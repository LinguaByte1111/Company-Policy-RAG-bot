import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

const styles = {
  zone: (drag) => ({
    border: `2px dashed ${drag ? "var(--accent)" : "var(--border)"}`,
    borderRadius: "var(--radius)",
    background: drag ? "rgba(37,99,235,0.06)" : "var(--surface)",
    padding: "48px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    textAlign: "center",
  }),
  icon: (drag) => ({
    color: drag ? "var(--accent)" : "var(--text-sub)",
    transition: "color 0.2s",
  }),
  label: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text)",
  },
  sub: {
    fontSize: 13,
    color: "var(--text-sub)",
  },
  progress: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  bar: (pct) => ({
    height: 6,
    background: "var(--border)",
    borderRadius: 99,
    overflow: "hidden",
    position: "relative",
  }),
  fill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "var(--accent)",
    borderRadius: 99,
    transition: "width 0.3s ease",
  }),
  stat: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "var(--text-sub)",
    fontFamily: "var(--mono)",
  },
  success: {
    padding: "14px 18px",
    background: "rgba(35,134,54,0.12)",
    border: "1px solid rgba(35,134,54,0.3)",
    borderRadius: "var(--radius-sm)",
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 14,
    color: "#3fb950",
  },
};

export default function UploadPanel({ onUploadComplete }) {
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = useCallback(async (file) => {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);

    // Simulate progress ticks while awaiting server
    const ticker = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 85));
    }, 400);

    try {
      const API = process.env.REACT_APP_API_URL || "";
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      clearInterval(ticker);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      const data = await res.json();
      setProgress(100);
      setResult(data);
      setTimeout(() => onUploadComplete(data), 600);
    } catch (e) {
      clearInterval(ticker);
      setError(e.message);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  }, [onUploadComplete]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {!uploading && !result && (
        <div
          style={styles.zone(drag)}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <UploadCloud size={40} style={styles.icon(drag)} />
          <span style={styles.label}>Drop your policy PDF here</span>
          <span style={styles.sub}>or click to browse · PDF only</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {uploading && (
        <div style={{ ...styles.zone(false), gap: 20 }}>
          <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
          <div style={styles.progress}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-sub)" }}>
              <span>Ingesting document…</span>
              <span style={{ fontFamily: "var(--mono)" }}>{progress}%</span>
            </div>
            <div style={styles.bar()}>
              <div style={styles.fill(progress)} />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
              Parsing PDF → chunking → generating embeddings → storing in ChromaDB
            </p>
          </div>
        </div>
      )}

      {result && (
        <div style={styles.success}>
          <FileText size={18} />
          <div>
            <div style={{ fontWeight: 600 }}>{result.filename}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {result.pages} pages · {result.chunks} chunks · {result.ingestion_ms}ms
            </div>
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 13, color: "var(--danger)", textAlign: "center" }}>
          ⚠ {error}
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
