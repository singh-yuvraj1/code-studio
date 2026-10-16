import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  Code2,
  Copy,
  CornerDownLeft,
  FileCode,
  KeyRound,
  LoaderCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  StopCircle,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { fetchAIStatus, isBackendConfigured, sendAIChatRequest } from "../lib/socket.js";

const QUICK_ACTIONS = [
  {
    id: "explain",
    label: "Explain",
    icon: Zap,
    prompt: "Explain how this code works, its key algorithms, data structures, and edge cases.",
  },
  {
    id: "debug",
    label: "Find Bugs",
    icon: AlertCircle,
    prompt: "Review this code carefully for bugs, logical flaws, performance bottlenecks, and security issues. Suggest fixes.",
  },
  {
    id: "optimize",
    label: "Optimize",
    icon: Sparkles,
    prompt: "Optimize this code for runtime performance, memory efficiency, and modern idiomatic cleanliness.",
  },
  {
    id: "test",
    label: "Write Tests",
    icon: Code2,
    prompt: "Write comprehensive unit tests for this code covering typical usage, edge cases, and error conditions.",
  },
  {
    id: "refactor",
    label: "Refactor",
    icon: FileCode,
    prompt: "Refactor this code to be cleaner, more modular, and easier to maintain. Provide the refactored code.",
  },
];

const INITIAL_PROMPTS = [
  "How can I refactor this file to follow best practices?",
  "Review this file for edge cases and security vulnerabilities.",
  "Write comprehensive unit tests with assertions.",
  "Optimize this code for execution speed and lower memory.",
];

