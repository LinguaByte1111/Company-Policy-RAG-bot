# 🤖 PolicyBot — Company Policy RAG Q&A Bot

> Upload any company policy PDF. Ask questions in plain English. Get answers grounded in the actual document — with source page citations.

**Live tech stack:** LangChain · ChromaDB · OpenAI · FastAPI · React

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        INGESTION PIPELINE                   │
│                                                             │
│  PDF Upload → PyMuPDF Parser → RecursiveTextSplitter        │
│       → OpenAI Embeddings (ada-002) → ChromaDB (local)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       QUERY PIPELINE                        │
│                                                             │
│  User Question → Embed Query → ChromaDB Similarity Search   │
│       → Top-4 Chunks → GPT-3.5-turbo (ConversationalRAG)    │
│       → Answer + Source Pages                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         API LAYER                           │
│                                                             │
│  FastAPI  ─────  POST /upload   (PDF ingestion)             │
│                  POST /ask      (Q&A with sources)          │
│                  GET  /status   (doc metadata)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      REACT FRONTEND                         │
│                                                             │
│  Drag-and-drop PDF Upload Panel                             │
│  Real-time chat with typing indicators                      │
│  Source attribution badges (filename + page number)         │
│  Sample question chips                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Detail |
|---|---|
| **PDF Ingestion** | PyMuPDF → page-level parsing → 600-token chunks with 80-token overlap |
| **Semantic Search** | OpenAI `text-embedding-ada-002` + ChromaDB cosine similarity |
| **Conversational Memory** | `ConversationBufferMemory` — follow-up questions understand context |
| **Source Attribution** | Every answer shows the source file + exact page number |
| **Hallucination Guard** | Custom prompt instructs the LLM to answer **only** from retrieved context |
| **Multi-turn Chat** | Full conversation history preserved via LangChain memory |
| **Startup Restore** | Pre-loads existing ChromaDB collection on server restart |

---

## Project Structure

```
company-policy-rag-bot/
├── backend/
│   ├── main.py           # FastAPI app — /upload, /ask, /status endpoints
│   ├── ingest.py         # PDF loading, chunking, embedding, ChromaDB storage
│   ├── chain.py          # ConversationalRetrievalChain with custom prompts
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main shell (upload ↔ chat screens)
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx    # Message list with typing indicator
│   │   │   └── UploadPanel.jsx   # Drag-and-drop PDF upload with progress
│   │   ├── index.js
│   │   └── index.css             # Design system (CSS variables, animations)
│   └── package.json
└── data/
    └── policies/          # Uploaded PDFs stored here (git-ignored)
```

---

## Setup & Run

### Prerequisites
- Python 3.10+
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set your API key
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start the server
uvicorn main:app --reload --port 8000
```

API is now live at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
```

App opens at `http://localhost:3000`

---

## Usage

1. **Upload a policy PDF** — drag and drop or click to browse
2. Watch the ingestion pipeline run (parse → chunk → embed → store)
3. **Ask any question** in plain English
4. See the answer with **source page citations**

### Sample Questions
- *"What is the work-from-home policy?"*
- *"How many sick days am I entitled to?"*
- *"What are the rules around accepting gifts from vendors?"*
- *"What are the consequences of a data breach?"*

---

## API Reference

### `POST /upload`
Upload and ingest a PDF policy document.

**Request:** `multipart/form-data` with `file` field

**Response:**
```json
{
  "message": "✅ Policy ingested successfully.",
  "filename": "hr-policy.pdf",
  "pages": 24,
  "chunks": 187,
  "ingestion_ms": 4821
}
```

### `POST /ask`
Ask a question against the loaded policy.

**Request:**
```json
{ "question": "How many days of annual leave do I get?" }
```

**Response:**
```json
{
  "answer": "Full-time employees are entitled to 20 days of annual leave per year...",
  "sources": ["hr-policy.pdf — Page 7", "hr-policy.pdf — Page 8"],
  "latency_ms": 1243
}
```

### `GET /status`
Check if a policy is loaded.

**Response:**
```json
{
  "policy_loaded": true,
  "doc_name": "hr-policy.pdf",
  "chunk_count": 187
}
```

---

## How RAG Works (for interviews)

**Retrieval-Augmented Generation** solves the problem of LLMs making things up by grounding their answers in real documents:

1. **Ingestion** — The PDF is parsed and split into overlapping chunks (~600 tokens each)
2. **Embedding** — Each chunk is converted to a high-dimensional vector using OpenAI's embedding model
3. **Storage** — Vectors are stored in ChromaDB, a local vector database
4. **Query** — When a user asks a question, it's also embedded and the top-4 most similar chunks are retrieved
5. **Generation** — The LLM receives the question + retrieved chunks and generates a grounded answer
6. **Attribution** — The source document and page number for each chunk is returned alongside the answer

---

## CV Bullets

```
• Built a production-style RAG chatbot using LangChain and ChromaDB vector
  database, enabling semantic Q&A over company policy PDFs with page-level
  source attribution.

• Designed an end-to-end document ingestion pipeline: PDF parsing (PyMuPDF),
  recursive text chunking, OpenAI embedding generation, and ChromaDB vector
  storage — processing 24-page documents in under 5 seconds.

• Integrated ConversationalRetrievalChain with ConversationBufferMemory,
  enabling contextual multi-turn dialogue grounded in retrieved policy sections.

• Implemented custom LangChain prompts to prevent hallucination, instructing
  the LLM to answer exclusively from retrieved context with explicit fallback
  messaging when the policy doesn't cover a topic.

• Exposed the RAG pipeline as FastAPI REST endpoints (/upload, /ask, /status)
  and built a React + CSS chat interface with drag-and-drop upload, real-time
  typing indicators, and source citation badges.
```

---

## License

MIT
