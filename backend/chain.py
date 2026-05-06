import os
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

QA_PROMPT = PromptTemplate.from_template(
    """You are a helpful Company Policy Assistant.
You are given excerpts from a company policy document.
Answer the question as helpfully as possible based on the excerpts.
If the excerpts contain relevant information, use it to answer.
If the excerpts truly do not contain relevant information, say:
"I couldn't find a specific policy on this. Please check with HR."

Always be helpful and extract any relevant information from the excerpts.

Policy Excerpts:
{context}

Question: {question}

Answer:"""
)

def format_docs(docs):
    formatted = []
    for doc in docs:
        page = doc.metadata.get('page', '?')
        content = doc.page_content.strip()
        formatted.append(f"[Page {page}]\n{content}")
    return "\n\n".join(formatted)

def build_chain(vectorstore):
    retriever = vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 4},
    )

    llm = ChatGroq(
        model="llama-3.1-8b-instant",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY"),
    )

    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | QA_PROMPT
        | llm
        | StrOutputParser()
    )

    return chain, retriever