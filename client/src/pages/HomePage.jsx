import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Clock,
  Code2,
  FileCode2,
  Focus,
  FolderOpen,
  GitBranch,
  Layers,
  Link2,
  Plus,
  Sparkles,
  Terminal,
  Trash2,
  UsersRound,
  Wifi,
  Zap,
} from "lucide-react";
import Brand from "../components/Brand.jsx";
import { connectSocket, emitWithAck, getDisplayName, getSocket, isBackendConfigured } from "../lib/socket.js";

const ROOM_ID_PATTERN = /^[a-zA-Z0-9-]{4,40}$/;

const TEMPLATES = [
  {
    id: "js",
    title: "JavaScript",
    lang: "javascript",
    desc: "Modern ES6+ workspace with console output",
    icon: Code2,
    badge: "JS",
  },
  {
    id: "ts",
    title: "TypeScript",
    lang: "typescript",
    desc: "Typed functions, interfaces, and utilities",
    icon: Terminal,
    badge: "TS",
  },
  {
    id: "python",
    title: "Python",
    lang: "python",
    desc: "Data structures, algorithms, and scripting",
    icon: FileCode2,
    badge: "PY",
  },
  {
    id: "web",
    title: "Full-Stack Web",
    lang: "html",
    desc: "HTML5, CSS styles, and JavaScript modules",
    icon: Layers,
    badge: "WEB",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const roomIdInput = useRef(null);
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
    } catch (e) {
      console.warn("Unable to read recent workspaces", e);
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

  // Generate a random local room ID
  function generateLocalRoomId(prefix = "CS") {
    return `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  async function createRoom() {
    if (pendingAction) return;
    setPendingAction("create");
    setError("");

    // If backend is not configured or in production without URL, allow standalone workspace creation directly
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
      // Provide actionable message with fallback option to launch offline workspace
      setError(
        `${requestError.message} You can also launch a local offline workspace below.`
      );
    } finally {
      setPendingAction("");
    }
  }

  function launchLocalWorkspace() {
    const localId = generateLocalRoomId("LOCAL");
    navigate(`/room/${localId}`);
  }

  function launchTemplate(template) {
    const templateRoomId = generateLocalRoomId(template.badge);
    navigate(`/room/${templateRoomId}`);
  }

  function focusJoinInput() {
    roomIdInput.current?.focus();
    roomIdInput.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function joinRoom(event) {
    event.preventDefault();
    if (pendingAction) return;
    const normalizedId = roomId.trim();
    if (!ROOM_ID_PATTERN.test(normalizedId)) {
      setError("Use 4–40 letters, numbers, or hyphens.");
      roomIdInput.current?.focus();
      return;
    }

    setPendingAction("join");
    setError("");

    if (!isBackendConfigured()) {
      // Open offline/local copy of that room ID
      navigate(`/room/${normalizedId}`);
      return;
    }

    try {
      const socket = getSocket();
      await connectSocket(socket);
      const response = await emitWithAck(socket, "room:join", {
        roomId: normalizedId,
        displayName: getDisplayName(),
      });
      navigate(`/room/${response.roomId}`);
    } catch (requestError) {
      setError(requestError.message);
      roomIdInput.current?.focus();
    } finally {
      setPendingAction("");
    }
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
    <main className="landing-shell">
      {/* Top Navbar */}
      <nav aria-label="Main navigation" className="landing-nav page-width">
        <Brand />
        <div className="nav-right">
          <span className="nav-context">Code Studio Platform</span>
          <button
            className="button button-quiet nav-scratchpad-btn"
            onClick={launchLocalWorkspace}
            title="Open an instant code editor scratchpad"
            type="button"
          >
            <Plus size={13} />
            <span>New Scratchpad</span>
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section aria-labelledby="landing-title" className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            Full-Stack AI Coding Environment
          </div>
          <h1 id="landing-title">Your team&apos;s workspace for code.</h1>
          <p className="hero-description">
            Write, collaborate, review, and debug together in a professional Monaco-powered workspace with AI assistance.
          </p>
          <div className="hero-actions">
            <button
              className="button button-primary"
              disabled={Boolean(pendingAction)}
              onClick={createRoom}
              type="button"
            >
              <Code2 size={15} />
              {pendingAction === "create" ? "Opening…" : "Create Workspace"}
              <ArrowRight size={15} />
            </button>
            <button
              className="button button-secondary"
              disabled={Boolean(pendingAction)}
              onClick={focusJoinInput}
              type="button"
            >
              Join with Room ID
            </button>
          </div>

          {/* Join Existing Workspace Form */}
          <form className="join-form" noValidate onSubmit={joinRoom}>
            <label className="join-label" htmlFor="room-id">
              <Link2 aria-hidden="true" size={14} />
              Join an existing workspace
            </label>
            <div className={`join-input-wrap ${error ? "has-error" : ""}`}>
              <input
                aria-describedby={error ? "room-error" : "room-hint"}
                aria-invalid={Boolean(error)}
                autoComplete="off"
                id="room-id"
                onChange={(event) => {
                  setRoomId(event.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. CS-A1B2C3D4"
                ref={roomIdInput}
                value={roomId}
              />
              <button className="join-submit" disabled={Boolean(pendingAction)} type="submit">
                {pendingAction === "join" ? "Joining…" : "Join"}{" "}
                <ArrowRight aria-hidden="true" size={14} />
              </button>
            </div>
            <p
              className={error ? "form-error" : "join-hint"}
              id={error ? "room-error" : "room-hint"}
              role={error ? "alert" : undefined}
            >
              {error || "Room IDs use 4–40 letters, numbers, or hyphens."}
            </p>
          </form>
        </div>

        {/* Hero Visual Preview */}
        <div aria-label="Code editor preview" className="hero-visual" role="img">
          <div className="editor-preview">
            <div className="preview-titlebar">
              <div aria-hidden="true" className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <div className="preview-tab">
                <span className="js-badge">JS</span> main.js
              </div>
              <span className="preview-mode">Code Studio</span>
            </div>
            <div className="preview-body">
              <div aria-hidden="true" className="preview-gutter">
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index}>{index + 1}</span>
                ))}
              </div>
              <pre>
                <span className="code-purple">import</span> {"{ "}
                <span className="code-blue">ai</span>
                {" }"} <span className="code-purple">from</span>{" "}
                <span className="code-green">&quot;@code-studio/ai&quot;</span>;
                {"\n\n"}<span className="code-purple">export default async function</span>{" "}
                <span className="code-yellow">pairProgram</span>() {"{"}
                {"\n"}  <span className="code-purple">const</span>{" "}
                <span className="code-blue">insights</span> ={" "}
                <span className="code-purple">await</span>{" "}
                <span className="code-blue">ai</span>.<span className="code-yellow">reviewCode</span>();
                {"\n"}  <span className="code-purple">return</span> insights;
                {"\n"}{"}"}
              </pre>
            </div>
            <div className="preview-footer">
              <span>
                <GitBranch aria-hidden="true" size={13} /> main
              </span>
              <span>
                <Sparkles aria-hidden="true" size={13} /> Gemini AI
              </span>
              <span>UTF-8</span>
            </div>
          </div>
        </div>
      </section>

      {/* Starter Templates Section */}
      <section aria-labelledby="templates-title" className="templates-section page-width">
        <div className="section-header">
          <h2 id="templates-title">Quick Starter Templates</h2>
          <p>Launch an instant workspace configured for your language of choice.</p>
        </div>
        <div className="templates-grid">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <div
                className="template-card"
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
                <div className="template-card-top">
                  <span className="template-badge">{tmpl.badge}</span>
                  <Icon size={16} />
                </div>
                <h3>{tmpl.title}</h3>
                <p>{tmpl.desc}</p>
                <div className="template-launch-link">
                  <span>Launch Workspace</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Workspaces Section (Shown if user has visited rooms) */}
      {recentWorkspaces.length > 0 && (
        <section aria-labelledby="recents-title" className="recents-section page-width">
          <div className="section-header">
            <h2 id="recents-title">Recent Workspaces</h2>
            <p>Pick up right where you left off on this device.</p>
          </div>
          <div className="recents-grid">
            {recentWorkspaces.map((ws) => (
              <div
                className="recent-card"
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
                <div className="recent-card-header">
                  <div className="recent-card-title">
                    <FolderOpen size={14} />
                    <span>{ws.title || ws.id}</span>
                  </div>
                  <button
                    aria-label={`Remove ${ws.id} from recent history`}
                    className="recent-delete-btn"
                    onClick={(e) => removeRecentWorkspace(ws.id, e)}
                    title="Remove from history"
                    type="button"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="recent-card-meta">
                  <span className="recent-room-id">ROOM / {ws.id}</span>
                  <span className="recent-time">
                    <Clock size={11} /> {formatTimeAgo(ws.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feature Strip */}
      <section aria-label="Platform features" className="feature-strip page-width">
        <article className="feature-item">
          <span className="feature-icon">
            <UsersRound aria-hidden="true" size={17} />
          </span>
          <div>
            <h2>Real-time Collaboration</h2>
            <p>Work on code with your teammates with live synchronization.</p>
          </div>
        </article>
        <article className="feature-item">
          <span className="feature-icon">
            <Bot aria-hidden="true" size={17} />
          </span>
          <div>
            <h2>Gemini AI Assistant</h2>
            <p>Explain code, identify bugs, write tests, and explore refactoring.</p>
          </div>
        </article>
        <article className="feature-item">
          <span className="feature-icon">
            <Focus aria-hidden="true" size={17} />
          </span>
          <div>
            <h2>Multi-File Monaco Editor</h2>
            <p>Full language tooling, syntax highlighting, and local persistence.</p>
          </div>
        </article>
      </section>

      {/* Footer */}
      <footer className="landing-footer page-width">
        <span>© 2026 Code Studio</span>
        <span className="preview-disclosure">
          Production Ready · Dual-Mode Collaboration & Offline Editor
        </span>
      </footer>
    </main>
  );
}
