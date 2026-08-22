import os
import json
import math
import re
import logging
import numpy as np
from collections import Counter
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


class BM25Store:
    """Lightweight Okapi BM25 index for sparse keyword search."""
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: List[Document] = []
        self.corpus_size = 0
        self.avgdl = 0.0
        self.doc_freqs: List[Counter] = []
        self.doc_len: List[int] = []
        self.idf: Dict[str, float] = {}

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\w+', text.lower())

    def fit(self, documents: List[Document]):
        self.documents = documents
        self.corpus_size = len(documents)
        if self.corpus_size == 0:
            return

        self.doc_len = []
        self.doc_freqs = []
        df = Counter()

        for doc in documents:
            tokens = self._tokenize(doc.page_content)
            self.doc_len.append(len(tokens))
            freqs = Counter(tokens)
            self.doc_freqs.append(freqs)
            for token in freqs:
                df[token] += 1

        self.avgdl = sum(self.doc_len) / self.corpus_size if self.corpus_size > 0 else 0.0

        for word, freq in df.items():
            self.idf[word] = math.log((self.corpus_size - freq + 0.5) / (freq + 0.5) + 1.0)

    def search(self, query: str, k: int = 10) -> List[Tuple[Document, float]]:
        if not self.documents or self.corpus_size == 0:
            return []

        query_tokens = self._tokenize(query)
        scores = np.zeros(self.corpus_size)

        for token in query_tokens:
            if token not in self.idf:
                continue
            idf = self.idf[token]
            for idx, freqs in enumerate(self.doc_freqs):
                tf = freqs[token]
                if tf > 0:
                    doc_len = self.doc_len[idx]
                    denom = tf + self.k1 * (1 - self.b + self.b * (doc_len / self.avgdl))
                    scores[idx] += idf * (tf * (self.k1 + 1)) / denom

        top_indices = np.argsort(scores)[::-1][:k]
        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                results.append((self.documents[idx], float(scores[idx])))
        return results

    def save_local(self, folder_path: str):
        os.makedirs(folder_path, exist_ok=True)
        docs_data = [
            {"page_content": doc.page_content, "metadata": doc.metadata}
            for doc in self.documents
        ]
        with open(os.path.join(folder_path, "bm25_docs.json"), "w", encoding="utf-8") as f:
            json.dump(docs_data, f, ensure_ascii=False, indent=2)

    @classmethod
    def load_local(cls, folder_path: str) -> "BM25Store":
        bm25 = cls()
        docs_path = os.path.join(folder_path, "bm25_docs.json")
        if os.path.exists(docs_path):
            try:
                with open(docs_path, "r", encoding="utf-8") as f:
                    docs_data = json.load(f)
                docs = [Document(page_content=d["page_content"], metadata=d["metadata"]) for d in docs_data]
                bm25.fit(docs)
            except Exception as e:
                logger.error(f"Failed to load BM25 store from {docs_path}: {e}")
        return bm25


