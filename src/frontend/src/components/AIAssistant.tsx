import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  results?: SearchResult[];
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  image?: string;
}

const SUGGESTIONS = [
  "Hello!",
  "What is AI?",
  "How do I upload a video?",
  "Who is the president of Gambia?",
  "Explain black holes simply",
  "What is the weather like today?",
  "How does HLS streaming work?",
  "What are trending topics today?",
];

function isMathExpr(s: string): boolean {
  return /^[\d+\-*/()%.\s]+$/.test(s.trim()) && s.trim().length > 1;
}

function evalMath(expr: string): string {
  try {
    const sanitized = expr.replace(/[^\d+\-*/()%.\s]/g, "");
    const result = Function(`"use strict"; return (${sanitized})`)() as number;
    if (typeof result === "number" && Number.isFinite(result))
      return String(result);
    return "Could not evaluate.";
  } catch {
    return "Invalid expression.";
  }
}

async function webSearch(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const res = await fetch(url);
    const data = await res.json();
    const results: SearchResult[] = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        title: (data.Heading as string) || query,
        link: data.AbstractURL as string,
        snippet: data.AbstractText as string,
        image: (data.Image as string) || undefined,
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const t of (data.RelatedTopics as Record<string, unknown>[]).slice(
        0,
        6,
      )) {
        if (t.Text && t.FirstURL) {
          results.push({
            title: (t.Text as string).split(" - ")[0].slice(0, 70),
            link: t.FirstURL as string,
            snippet: t.Text as string,
            image: (t.Icon as { URL?: string })?.URL || undefined,
          });
        } else if (Array.isArray(t.Topics)) {
          for (const sub of (t.Topics as Record<string, unknown>[]).slice(
            0,
            2,
          )) {
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: (sub.Text as string).slice(0, 70),
                link: sub.FirstURL as string,
                snippet: sub.Text as string,
                image: (sub.Icon as { URL?: string })?.URL || undefined,
              });
            }
          }
        }
        if (results.length >= 5) break;
      }
    }
    return results.slice(0, 5);
  } catch {
    return [];
  }
}

function buildAnswer(question: string, context: string): string {
  const q = question.toLowerCase().trim();
  if (/^(hello|hi|hey|howdy|hola|sup)/.test(q))
    return "Hello! I'm your SUB PREMIUM AI assistant. Ask me anything — I search the web, answer questions, or do math!";
  if (q.includes("upload") && (q.includes("how") || q.includes("video")))
    return "Tap the ➕ button in the bottom nav. Choose a file from your device or paste a direct video URL. Large files upload in chunks and resume automatically.";
  if (q.includes("sub premium"))
    return "SUB PREMIUM is a premium video streaming platform with HLS adaptive streaming, resumable uploads, a full account system, and real-time analytics.";
  if (context)
    return `Based on web results:\n\n${context}\n\nSee the links below for full details.`;
  if (q.includes("black hole"))
    return "A black hole is a region where gravity is so strong nothing — not even light — escapes. They form from collapsed massive stars. The boundary is the event horizon.";
  if (q.includes("weather"))
    return "I don't have live weather data. Visit weather.com or google.com/weather for current conditions.";
  return `Here are web results for "${question}" — click any link below for full details.`;
}

