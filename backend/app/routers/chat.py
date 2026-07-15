import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.config import settings
from app.services.rag import search_vector_store
from app.services.llm import stream_chat_response

logger = logging.getLogger("sitemind.router.chat")
router = APIRouter(prefix="/chat", tags=["chatting"])

class ChatHistoryMessage(BaseModel):
    role: str # user or assistant
    content: str

class ChatRequest(BaseModel):
    task_id: str
    message: str
    history: List[ChatHistoryMessage] = []
    provider: Optional[str] = "local"
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    temperature: Optional[float] = 0.2
    top_k: Optional[int] = 5

@router.post("")
async def chat_endpoint(request: ChatRequest):
    task_id = request.task_id.strip()
    if not task_id:
        raise HTTPException(status_code=400, detail="Task ID cannot be empty")
        
    query = request.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")
        
    logger.info(f"Chat request for task {task_id} with query: {query}")
    
    # 1. Retrieve context chunks from RAG store
    try:
        top_k = request.top_k or settings.DEFAULT_TOP_K
        # Vector stores are built with local embeddings; the selected provider is
        # only for final answer generation.
        emb_provider = "local"
        
        context_chunks = search_vector_store(
            namespace=task_id,
            query=query,
            embedding_provider=emb_provider,
            api_key=request.api_key,
            k=top_k
        )
    except Exception as e:
        logger.exception(f"Failed to query vector store for namespace {task_id}:")
        context_chunks = []
        
    # 2. Build model config
    history_list = [{"role": msg.role, "content": msg.content} for msg in request.history]
    provider = request.provider or "local"
    
    # If using local provider for LLM, raise error since we don't host a local LLM server.
    # The user MUST use one of the API keys (Groq, OpenAI, Gemini).
    # If provider is "local", we can auto-detect which API key is present in settings or headers
    # and use it as a fallback provider.
    if provider == "local":
        if request.api_key:
            # If a key is passed, we can guess the provider based on key format or check if there is an active setting
            # But the UI will pass the provider. Let's select Gemini or Groq or OpenAI depending on what key is in backend config.
            if settings.GEMINI_API_KEY:
                provider = "gemini"
            elif settings.GROQ_API_KEY:
                provider = "groq"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Please select a valid LLM provider (Gemini, Groq, OpenAI) and input your API key."
                )
        else:
            # Check backend keys
            if settings.GEMINI_API_KEY:
                provider = "gemini"
            elif settings.GROQ_API_KEY:
                provider = "groq"
            elif settings.OPENAI_API_KEY:
                provider = "openai"
            else:
                raise HTTPException(
                    status_code=400,
                    detail="No AI model provider is configured. Please provide an API key in settings."
                )
                
    # 3. Stream back the RAG chat generation
    generator = stream_chat_response(
        query=query,
        context_chunks=context_chunks,
        history=history_list,
        provider=provider,
        api_key=request.api_key,
        model_name=request.model_name,
        temperature=request.temperature or 0.2
    )
    
    return StreamingResponse(generator, media_type="text/event-stream")
