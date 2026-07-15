import os
import json
import logging
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any

from app.config import settings
from app.services.crawler import crawl_jobs
from app.services.analyzer import generate_sitemap_tree, analyze_website_content

logger = logging.getLogger("sitemind.router.analytics")
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/{task_id}")
async def get_analytics(
    task_id: str,
    provider: Optional[str] = "local",
    api_key: Optional[str] = None,
    model_name: Optional[str] = None
):
    task_id = task_id.strip()
    if not task_id:
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
        
    folder_path = os.path.join(settings.VECTOR_STORE_DIR, task_id)
    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="Website data not found. Please crawl the website first.")
        
    # Try reading from cache first
    cache_path = os.path.join(folder_path, "analysis.json")
    
    # Check if we have crawled content documents
    docs_path = os.path.join(folder_path, "documents.json")
    if not os.path.exists(docs_path):
        raise HTTPException(status_code=400, detail="No content documents found for this task.")
        
    # Read documents to build sitemap and extract text
    try:
        with open(docs_path, "r", encoding="utf-8") as f:
            documents = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read index: {str(e)}")
        
    if not documents:
        raise HTTPException(status_code=400, detail="Index contains no data.")
        
    # Gather URLs and text map for analyzer
    urls = []
    crawl_results = {}
    for doc in documents:
        url = doc["metadata"]["source"]
        title = doc["metadata"]["title"]
        text = doc["page_content"]
        urls.append(url)
        if url not in crawl_results:
            crawl_results[url] = {"text": text, "title": title}
            
    # 1. Generate Sitemap (deterministic, fast, doesn't need LLM)
    sitemap = generate_sitemap_tree(urls)
    
    # Compute base stats
    total_pages = len(urls)
    total_chunks = len(documents)
    total_chars = sum([len(doc["page_content"]) for doc in documents])
    
    # 2. Check if LLM analytics is already cached
    cached_analysis = {}
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                cached_analysis = json.load(f)
        except Exception:
            pass
            
    # If not cached, or if user explicitly wants to refresh (or if cache is empty), compute it
    if not cached_analysis or "summary" not in cached_analysis:
        # Determine provider fallback
        target_provider = provider
        if target_provider == "local":
            if settings.GEMINI_API_KEY:
                target_provider = "gemini"
            elif settings.GROQ_API_KEY:
                target_provider = "groq"
            elif settings.OPENAI_API_KEY:
                target_provider = "openai"
            else:
                # No keys available, analyzer will return fallback data
                target_provider = None
                
        logger.info(f"Computing website analysis for {task_id} using {target_provider}...")
        analysis_res = await analyze_website_content(
            crawl_results=crawl_results,
            provider=target_provider,
            api_key=api_key,
            model_name=model_name
        )
        
        # Save to cache
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(analysis_res, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to cache analysis: {e}")
            
        cached_analysis = analysis_res
        
    # Combine stats, sitemap, and LLM analytical reports
    return {
        "stats": {
            "total_pages": total_pages,
            "total_chunks": total_chunks,
            "total_characters": total_chars,
            "crawl_depth": crawl_jobs[task_id].max_depth if task_id in crawl_jobs else 3,
            "processing_time": crawl_jobs[task_id].processing_time_sec if task_id in crawl_jobs else 0.0
        },
        "sitemap": sitemap,
        "analysis": cached_analysis
    }