def reciprocal_rank_fusion(
    dense_results: List[Tuple[Document, float]],
    sparse_results: List[Tuple[Document, float]],
    k_rrf: int = 60,
    top_n: int = 5
) -> List[Tuple[Document, float]]:
    """Combines rankings from dense vector search and BM25 sparse search using Reciprocal Rank Fusion."""
    scores: Dict[str, float] = {}
    doc_map: Dict[str, Document] = {}

    def get_doc_key(doc: Document) -> str:
        parent_id = doc.metadata.get("parent_id")
        if parent_id:
            return str(parent_id)
        return f"{doc.metadata.get('source', '')}:{doc.page_content[:100]}"

    for rank, (doc, _) in enumerate(dense_results):
        key = get_doc_key(doc)
        doc_map[key] = doc
        scores[key] = scores.get(key, 0.0) + (1.0 / (k_rrf + rank + 1))

    for rank, (doc, _) in enumerate(sparse_results):
        key = get_doc_key(doc)
        doc_map[key] = doc
        scores[key] = scores.get(key, 0.0) + (1.0 / (k_rrf + rank + 1))

    sorted_keys = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[:top_n]
    return [(doc_map[k], scores[k]) for k in sorted_keys]


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
                model_name = getattr(settings, "DEFAULT_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
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
    """Splits crawled text using Parent-Child chunking and indexes it in vector store & BM25 index."""
    logger.info(f"Building hybrid vector store with parent-child chunking for namespace: {namespace}")
    
    parent_chunk_size = getattr(settings, "DEFAULT_PARENT_CHUNK_SIZE", 1200)
    parent_chunk_overlap = getattr(settings, "DEFAULT_PARENT_CHUNK_OVERLAP", 200)
    child_chunk_size = getattr(settings, "DEFAULT_CHILD_CHUNK_SIZE", 400)
    child_chunk_overlap = getattr(settings, "DEFAULT_CHILD_CHUNK_OVERLAP", 50)
    
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=parent_chunk_size,
        chunk_overlap=parent_chunk_overlap,
        length_function=len
    )
    
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=child_chunk_size,
        chunk_overlap=child_chunk_overlap,
        length_function=len
    )
    
    child_chunks: List[Document] = []
    
    for url, data in crawl_results.items():
        doc = Document(
            page_content=data["text"],
            metadata={"source": url, "title": data["title"]}
        )
        
        # 1. Generate Parent Chunks
        parent_docs = parent_splitter.split_documents([doc])
        
        for p_idx, p_doc in enumerate(parent_docs):
            parent_id = f"{url}#p{p_idx}"
            parent_text = p_doc.page_content
            
            # 2. Generate Child Chunks from Parent Chunk
            child_docs = child_splitter.split_documents([p_doc])
            for c_doc in child_docs:
                c_doc.metadata.update({
                    "parent_id": parent_id,
                    "parent_content": parent_text,
                    "source": url,
                    "title": data["title"]
                })
                child_chunks.append(c_doc)
                
    chunks_count = len(child_chunks)
    logger.info(f"Generated {chunks_count} child chunks from {len(crawl_results)} pages.")
    
    embeddings = get_embedding_model(embedding_provider, api_key)
    folder_path = os.path.join(settings.VECTOR_STORE_DIR, namespace)
    
    # Store child vectors in FAISS or SimpleVectorStore
    if HAS_FAISS:
        try:
            db = FAISS.from_documents(child_chunks, embeddings)
            db.save_local(folder_path)
            logger.info(f"Child vector store saved using FAISS to {folder_path}")
        except Exception as e:
            logger.error(f"FAISS save failed: {e}. Falling back to SimpleVectorStore.")
            db = SimpleVectorStore(embeddings)
            db.add_documents(child_chunks)
            db.save_local(folder_path)
    else:
        db = SimpleVectorStore(embeddings)
        db.add_documents(child_chunks)
        db.save_local(folder_path)
        
    # Build & save BM25 sparse index for Hybrid Search
    bm25 = BM25Store()
    bm25.fit(child_chunks)
    bm25.save_local(folder_path)
    
    return chunks_count, chunks_count


def search_vector_store(
    namespace: str,
    query: str,
    embedding_provider: str = "local",
    api_key: Optional[str] = None,
    k: int = 5
) -> List[Dict[str, Any]]:
    """Performs Hybrid Search (Dense Vector + BM25 Sparse) with Parent-Child context retrieval."""
    folder_path = os.path.join(settings.VECTOR_STORE_DIR, namespace)
    if not os.path.exists(folder_path):
        logger.warning(f"Vector store folder not found: {folder_path}")
        return []
        
    embeddings = get_embedding_model(embedding_provider, api_key)
    search_k = k * 2  # Retrieve extra candidates for rank fusion & parent deduplication
    
    # 1. Dense Vector Search
    dense_results: List[Tuple[Document, float]] = []
    if HAS_FAISS:
        try:
            db = FAISS.load_local(folder_path, embeddings, allow_dangerous_deserialization=True)
            dense_results = db.similarity_search_with_score(query, k=search_k)
        except Exception as e:
            logger.error(f"FAISS load failed: {e}. Trying SimpleVectorStore load.")
            db = SimpleVectorStore.load_local(folder_path, embeddings)
            dense_results = db.similarity_search_with_score(query, k=search_k)
    else:
        db = SimpleVectorStore.load_local(folder_path, embeddings)
        dense_results = db.similarity_search_with_score(query, k=search_k)
        
    # 2. Sparse BM25 Search (if enabled)
    sparse_results: List[Tuple[Document, float]] = []
    if getattr(settings, "ENABLE_HYBRID_SEARCH", True):
        bm25 = BM25Store.load_local(folder_path)
        sparse_results = bm25.search(query, k=search_k)
        
    # 3. Combine with Reciprocal Rank Fusion if both are present
    if sparse_results and dense_results:
        fused_docs_with_scores = reciprocal_rank_fusion(dense_results, sparse_results, k_rrf=60, top_n=k)
    else:
        fused_docs_with_scores = dense_results[:k]
        
    # 4. Extract parent context (if Parent-Child enabled) & build response
    results = []
    seen_parents = set()
    
    for doc, score in fused_docs_with_scores:
        parent_id = doc.metadata.get("parent_id")
        parent_content = doc.metadata.get("parent_content")
        
        # Deduplicate identical parent chunks if parent_id exists
        if parent_id and parent_id in seen_parents:
            continue
        if parent_id:
            seen_parents.add(parent_id)
            
        # Use full parent context for LLM if available, else child chunk content
        content = parent_content if parent_content else doc.page_content
        
        results.append({
            "page_content": content,
            "snippet": doc.page_content,
            "source": doc.metadata.get("source", "Unknown"),
            "title": doc.metadata.get("title", "Untitled Page"),
            "score": float(score)
        })
        
    return results[:k]
