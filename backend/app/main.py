import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import crawl, chat, analytics

# Configure logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("sitemind")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for crawling websites, semantic indexing (RAG), and generative chat.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins in dev mode
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(crawl.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
