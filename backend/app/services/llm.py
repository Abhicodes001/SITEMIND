import json
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

from app.config import settings

logger = logging.getLogger("sitemind.llm")

def get_chat_model(
    provider: str,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: float = 0.2
) -> Any:
    """Initializes the chat model from the requested provider."""
    # Ensure temperature is within valid range
    temperature = max(0.0, min(1.0, temperature))
    
    if provider == "openai":
        from langchain_openai import ChatOpenAI
        key = api_key or settings.OPENAI_API_KEY
        if not key:
            raise ValueError("OpenAI API Key is missing.")
        model = model_name or settings.DEFAULT_OPENAI_MODEL
        logger.info(f"Initializing ChatOpenAI model: {model}")
        return ChatOpenAI(
            openai_api_key=key,
            model=model,
            temperature=temperature,
            streaming=True
        )
        
    elif provider == "groq":
        from langchain_groq import ChatGroq
        key = api_key or settings.GROQ_API_KEY
        if not key:
            raise ValueError("Groq API Key is missing.")
        model = model_name or settings.DEFAULT_GROQ_MODEL
        logger.info(f"Initializing ChatGroq model: {model}")
        return ChatGroq(
            groq_api_key=key,
            model=model,
            temperature=temperature,
            streaming=True
        )
        
    elif provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        key = api_key or settings.GEMINI_API_KEY
        if not key:
            raise ValueError("Gemini API Key is missing.")
        model = model_name or settings.DEFAULT_GEMINI_MODEL
        logger.info(f"Initializing ChatGoogleGenerativeAI model: {model}")
        return ChatGoogleGenerativeAI(
            google_api_key=key,
            model=model,
            temperature=temperature,
            streaming=True
        )
        
    else:
        raise ValueError(f"Unsupported AI provider: {provider}")


async def stream_chat_response(
    query: str,
    context_chunks: List[Dict[str, Any]],
    history: List[Dict[str, str]],
    provider: str,
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: float = 0.2
) -> AsyncGenerator[str, None]:
    """
    Streams a response using SSE.
    Yields:
      event: sources -> returns JSON of sources list
      event: token -> returns content token
      event: error -> returns error message
      event: end -> returns completion signal
    """
    # 1. Yield sources immediately so UI can render them
    sources_data = []
    seen_urls = set()
    for chunk in context_chunks:
        url = chunk["source"]
        if url not in seen_urls:
            seen_urls.add(url)
            sources_data.append({
                "url": url,
                "title": chunk["title"],
                "snippet": chunk["page_content"][:200] + "..." if len(chunk["page_content"]) > 200 else chunk["page_content"]
            })
            
    yield f"event: sources\ndata: {json.dumps(sources_data)}\n\n"
    
    # 2. Build system context message
    context_text = ""
    for idx, chunk in enumerate(context_chunks):
        context_text += f"Source [{idx + 1}]: {chunk['title']} ({chunk['source']})\nContent: {chunk['page_content']}\n\n"
        
    system_prompt = (
        "You are SiteMind AI, an expert assistant that answers questions based ONLY on the provided website contents.\n"
        "Your task is to answer the user's questions truthfully and accurately using only the source texts. "
        "Strictly adhere to the following rules:\n"
        "1. Base your answer ONLY on the context blocks provided below. Do not use external knowledge or make assumptions.\n"
        "2. If the context does not contain the answer or if you cannot verify it from the context, respond EXACTLY with:\n"
        "   \"I couldn't find this information on the website.\"\n"
        "   Do not add any explanations, apologies, or extra text if the answer is not found.\n"
        "3. Provide inline citations referring to the sources as [1], [2], etc., when citing facts.\n"
        "4. Keep your answer clear, readable, and structured in Markdown format. Use tables, bold text, lists, and code blocks where helpful.\n\n"
        f"--- WEBSITE CONTEXT ---\n{context_text}"
    )
    
    # 3. Assemble chat history messages
    messages = [SystemMessage(content=system_prompt)]
    
    for msg in history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))
            
    messages.append(HumanMessage(content=query))
    
    # 4. Generate response from LLM. Some providers stream cumulative chunks
    # instead of deltas, which duplicates text in the UI. Use one clean response
    # and send it through the existing SSE token channel.
    try:
        chat = get_chat_model(provider, api_key, model_name, temperature)
        response = await chat.ainvoke(messages)
        text = response.content
        if isinstance(text, list):
            text = "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in text
            )
        if isinstance(text, str) and text:
            yield f"event: token\ndata: {json.dumps({'text': text})}\n\n"
                
        yield "event: end\ndata: {}\n\n"
        
    except Exception as e:
        logger.exception("Error during LLM streaming:")
        yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
