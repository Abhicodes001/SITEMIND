import re
import json
import logging
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from pydantic import BaseModel, Field
from app.services.llm import get_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger("sitemind.analyzer")


class CompanyDetailsModel(BaseModel):
    name: str = Field(..., description="Company or website name")
    industry: str = Field(..., description="Industry sector (e.g., SaaS, E-commerce, Blog, Non-profit)")
    mission: str = Field(default="", description="Mission statement or core objective if present")
    description: str = Field(..., description="Short description of the company values and offerings")


class FAQItemModel(BaseModel):
    question: str = Field(..., description="FAQ Question")
    answer: str = Field(..., description="FAQ Answer")


class ContactDetailsModel(BaseModel):
    emails: List[str] = Field(default_factory=list, description="Extracted contact email addresses")
    phones: List[str] = Field(default_factory=list, description="Extracted contact phone numbers")
    address: str = Field(default="", description="Physical office address if present")
    social_links: List[str] = Field(default_factory=list, description="Social media profile links")


class WebsiteAnalysisSchema(BaseModel):
    summary: str = Field(..., description="Concise paragraph summary of what this website or business is about")
    company_details: CompanyDetailsModel
    key_insights: List[str] = Field(..., description="List of key structural insights, main offerings, or target audience details")
    faqs: List[FAQItemModel] = Field(default_factory=list, description="Frequently asked questions extracted or inferred from website content")
    contact_details: ContactDetailsModel


def generate_sitemap_tree(urls: List[str]) -> Dict[str, Any]:
    """
    Constructs a hierarchical sitemap tree from a flat list of URLs.
    Example output format:
    {
        "name": "home",
        "url": "https://example.com",
        "children": [
            { "name": "about", "url": "https://example.com/about", "children": [...] }
        ]
    }
    """
    if not urls:
        return {}
        
    # Sort URLs by length so we process parents before children
    urls = sorted(list(set(urls)), key=len)
    
    # Identify root URL (usually the shortest or the start URL)
    root_url = urls[0]
    parsed_root = urlparse(root_url)
    root_name = parsed_root.netloc or "Home"
    
    # We will build a tree using a helper dict mapping URL -> Node
    tree_nodes: Dict[str, Dict[str, Any]] = {
        root_url: {
            "name": "/",
            "url": root_url,
            "children": []
        }
    }
    
    for url in urls[1:]:
        parsed = urlparse(url)
        path = parsed.path.strip("/")
        
        if not path:
            # It's an alternate form of root
            continue
            
        segments = path.split("/")
        name = segments[-1] or segments[-2] if len(segments) > 1 else segments[0]
        
        node = {
            "name": "/" + name,
            "url": url,
            "children": []
        }
        tree_nodes[url] = node
        
        # Try to find the closest parent URL
        parent_url = None
        # Walk up the segments to find a parent url that we indexed
        for i in range(len(segments) - 1, 0, -1):
            subpath = "/".join(segments[:i])
            potential_parent_url = f"{parsed.scheme}://{parsed.netloc}/{subpath}"
            potential_parent_url_alt = f"{parsed.scheme}://{parsed.netloc}/{subpath}/"
            
            if potential_parent_url in tree_nodes:
                parent_url = potential_parent_url
                break
            elif potential_parent_url_alt in tree_nodes:
                parent_url = potential_parent_url_alt
                break
                
        # If no parent was found in our indexed list, attach to root
        if not parent_url:
            parent_url = root_url
            
        if parent_url in tree_nodes:
            tree_nodes[parent_url]["children"].append(node)
            
    return tree_nodes[root_url]


def extract_regex_contacts(text: str) -> Dict[str, List[str]]:
    """Extract emails and phone numbers using regex from text content."""
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}'
    
    emails = list(set(re.findall(email_pattern, text)))
    # Filter out common false positives for phone numbers (e.g. dates, version numbers)
    raw_phones = re.findall(phone_pattern, text)
    phones = []
    for p in raw_phones:
        cleaned = re.sub(r'[-.\s\(\)]', '', p)
        if 7 <= len(cleaned) <= 15 and not cleaned.startswith('202') and not cleaned.startswith('203'):
            phones.append(p.strip())
            
    return {
        "emails": list(set(emails))[:5],
        "phones": list(set(phones))[:5]
    }


