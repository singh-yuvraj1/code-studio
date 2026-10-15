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
  FolderOpen,
  LoaderCircle,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Save,
  Settings,
  Share2,
  Sparkles,
  UsersRound,
  WrapText,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Brand from "../components/Brand.jsx";
import AIAssistant from "../components/AIAssistant.jsx";
import FileExplorer, { detectLanguage, getLanguageBadge } from "../components/FileExplorer.jsx";
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
  { id: "markdown", label: "Markdown", extension: "md" },
];

const THEME_OPTIONS = [
  { id: "vs-dark", label: "Dark" },
  { id: "hc-black", label: "High contrast" },
  { id: "light", label: "Light" },
];

const DEFAULT_FILES = [
  {
    id: "f-main",
    name: "main.js",
    language: "javascript",
    content: `// Welcome to your Code Studio workspace
// Write code, collaborate in real time, and ask the AI assistant.

function greet(name) {
  return \`Hello, \${name}! Let's build something great.\`;
}

console.log(greet("world"));
`,
  },
  {
    id: "f-notes",
    name: "notes.md",
    language: "markdown",
    content: `# Code Studio Project Notes

- **Real-Time Collaboration**: Share your Room ID with teammates.
- **Multi-File Workspace**: Add and manage files in the file explorer.
- **AI Coding Assistant**: Request refactoring, code explanation, and bug checks.
`,
  },
];

