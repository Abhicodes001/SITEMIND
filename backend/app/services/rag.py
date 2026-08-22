import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

logger = logging.getLogger("sitemind.rag")

# Try to import FAISS, but don't fail if it's missing
HAS_FAISS = False
try:
    from langchain_community.vectorstores import FAISS
    HAS_FAISS = True
    logger.info("FAISS vector database available.")
except ImportError:
    logger.warning("FAISS not found. Falling back to NumPy-based SimpleVectorStore.")


class SimpleVectorStore:
    """A lightweight, pure-NumPy vector store fallback that implements basic search."""
    def __init__(self, embeddings_model: Any):
        self.embeddings_model = embeddings_model
        self.documents: List[Document] = []
        self.vectors: Optional[np.ndarray] = None

    def add_documents(self, documents: List[Document]):
        if not documents:
            return
            
        texts = [doc.page_content for doc in documents]
        new_vectors = self.embeddings_model.embed_documents(texts)
        new_vectors_np = np.array(new_vectors, dtype=np.float32)
        
        # Normalize vectors for cosine similarity (dot product of normalized vectors)
        norms = np.linalg.norm(new_vectors_np, axis=1, keepdims=True)
        # Avoid division by zero
        norms = np.where(norms == 0, 1e-9, norms)
        new_vectors_np = new_vectors_np / norms
        
        if self.vectors is None:
            self.vectors = new_vectors_np
            self.documents = list(documents)
        else:
            self.vectors = np.vstack([self.vectors, new_vectors_np])
            self.documents.extend(documents)
            
        logger.info(f"Added {len(documents)} documents to SimpleVectorStore. Total: {len(self.documents)}")

    def similarity_search_with_score(self, query: str, k: int = 5) -> List[Tuple[Document, float]]:
        if not self.documents or self.vectors is None:
            return []
            
        query_vector = self.embeddings_model.embed_query(query)
        query_vector_np = np.array(query_vector, dtype=np.float32)
        
        # Normalize query vector
        q_norm = np.linalg.norm(query_vector_np)
        if q_norm > 0:
            query_vector_np = query_vector_np / q_norm
            
        # Compute cosine similarities (dot products)
        similarities = np.dot(self.vectors, query_vector_np)
        
        # Get top K indices
        top_k_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_k_indices:
            results.append((self.documents[idx], float(similarities[idx])))
            
        return results

    def save_local(self, folder_path: str):
        os.makedirs(folder_path, exist_ok=True)
        # Save documents
        docs_data = [
            {
                "page_content": doc.page_content,
                "metadata": doc.metadata
            } for doc in self.documents
        ]
        with open(os.path.join(folder_path, "documents.json"), "w", encoding="utf-8") as f:
            json.dump(docs_data, f, ensure_ascii=False, indent=2)
            
        # Save vectors
        if self.vectors is not None:
            np.save(os.path.join(folder_path, "vectors.npy"), self.vectors)
            
        logger.info(f"Saved SimpleVectorStore to {folder_path}")

    @classmethod
    def load_local(cls, folder_path: str, embeddings_model: Any) -> "SimpleVectorStore":
        store = cls(embeddings_model)
        docs_path = os.path.join(folder_path, "documents.json")
        vectors_path = os.path.join(folder_path, "vectors.npy")
        
        if os.path.exists(docs_path):
            with open(docs_path, "r", encoding="utf-8") as f:
                docs_data = json.load(f)
            store.documents = [
                Document(page_content=doc["page_content"], metadata=doc["metadata"])
                for doc in docs_data
            ]
            
        if os.path.exists(vectors_path):
            store.vectors = np.load(vectors_path)
            
        logger.info(f"Loaded SimpleVectorStore from {folder_path} with {len(store.documents)} documents.")
        return store


