import uuid
import hashlib
import asyncio
import logging
import json
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any

from app.config import settings
from app.services.crawler import crawl_jobs, CrawlJob, crawl_website
from app.services.rag import build_vector_store

logger = logging.getLogger("sitemind.router.crawl")
router = APIRouter(prefix="/crawl", tags=["crawling"])

class CrawlRequest(BaseModel):
    url: str
    max_depth: Optional[int] = None
    max_pages: Optional[int] = None
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None
    embedding_provider: Optional[str] = "local"
    api_key: Optional[str] = None

class CrawlStatusResponse(BaseModel):
    task_id: str
    status: str
    pages_discovered: int
    pages_indexed_count: int
    pages_indexed: List[str]
    current_action: str
    errors: List[str]
    logs: List[str]
    chunks_count: int
    embeddings_count: int
    processing_time_sec: float

def generate_task_id(url: str) -> str:
    # Generate a deterministic alphanumeric task ID based on the URL domain and a hash
    parsed = urlparse(url)
    domain = parsed.netloc or url.split("/")[0]
    # Clean domain to make it safe for folder paths
    safe_domain = "".join([c if c.isalnum() else "_" for c in domain])
    # Short hash of full URL to avoid collisions
    url_hash = hashlib.md5(url.encode('utf-8')).hexdigest()[:8]
    return f"{safe_domain}_{url_hash}"

async def background_crawl_and_index(
    task_id: str,
    request: CrawlRequest
):
    job = crawl_jobs[task_id]
    
    try:
        # 1. Run the Crawler
        await crawl_website(task_id)
        
        # 2. Check if crawler succeeded
        if job.status == "failed":
            logger.error(f"Crawler failed for job {task_id}")
            return
            
        # 3. Transition to DB building
        job.status = "building_db"
        job.current_action = "Building vector database..."
        job.add_log("Starting document chunking and vector index construction...")
        
        # Run building in thread pool to prevent blocking event loop if local embeddings are running
        loop = asyncio.get_event_loop()
        
        # Prepare parameters
        c_size = request.chunk_size or settings.DEFAULT_CHUNK_SIZE
        c_overlap = request.chunk_overlap or settings.DEFAULT_CHUNK_OVERLAP
        emb_provider = request.embedding_provider or "local"
        
        chunks_count, embeddings_count = await loop.run_in_executor(
            None,
            build_vector_store,
            task_id,
            job.results,
            emb_provider,
            request.api_key,
            c_size,
            c_overlap
        )
        
        import time
        job.chunks_count = chunks_count
        job.embeddings_count = embeddings_count
        job.status = "completed"
        job.current_action = "Ready to chat."
        job.processing_time_sec = time.time() - job.start_time
        job.add_log(f"Database successfully built with {chunks_count} chunks. Ready to chat!")
        
    except Exception as e:
        logger.exception(f"Background task failed for job {task_id}:")
        job.status = "failed"
        job.errors.append(f"Processing failed: {str(e)}")
        job.add_log(f"Process failed: {str(e)}")

@router.post("/start")
async def start_crawl(request: CrawlRequest):
    # Basic URL sanitation
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    if not (url.startswith("http://") or url.startswith("https://")):
        url = "https://" + url
        
    # Prevent SSRF by skipping local addresses
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if any(ip in host for ip in ["localhost", "127.0.0.1", "0.0.0.0", "::1"]):
        raise HTTPException(status_code=400, detail="Accessing local network addresses is restricted.")
        
    # Generate stable task_id
    task_id = generate_task_id(url)
    
    # Check if this job is currently crawling/building, if so, return it
    if task_id in crawl_jobs and crawl_jobs[task_id].status in ["checking", "crawling", "cleaning", "building_db"]:
        return {
            "task_id": task_id,
            "status": crawl_jobs[task_id].status,
            "message": "Crawl job already in progress for this URL."
        }
        
    # Create new job
    depth = request.max_depth or settings.DEFAULT_MAX_DEPTH
    pages = request.max_pages or settings.DEFAULT_MAX_PAGES
    
    job = CrawlJob(url, depth, pages)
    crawl_jobs[task_id] = job
    
    # Start background execution
    asyncio.create_task(background_crawl_and_index(task_id, request))
    
    return {
        "task_id": task_id,
        "status": "checking",
        "message": "Crawler started successfully"
    }

