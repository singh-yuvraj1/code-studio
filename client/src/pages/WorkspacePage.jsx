import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import CssWorker from "monaco-editor/language/css/css.worker.js?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Download,
  FileCode2,
  LoaderCircle,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import { connectSocket, emitWithAck, getDisplayName, getSocket } from "../lib/socket.js";

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === "json") return new JsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new CssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
    if (label === "javascript" || label === "typescript") return new TypeScriptWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });

const LANGUAGES = [
  { id: "javascript", label: "JavaScript", extension: "js" },
  { id: "typescript", label: "TypeScript", extension: "ts" },
  { id: "python", label: "Python", extension: "py" },
  { id: "html", label: "HTML", extension: "html" },
  { id: "css", label: "CSS", extension: "css" },
  { id: "json", label: "JSON", extension: "json" },
  { id: "java", label: "Java", extension: "java" },
  { id: "cpp", label: "C++", extension: "cpp" },
];

const INITIAL_CODE = `// Welcome to your CodeSync workspace
// Share this room ID with a teammate to get started.

function greet(name) {
  return \`Hello, \${name}! Let's build something great.\`;
}

console.log(greet("world"));
`;

const THEME_OPTIONS = [
  { id: "vs-dark", label: "Dark" },
  { id: "hc-black", label: "High contrast" },
  { id: "light", label: "Light" },
];

const SUGGESTIONS = [
  "Explain this code",
  "Find potential bugs",
  "Write a few tests",
];

