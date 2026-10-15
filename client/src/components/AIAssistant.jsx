import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  Code2,
  Copy,
  CornerDownLeft,
  FileCode,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { fetchAIStatus, isBackendConfigured, sendAIChatRequest } from "../lib/socket.js";

const QUICK_ACTIONS = [
  { id: "explain", label: "Explain", icon: Zap, prompt: "Explain how this code works, its key components, and any edge cases." },
  { id: "debug", label: "Find Bugs", icon: AlertCircle, prompt: "Review this code for potential bugs, logical errors, edge cases, and security vulnerabilities." },
  { id: "optimize", label: "Optimize", icon: Sparkles, prompt: "Optimize this code for better performance, memory efficiency, and idiomatic readability." },
  { id: "test", label: "Write Tests", icon: Code2, prompt: "Write comprehensive unit tests for this code covering typical and boundary cases." },
];

const INITIAL_SUGGESTIONS = [
  "How does this code handle edge cases?",
  "What is the time complexity of this implementation?",
  "Refactor this to be more modular and maintainable.",
  "Add docstrings and TypeScript types.",
];

export default function AIAssistant({
  activeCode = "",
  activeLanguage = "javascript",
  onApplyCode,
  roomId = "",
  onClose,
}) {
  const storageKey = `codesync:chat:${roomId || "default"}`;
  const [messages, setMessages] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [appliedIndex, setAppliedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (e) {
      console.warn("Unable to save chat history to sessionStorage", e);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    let disposed = false;
    async function checkStatus() {
      if (!isBackendConfigured()) {
        if (!disposed) setAiStatus("unconfigured");
        return;
      }
      const res = await fetchAIStatus();
      if (disposed) return;
      if (res.configured) {
        setAiStatus("ready");
      } else if (res.status === "offline") {
        setAiStatus("offline");
      } else {
        setAiStatus("unconfigured");
      }
    }
    void checkStatus();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  async function handleSend(customPrompt, customAction = "chat") {
    const textToSend = (customPrompt ?? prompt).trim();
    if (!textToSend && !activeCode) return;
    if (loading) return;

    setErrorMessage("");
    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: "user",
      content: textToSend || `[${customAction.toUpperCase()}] Current file`,
      action: customAction,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await sendAIChatRequest({
        prompt: textToSend,
        code: activeCode,
        language: activeLanguage,
        action: customAction,
        history: messages,
        signal: controller.signal,
      });

      const assistantMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: "assistant",
        content: response.text,
        action: customAction,
        model: response.model,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      if (error.name === "AbortError") {
        setErrorMessage("Request canceled.");
      } else {
        const errorText = error.message || "Unable to get a response from the AI assistant.";
        setErrorMessage(errorText);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "error",
            content: errorText,
            timestamp: Date.now(),
          },
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
      textareaRef.current?.focus();
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([]);
    setErrorMessage("");
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  async function copyToClipboard(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1800);
    } catch (e) {
      console.warn("Unable to copy code", e);
    }
  }

  function applyCodeToEditor(codeToApply, index) {
    if (typeof onApplyCode === "function") {
      onApplyCode(codeToApply);
      setAppliedIndex(index);
      setTimeout(() => setAppliedIndex(null), 2000);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey || !event.shiftKey)) {
      event.preventDefault();
      void handleSend();
    }
  }

  // Parse markdown code blocks
  function renderFormattedMessage(content, msgId) {
    if (!content) return null;
    const parts = [];
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let codeIndex = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const beforeText = content.slice(lastIndex, match.index);
      if (beforeText) {
        parts.push(
          <div className="message-prose" key={`text-${msgId}-${lastIndex}`}>
            {beforeText.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        );
      }

      const lang = match[1] || "code";
      const snippet = match[2].trim();
      const currentBlockId = `${msgId}-code-${codeIndex++}`;

      parts.push(
        <div className="ai-code-block" key={currentBlockId}>
          <div className="ai-code-header">
            <span className="ai-code-lang">{lang}</span>
            <div className="ai-code-actions">
              <button
                className="ai-action-btn"
                onClick={() => copyToClipboard(snippet, currentBlockId)}
                title="Copy code to clipboard"
                type="button"
              >
                {copiedIndex === currentBlockId ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedIndex === currentBlockId ? "Copied" : "Copy"}</span>
              </button>
              {typeof onApplyCode === "function" && (
                <button
                  className="ai-action-btn ai-apply-btn"
                  onClick={() => applyCodeToEditor(snippet, currentBlockId)}
                  title="Replace or apply code into current editor"
                  type="button"
                >
                  {appliedIndex === currentBlockId ? <Check size={12} /> : <FileCode size={12} />}
                  <span>{appliedIndex === currentBlockId ? "Applied!" : "Insert into Editor"}</span>
                </button>
              )}
            </div>
          </div>
          <pre className="ai-code-pre">
            <code>{snippet}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.slice(lastIndex);
    if (remainingText) {
      parts.push(
        <div className="message-prose" key={`text-${msgId}-${lastIndex}`}>
          {remainingText.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      );
    }

    return parts;
  }

  return (
    <aside aria-label="AI coding assistant" className="assistant-pane premium-assistant">
      <div className="assistant-heading">
        <div className="assistant-title">
          <span className="assistant-heading-icon">
            <Sparkles size={15} />
          </span>
          <div>
            <b>AI Assistant</b>
            <span>Code analysis & generation</span>
          </div>
        </div>
        <div className="assistant-header-tools">
          <span
            className={`ai-status-pill status-${aiStatus}`}
            title={
              aiStatus === "ready"
                ? "Connected to Gemini AI"
                : aiStatus === "unconfigured"
                  ? "GEMINI_API_KEY is not configured on server"
                  : "Backend offline"
            }
          >
            {aiStatus === "ready" ? "Online" : aiStatus === "unconfigured" ? "API Key Needed" : "Offline"}
          </span>
          {messages.length > 0 && (
            <button
              aria-label="Clear chat history"
              className="icon-button"
              onClick={handleClearChat}
              title="Clear conversation"
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}
          {typeof onClose === "function" && (
            <button
              aria-label="Close assistant"
              className="icon-button"
              onClick={onClose}
              title="Close assistant"
              type="button"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="ai-quick-actions" role="toolbar" aria-label="Quick AI actions">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              className="ai-quick-btn"
              disabled={loading}
              key={action.id}
              onClick={() => handleSend(action.prompt, action.id)}
              title={action.prompt}
              type="button"
            >
              <Icon size={12} />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      <div className="assistant-conversation">
        {messages.length === 0 ? (
          <div className="assistant-welcome">
            <span className="assistant-orb">
              <Bot size={22} />
            </span>
            <h3>Pair program with AI</h3>
            <p>Ask questions about your code, debug issues, write tests, or explore optimizations.</p>

            <div className="suggestion-list">
              <span className="suggestion-label">PROMPTS</span>
              {INITIAL_SUGGESTIONS.map((sug) => (
                <button
                  className="suggestion-button"
                  disabled={loading}
                  key={sug}
                  onClick={() => handleSend(sug, "chat")}
                  type="button"
                >
                  <Sparkles size={13} />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages-list">
            {messages.map((msg) => (
              <div className={`ai-message ai-message-${msg.role}`} key={msg.id}>
                <div className="ai-message-header">
                  <span className="ai-avatar">
                    {msg.role === "assistant" ? <Bot size={13} /> : msg.role === "error" ? <AlertCircle size={13} /> : <Code2 size={13} />}
                  </span>
                  <span className="ai-sender-name">
                    {msg.role === "assistant" ? "Assistant" : msg.role === "error" ? "System Error" : "You"}
                  </span>
                  {msg.action && msg.action !== "chat" && (
                    <span className="ai-action-tag">{msg.action}</span>
                  )}
                </div>
                <div className="ai-message-body">
                  {msg.role === "assistant"
                    ? renderFormattedMessage(msg.content, msg.id)
                    : <p>{msg.content}</p>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message ai-message-assistant ai-message-loading">
                <div className="ai-message-header">
                  <span className="ai-avatar">
                    <LoaderCircle className="spin" size={13} />
                  </span>
                  <span className="ai-sender-name">Thinking…</span>
                </div>
                <div className="ai-loading-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="assistant-error-banner" role="alert">
          <AlertCircle size={13} />
          <span>{errorMessage}</span>
          <button
            className="ai-retry-btn"
            onClick={() => handleSend()}
            title="Retry last request"
            type="button"
          >
            <RotateCcw size={11} /> Retry
          </button>
        </div>
      )}

      <form className="assistant-composer" onSubmit={(e) => { e.preventDefault(); void handleSend(); }}>
        <textarea
          aria-label="Ask the AI assistant about your code"
          disabled={loading}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or request refactoring (Ctrl+Enter to send)..."
          ref={textareaRef}
          rows={2}
          value={prompt}
        />
        <div className="composer-footer">
          <span className="composer-context-label">
            Context: {activeLanguage} ({activeCode ? `${activeCode.split("\n").length} lines` : "empty"})
          </span>
          <div className="composer-buttons">
            {loading ? (
              <button
                className="ai-stop-btn"
                onClick={handleStop}
                title="Stop generation"
                type="button"
              >
                Stop
              </button>
            ) : (
              <button
                aria-label="Send message to AI"
                className="send-button"
                disabled={!prompt.trim() && !activeCode}
                title="Send message (Ctrl+Enter)"
                type="submit"
              >
                <Send size={13} />
              </button>
            )}
          </div>
        </div>
      </form>
    </aside>
  );
}
