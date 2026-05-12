import os
import fitz
from typing import List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import CohereEmbeddings

CHROMA_DIR = "./chroma_db"
COLLECTION_NAME = "policy_docs"

def load_pdf(file_path: str) -> List[Document]:
    doc = fitz.open(file_path)
    documents = []
    filename = os.path.basename(file_path)
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        if not text:
            continue
        documents.append(Document(
            page_content=text,
            metadata={
                "source": filename,
                "page": page_num,
                "total_pages": len(doc),
            },
        ))
    doc.close()
    return documents

def split_documents(documents: List[Document]) -> List[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=80,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_documents(documents)

def get_embeddings():
    return CohereEmbeddings(
        cohere_api_key=os.getenv("COHERE_API_KEY"),
        model="embed-english-light-v3.0"
    )

def embed_and_store(docs: List[Document]) -> Chroma:
    embeddings = get_embeddings()
    vectorstore = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=CHROMA_DIR,
        collection_name=COLLECTION_NAME,
    )
    print(f"[ingest] Stored {len(docs)} chunks in ChromaDB")
    return vectorstore

def get_vectorstore() -> Chroma:
    embeddings = get_embeddings()
    return Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=embeddings,
        collection_name=COLLECTION_NAME,
    )

def collection_exists() -> bool:
    return os.path.isdir(CHROMA_DIR) and bool(os.listdir(CHROMA_DIR))