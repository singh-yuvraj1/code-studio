import {
  Bot,
  Files,
  Keyboard,
  Search,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";

export default function ActivityBar({
  activeView = "explorer",
  onSelectView,
  onToggleView,
  showAI = true,
  onToggleAI,
  onOpenSettings,
  onOpenShortcuts,
  connectedCount = 1,
  connectionStatus = "connected",
}) {
  function handleItemClick(viewId) {
    if (activeView === viewId) {
      onToggleView();
    } else {
      onSelectView(viewId);
    }
  }

  return (
    <aside aria-label="Activity Bar" className="ide-activity-bar">
      {/* Top Navigation Views */}
      <div className="activity-bar-group top-group">
        {/* Explorer */}
        <button
          aria-label="File Explorer"
          className={`activity-btn ${activeView === "explorer" ? "active" : ""}`}
          onClick={() => handleItemClick("explorer")}
          title="Explorer (Ctrl+Shift+E / Ctrl+B)"
          type="button"
        >
          <Files size={18} />
          <span className="activity-indicator" />
        </button>

        {/* Search */}
        <button
          aria-label="Search Workspace"
          className={`activity-btn ${activeView === "search" ? "active" : ""}`}
          onClick={() => handleItemClick("search")}
          title="Search in Files (Ctrl+Shift+F)"
          type="button"
        >
          <Search size={18} />
          <span className="activity-indicator" />
        </button>

        {/* Collaboration */}
        <button
          aria-label="Collaboration & Connected Peers"
          className={`activity-btn ${activeView === "collab" ? "active" : ""}`}
          onClick={() => handleItemClick("collab")}
          title="Collaboration & Teammates"
          type="button"
        >
          <UsersRound size={18} />
          {connectedCount > 1 && (
            <span className="activity-badge">{connectedCount}</span>
          )}
          <span className="activity-indicator" />
        </button>

        {/* AI Assistant */}
        <button
          aria-label="AI Assistant"
          className={`activity-btn ${showAI ? "active-ai" : ""}`}
          onClick={onToggleAI}
          title="Gemini AI Assistant (Ctrl+Shift+A)"
          type="button"
        >
          <Sparkles size={18} />
          <span className="activity-indicator" />
        </button>
      </div>

      {/* Bottom Group */}
      <div className="activity-bar-group bottom-group">
        {/* Keyboard Shortcuts */}
        <button
          aria-label="Keyboard Shortcuts"
          className="activity-btn"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (F1)"
          type="button"
        >
          <Keyboard size={18} />
        </button>

        {/* Settings */}
        <button
          aria-label="Settings"
          className={`activity-btn ${activeView === "settings" ? "active" : ""}`}
          onClick={() => handleItemClick("settings")}
          title="Settings (Ctrl+,)"
          type="button"
        >
          <Settings size={18} />
          <span className="activity-indicator" />
        </button>
      </div>
    </aside>
  );
}