class CustomEmbeddingWrapper:
    """Wrapper that matches LangChain embeddings interface using SentenceTransformers or APIs."""
    def __init__(self, provider: str = "local", api_key: Optional[str] = None):
        self.provider = provider
        self.api_key = api_key
        self._model = None
        
        if provider == "local":
            try:
                from sentence_transformers import SentenceTransformer
                # Use a fast, high-accuracy open embedding model (BAAI BGE Small v1.5)
                model_name = settings.DEFAULT_EMBEDDING_MODEL
                self._model = SentenceTransformer(model_name)
                logger.info(f"Initialized local SentenceTransformer embedding model: {model_name}")
            except Exception as e:
                logger.error(f"Failed to load sentence-transformers: {e}. Vector search will fail unless an API provider is used.")
                
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if self.provider == "local" and self._model:
            embeddings = self._model.encode(texts, show_progress_bar=False)
            return [x.tolist() for x in embeddings]
        elif self.provider == "openai":
            from langchain_openai import OpenAIEmbeddings
            emb = OpenAIEmbeddings(openai_api_key=self.api_key, model="text-embedding-3-small")
            return emb.embed_documents(texts)
        elif self.provider == "gemini":
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            emb = GoogleGenerativeAIEmbeddings(google_api_key=self.api_key, model="models/text-embedding-004")
            return emb.embed_documents(texts)
        else:
            raise ValueError(f"Embedding provider {self.provider} not initialized or keys missing.")

    def embed_query(self, text: str) -> List[float]:
        if self.provider == "local" and self._model:
            embedding = self._model.encode(text, show_progress_bar=False)
            return embedding.tolist()
        elif self.provider == "openai":
            from langchain_openai import OpenAIEmbeddings
            emb = OpenAIEmbeddings(openai_api_key=self.api_key, model="text-embedding-3-small")
            return emb.embed_query(text)
        elif self.provider == "gemini":
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            emb = GoogleGenerativeAIEmbeddings(google_api_key=self.api_key, model="models/text-embedding-004")
            return emb.embed_query(text)
        else:
            raise ValueError(f"Embedding provider {self.provider} not initialized or keys missing.")


def get_embedding_model(provider: str, api_key: Optional[str] = None) -> CustomEmbeddingWrapper:
    if provider == "openai" and api_key:
        return CustomEmbeddingWrapper("openai", api_key)
    elif provider == "gemini" and api_key:
        return CustomEmbeddingWrapper("gemini", api_key)
    # Default fallback to local
    return CustomEmbeddingWrapper("local")


def build_vector_store(
    namespace: str,
    crawl_results: Dict[str, Dict[str, str]],
    embedding_provider: str = "local",
    api_key: Optional[str] = None,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> Tuple[int, int]:
    """Splits crawled text and indexes it in the vector store. Returns (chunks_count, embedding_count)"""
    logger.info(f"Building vector store for namespace: {namespace}")
    
    documents = []
    for url, data in crawl_results.items():
        doc = Document(
            page_content=data["text"],
            metadata={"source": url, "title": data["title"]}
        )
        documents.append(doc)
        
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len
    )
    
    chunks = text_splitter.split_documents(documents)
    chunks_count = len(chunks)
    
    # Generate embeddings
    embeddings = get_embedding_model(embedding_provider, api_key)
    
    folder_path = os.path.join(settings.VECTOR_STORE_DIR, namespace)
    
    # Store using FAISS or custom fallback
    if HAS_FAISS:
        try:
            db = FAISS.from_documents(chunks, embeddings)
            db.save_local(folder_path)
            logger.info(f"Vector store saved using FAISS to {folder_path}")
        except Exception as e:
            logger.error(f"FAISS save failed: {e}. Falling back to SimpleVectorStore.")
            db = SimpleVectorStore(embeddings)
            db.add_documents(chunks)
            db.save_local(folder_path)
    else:
        db = SimpleVectorStore(embeddings)
        db.add_documents(chunks)
        db.save_local(folder_path)
        
    return chunks_count, chunks_count # each chunk is embedded once


def search_vector_store(
    namespace: str,
    query: str,
    embedding_provider: str = "local",
    api_key: Optional[str] = None,
    k: int = 5
) -> List[Dict[str, Any]]:
    """Searches the indexed database and returns list of source chunks with scores."""
    folder_path = os.path.join(settings.VECTOR_STORE_DIR, namespace)
    if not os.path.exists(folder_path):
        logger.warning(f"Vector store folder not found: {folder_path}")
        return []
        
    embeddings = get_embedding_model(embedding_provider, api_key)
    
    # Try loading FAISS, fallback to SimpleVectorStore
    docs_with_scores = []
    if HAS_FAISS:
        try:
            # FAISS expects allow_dangerous_deserialization for pickle loading
            db = FAISS.load_local(folder_path, embeddings, allow_dangerous_deserialization=True)
            docs_with_scores = db.similarity_search_with_score(query, k=k)
        except Exception as e:
            logger.error(f"FAISS load failed: {e}. Trying SimpleVectorStore load.")
            db = SimpleVectorStore.load_local(folder_path, embeddings)
            docs_with_scores = db.similarity_search_with_score(query, k=k)
    else:
        db = SimpleVectorStore.load_local(folder_path, embeddings)
        docs_with_scores = db.similarity_search_with_score(query, k=k)
        
    results = []
    for doc, score in docs_with_scores:
        results.append({
            "page_content": doc.page_content,
            "source": doc.metadata.get("source", "Unknown"),
            "title": doc.metadata.get("title", "Untitled Page"),
            "score": float(score)
        })
        
    return results