export default function WorkspacePage() {
  const { roomId = "" } = useParams();
  const storageKey = useMemo(() => `codesync:room:${roomId}`, [roomId]);
  const [code, setCode] = useState(INITIAL_CODE);
  const [language, setLanguage] = useState(LANGUAGES[0].id);
  const [theme, setTheme] = useState(THEME_OPTIONS[0].id);
  const [showAssistant, setShowAssistant] = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const [copyState, setCopyState] = useState(false);
  const [savedCode, setSavedCode] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [users, setUsers] = useState([]);
  const lastSyncedCodeRef = useRef(code);
  const hasJoinedRoomRef = useRef(false);

  const joinRoom = useCallback(async (socket) => {
    const response = await emitWithAck(socket, "room:join", {
      roomId,
      displayName: getDisplayName(),
    });
    if (typeof response.code !== "string") {
      throw new Error("The room did not provide its current code.");
    }
    lastSyncedCodeRef.current = response.code;
    setCode(response.code);
    setUsers(response.users);
    hasJoinedRoomRef.current = true;
    setConnectionError("");
    setConnectionStatus("connected");
  }, [roomId]);

  useEffect(() => {
    let disposed = false;
    const socket = getSocket();

    function onConnect() {
      if (!hasJoinedRoomRef.current || disposed) return;
      setConnectionStatus("connecting");
      joinRoom(socket).catch((error) => {
        if (disposed) return;
        setConnectionStatus("error");
        setConnectionError(error.message);
      });
    }

    function onDisconnect() {
      if (disposed) return;
      setConnectionStatus("reconnecting");
    }

    function onConnectError() {
      if (disposed) return;
      setConnectionStatus("error");
      setConnectionError("Connection to the collaboration server was lost. Retrying…");
    }

    function onRoomUsers(payload) {
      if (payload?.roomId === roomId && Array.isArray(payload.users)) {
        setUsers(payload.users);
      }
    }

    function onCodeSync(payload) {
      if (typeof payload?.code !== "string") return;
      lastSyncedCodeRef.current = payload.code;
      setCode(payload.code);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("room:users", onRoomUsers);
    socket.on("code:sync", onCodeSync);

    async function initializeRoom() {
      try {
        setConnectionStatus("connecting");
        await connectSocket(socket);
        if (!disposed) await joinRoom(socket);
      } catch (error) {
        if (disposed) return;
        setConnectionStatus("error");
        setConnectionError(error.message);
      }
    }

    void initializeRoom();
    return () => {
      disposed = true;
      hasJoinedRoomRef.current = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room:users", onRoomUsers);
      socket.off("code:sync", onCodeSync);
      if (socket.connected) socket.emit("room:leave");
    };
  }, [joinRoom, roomId]);

  useEffect(() => {
    if (
      connectionStatus !== "connected" ||
      code === lastSyncedCodeRef.current
    ) {
      return undefined;
    }

    const socket = getSocket();
    const timeoutId = window.setTimeout(() => {
      socket.emit("code:change", { code }, (response) => {
        if (response?.ok) {
          lastSyncedCodeRef.current = code;
          return;
        }
        if (!response) return;
        setConnectionError(response.message || "Unable to synchronize this code.");
      });
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [code, connectionStatus]);

  useEffect(() => {
    try {
      const storedCode = window.localStorage.getItem(storageKey);
      if (storedCode !== null) {
        setCode(storedCode);
        setSavedCode(storedCode);
      } else {
        setCode(INITIAL_CODE);
        setSavedCode(null);
      }
    } catch (error) {
      console.error("Unable to read this room's local draft.", error);
    }
  }, [storageKey]);

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1600);
    } catch (error) {
      console.error("Unable to copy the room ID.", error);
      setCopyState(false);
    }
  }

  function saveCode() {
    setSaveState("saving");
    window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, code);
        setSavedCode(code);
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1800);
      } catch (error) {
        console.error("Unable to save this room's local draft.", error);
        setSaveState("error");
      }
    }, 160);
  }

  function downloadCode() {
    const selectedLanguage = LANGUAGES.find((item) => item.id === language);
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codesync-${roomId.toLowerCase()}.${selectedLanguage?.extension ?? "txt"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function restoreSavedCode() {
    if (savedCode !== null) setCode(savedCode);
  }

  const saveLabel = {
    idle: "Save",
    saving: "Saving",
    saved: "Saved",
    error: "Save failed",
  }[saveState];

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div className="workspace-brand">
          <Brand compact />
          <span className="header-divider" />
          <Link className="back-link" to="/" aria-label="Back to dashboard">
            <ArrowLeft size={15} />
          </Link>
          <div className="room-breadcrumb">
            <span className="room-name">Untitled session</span>
            <span className="room-id">ROOM / {roomId}</span>
          </div>
        </div>
        <div className="workspace-header-actions">
          <div
            className={`backend-status connection-${connectionStatus}`}
            title={connectionError || `Connection ${connectionStatus}`}
          >
            <span className={`status-indicator status-${connectionStatus}`} />
            <span>{connectionStatusLabel(connectionStatus)}</span>
          </div>
          <div className="connected-users" aria-label={`${users.length} connected users`} title={users.map((user) => user.displayName).join(", ")}>
            <UsersRound size={14} />
            <span>{users.length}</span>
            <div className="connected-user-names">
              {users.map((user) => (
                <span className="connected-user-name" key={user.id} title={user.displayName}>
                  {user.displayName}
                </span>
              ))}
            </div>
          </div>
          <span className="header-divider action-divider" />
          <button className="button button-quiet room-copy-button" onClick={copyRoomId} title="Copy room ID">
            {copyState ? <Check size={15} /> : <Copy size={14} />}
            <span>{copyState ? "Copied" : "Copy ID"}</span>
          </button>
          <button
            className={`button button-quiet ${saveState === "error" ? "button-error" : ""}`}
            onClick={saveCode}
            disabled={saveState === "saving"}
            title={saveState === "error" ? "Local save failed — check browser storage" : "Save draft in this browser"}
          >
            {saveState === "saving" ? <LoaderCircle className="spin" size={15} /> : saveState === "saved" ? <Check size={15} /> : <Save size={15} />}
            <span>{saveLabel}</span>
          </button>
          <button className="button button-quiet download-button" onClick={downloadCode} title="Download source file">
            <Download size={15} />
            <span>Download</span>
          </button>
        </div>
      </header>

      <div className="workspace-toolbar">
        <div className="file-tab">
          <FileCode2 size={15} />
          <span>main.{LANGUAGES.find((item) => item.id === language)?.extension}</span>
          {savedCode !== code && <span aria-label="Unsaved changes" className="unsaved-dot" />}
        </div>
        <div className="toolbar-controls">
          <label className="select-wrap">
            <span className="sr-only">Programming language</span>
            <select onChange={(event) => setLanguage(event.target.value)} value={language}>
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <label className="select-wrap theme-select">
            <span className="sr-only">Editor theme</span>
            <select onChange={(event) => setTheme(event.target.value)} value={theme}>
              {THEME_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label} theme</option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <button
            aria-label={showAssistant ? "Hide AI assistant" : "Show AI assistant"}
            className="icon-button assistant-toggle"
            onClick={() => setShowAssistant((visible) => !visible)}
            title={showAssistant ? "Hide assistant" : "Show assistant"}
          >
            {showAssistant ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        </div>
      </div>

      <div className={`workspace-content ${showAssistant ? "" : "assistant-hidden"}`}>
        <section aria-label="Code editor" className="editor-pane">
          <Editor
            language={language}
            onChange={(value) => setCode(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
              lineHeight: 23,
              padding: { top: 18, bottom: 18 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              renderLineHighlight: "gutter",
              automaticLayout: true,
              wordWrap: "on",
              tabSize: 2,
            }}
            theme={theme}
            value={code}
          />
          {savedCode !== null && savedCode !== code && (
            <button className="restore-draft" onClick={restoreSavedCode}>
              <CircleHelp size={14} /> Restore saved draft
            </button>
          )}
        </section>

        {showAssistant && (
          <aside aria-label="AI coding assistant" className="assistant-pane">
            <div className="assistant-heading">
              <div className="assistant-title">
                <span className="assistant-heading-icon"><Sparkles size={15} /></span>
                <div><b>AI Assistant</b><span>Pair on your next idea</span></div>
              </div>
              <span className="coming-soon-badge">Not connected</span>
            </div>
            <div className="assistant-conversation">
              <div className="assistant-welcome">
                <span className="assistant-orb"><Bot size={22} /></span>
                <h3>A little help, right when you need it.</h3>
                <p>Ask about your code, explore an idea, or get help tracking down a bug.</p>
              </div>
              <div className="suggestion-list">
                <span className="suggestion-label">TRY ASKING</span>
                {SUGGESTIONS.map((suggestion) => (
                  <button className="suggestion-button" disabled key={suggestion} title="Connect the AI backend to use suggestions" type="button">
                    <Sparkles size={13} /> {suggestion}
                  </button>
                ))}
              </div>
            </div>
            <div className="assistant-unavailable" role="status">
              <Bot size={15} />
              <span>Assistant becomes available when the API is configured.</span>
            </div>
            <form
              className="assistant-composer"
              onSubmit={(event) => event.preventDefault()}
            >
              <textarea
                aria-label="Ask the AI assistant"
                disabled
                placeholder="Ask about your code..."
                rows={3}
              />
              <div className="composer-footer">
                <span>Current file · {LANGUAGES.find((item) => item.id === language)?.label}</span>
                <button aria-label="Send message" className="send-button" disabled type="submit">
                  <Send size={15} />
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>

      <footer className="workspace-statusbar">
        <div role={saveState === "error" || connectionError ? "alert" : undefined}>
          <span className={`status-indicator ${saveState === "error" || connectionStatus === "error" ? "status-error" : `status-${connectionStatus}`}`} />
          {saveState === "error"
            ? "Could not save draft — browser storage is unavailable"
            : connectionError || `${connectionStatusLabel(connectionStatus)} · Room ${roomId}`}
        </div>
        <div><span>UTF-8</span><span>Spaces: 2</span><span>Ln {code.split("\n").length}, Col 1</span></div>
      </footer>
    </main>
  );
}

function connectionStatusLabel(status) {
  const labels = {
    connecting: "Connecting",
    connected: "Connected",
    reconnecting: "Reconnecting",
    error: "Connection error",
  };
  return labels[status] || "Connecting";
}
