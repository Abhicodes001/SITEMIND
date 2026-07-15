import asyncio
import logging
import re
from urllib.parse import urljoin, urlparse, urlunparse
import httpx
from bs4 import BeautifulSoup, Comment
from typing import Dict, List, Set, Any, Optional

logger = logging.getLogger("sitemind.crawler")

class CrawlJob:
    def __init__(self, start_url: str, max_depth: int, max_pages: int):
        self.start_url = start_url
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.status = "idle"  # idle, checking, crawling, cleaning, completing, completed, failed
        self.pages_discovered = 0
        self.pages_indexed = []
        self.current_action = ""
        self.errors = []
        self.results = {}  # url -> {"text": str, "title": str, "url": str}
        self.logs = []
        self.chunks_count = 0
        self.embeddings_count = 0
        self.start_time = None
        self.processing_time_sec = 0

    def add_log(self, message: str):
        logger.info(message)
        self.logs.append(message)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start_url": self.start_url,
            "status": self.status,
            "pages_discovered": self.pages_discovered,
            "pages_indexed_count": len(self.pages_indexed),
            "pages_indexed": self.pages_indexed,
            "current_action": self.current_action,
            "errors": self.errors,
            "logs": self.logs[-15:], # return last 15 logs
            "chunks_count": self.chunks_count,
            "embeddings_count": self.embeddings_count,
            "processing_time_sec": round(self.processing_time_sec, 2)
        }

# Global registry for crawl jobs
crawl_jobs: Dict[str, CrawlJob] = {}

def get_base_domain(url: str) -> str:
    parsed = urlparse(url)
    return parsed.netloc

def clean_url(url: str) -> str:
    # Normalize URL by stripping fragments and query params (if query params are just tracking)
    parsed = urlparse(url)
    # We keep query params to support routing frameworks but strip fragments
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, parsed.query, ''))

def get_start_url_candidates(url: str) -> List[str]:
    parsed = urlparse(url)
    candidates = [url]

    if parsed.scheme == "https":
        candidates.append(urlunparse(("http", parsed.netloc, parsed.path, parsed.params, parsed.query, "")))

    if parsed.netloc and not parsed.netloc.startswith("www."):
        www_netloc = f"www.{parsed.netloc}"
        candidates.append(urlunparse((parsed.scheme, www_netloc, parsed.path, parsed.params, parsed.query, "")))
        if parsed.scheme == "https":
            candidates.append(urlunparse(("http", www_netloc, parsed.path, parsed.params, parsed.query, "")))

    deduped = []
    for candidate in candidates:
        if candidate not in deduped:
            deduped.append(candidate)
    return deduped

def is_same_domain(url: str, base_domain: str) -> bool:
    parsed = urlparse(url)
    # Match domain or subdomain
    return parsed.netloc == base_domain or parsed.netloc.endswith("." + base_domain)

def should_skip_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    
    # Check for login, register, admin sections
    skip_keywords = ["login", "signin", "signup", "register", "logout", "password-reset", "admin", "wp-admin"]
    if any(keyword in path for keyword in skip_keywords):
        return True
        
    # Check for media/document extensions
    skip_extensions = [
        # Images
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".bmp", ".webp", ".ico",
        # Video/Audio
        ".mp4", ".avi", ".mov", ".mkv", ".webm", ".mp3", ".wav", ".flac", ".ogg",
        # Documents
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt",
        # Compressed/Executable
        ".zip", ".tar", ".gz", ".rar", ".exe", ".dmg", ".bin",
        # Styles/Scripts
        ".css", ".js", ".json", ".xml", ".rss"
    ]
    if any(path.endswith(ext) for ext in skip_extensions):
        return True
        
    return False

def clean_html_content(html: str) -> Dict[str, str]:
    try:
        import lxml
        parser = "lxml"
    except ImportError:
        parser = "html.parser"
    soup = BeautifulSoup(html, parser)
    
    # Extract title
    title_tag = soup.find("title")
    title = title_tag.get_text().strip() if title_tag else "Untitled Page"
    
    # Remove unwanted tags
    unwanted_selectors = [
        "script", "style", "noscript", "iframe", "svg", "header", "footer", 
        "nav", "aside", ".nav", ".navigation", ".footer", ".header", ".sidebar", 
        ".menu", ".ads", ".advertisement", "#ads", "#header", "#footer", "#nav",
        "form", "input", "button", "select", "textarea"
    ]
    
    for selector in unwanted_selectors:
        for element in soup.select(selector):
            element.decompose()
            
    # Also strip comments
    for element in soup.find_all(string=lambda text: isinstance(text, Comment)):
        element.extract()
        
    # Extract structural text (headings, paragraphs, lists, table elements)
    text_blocks = []
    
    # We scan for paragraphs and blocks of text
    for element in soup.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "blockquote", "pre", "code"]):
        text = element.get_text().strip()
        if text:
            # Clean excessive whitespace inside text block
            text = re.sub(r'\s+', ' ', text)
            if len(text) > 10:  # Skip trivial texts
                text_blocks.append(text)
                
    # If no structured blocks were found, fallback to body text
    if not text_blocks and soup.body:
        body_text = soup.body.get_text()
        body_text = re.sub(r'\s+', ' ', body_text).strip()
        if body_text:
            text_blocks.append(body_text)
            
    # Combine paragraphs with newlines
    cleaned_text = "\n\n".join(text_blocks)
    
    return {
        "title": title,
        "text": cleaned_text
    }

