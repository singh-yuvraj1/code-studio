import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Braces,
  Clock,
  Code2,
  FileCode2,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Layers,
  Link2,
  Plus,
  Radio,
  Search,
  Sparkles,
  Terminal,
  Trash2,
  UsersRound,
  Zap,
} from "lucide-react";
import {
  connectSocket,
  emitWithAck,
  getDisplayName,
  getSocket,
  isBackendConfigured,
} from "../lib/socket.js";

const ROOM_ID_PATTERN = /^[a-zA-Z0-9-]{4,40}$/;

const STARTER_TEMPLATES = [
  {
    id: "ts-react",
    title: "React + TypeScript",
    lang: "typescript",
    desc: "Component tree, hooks, and typed props ready for modern UI building.",
    badge: "REACT",
    icon: Code2,
  },
  {
    id: "node-api",
    title: "Node.js REST API",
    lang: "javascript",
    desc: "Express server, middleware routes, and mock data controllers.",
    badge: "NODE",
    icon: Terminal,
  },
  {
    id: "python-algo",
    title: "Python Data & Algorithms",
    lang: "python",
    desc: "Clean algorithmic functions, data structures, and test assertions.",
    badge: "PYTHON",
    icon: FileCode2,
  },
  {
    id: "fullstack-web",
    title: "Full-Stack Web Workspace",
    lang: "html",
    desc: "Complete project with src/, components/, public/, and package.json.",
    badge: "WEB",
    icon: Layers,
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const roomIdInputRef = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [recentWorkspaces, setRecentWorkspaces] = useState([]);

  // Load recent workspaces from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("codesync:recent_workspaces");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentWorkspaces(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function removeRecentWorkspace(idToRemove, event) {
    event.stopPropagation();
    event.preventDefault();
    try {
      const updated = recentWorkspaces.filter((w) => w.id !== idToRemove);
      setRecentWorkspaces(updated);
      window.localStorage.setItem("codesync:recent_workspaces", JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  function generateLocalRoomId(prefix = "CS") {
    return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  async function handleCreateRoom() {
    if (pendingAction) return;
    setPendingAction("create");
    setError("");

    if (!isBackendConfigured()) {
      const localId = generateLocalRoomId();
      navigate(`/room/${localId}`);
      return;
    }

    try {
      const socket = getSocket();
      await connectSocket(socket);
      const response = await emitWithAck(socket, "room:create", {
        displayName: getDisplayName(),
      });
      navigate(`/room/${response.roomId}`);
    } catch (requestError) {
      // Fallback to local workspace if backend cannot be reached
      const fallbackId = generateLocalRoomId("OFFLINE");
      navigate(`/room/${fallbackId}`);
    } finally {
      setPendingAction("");
    }
  }

  async function handleJoinRoom(e) {
    e.preventDefault();
    if (pendingAction) return;
    const normalized = roomId.trim();
    if (!ROOM_ID_PATTERN.test(normalized)) {
      setError("Please enter 4–40 letters, numbers, or hyphens.");
      roomIdInputRef.current?.focus();
      return;
    }

    setPendingAction("join");
    setError("");

    if (!isBackendConfigured()) {
      navigate(`/room/${normalized}`);
      return;
    }

    try {
      const socket = getSocket();
      await connectSocket(socket);
      const response = await emitWithAck(socket, "room:join", {
        roomId: normalized,
        displayName: getDisplayName(),
      });
      navigate(`/room/${response.roomId}`);
    } catch (requestError) {
      // Allow opening anyway in offline mode
      navigate(`/room/${normalized}`);
    } finally {
      setPendingAction("");
    }
  }

  function launchTemplate(template) {
    const templateId = generateLocalRoomId(template.badge);
    navigate(`/room/${templateId}`);
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return "Recently";
    const elapsedSec = Math.floor((Date.now() - timestamp) / 1000);
    if (elapsedSec < 60) return "Just now";
    if (elapsedSec < 3600) return `${Math.floor(elapsedSec / 60)}m ago`;
    if (elapsedSec < 86400) return `${Math.floor(elapsedSec / 3600)}h ago`;
    return `${Math.floor(elapsedSec / 86400)}d ago`;
  }

  return (
    <div className="home-page-root">
      {/* Navbar */}
      <header className="home-nav">
        <div className="home-nav-container">
          <Link className="home-brand" to="/">
            <span className="brand-logo-mark">
              <Braces size={18} strokeWidth={2.4} />
            </span>
            <span className="brand-title">
              Code Studio<span className="brand-accent"> IDE</span>
            </span>
          </Link>

          <div className="home-nav-right">
            <span className="platform-tag">v2.0 Professional</span>
            <button
              className="button button-primary nav-launch-btn"
              disabled={Boolean(pendingAction)}
              onClick={handleCreateRoom}
              type="button"
            >
              <Plus size={14} />
              <span>New Workspace</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-content">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            <span>AI-Powered Collaborative IDE</span>
          </div>

          <h1 className="hero-heading">
            The intelligent workspace for real-time software engineering.
          </h1>

          <p className="hero-subheading">
            Combines the precision of Monaco Editor, hierarchical multi-folder
            workspaces, instant multiplayer collaboration, and integrated Gemini AI assistance.
          </p>

          <div className="hero-cta-group">
            <button
              className="button button-primary hero-btn-main"
              disabled={Boolean(pendingAction)}
              onClick={handleCreateRoom}
              type="button"
            >
              <Code2 size={16} />
              <span>{pendingAction === "create" ? "Starting…" : "Create Workspace"}</span>
              <ArrowRight size={15} />
            </button>

            <button
              className="button button-secondary hero-btn-sub"
              onClick={() => {
                const offlineId = generateLocalRoomId("LOCAL");
                navigate(`/room/${offlineId}`);
              }}
              type="button"
            >
              <FolderOpen size={15} />
              <span>Open Scratchpad</span>
            </button>
          </div>

          {/* Join Form */}
          <form className="home-join-form" onSubmit={handleJoinRoom}>
            <label className="join-form-label" htmlFor="join-room-input">
              <Link2 size={14} />
              <span>Join with Room ID</span>
            </label>
            <div className={`join-input-group ${error ? "has-error" : ""}`}>
              <input
                autoComplete="off"
                id="join-room-input"
                onChange={(e) => {
                  setRoomId(e.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. CS-4A9B-7C2D"
                ref={roomIdInputRef}
                value={roomId}
              />
              <button
                className="join-action-btn"
                disabled={Boolean(pendingAction)}
                type="submit"
              >
                {pendingAction === "join" ? "Connecting…" : "Join Room"}
                <ArrowRight size={14} />
              </button>
            </div>
            {error && <p className="join-error-msg">{error}</p>}
          </form>
        </div>

        {/* Hero Visual Mockup */}
        <div className="home-hero-preview">
          <div className="ide-mockup-frame">
            <div className="mockup-titlebar">
              <div className="mockup-window-controls">
                <i />
                <i />
                <i />
              </div>
              <span className="mockup-title">Code Studio — src/App.jsx</span>
              <span className="mockup-live-badge">
                <Radio className="pulse" size={10} /> Live Room
              </span>
            </div>

            <div className="mockup-body">
              {/* Activity Bar Rail */}
              <div className="mockup-rail">
                <span className="rail-icon active">
                  <Code2 size={13} />
                </span>
                <span className="rail-icon">
                  <Search size={13} />
                </span>
                <span className="rail-icon">
                  <UsersRound size={13} />
                </span>
                <span className="rail-icon">
                  <Sparkles size={13} />
                </span>
              </div>

              {/* Sidebar Tree */}
              <div className="mockup-tree">
                <div className="mockup-tree-header">EXPLORER</div>
                <div className="mockup-tree-node folder open">📁 src</div>
                <div className="mockup-tree-node file indent active">📄 App.jsx</div>
                <div className="mockup-tree-node file indent">📄 Editor.jsx</div>
                <div className="mockup-tree-node folder">📁 components</div>
                <div className="mockup-tree-node file">📄 package.json</div>
              </div>

              {/* Editor Code Area */}
              <div className="mockup-editor">
                <div className="mockup-tabs">
                  <span className="mockup-tab active">
                    <b className="tab-pill-js">JS</b> App.jsx
                  </span>
                  <span className="mockup-tab">Editor.jsx</span>
                </div>
                <div className="mockup-code-lines">
                  <pre>
                    <span className="hl-kw">import</span> React <span className="hl-kw">from</span> <span className="hl-str">&apos;react&apos;</span>;{"\n"}
                    <span className="hl-kw">import</span> &#123; ai &#125; <span className="hl-kw">from</span> <span className="hl-str">&apos;@codestudio/ai&apos;</span>;{"\n\n"}
                    <span className="hl-kw">export default async function</span> <span className="hl-fn">pairProgram</span>() &#123;{"\n"}
                    {"  "}<span className="hl-kw">const</span> analysis = <span className="hl-kw">await</span> ai.<span className="hl-fn">review</span>();{"\n"}
                    {"  "}<span className="hl-kw">return</span> analysis;{"\n"}
                    &#125;
                  </pre>
                </div>
              </div>

              {/* Mini AI panel preview */}
              <div className="mockup-ai-preview">
                <div className="mockup-ai-header">
                  <Sparkles size={12} />
                  <span>AI Assistant</span>
                </div>
                <div className="mockup-ai-chat">
                  <div className="ai-preview-msg user">
                    Find edge cases in pairProgram()
                  </div>
                  <div className="ai-preview-msg assistant">
                    The function handles asynchronous review cleanly. Consider adding a timeout fallback.
                  </div>
                </div>
              </div>
            </div>

            <div className="mockup-statusbar">
              <span>
                <GitBranch size={11} /> main
              </span>
              <span>
                <Radio size={11} /> CS-8B2A-9C4D
              </span>
              <span className="status-right-col">Ln 4, Col 12 · UTF-8 · JavaScript</span>
            </div>
          </div>
        </div>
      </section>

      {/* Starter Templates */}
      <section className="home-templates-section">
        <div className="home-section-header">
          <h2>Starter Workspaces</h2>
          <p>Instant workspace configurations with multi-file architectures.</p>
        </div>

        <div className="home-templates-grid">
          {STARTER_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <div
                className="template-box"
                key={tmpl.id}
                onClick={() => launchTemplate(tmpl)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    launchTemplate(tmpl);
                  }
                }}
              >
                <div className="template-box-top">
                  <span className="template-badge">{tmpl.badge}</span>
                  <Icon size={16} />
                </div>
                <h3>{tmpl.title}</h3>
                <p>{tmpl.desc}</p>
                <div className="template-launch-hint">
                  <span>Launch Workspace</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Workspaces (if any) */}
      {recentWorkspaces.length > 0 && (
        <section className="home-recents-section">
          <div className="home-section-header">
            <h2>Recent Workspaces</h2>
            <p>Pick up where you left off on this device.</p>
          </div>

          <div className="home-recents-grid">
            {recentWorkspaces.map((ws) => (
              <div
                className="recent-box"
                key={ws.id}
                onClick={() => navigate(`/room/${ws.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/room/${ws.id}`);
                  }
                }}
              >
                <div className="recent-box-header">
                  <div className="recent-box-title">
                    <FolderOpen size={15} />
                    <span>{ws.title || ws.id}</span>
                  </div>
                  <button
                    aria-label={`Remove ${ws.id}`}
                    className="recent-remove-btn"
                    onClick={(e) => removeRecentWorkspace(ws.id, e)}
                    title="Remove from history"
                    type="button"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="recent-box-meta">
                  <span className="recent-id-badge">ROOM / {ws.id}</span>
                  <span className="recent-time-text">
                    <Clock size={11} /> {formatTimeAgo(ws.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Platform Features Grid */}
      <section className="home-features-section">
        <div className="feature-grid">
          <div className="feature-cell">
            <span className="feature-cell-icon">
              <UsersRound size={18} />
            </span>
            <h3>Real-Time Collaboration</h3>
            <p>
              Socket.IO powered multiplayer coding. Instant sync for code, files, and folder structures.
            </p>
          </div>

          <div className="feature-cell">
            <span className="feature-cell-icon">
              <Sparkles size={18} />
            </span>
            <h3>Gemini AI Assistant</h3>
            <p>
              Integrated pair programmer for code review, bug detection, performance optimization, and unit testing.
            </p>
          </div>

          <div className="feature-cell">
            <span className="feature-cell-icon">
              <FolderPlus size={18} />
            </span>
            <h3>Hierarchical File Explorer</h3>
            <p>
              Create nested folders and files, rename, delete, open local disk directories, and export workspaces.
            </p>
          </div>

          <div className="feature-cell">
            <span className="feature-cell-icon">
              <Terminal size={18} />
            </span>
            <h3>Developer Terminal & Diagnostics</h3>
            <p>
              Interactive terminal commands, Monaco syntax error diagnostics, and workspace output logs.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-container">
          <span>© 2026 Code Studio IDE. Built for collaborative engineering.</span>
          <span className="footer-tag">
            Powered by Monaco · Socket.IO · Google Gemini
          </span>
        </div>
      </footer>
    </div>
  );
}