@router.get("/status/{task_id}", response_model=CrawlStatusResponse)
async def get_status(task_id: str):
    if task_id not in crawl_jobs:
        # Check if vector store folder exists on disk.
        # If so, recreate a completed stub job so user can load previously scanned websites!
        folder_path = f"{settings.VECTOR_STORE_DIR}/{task_id}"
        if os_exists := hasattr(settings, "VECTOR_STORE_DIR") and os_path_exists(folder_path):
            # Create a stub job
            stub_url = task_id_to_url_placeholder(task_id)
            job = CrawlJob(stub_url, 0, 0)
            job.status = "completed"
            job.current_action = "Ready to chat."
            # Retrieve cached files if present, else empty
            crawl_jobs[task_id] = job
        else:
            raise HTTPException(status_code=404, detail="Task not found")
            
    return crawl_jobs[task_id].to_dict() | {"task_id": task_id}

@router.get("/list")
async def list_jobs():
    # Helper to scan saved stores on disk and return them
    import os
    saved_stores = []
    if os.path.exists(settings.VECTOR_STORE_DIR):
        for entry in os.listdir(settings.VECTOR_STORE_DIR):
            if os.path.isdir(os.path.join(settings.VECTOR_STORE_DIR, entry)):
                # If it's already in memory, use memory representation
                if entry in crawl_jobs:
                    saved_stores.append({
                        "task_id": entry,
                        "url": crawl_jobs[entry].start_url,
                        "status": crawl_jobs[entry].status,
                        "pages_count": len(crawl_jobs[entry].pages_indexed),
                        "chunks_count": crawl_jobs[entry].chunks_count,
                        "processing_time": crawl_jobs[entry].processing_time_sec
                    })
                else:
                    # Parse from document dump if available
                    doc_json_path = os.path.join(settings.VECTOR_STORE_DIR, entry, "documents.json")
                    pages_count = 0
                    urls = []
                    if os.path.exists(doc_json_path):
                        try:
                            with open(doc_json_path, "r", encoding="utf-8") as f:
                                docs = json.load(f)
                            urls = list(set([doc["metadata"]["source"] for doc in docs if "metadata" in doc]))
                            pages_count = len(urls)
                        except Exception:
                            pass
                            
                    # Attempt to guess domain name from directory structure
                    # entry format: www_domain_com_hash
                    # Recover URL placeholder
                    inferred_url = entry.replace("_", ".")
                    if inferred_url.endswith(".html") or len(inferred_url) > 8:
                        # Find index of last hash
                        parts = entry.split("_")
                        if len(parts) > 1:
                            inferred_url = "https://" + ".".join(parts[:-1])
                            
                    saved_stores.append({
                        "task_id": entry,
                        "url": inferred_url,
                        "status": "completed",
                        "pages_count": pages_count,
                        "chunks_count": len(docs) if 'docs' in locals() else 0,
                        "processing_time": 0.0
                    })
                    
    return saved_stores

# Quick helper imports/functions
def os_path_exists(path: str) -> bool:
    import os
    return os.path.exists(path)

def task_id_to_url_placeholder(task_id: str) -> str:
    parts = task_id.split("_")
    if len(parts) > 1:
        return "https://" + ".".join(parts[:-1])
    return "https://" + task_id

@router.delete("/{task_id}")
async def delete_crawl_job(task_id: str):
    task_id = task_id.strip()
    if not task_id:
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
        
    import os
    import shutil
    
    # 1. Remove from in-memory crawl jobs registry
    if task_id in crawl_jobs:
        del crawl_jobs[task_id]
        
    # 2. Remove files from vector store directory on disk
    folder_path = os.path.join(settings.VECTOR_STORE_DIR, task_id)
    if os.path.exists(folder_path):
        try:
            shutil.rmtree(folder_path)
        except Exception as e:
            logger.error(f"Failed to delete directory {folder_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete website index files: {str(e)}")
            
    return {"status": "success", "message": "Website database deleted successfully"}

