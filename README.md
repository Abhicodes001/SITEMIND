# 🌐 SiteMind AI

> **Chat with any website using AI.**  
> SiteMind AI transforms any website into an intelligent knowledge base, allowing users to ask natural language questions and receive accurate, source-grounded answers.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-yellow?logo=python)
![License](https://img.shields.io/badge/License-MIT-success)

---

##  Overview

Finding information on large websites can be frustrating. Search bars often miss relevant content, and manually browsing multiple pages is time-consuming.

**SiteMind AI** solves this by crawling a website, extracting meaningful content, building a Retrieval-Augmented Generation (RAG) knowledge base, and allowing users to chat with the website using natural language.

Instead of searching page by page, simply ask questions like:

> *"What services does this company offer?"*

> *"Summarize this documentation."*

> *"How do I integrate their API?"*

The AI answers **only using the website's content**, reducing hallucinations and providing reliable responses with source references.

---

#  Features

###  Website Crawling
- Crawl an entire website recursively
- Intelligent internal link discovery
- Configurable crawl depth
- Duplicate page detection

###  Smart Content Extraction
- Removes:
  - Navigation bars
  - Headers & Footers
  - Advertisements
  - Scripts & Styles
  - Popups
- Extracts only meaningful textual information

###  Intelligent Chunking
- Semantic text chunking
- Context preservation
- Optimized chunk sizes
- Metadata generation

### Vector Search (RAG)
- High-quality embeddings
- Semantic similarity search
- Fast document retrieval
- Context-aware search

### AI Chat
- Natural conversations
- Multi-turn memory
- Context-aware answers
- Source citations
- No hallucinations

###  Authentication
- User Login
- Signup
- Secure sessions
- Personal chat history

###  Chat History
- Save conversations
- Resume previous chats
- Delete conversations
- Search previous sessions

###  Modern UI
- Responsive Design
- Dark / Light Theme
- Smooth animations
- Premium SaaS experience
- Mobile Friendly

---

#  Architecture

```
              Website URL
                    │
                    ▼
          Website Crawler
                    │
                    ▼
      Smart Content Extractor
                    │
                    ▼
          Text Chunking Engine
                    │
                    ▼
            Embedding Model
                    │
                    ▼
             Vector Database
                    │
                    ▼
          Semantic Retrieval
                    │
                    ▼
            Large Language Model
                    │
                    ▼
              AI Response
```

---

#  Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- ShadCN UI
- Framer Motion

## Backend

- FastAPI
- Python
- BeautifulSoup4
- Crawl4AI
- LangChain

## AI

- Groq
- OpenAI
- Gemini
- OpenRouter
- FastEmbed

## Database

- Supabase
- PostgreSQL
- pgvector

---

#  How It Works

## Step 1

Enter any website URL.

```
https://example.com
```

---

## Step 2

SiteMind crawls every important page.

```
Homepage
│
├── About
├── Pricing
├── Blog
├── Documentation
└── Contact
```

---

## Step 3

Content is cleaned.

```
❌ Navigation
❌ Ads
❌ Footer
❌ Scripts

✅ Useful Content
```

---

## Step 4

Text is divided into semantic chunks.

```
Page

↓

Chunk 1

↓

Chunk 2

↓

Chunk 3
```

---

## Step 5

Embeddings are generated.

```
Text

↓

Embedding Model

↓

Vector Representation
```

---

## Step 6

Chunks are stored in a vector database.

```
Vector DB

↓

Semantic Search
```

---

## Step 7

Ask questions.

```
"What products do they sell?"

↓

Relevant Chunks Retrieved

↓

LLM

↓

Accurate Answer
```

---

#  Example Questions

- What services does this company provide?
- Summarize the homepage.
- How can I contact support?
- Explain their pricing.
- What technologies are used?
- Give me a quick overview.
- What are the latest blog posts?
- Explain this documentation.
- What is their refund policy?

---

#  Project Structure

```
SiteMind-AI/

├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── assets/
│
├── backend/
│   ├── api/
│   ├── crawler/
│   ├── rag/
│   ├── embeddings/
│   ├── services/
│   └── utils/
│
├── database/
│
├── docs/
│
├── README.md
│
└── requirements.txt
```

---

# Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/sitemind-ai.git
cd sitemind-ai
```

---

## Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Environment Variables

Create a `.env` file.

```env
GROQ_API_KEY=

OPENAI_API_KEY=

GEMINI_API_KEY=

SUPABASE_URL=

SUPABASE_KEY=

DATABASE_URL=
```

---

# Future Enhancements

- PDF Upload Support
- Website Comparison
- Multi-Website Chat
- Image Understanding (VLM)
- Voice Chat
- Browser Extension
- API Access
- Team Workspaces
- Shareable Knowledge Bases
- Enterprise Dashboard

---

# Use Cases

- Students
- Researchers
- Developers
- Businesses
- Customer Support
- Technical Documentation
- Product Research
- Company Analysis
- Educational Websites

---

# 📸 Screenshots

Coming Soon...

---

#  Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

#  License

This project is licensed under the MIT License.

---

#  Author

**Abhishek M Nair**

Final Year B.Tech CSE (AI & ML)

Passionate about Artificial Intelligence, Machine Learning, Full Stack Development, and building impactful AI products.

---

⭐ **If you found this project useful, consider giving it a star!**
