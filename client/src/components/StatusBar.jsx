import {
  AlertCircle,
  AlertTriangle,
  GitBranch,
  Radio,
  Sparkles,
  UsersRound,
  Wifi,
  WifiOff,
} from "lucide-react";

export default function StatusBar({
  roomId = "",
  connectionStatus = "connected",
  connectedCount = 1,
  saveState = "idle",
  errorCount = 0,
  warningCount = 0,
  cursorLine = 1,
  cursorCol = 1,
  selectionLength = 0,
  language = "javascript",
  aiStatus = "ready",
  onToggleBottomPanel,
  onToggleAI,
  onOpenCollab,
}) {
  return (
    <footer aria-label="Status Bar" className="ide-status-bar">
      {/* Left Items */}
      <div className="status-bar-left">
        {/* Remote Collab Indicator */}
        <button
          className={`status-item status-collab status-${connectionStatus}`}
          onClick={onOpenCollab}
          title={`Room: ${roomId} · Status: ${connectionStatus}`}
          type="button"
        >
          {connectionStatus === "connected" ? (
            <>
              <Radio size={11} />
              <span>{roomId || "Connected"}</span>
              <span className="status-users">
                <UsersRound size={10} /> {connectedCount}
              </span>
            </>
          ) : connectionStatus === "reconnecting" ? (
            <>
              <Wifi className="spin" size={11} />
              <span>Reconnecting…</span>
            </>
          ) : (
            <>
              <WifiOff size={11} />
              <span>Local Offline</span>
            </>
          )}
        </button>

        {/* Git Branch */}
        <span className="status-item status-branch" title="Git Branch: main">
          <GitBranch size={11} />
          <span>main</span>
        </span>

        {/* Problems Indicator */}
        <button
          className="status-item status-problems"
          onClick={onToggleBottomPanel}
          title={`${errorCount} Errors, ${warningCount} Warnings (Ctrl+J)`}
          type="button"
        >
          <span className="problem-count-item">
            <AlertCircle className={errorCount > 0 ? "icon-err" : ""} size={11} />
            <span>{errorCount}</span>
          </span>
          <span className="problem-count-item">
            <AlertTriangle className={warningCount > 0 ? "icon-warn" : ""} size={11} />
            <span>{warningCount}</span>
          </span>
        </button>

        {/* Save Status */}
        <span className="status-item status-sync">
          {saveState === "saving" ? (
            <span>Saving draft…</span>
          ) : saveState === "saved" ? (
            <span>Workspace Saved</span>
          ) : saveState === "error" ? (
            <span className="status-err-text">Draft save error</span>
          ) : null}
        </span>
      </div>

      {/* Right Items */}
      <div className="status-bar-right">
        {/* Cursor Position */}
        <span className="status-item status-cursor" title="Cursor Line and Column">
          Ln {cursorLine}, Col {cursorCol}
          {selectionLength > 0 && ` (${selectionLength} selected)`}
        </span>

        {/* Spaces Indentation */}
        <span className="status-item status-indent">Spaces: 2</span>

        {/* Encoding */}
        <span className="status-item status-encoding">UTF-8</span>

        {/* Language */}
        <span className="status-item status-language" title={`Language: ${language}`}>
          {language}
        </span>

        {/* AI Assistant Status */}
        <button
          className={`status-item status-ai ai-pill-${aiStatus}`}
          onClick={onToggleAI}
          title={
            aiStatus === "ready"
              ? "Gemini AI: Ready"
              : aiStatus === "unconfigured"
              ? "Gemini AI: Key Missing"
              : "Gemini AI: Offline"
          }
          type="button"
        >
          <Sparkles size={11} />
          <span>Gemini AI</span>
        </button>
      </div>
    </footer>
  );
}
