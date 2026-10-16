import { useState } from "react";
import {
  Check,
  Copy,
  Link2,
  LogIn,
  Plus,
  Radio,
  Share2,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getDisplayName } from "../lib/socket.js";

export default function CollaborationPane({
  roomId = "",
  users = [],
  connectionStatus = "connected",
  onJoinRoom,
  onCreateRoom,
  onCopyLink,
  isCopied = false,
}) {
  const [targetRoomId, setTargetRoomId] = useState("");
  const [joinError, setJoinError] = useState("");
  const myDisplayName = getDisplayName();

  function handleJoinSubmit(e) {
    e.preventDefault();
    const clean = targetRoomId.trim();
    if (!clean) {
      setJoinError("Enter a room ID");
      return;
    }
    if (clean === roomId) {
      setJoinError("You are already in this room");
      return;
    }
    setJoinError("");
    onJoinRoom(clean);
  }

  return (
    <aside aria-label="Collaboration" className="ide-sidebar-panel collab-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-header-title">
          <span>COLLABORATION</span>
        </span>
      </div>

      <div className="collab-content">
        {/* Current Room Card */}
        <div className="collab-card">
          <div className="collab-card-header">
            <span className="collab-label">ACTIVE ROOM</span>
            <span className={`collab-status-badge badge-${connectionStatus}`}>
              {connectionStatus === "connected" ? (
                <>
                  <Radio className="pulse" size={11} /> Connected
                </>
              ) : connectionStatus === "reconnecting" ? (
                <>
                  <Wifi className="spin" size={11} /> Reconnecting…
                </>
              ) : (
                <>
                  <WifiOff size={11} /> Local Offline
                </>
              )}
            </span>
          </div>

          <div className="room-id-display">
            <code>{roomId}</code>
            <button
              className="copy-room-btn"
              onClick={onCopyLink}
              title="Copy Room ID and Share Link"
              type="button"
            >
              {isCopied ? <Check size={13} /> : <Copy size={13} />}
              <span>{isCopied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <p className="collab-hint">
            Share this Room ID or link with your teammates. All edits and files are
            synchronized in real time.
          </p>
        </div>

        {/* Connected Collaborators */}
        <div className="collab-section">
          <div className="section-title-row">
            <span className="section-title">
              CONNECTED PEERS ({users.length})
            </span>
          </div>

          <div className="peers-list">
            {users.length === 0 ? (
              <div className="peer-row self-peer">
                <span className="peer-avatar">Y</span>
                <div className="peer-info">
                  <span className="peer-name">{myDisplayName} (You)</span>
                  <span className="peer-status">Active now</span>
                </div>
              </div>
            ) : (
              users.map((user, idx) => {
                const isMe = user.displayName === myDisplayName;
                const initial = (user.displayName || "U").charAt(0).toUpperCase();
                const colors = [
                  "#10b981",
                  "#3b82f6",
                  "#ec4899",
                  "#f59e0b",
                  "#8b5cf6",
                  "#06b6d4",
                ];
                const avatarColor = colors[idx % colors.length];

                return (
                  <div className={`peer-row ${isMe ? "self-peer" : ""}`} key={user.id || idx}>
                    <span
                      className="peer-avatar"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initial}
                    </span>
                    <div className="peer-info">
                      <span className="peer-name">
                        {user.displayName} {isMe && <b className="me-badge">(You)</b>}
                      </span>
                      <span className="peer-status">Collaborator</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Switch / Join Another Room */}
        <div className="collab-section">
          <div className="section-title-row">
            <span className="section-title">JOIN ANOTHER ROOM</span>
          </div>

          <form className="join-room-form" onSubmit={handleJoinSubmit}>
            <div className="join-room-input-wrap">
              <Link2 size={13} />
              <input
                className="join-room-input"
                onChange={(e) => {
                  setTargetRoomId(e.target.value);
                  if (joinError) setJoinError("");
                }}
                placeholder="e.g. CS-9A2F81"
                value={targetRoomId}
              />
              <button className="join-room-btn" type="submit">
                <LogIn size={13} />
                <span>Join</span>
              </button>
            </div>
            {joinError && <p className="join-error-text">{joinError}</p>}
          </form>

          <button
            className="create-new-room-btn"
            onClick={onCreateRoom}
            type="button"
          >
            <Plus size={14} />
            <span>Create New Room</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
