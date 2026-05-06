import React, { useState } from "react";

export default function RatingBar({ onDismiss }) {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (val) => {
    setRating(val);
    setSubmitted(true);
    setTimeout(onDismiss, 2000);
  };

  if (submitted) {
    return (
      <div style={bar}>
        ⭐ Thanks for rating {rating}/5!
      </div>
    );
  }

  return (
    <div style={bar}>
      <span>Rate your experience:</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={() => handleRate(n)}
          style={{ cursor: "pointer", fontSize: 24, color: n <= rating ? "#f59e0b" : "#444" }}
          onMouseEnter={() => setRating(n)}
        >
          ★
        </span>
      ))}
      <button onClick={onDismiss} style={{ background: "none", border: "none", color: "#888", cursor: "pointer" }}>✕</button>
    </div>
  );
}

const bar = {
  position: "fixed",
  bottom: 90,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#1c2128",
  border: "1px solid #30363d",
  borderRadius: 10,
  padding: "12px 20px",
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 14,
  color: "#e6edf3",
  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  zIndex: 999,
};