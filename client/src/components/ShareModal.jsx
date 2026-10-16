import { useEffect, useState } from "react";
import { Check, Copy, Link2, Share2, UsersRound, X } from "lucide-react";

export default function ShareModal({
  isOpen = false,
  onClose,
  roomId = "",
  users = [],
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  async function handleCopy(text, type) {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "id") {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 1800);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 1800);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card share-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Share2 size={16} />
            <h3>Share Collaboration Room</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={15} />
          </button>
        </div>

        <div className="share-modal-body">
          <p className="share-modal-intro">
            Anyone with this link or room ID can join your workspace and code with you in real time.
          </p>

          {/* Room ID Copy */}
          <div className="share-field-group">
            <label className="share-field-label">ROOM ID</label>
            <div className="share-input-row">
              <input className="share-text-input" readOnly value={roomId} />
              <button
                className="button button-primary copy-action-btn"
                onClick={() => handleCopy(roomId, "id")}
                type="button"
              >
                {copiedId ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedId ? "Copied" : "Copy ID"}</span>
              </button>
            </div>
          </div>

          {/* Full Link Copy */}
          <div className="share-field-group">
            <label className="share-field-label">DIRECT JOIN LINK</label>
            <div className="share-input-row">
              <input className="share-text-input" readOnly value={shareUrl} />
              <button
                className="button button-secondary copy-action-btn"
                onClick={() => handleCopy(shareUrl, "url")}
                type="button"
              >
                {copiedUrl ? <Check size={13} /> : <Link2 size={13} />}
                <span>{copiedUrl ? "Copied Link" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* Connected Peers Summary */}
          <div className="share-peers-summary">
            <span className="peers-summary-title">
              <UsersRound size={13} /> Active Collaborators ({users.length})
            </span>
            <div className="share-peers-tags">
              {users.map((u, i) => (
                <span className="share-peer-tag" key={u.id || i}>
                  <i className="presence-dot" />
                  {u.displayName}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