async def analyze_website_content(
    crawl_results: Dict[str, Dict[str, str]],
    provider: str,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Extracts summary, FAQs, key insights, company details and contacts using LLM analysis.
    Uses Pydantic structured output with fallback parsing.
    """
    # 1. Gather sample text from the main pages (e.g., home and about pages, up to 10k chars total)
    sample_text = ""
    urls = list(crawl_results.keys())
    
    preferred_urls = []
    other_urls = []
    for u in urls:
        path = urlparse(u).path.lower()
        if path == "" or path == "/" or "about" in path or "contact" in path or "info" in path:
            preferred_urls.append(u)
        else:
            other_urls.append(u)
            
    sorted_urls = preferred_urls + other_urls
    
    for u in sorted_urls[:4]:  # use up to 4 pages for context
        content = crawl_results[u]
        sample_text += f"--- PAGE: {content['title']} ({u}) ---\n{content['text'][:3000]}\n\n"
        if len(sample_text) > 15000:
            break
            
    # Regex extract emails/phones as baseline
    regex_contacts = extract_regex_contacts(sample_text)
    
    # 2. Build analysis query for LLM
    prompt = (
        "You are an expert business analyst and research agent. Analyze the following scraped content "
        "from a website and extract structural insights.\n\n"
        f"--- WEBSITE SCENARIO TEXT ---\n{sample_text}"
    )
    
    # Fallback response in case LLM fails or is not configured
    fallback_data = {
        "summary": "Website content indexed. Chat is ready to query details.",
        "company_details": {
            "name": urlparse(urls[0]).netloc if urls else "Website",
            "industry": "Unspecified",
            "mission": "",
            "description": "Website scanned and indexed."
        },
        "key_insights": [
            f"Successfully scanned {len(urls)} pages.",
            "Ready to answer natural language questions about the website content.",
            "Ignore headers, footers, scripts, and duplicate styles."
        ],
        "faqs": [
            {
                "question": "What website was indexed?",
                "answer": f"The crawl started from {urls[0] if urls else 'an unknown page'}."
            },
            {
                "question": "What can I do next?",
                "answer": "You can ask questions about any information, products, or specifications on this website."
            }
        ],
        "contact_details": {
            "emails": regex_contacts["emails"],
            "phones": regex_contacts["phones"],
            "address": "",
            "social_links": []
        }
    }
    
    if not provider:
        return fallback_data
        
    try:
        chat = get_chat_model(provider, api_key, model_name, temperature=0.1)
        messages = [
            SystemMessage(content="You are a strict data extraction assistant that extracts structured business insights from website contents."),
            HumanMessage(content=prompt)
        ]
        
        data = None
        
        # 1. Attempt Pydantic Structured Output
        try:
            structured_chat = chat.with_structured_output(WebsiteAnalysisSchema)
            structured_result = await structured_chat.ainvoke(messages)
            if structured_result:
                if isinstance(structured_result, BaseModel):
                    data = structured_result.model_dump()
                elif isinstance(structured_result, dict):
                    data = structured_result
        except Exception as se:
            logger.warning(f"Structured output method failed or unsupported by provider: {se}. Falling back to JSON parsing.")
            
        # 2. Standard JSON Fallback if structured output fails
        if not data:
            response = await chat.ainvoke(messages)
            res_text = response.content.strip()
            
            if res_text.startswith("```"):
                res_text = re.sub(r'^```(?:json)?\n', '', res_text)
                res_text = re.sub(r'\n```$', '', res_text)
                
            data = json.loads(res_text.strip())
            
        # Merge regex-extracted contacts if LLM missed them
        if not data.get("contact_details"):
            data["contact_details"] = {}
            
        if not data["contact_details"].get("emails") and regex_contacts["emails"]:
            data["contact_details"]["emails"] = regex_contacts["emails"]
            
        if not data["contact_details"].get("phones") and regex_contacts["phones"]:
            data["contact_details"]["phones"] = regex_contacts["phones"]
            
        return data
        
    except Exception as e:
        logger.error(f"Error during LLM website analysis: {e}")
        return fallback_data
