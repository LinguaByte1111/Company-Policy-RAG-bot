import React, { useState, useCallback, useEffect } from "react";
import { Send, RefreshCw, Cpu } from "lucide-react";
import UploadPanel from "./components/UploadPanel";
import ChatWindow from "./components/ChatWindow";
import RatingBar from "./components/RatingBar";

const SAMPLE_QUESTIONS = [
  "What is the policy on accepting gifts from vendors?",
  "What should I do if I witness misconduct?",
  "How should conflicts of interest be handled?",
  "What are the consequences of violating the code of ethics?",
];

export default function App() {
  const [screen, setScreen] = useState("upload");
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [docMeta, setDocMeta] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [showRating, setShowRating] = useState(false);

  // Check if policy already loaded on server
  useEffect(() => {
    fetch("/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.policy_loaded) {
          setDocMeta(data);
          setScreen("chat");
          setMessages([{ role: "bot", text: `✅ Loaded: ${data.doc_name}\n\nAsk me anything about this policy.` }]);
        }
      })
      .catch(() => {});
  }, []);

  const handleUploadComplete = useCallback((data) => {
    setDocMeta(data);
    setScreen("chat");
    setQuestionCount(0);
    setMessages([{
      role: "bot",
      text: `✅ ${data.filename} ingested!\n\n📄 ${data.pages} pages → ${data.chunks} chunks stored.\n\nAsk me anything about this policy.`,
    }]);
  }, []);

  const sendQuestion = useCallback(async (q) => {
    const text = (q || question).trim();
    if (!text || loading) return;

    setQuestion("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessages((prev) => [...prev, { role: "bot", typing: true }]);

    try {
      const res = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to get answer.");
      }

      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "bot", text: data.answer, sources: data.sources, latency_ms: data.latency_ms },
      ]);

      const newCount = questionCount + 1;
      setQuestionCount(newCount);
      if (newCount % 5 === 0) setShowRating(true);

    } catch (e) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "bot", text: `⚠ ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [question, loading, questionCount]);

  const resetToUpload = () => {
    setScreen("upload");
    setMessages([]);
    setDocMeta(null);
    setQuestionCount(0);
    setShowRating(false);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56,
        borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Cpu size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>PolicyBot</span>
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", background: "rgba(37,99,235,0.15)", color: "#6ea8fe", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 4, padding: "2px 6px" }}>
            RAG
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {docMeta && (
            <span style={{ fontSize: 12, color: "var(--text-sub)", fontFamily: "var(--mono)" }}>
              {docMeta.filename || docMeta.doc_name}
            </span>
          )}
          {screen === "chat" && (
            <button onClick={resetToUpload} style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 6,
              color: "var(--text-sub)", padding: "4px 10px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5, fontSize: 12,
            }}>
              <RefreshCw size={12} /> New Policy
            </button>
          )}
        </div>
      </header>

      {/* Upload Screen */}
      {screen === "upload" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Company Policy Q&amp;A Bot</h1>
              <p style={{ color: "var(--text-sub)", fontSize: 14 }}>
                Upload any HR, IT, or compliance PDF and ask questions in plain English.
              </p>
            </div>
            <UploadPanel onUploadComplete={handleUploadComplete} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {["LangChain", "ChromaDB", "Groq", "FastAPI", "React"].map((t) => (
                <span key={t} style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 8px" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Screen */}
      {screen === "chat" && (
        <>
          <ChatWindow messages={messages} />

          {/* Sample questions — only show at start */}
          {messages.length <= 1 && (
            <div style={{ padding: "0 20px 12px", display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendQuestion(q)} style={{
                  fontSize: 12, padding: "5px 11px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 99, color: "var(--text-sub)", cursor: "pointer",
                }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 6px 6px 14px" }}>
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendQuestion()}
                placeholder="Ask about company policy…"
                disabled={loading}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 14 }}
              />
              <button
                onClick={() => sendQuestion()}
                disabled={loading || !question.trim()}
                style={{
                  background: "var(--accent)", border: "none", borderRadius: 7,
                  width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: loading || !question.trim() ? "not-allowed" : "pointer",
                  opacity: loading || !question.trim() ? 0.5 : 1, flexShrink: 0,
                }}
              >
                <Send size={15} color="#fff" />
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 8 }}>
              Answers grounded in uploaded document · Source pages shown below each response
            </p>
          </div>
        </>
      )}

      {/* Rating bar — shows after every 5 questions */}
      {showRating && <RatingBar onDismiss={() => setShowRating(false)} />}

    </div>
  );
}