// Use a generic interface so TypeScript doesn't need the lib.dom SpeechRecognition type
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((e: {
        results: { [k: number]: { [k: number]: { transcript: string } } };
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecCtor = new () => SpeechRec;

function getSpeechAPI(): SpeechRecCtor | undefined {
  return (
    (window as unknown as { SpeechRecognition?: SpeechRecCtor })
      .SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: SpeechRecCtor })
      .webkitSpeechRecognition
  );
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text: q };
    setInput("");
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    if (isMathExpr(q)) {
      setMessages((p) => [
        ...p,
        { id: `ai-${Date.now()}`, role: "ai", text: `= ${evalMath(q)}` },
      ]);
      setLoading(false);
      return;
    }

    try {
      const results = await webSearch(q);
      const context = results
        .slice(0, 2)
        .map((r) => `${r.title}: ${r.snippet}`)
        .join("\n");
      const aiText = buildAnswer(q, context);
      setMessages((p) => [
        ...p,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          text: aiText,
          results: results.length ? results : undefined,
        },
      ]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: `err-${Date.now()}`,
          role: "ai",
          text: "AI not available — try again.",
        },
      ]);
    }
    setLoading(false);
  };

  const startVoice = () => {
    const API = getSpeechAPI();
    if (!API) {
      alert("Voice input not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new API();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const showSuggestions = !input.trim() && messages.length === 0;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
          style={{
            position: "fixed",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 990,
            background: "#111",
            border: "1.5px solid #333",
            color: "#fff",
            width: 46,
            height: 46,
            borderRadius: "50%",
            fontSize: 22,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
          }}
        >
          🤖
        </button>
      )}

      {/* Backdrop */}
      {open && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismissal
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 991,
            background: "rgba(0,0,0,0.45)",
          }}
        />
      )}

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "65vh",
            background: "#0b0b0b",
            borderRadius: "18px 18px 0 0",
            zIndex: 992,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.8)",
            border: "1px solid #222",
            borderBottom: "none",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 10px",
              borderBottom: "1px solid #1e1e1e",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🤖</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                AI Assistant
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "#1e3a2f",
                  color: "#4ade80",
                  padding: "2px 8px",
                  borderRadius: 20,
                  fontWeight: 600,
                }}
              >
                ONLINE
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                background: "#1a1a1a",
                border: "none",
                color: "#888",
                fontSize: 18,
                width: 30,
                height: 30,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  background: "#141414",
                  borderRadius: 12,
                  padding: "12px 14px",
                  color: "#aaa",
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: "1px solid #1e1e1e",
                }}
              >
                👋 Ask me anything — I search the web and give real answers!
              </div>
            )}

            {showSuggestions && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    color: "#555",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  Suggested
                </div>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    style={{
                      background: "#141414",
                      border: "1px solid #222",
                      color: "#ccc",
                      borderRadius: 10,
                      padding: "9px 12px",
                      textAlign: "left",
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ opacity: 0.5 }}>🔍</span> {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div
                  style={{
                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                  }}
                >
                  <div
                    style={{
                      background:
                        msg.role === "user"
                          ? "oklch(0.548 0.222 27)"
                          : "#1a1a1a",
                      color: "#fff",
                      padding: "10px 13px",
                      fontSize: 13,
                      lineHeight: 1.55,
                      borderRadius:
                        msg.role === "user"
                          ? "16px 16px 4px 16px"
                          : "16px 16px 16px 4px",
                      border: msg.role === "ai" ? "1px solid #222" : "none",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>

                {msg.role === "ai" && msg.results && msg.results.length > 0 && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div
                      style={{
                        color: "#555",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Web Results
                    </div>
                    {msg.results.map((r) => (
                      <a
                        key={r.link}
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          background: "#141414",
                          border: "1px solid #222",
                          borderRadius: 10,
                          padding: "10px 12px",
                          textDecoration: "none",
                          overflow: "hidden",
                        }}
                      >
                        {r.image && r.image.length > 5 && (
                          <img
                            src={
                              r.image.startsWith("http")
                                ? r.image
                                : `https://duckduckgo.com${r.image}`
                            }
                            alt=""
                            style={{
                              width: "100%",
                              maxHeight: 100,
                              objectFit: "cover",
                              borderRadius: 7,
                              marginBottom: 8,
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        )}
                        <div
                          style={{
                            color: "#4da3ff",
                            fontWeight: 600,
                            fontSize: 13,
                            marginBottom: 4,
                          }}
                        >
                          {r.title}
                        </div>
                        <div
                          style={{
                            color: "#888",
                            fontSize: 12,
                            lineHeight: 1.4,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {r.snippet}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#1a1a1a",
                  border: "1px solid #222",
                  borderRadius: "16px 16px 16px 4px",
                  padding: "10px 14px",
                  color: "#888",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4da3ff",
                    display: "inline-block",
                    animation: "aiPulse 1s ease-in-out infinite",
                  }}
                />
                Searching & thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px 16px",
              borderTop: "1px solid #1a1a1a",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={startVoice}
              aria-label="Voice input"
              style={{
                background: isListening ? "oklch(0.548 0.222 27)" : "#1a1a1a",
                border: "1.5px solid #333",
                color: isListening ? "#fff" : "#888",
                width: 38,
                height: 38,
                borderRadius: "50%",
                fontSize: 16,
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              🎤
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={isListening ? "Listening..." : "Ask anything..."}
              style={{
                flex: 1,
                background: "#1a1a1a",
                border: "1.5px solid #2a2a2a",
                borderRadius: 20,
                padding: "9px 14px",
                color: "#fff",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              aria-label="Send"
              style={{
                background:
                  input.trim() && !loading
                    ? "oklch(0.548 0.222 27)"
                    : "#1a1a1a",
                border: "none",
                color: input.trim() && !loading ? "#fff" : "#444",
                width: 38,
                height: 38,
                borderRadius: "50%",
                fontSize: 16,
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>
        {
          "@keyframes aiPulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.1)} }"
        }
      </style>
    </>
  );
}