export default function AIAssistant({
  activeCode = "",
  selectedCode = "",
  activeLanguage = "javascript",
  activeFileName = "main.js",
  onApplyCode,
  roomId = "",
  onClose,
}) {
  const storageKey = `codesync:ai_chat:${roomId || "default"}`;
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
  const [copiedId, setCopiedId] = useState(null);
  const [appliedId, setAppliedId] = useState(null);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const textareaRef = useRef(null);

  // Persist messages to session storage
  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, storageKey]);

  // Check AI status from server
  async function checkServerStatus() {
    setErrorMessage("");
    if (!isBackendConfigured()) {
      setAiStatus("offline");
      return;
    }
    try {
      const status = await fetchAIStatus();
      if (status.configured) {
        setAiStatus("ready");
      } else if (status.status === "offline") {
        setAiStatus("offline");
      } else {
        setAiStatus("unconfigured");
      }
    } catch {
      setAiStatus("offline");
    }
  }

  useEffect(() => {
    void checkServerStatus();
  }, []);

  // Scroll to bottom on new message
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
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      content: textToSend || `[${customAction.toUpperCase()}] ${activeFileName}`,
      action: customAction,
      fileName: activeFileName,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const codeContext = (selectedCode && selectedCode.trim()) ? selectedCode : activeCode;

    try {
      const response = await sendAIChatRequest({
        prompt: textToSend,
        code: codeContext,
        language: activeLanguage,
        action: customAction,
        history: messages,
        signal: controller.signal,
      });

      const assistantMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
        const errorText = error.message || "Unable to get response from AI.";
        setErrorMessage(errorText);

        // If it's a configuration error, show config guide
        if (errorText.includes("GEMINI_API_KEY")) {
          setAiStatus("unconfigured");
          setShowConfigHelp(true);
        }

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

  async function copyToClipboard(text, blockId) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(blockId);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  }

  function applyCodeToEditor(codeToApply, blockId) {
    if (typeof onApplyCode === "function") {
      onApplyCode(codeToApply);
      setAppliedId(blockId);
      setTimeout(() => setAppliedId(null), 2000);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
      e.preventDefault();
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

      const lang = match[1] || activeLanguage || "code";
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
                title="Copy snippet"
                type="button"
              >
                {copiedId === currentBlockId ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId === currentBlockId ? "Copied" : "Copy"}</span>
              </button>
              {typeof onApplyCode === "function" && (
                <button
                  className="ai-action-btn ai-apply-btn"
                  onClick={() => applyCodeToEditor(snippet, currentBlockId)}
                  title="Apply or insert this code into the active editor"
                  type="button"
                >
                  {appliedId === currentBlockId ? <Check size={12} /> : <FileCode size={12} />}
                  <span>{appliedId === currentBlockId ? "Applied!" : "Apply to Editor"}</span>
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

  const lineCount = activeCode ? activeCode.split("\n").length : 0;

  return (
    <aside aria-label="AI Assistant" className="ide-ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-header-title">
          <Sparkles className="icon-ai-sparkle" size={16} />
          <div>
            <b>AI Assistant</b>
            <span className="ai-header-subtitle">Pair programmer</span>
          </div>
        </div>

        <div className="ai-header-actions">
          {/* Status Badge */}
          <span
            className={`ai-status-badge status-${aiStatus}`}
            onClick={() => {
              if (aiStatus !== "ready") setShowConfigHelp((prev) => !prev);
            }}
            title={
              aiStatus === "ready"
                ? "Gemini API Connected"
                : aiStatus === "unconfigured"
                ? "Click to see GEMINI_API_KEY setup guide"
                : "Server Offline"
            }
          >
            <i className="status-dot" />
            {aiStatus === "ready" ? "Online" : aiStatus === "unconfigured" ? "Setup Key" : "Offline"}
          </span>

          {messages.length > 0 && (
            <button
              className="ai-icon-btn"
              onClick={handleClearChat}
              title="Clear conversation"
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}

          {typeof onClose === "function" && (
            <button
              className="ai-icon-btn"
              onClick={onClose}
              title="Close panel (Ctrl+Shift+A)"
              type="button"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Active File Context Chip */}
      <div className="ai-context-strip">
        <span className="context-label">CONTEXT:</span>
        <span className="context-file" title={`Using ${activeFileName} as context`}>
          <FileCode size={12} />
          <span>{activeFileName}</span>
        </span>
        {selectedCode && selectedCode.trim() ? (
          <span className="context-selection-chip" title="Selected code will be used as primary prompt context">
            Selection ({selectedCode.split("\n").length} lines)
          </span>
        ) : (
          <span className="context-meta">
            {activeLanguage} · {lineCount} lines
          </span>
        )}
      </div>

      {/* Unconfigured Gemini API Key Banner */}
      {(aiStatus === "unconfigured" || showConfigHelp) && (
        <div className="ai-config-notice">
          <div className="notice-header">
            <KeyRound size={14} />
            <b>Gemini API Key Required</b>
            <button
              className="notice-close-btn"
              onClick={() => setShowConfigHelp(false)}
              type="button"
            >
              <X size={12} />
            </button>
          </div>
          <p className="notice-desc">
            To use AI features, add your free key to <code>server/.env</code>:
          </p>
          <pre className="notice-snippet">GEMINI_API_KEY=your_key_here</pre>
          <div className="notice-actions">
            <a
              className="notice-link"
              href="https://aistudio.google.com/"
              rel="noreferrer"
              target="_blank"
            >
              Get Free Key
            </a>
            <button
              className="notice-recheck-btn"
              onClick={checkServerStatus}
              type="button"
            >
              <RefreshCw size={11} /> Recheck
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="ai-quick-actions" role="toolbar">
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

      {/* Messages Conversation Scroll */}
      <div className="ai-messages-scroll">
        {messages.length === 0 ? (
          <div className="ai-welcome-state">
            <div className="ai-welcome-orb">
              <Bot size={24} />
            </div>
            <h3>Code Studio AI Assistant</h3>
            <p>
              Ask questions about your code, detect logical bugs, optimize algorithms, or generate unit tests.
            </p>

            <div className="ai-starter-prompts">
              <span className="prompts-heading">SUGGESTIONS</span>
              {INITIAL_PROMPTS.map((p, idx) => (
                <button
                  className="starter-prompt-btn"
                  disabled={loading}
                  key={idx}
                  onClick={() => handleSend(p, "chat")}
                  type="button"
                >
                  <Sparkles size={12} />
                  <span>{p}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages-container">
            {messages.map((msg) => (
              <div className={`ai-chat-bubble bubble-${msg.role}`} key={msg.id}>
                <div className="bubble-header">
                  <span className="bubble-avatar">
                    {msg.role === "assistant" ? (
                      <Bot size={13} />
                    ) : msg.role === "error" ? (
                      <AlertCircle size={13} />
                    ) : (
                      <Code2 size={13} />
                    )}
                  </span>
                  <span className="bubble-sender">
                    {msg.role === "assistant"
                      ? "Code Studio AI"
                      : msg.role === "error"
                      ? "System Error"
                      : "You"}
                  </span>
                  {msg.action && msg.action !== "chat" && (
                    <span className="bubble-action-tag">{msg.action}</span>
                  )}
                </div>

                <div className="bubble-body">
                  {msg.role === "assistant"
                    ? renderFormattedMessage(msg.content, msg.id)
                    : <p>{msg.content}</p>}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-chat-bubble bubble-assistant bubble-loading">
                <div className="bubble-header">
                  <span className="bubble-avatar">
                    <LoaderCircle className="spin" size={13} />
                  </span>
                  <span className="bubble-sender">Analyzing code…</span>
                </div>
                <div className="loading-dots">
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

      {/* Error alert if any */}
      {errorMessage && (
        <div className="ai-error-banner" role="alert">
          <AlertCircle size={13} />
          <span>{errorMessage}</span>
          <button
            className="ai-retry-btn"
            onClick={() => handleSend()}
            title="Retry"
            type="button"
          >
            <RotateCcw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Input Composer Form */}
      <form
        className="ai-composer-form"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <textarea
          aria-label="Ask the AI assistant"
          disabled={loading}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or request refactoring (Ctrl+Enter to send)..."
          ref={textareaRef}
          rows={2}
          value={prompt}
        />

        <div className="ai-composer-footer">
          <span className="composer-hint">
            Active: <code>{activeFileName}</code>
          </span>

          <div className="composer-actions">
            {loading ? (
              <button
                className="ai-stop-btn"
                onClick={handleStop}
                title="Stop generation"
                type="button"
              >
                <StopCircle size={12} />
                <span>Stop</span>
              </button>
            ) : (
              <button
                aria-label="Send message"
                className="ai-send-btn"
                disabled={!prompt.trim() && !activeCode}
                title="Send (Ctrl+Enter)"
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