export default function WorkspacePage() {
  const { roomId = "" } = useParams();
  const storageFilesKey = useMemo(() => `codesync:room:${roomId}:files`, [roomId]);
  const storageActiveKey = useMemo(() => `codesync:room:${roomId}:active`, [roomId]);

  // Load initial files from local storage if available
  const [files, setFiles] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageFilesKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Unable to read saved files from localStorage", e);
    }
    return DEFAULT_FILES;
  });

  const [activeFileId, setActiveFileId] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageActiveKey);
      if (saved && files.some((f) => f.id === saved)) return saved;
    } catch {
      // ignore
    }
    return files[0]?.id || "f-main";
  });

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || files[0] || DEFAULT_FILES[0],
    [files, activeFileId]
  );

  const [theme, setTheme] = useState(THEME_OPTIONS[0].id);
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState("on");
  const [showMinimap, setShowMinimap] = useState(false);
  const [showAssistant, setShowAssistant] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [saveState, setSaveState] = useState("idle");
  const [copyState, setCopyState] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [users, setUsers] = useState([]);
  const [unsavedMap, setUnsavedMap] = useState({});

  const editorRef = useRef(null);
  const lastSyncedCodeRef = useRef(activeFile.content);
  const hasJoinedRoomRef = useRef(false);

  // Track room in recent workspaces
  useEffect(() => {
    if (!roomId) return;
    try {
      const recentsKey = "codesync:recent_workspaces";
      const existing = JSON.parse(window.localStorage.getItem(recentsKey) || "[]");
      const filtered = existing.filter((item) => item.id !== roomId);
      filtered.unshift({
        id: roomId,
        title: `Workspace ${roomId}`,
        updatedAt: Date.now(),
        fileCount: files.length,
        language: activeFile.language,
      });
      window.localStorage.setItem(recentsKey, JSON.stringify(filtered.slice(0, 8)));
    } catch (e) {
      console.warn("Unable to update recent workspaces", e);
    }
  }, [roomId, files.length, activeFile.language]);

  // Save active file selection
  useEffect(() => {
    try {
      window.localStorage.setItem(storageActiveKey, activeFileId);
    } catch {
      // ignore
    }
  }, [activeFileId, storageActiveKey]);

  // Join Socket.IO room
  const joinRoom = useCallback(
    async (socket) => {
      const response = await emitWithAck(socket, "room:join", {
        roomId,
        displayName: getDisplayName(),
      });
      if (typeof response.code === "string") {
        lastSyncedCodeRef.current = response.code;
        setFiles((prev) =>
          prev.map((f) => (f.id === activeFileId ? { ...f, content: response.code } : f))
        );
      }
      setUsers(response.users || []);
      hasJoinedRoomRef.current = true;
      setConnectionError("");
      setConnectionStatus("connected");
    },
    [roomId, activeFileId]
  );

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
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, content: payload.code } : f))
      );
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
  }, [joinRoom, roomId, activeFileId]);

  // Synchronize changes with debounce over Socket.IO
  useEffect(() => {
    if (connectionStatus !== "connected" || activeFile.content === lastSyncedCodeRef.current) {
      return undefined;
    }

    const socket = getSocket();
    const timeoutId = window.setTimeout(() => {
      socket.emit("code:change", { code: activeFile.content }, (response) => {
        if (response?.ok) {
          lastSyncedCodeRef.current = activeFile.content;
          return;
        }
        if (!response) return;
        setConnectionError(response.message || "Unable to synchronize this code.");
      });
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [activeFile.content, connectionStatus]);

  // Handle active file code edit
  function handleCodeChange(newContent) {
    const text = newContent ?? "";
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, content: text } : f))
    );
    setUnsavedMap((prev) => ({ ...prev, [activeFile.id]: true }));
  }

  // Handle language change for active file
  function handleLanguageChange(newLang) {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFile.id ? { ...f, language: newLang } : f))
    );
  }

  // Save all files to localStorage
  function saveDraft() {
    setSaveState("saving");
    window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageFilesKey, JSON.stringify(files));
        setSaveState("saved");
        setUnsavedMap({});
        window.setTimeout(() => setSaveState("idle"), 1800);
      } catch (e) {
        console.error("Unable to save draft", e);
        setSaveState("error");
      }
    }, 180);
  }

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        saveDraft();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [files]);

  // Create new file
  function handleCreateFile(name) {
    const lang = detectLanguage(name);
    const newFile = {
      id: `f-${Date.now()}`,
      name,
      language: lang,
      content: `// ${name}\n`,
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }

  // Delete file
  function handleDeleteFile(fileId) {
    if (files.length <= 1) return;
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (activeFileId === fileId) {
      const remaining = files.filter((f) => f.id !== fileId);
      setActiveFileId(remaining[0]?.id || "");
    }
  }

  // Rename file
  function handleRenameFile(fileId, newName) {
    const newLang = detectLanguage(newName);
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, name: newName, language: newLang } : f))
    );
  }

  // Copy Room ID
  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopyState(true);
      window.setTimeout(() => setCopyState(false), 1600);
    } catch (e) {
      console.warn("Unable to copy room ID", e);
    }
  }

  // Download active file
  function downloadActiveFile() {
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Download all files as a project bundle
  function downloadProjectBundle() {
    const bundleData = {
      roomId,
      exportedAt: new Date().toISOString(),
      files: files.map(({ name, language, content }) => ({ name, language, content })),
    };
    const blob = new Blob([JSON.stringify(bundleData, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `codesync-project-${roomId.toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Apply code suggested by AI
  function handleApplyAICode(newCode) {
    handleCodeChange(newCode);
  }

  const saveLabel = {
    idle: "Save",
    saving: "Saving",
    saved: "Saved",
    error: "Failed",
  }[saveState];

  return (
    <main className="workspace-shell">
      {/* Top Header */}
      <header className="workspace-header">
        <div className="workspace-brand">
          <Brand compact />
          <span className="header-divider" />
          <Link aria-label="Back to dashboard" className="back-link" to="/">
            <ArrowLeft size={15} />
          </Link>
          <div className="room-breadcrumb">
            <span className="room-name">Code Studio</span>
            <span className="room-id">ROOM / {roomId}</span>
          </div>
        </div>

        <div className="workspace-header-actions">
          {/* Backend Connection Status */}
          <div
            className={`backend-status connection-${connectionStatus}`}
            title={connectionError || `Connection status: ${connectionStatus}`}
          >
            <span className={`status-indicator status-${connectionStatus}`} />
            <span>{connectionStatusLabel(connectionStatus)}</span>
          </div>

          {/* Connected Users */}
          <div
            aria-label={`${users.length} connected collaborators`}
            className="connected-users"
            title={users.map((u) => u.displayName).join(", ")}
          >
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

          {/* Copy Room ID Button */}
          <button
            className="button button-quiet room-copy-button"
            onClick={copyRoomId}
            title="Copy room ID to share with teammates"
            type="button"
          >
            {copyState ? <Check size={14} /> : <Share2 size={13} />}
            <span>{copyState ? "Copied ID" : "Share"}</span>
          </button>

          {/* Save Draft Button */}
          <button
            className={`button button-quiet ${saveState === "error" ? "button-error" : ""}`}
            disabled={saveState === "saving"}
            onClick={saveDraft}
            title="Save draft in this browser (Ctrl+S)"
            type="button"
          >
            {saveState === "saving" ? (
              <LoaderCircle className="spin" size={14} />
            ) : saveState === "saved" ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            <span>{saveLabel}</span>
          </button>

          {/* Download Dropdown / Action */}
          <div className="download-group">
            <button
              className="button button-quiet download-button"
              onClick={downloadActiveFile}
              title={`Download ${activeFile.name}`}
              type="button"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
            <button
              className="button button-quiet download-bundle-btn"
              onClick={downloadProjectBundle}
              title="Download all project files as JSON bundle"
              type="button"
            >
              Export
            </button>
          </div>
        </div>
      </header>

      {/* Editor Toolbar with Multi-File Tabs & Controls */}
      <div className="workspace-toolbar">
        <div className="toolbar-left-group">
          {/* File Explorer Toggle */}
          <button
            aria-label={showExplorer ? "Collapse file explorer" : "Expand file explorer"}
            className={`toolbar-icon-toggle ${showExplorer ? "active" : ""}`}
            onClick={() => setShowExplorer((prev) => !prev)}
            title="Toggle File Explorer"
            type="button"
          >
            <FolderOpen size={14} />
          </button>

          {/* File Tabs */}
          <div className="file-tabs-scroll" role="tablist">
            {files.map((file) => {
              const badge = getLanguageBadge(file.language);
              const isActive = file.id === activeFile.id;
              const isUnsaved = Boolean(unsavedMap[file.id]);
              return (
                <div
                  aria-selected={isActive}
                  className={`file-tab ${isActive ? "active-tab" : ""}`}
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  role="tab"
                >
                  <span
                    className="file-tab-badge"
                    style={{ color: badge.color, backgroundColor: badge.bg }}
                  >
                    {badge.text}
                  </span>
                  <span className="file-tab-title">{file.name}</span>
                  {isUnsaved && <span className="unsaved-dot" title="Unsaved changes" />}
                  {files.length > 1 && (
                    <button
                      aria-label={`Close ${file.name}`}
                      className="tab-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                      title="Close file"
                      type="button"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              className="new-tab-btn"
              onClick={() => {
                const nextNum = files.length + 1;
                handleCreateFile(`file${nextNum}.js`);
              }}
              title="Add new file"
              type="button"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Toolbar Right Controls */}
        <div className="toolbar-controls">
          {/* Language Selector */}
          <label className="select-wrap">
            <span className="sr-only">Programming language</span>
            <select
              onChange={(e) => handleLanguageChange(e.target.value)}
              value={activeFile.language}
            >
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>

          {/* Theme Selector */}
          <label className="select-wrap theme-select">
            <span className="sr-only">Editor theme</span>
            <select onChange={(e) => setTheme(e.target.value)} value={theme}>
              {THEME_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} theme
                </option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>

          {/* Word Wrap Toggle */}
          <button
            aria-label="Toggle line wrap"
            className={`icon-button ${wordWrap === "on" ? "active-tool" : ""}`}
            onClick={() => setWordWrap((prev) => (prev === "on" ? "off" : "on"))}
            title={wordWrap === "on" ? "Word wrap: On" : "Word wrap: Off"}
            type="button"
          >
            <WrapText size={15} />
          </button>

          {/* Font Size Adjuster */}
          <button
            aria-label="Toggle font size"
            className="icon-button font-size-btn"
            onClick={() => setFontSize((prev) => (prev === 14 ? 16 : prev === 16 ? 12 : 14))}
            title={`Font size: ${fontSize}px`}
            type="button"
          >
            <span className="font-size-text">{fontSize}</span>
          </button>

          {/* Assistant Toggle Button */}
          <button
            aria-label={showAssistant ? "Hide AI assistant" : "Show AI assistant"}
            className={`icon-button assistant-toggle ${showAssistant ? "assistant-active" : ""}`}
            onClick={() => setShowAssistant((visible) => !visible)}
            title={showAssistant ? "Hide AI Assistant" : "Open AI Assistant"}
            type="button"
          >
            {showAssistant ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div
        className={`workspace-content ${showAssistant ? "" : "assistant-hidden"} ${
          showExplorer ? "explorer-open" : "explorer-hidden"
        }`}
      >
        {/* File Explorer Sidebar */}
        {showExplorer && (
          <FileExplorer
            activeFileId={activeFile.id}
            files={files}
            isOpen={showExplorer}
            onClose={() => setShowExplorer(false)}
            onCreateFile={handleCreateFile}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onSelectFile={setActiveFileId}
            unsavedMap={unsavedMap}
          />
        )}

        {/* Monaco Code Editor Pane */}
        <section aria-label="Code editor" className="editor-pane">
          <Editor
            language={activeFile.language}
            onChange={handleCodeChange}
            onMount={(editor) => {
              editorRef.current = editor;
            }}
            options={{
              minimap: { enabled: showMinimap },
              fontSize,
              fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
              lineHeight: 22,
              padding: { top: 16, bottom: 16 },
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              renderLineHighlight: "gutter",
              automaticLayout: true,
              wordWrap,
              tabSize: 2,
            }}
            theme={theme}
            value={activeFile.content}
          />
        </section>

        {/* AI Assistant Pane */}
        {showAssistant && (
          <AIAssistant
            activeCode={activeFile.content}
            activeLanguage={activeFile.language}
            onApplyCode={handleApplyAICode}
            onClose={() => setShowAssistant(false)}
            roomId={roomId}
          />
        )}
      </div>

      {/* Status Bar */}
      <footer className="workspace-statusbar">
        <div role={saveState === "error" || connectionError ? "alert" : undefined}>
          <span
            className={`status-indicator ${
              saveState === "error" || connectionStatus === "error"
                ? "status-error"
                : `status-${connectionStatus}`
            }`}
          />
          <span className="status-message">
            {saveState === "error"
              ? "Draft save failed — check browser storage"
              : connectionError || `${connectionStatusLabel(connectionStatus)} · Room ${roomId}`}
          </span>
        </div>

        <div className="statusbar-right">
          <span>{activeFile.name}</span>
          <span className="status-separator">·</span>
          <span>{activeFile.language}</span>
          <span className="status-separator">·</span>
          <span>UTF-8</span>
          <span className="status-separator">·</span>
          <span>Ln {activeFile.content.split("\n").length}, Col 1</span>
        </div>
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
