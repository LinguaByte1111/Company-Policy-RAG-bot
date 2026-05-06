import React, { useEffect, useRef } from "react";
import { BookOpen, User } from "lucide-react";

const TypingDot = ({ delay }) => (
  <span
    style={{
      display: "inline-block",
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--text-sub)",
      margin: "0 2px",
      animation: `pulse-dot 1.2s ease-in-out ${delay}s infinite`,
    }}
  />
);

function SourceBadge({ source }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontFamily: "var(--mono)",
        background: "rgba(37,99,235,0.12)",
        color: "#6ea8fe",
        border: "1px solid rgba(37,99,235,0.25)",
        borderRadius: 4,
        padding: "2px 7px",
        whiteSpace: "nowrap",
      }}
    >
      <BookOpen size={10} />
      {source}
    </span>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        gap: 10,
        alignItems: "flex-start",
        animation: "fadeUp 0.25s ease both",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: isUser ? "var(--accent)" : "var(--surface2)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {isUser
          ? <User size={15} color="#fff" />
          : <span style={{ fontSize: 14 }}>🤖</span>
        }
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            background: isUser ? "var(--user-bg)" : "var(--bot-bg)",
            border: `1px solid ${isUser ? "rgba(37,99,235,0.3)" : "var(--border)"}`,
            borderRadius: isUser ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
            padding: "10px 14px",
            fontSize: 14,
            lineHeight: 1.65,
            color: "var(--text)",
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.typing ? (
            <span>
              <TypingDot delay={0} />
              <TypingDot delay={0.2} />
              <TypingDot delay={0.4} />
            </span>
          ) : msg.text}
        </div>

        {/* Latency + Sources */}
        {(msg.sources?.length > 0 || msg.latency_ms) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
            {msg.sources?.map((s, i) => <SourceBadge key={i} source={s} />)}
            {msg.latency_ms && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)", marginLeft: 2 }}>
                {msg.latency_ms}ms
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatWindow({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {messages.map((msg, i) => (
        <Message key={i} msg={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