async def crawl_website(job_id: str):
    job = crawl_jobs[job_id]
    job.status = "checking"
    job.current_action = "Checking URL and validating host..."
    job.add_log(f"Starting crawl for: {job.start_url}")
    
    import time
    job.start_time = time.time()
    
    start_url = job.start_url
    if not (start_url.startswith("http://") or start_url.startswith("https://")):
        start_url = "https://" + start_url
        job.start_url = start_url
        
    try:
        base_domain = get_base_domain(start_url)
        if not base_domain:
            raise ValueError("Invalid URL format.")
    except Exception as e:
        job.status = "failed"
        job.errors.append(f"Invalid URL: {str(e)}")
        job.add_log(f"Validation failed: {str(e)}")
        return
        
    from app.config import settings
    headers = {
        "User-Agent": settings.DEFAULT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }
    
    visited_urls: Set[str] = set()
    # BFS queue: list of tuples (url, depth). Try common variants for the first page;
    # many sites canonicalize between apex/www or HTTPS/HTTP.
    queue: List[tuple] = [(candidate, 1) for candidate in get_start_url_candidates(start_url)]
    
    job.status = "crawling"
    job.current_action = "Discovering pages..."
    
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    
    async with httpx.AsyncClient(headers=headers, timeout=12.0, follow_redirects=True, limits=limits) as client:
        while queue and len(visited_urls) < job.max_pages:
            job.processing_time_sec = time.time() - job.start_time
            curr_url, curr_depth = queue.pop(0)
            
            curr_url = clean_url(curr_url)
            if curr_url in visited_urls:
                continue
                
            visited_urls.add(curr_url)
            job.current_action = f"Reading {curr_url}..."
            job.add_log(f"Crawling: {curr_url} (depth={curr_depth})")
            
            try:
                # Perform fetch
                response = await client.get(curr_url)
                if response.status_code != 200:
                    message = f"Skipping {curr_url}: HTTP {response.status_code}"
                    if response.status_code in (401, 403):
                        body_preview = re.sub(r"\s+", " ", response.text).strip()[:180]
                        message += ". The site refused crawler access"
                        if body_preview:
                            message += f": {body_preview}"
                        job.errors.append(message)
                    job.add_log(message)
                    continue
                    
                content_type = response.headers.get("content-type", "").lower()
                if "text/html" not in content_type:
                    job.add_log(f"Skipping {curr_url}: Non-HTML content-type ({content_type})")
                    continue
                    
                html = response.text
                if not html or len(html.strip()) == 0:
                    job.add_log(f"Skipping {curr_url}: Empty page response")
                    continue
                    
                # Clean content
                job.current_action = f"Cleaning HTML from {curr_url}..."
                cleaned = clean_html_content(html)
                
                # Check for Cloudflare / bot protection in title or body text
                title_lower = cleaned["title"].lower()
                text_lower = cleaned["text"].lower()
                is_bot_protected = (
                    "cloudflare" in title_lower or 
                    "recaptcha" in title_lower or 
                    "checking your browser" in title_lower or 
                    "just a moment..." in title_lower or
                    "ddos-guard" in title_lower or
                    "sucuri" in title_lower
                )
                
                if is_bot_protected:
                    message = f"Skipping {curr_url}: The website is protected by Cloudflare/reCAPTCHA bot protection."
                    job.add_log(message)
                    job.errors.append(message)
                    continue
                
                if cleaned["text"]:
                    job.results[curr_url] = {
                        "url": curr_url,
                        "title": cleaned["title"],
                        "text": cleaned["text"]
                    }
                    job.pages_indexed.append(curr_url)
                    job.pages_discovered = len(visited_urls)
                    job.add_log(f"Successfully indexed: {cleaned['title']} ({len(cleaned['text'])} chars)")
                else:
                    job.add_log(f"Skipping {curr_url}: No text extracted after filtering tags")
                    
                # If we haven't reached max depth, find and queue links
                if curr_depth < job.max_depth:
                    soup = BeautifulSoup(html, "html.parser")
                    link_elements = soup.find_all("a", href=True)
                    
                    found_links_count = 0
                    for elem in link_elements:
                        href = elem["href"]
                        # Resolve relative links
                        full_href = urljoin(curr_url, href)
                        full_href = clean_url(full_href)
                        
                        if is_same_domain(full_href, base_domain) and not should_skip_url(full_href):
                            if full_href not in visited_urls and full_href not in [q[0] for q in queue]:
                                queue.append((full_href, curr_depth + 1))
                                found_links_count += 1
                                
                    if found_links_count > 0:
                        job.add_log(f"Discovered {found_links_count} new internal links on {curr_url}")
                        
            except httpx.RequestError as e:
                error_text = str(e)
                if "WinError 10013" in error_text or "forbidden by its access permissions" in error_text:
                    error_text = (
                        "Outbound network access is blocked by the current Windows/sandbox permissions. "
                        "Run the backend with normal network access and try again."
                    )
                job.errors.append(f"Network error on {curr_url}: {error_text}")
                job.add_log(f"Network error on {curr_url}: {error_text}")
            except Exception as e:
                job.errors.append(f"Unexpected error parsing {curr_url}: {str(e)}")
                job.add_log(f"Unexpected error parsing {curr_url}: {str(e)}")
                
            # Yield control to prevent blocking event loop
            await asyncio.sleep(0.1)
            
    job.processing_time_sec = time.time() - job.start_time
    if not job.results:
        job.status = "failed"
        job.errors.append("No content could be successfully indexed from the website.")
        job.add_log("Crawl failed: No content indexed")
    else:
        job.status = "cleaning"  # Done crawling, moving to database build next
        job.add_log(f"Crawl completed. Indexed {len(job.results)} pages total.")
