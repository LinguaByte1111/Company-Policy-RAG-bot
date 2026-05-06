import os
import shutil
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from chain import build_chain
from ingest import (
    collection_exists,
    embed_and_store,
    get_vectorstore,
    load_pdf,
    split_documents,
)

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
POLICIES_DIR = "data/policies"
os.makedirs(POLICIES_DIR, exist_ok=True)

state = {
    "chain": None,
    "retriever": None,
    "doc_name": None,
    "chunk_count": 0,
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    if collection_exists() and GROQ_API_KEY:
        logger.info("Existing ChromaDB found — loading chain on startup.")
        vs = get_vectorstore()
        chain, retriever = build_chain(vs)
        state["chain"] = chain
        state["retriever"] = retriever
        state["doc_name"] = "Previously uploaded policy"
    yield

app = FastAPI(
    title="Company Policy RAG Bot",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

class AnswerResponse(BaseModel):
    answer: str
    sources: list[str]
    latency_ms: int

class StatusResponse(BaseModel):
    policy_loaded: bool
    doc_name: Optional[str]
    chunk_count: int

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/status", response_model=StatusResponse)
def status():
    return StatusResponse(
        policy_loaded=state["chain"] is not None,
        doc_name=state["doc_name"],
        chunk_count=state["chunk_count"],
    )

@app.post("/upload")
async def upload_policy(file: UploadFile = File(...)):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured.")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    save_path = os.path.join(POLICIES_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        t0 = time.time()
        raw_docs = load_pdf(save_path)
        chunks = split_documents(raw_docs)
        vs = embed_and_store(chunks)
        elapsed = round((time.time() - t0) * 1000)

        chain, retriever = build_chain(vs)
        state["chain"] = chain
        state["retriever"] = retriever
        state["doc_name"] = file.filename
        state["chunk_count"] = len(chunks)

        return {
            "message": "Policy ingested successfully.",
            "filename": file.filename,
            "pages": len(raw_docs),
            "chunks": len(chunks),
            "ingestion_ms": elapsed,
        }
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(body: QuestionRequest):
    if state["chain"] is None:
        raise HTTPException(status_code=400, detail="No policy uploaded yet.")
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        t0 = time.time()

        source_docs = state["retriever"].invoke(body.question)
        answer = state["chain"].invoke(body.question)
        latency = int((time.time() - t0) * 1000)

        sources = []
        seen = set()
        for doc in source_docs:
            meta = doc.metadata
            label = f"{meta.get('source', 'Policy')} — Page {meta.get('page', '?')}"
            if label not in seen:
                seen.add(label)
                sources.append(label)

        return AnswerResponse(
            answer=answer,
            sources=sources,
            latency_ms=latency,
        )
    except Exception as e:
        logger.error(f"Q&A failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate answer: {str(e)}")