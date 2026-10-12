import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Code2,
  Focus,
  GitBranch,
  Link2,
  UsersRound,
  Wifi,
} from "lucide-react";
import Brand from "../components/Brand.jsx";
import { connectSocket, emitWithAck, getDisplayName, getSocket } from "../lib/socket.js";

const ROOM_ID_PATTERN = /^[a-zA-Z0-9-]{4,40}$/;

export default function HomePage() {
  const navigate = useNavigate();
  const roomIdInput = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  async function createRoom() {
    if (pendingAction) return;
    setPendingAction("create");
    setError("");
    try {
      const socket = getSocket();
      await connectSocket(socket);
      const response = await emitWithAck(socket, "room:create", {
        displayName: getDisplayName(),
      });
      navigate(`/room/${response.roomId}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPendingAction("");
    }
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

  return (
    <main className="landing-shell">
      <nav aria-label="Main navigation" className="landing-nav page-width">
        <Brand />
        <span className="nav-context">Collaborative code editor</span>
      </nav>

      <section aria-labelledby="landing-title" className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            A focused space to build together
          </div>
          <h1 id="landing-title">Your team&apos;s workspace for code.</h1>
          <p className="hero-description">
            Write, collaborate, and solve problems together in one workspace.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" disabled={Boolean(pendingAction)} onClick={createRoom} type="button">
              <Code2 size={15} />
              {pendingAction === "create" ? "Creating…" : "Create workspace"}
              <ArrowRight size={15} />
            </button>
            <button className="button button-secondary" disabled={Boolean(pendingAction)} onClick={focusJoinInput} type="button">
              Join with room ID
            </button>
          </div>

          <form className="join-form" onSubmit={joinRoom} noValidate>
            <label className="join-label" htmlFor="room-id">
              <Link2 aria-hidden="true" size={14} />
              Join an existing workspace
            </label>
            <div className={`join-input-wrap ${error ? "has-error" : ""}`}>
              <input
                ref={roomIdInput}
                aria-describedby={error ? "room-error" : "room-hint"}
                aria-invalid={Boolean(error)}
                autoComplete="off"
                id="room-id"
                onChange={(event) => {
                  setRoomId(event.target.value);
                  if (error) setError("");
                }}
                placeholder="e.g. CS-a1b2c3d4"
                value={roomId}
              />
              <button className="join-submit" disabled={Boolean(pendingAction)} type="submit">
                {pendingAction === "join" ? "Joining…" : "Join"} <ArrowRight aria-hidden="true" size={14} />
              </button>
            </div>
            <p className={error ? "form-error" : "join-hint"} id={error ? "room-error" : "room-hint"} role={error ? "alert" : undefined}>
              {error || "Room IDs use 4–40 letters, numbers, or hyphens."}
            </p>
          </form>
        </div>

        <div aria-label="Code editor preview" className="hero-visual" role="img">
          <div className="editor-preview">
            <div className="preview-titlebar">
              <div aria-hidden="true" className="window-dots">
                <i />
                <i />
                <i />
              </div>
              <div className="preview-tab">
                <span className="js-badge">JS</span> rooms.js
              </div>
              <span className="preview-mode">Editor preview</span>
            </div>
            <div className="preview-body">
              <div aria-hidden="true" className="preview-gutter">
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index}>{index + 1}</span>
                ))}
              </div>
              <pre>
                <span className="code-purple">function</span>{" "}
                <span className="code-yellow">createRoom</span>() {"{"}
                {"\n"}  <span className="code-purple">const</span>{" "}
                <span className="code-blue">roomId</span> ={" "}
                <span className="code-green">crypto</span>.
                <span className="code-yellow">randomUUID</span>();
                {"\n\n"}  <span className="code-purple">return</span> {"{"}
                {"\n"}    <span className="code-blue">id</span>: roomId,
                {"\n"}    <span className="code-blue">language</span>:{" "}
                <span className="code-green">&quot;javascript&quot;</span>,
                {"\n"}    <span className="code-blue">members</span>: [],
                {"\n"}  {"}"};
                {"\n"}{"}"}
              </pre>
            </div>
            <div className="preview-footer">
              <span><GitBranch aria-hidden="true" size={13} /> main</span>
              <span><Wifi aria-hidden="true" size={13} /> JavaScript</span>
              <span>UTF-8</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Workspace features" className="feature-strip page-width">
        <article className="feature-item">
          <span className="feature-icon"><UsersRound aria-hidden="true" size={17} /></span>
          <div>
            <h2>Real-time collaboration</h2>
            <p>Work on the same code with your teammates.</p>
          </div>
        </article>
        <article className="feature-item">
          <span className="feature-icon"><Bot aria-hidden="true" size={17} /></span>
          <div>
            <h2>AI coding assistant</h2>
            <p>Understand code, investigate bugs, and explore improvements.</p>
          </div>
        </article>
        <article className="feature-item">
          <span className="feature-icon"><Focus aria-hidden="true" size={17} /></span>
          <div>
            <h2>Distraction-free editor</h2>
            <p>Write and review code in a focused workspace.</p>
          </div>
        </article>
      </section>

      <footer className="landing-footer page-width">
        <span>© 2026 CodeSync AI</span>
        <span className="preview-disclosure">Frontend preview · Collaboration and AI are not connected</span>
      </footer>
    </main>
  );
}
