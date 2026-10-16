import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  KeyRound,
  Palette,
  RefreshCw,
  Sliders,
  Sparkles,
  Type,
  WrapText,
} from "lucide-react";
import { fetchAIStatus } from "../lib/socket.js";

export default function SettingsPane({
  theme,
  onChangeTheme,
  fontSize,
  onChangeFontSize,
  wordWrap,
  onChangeWordWrap,
  showMinimap,
  onChangeMinimap,
  tabSize = 2,
  onChangeTabSize,
}) {
  const [aiStatus, setAiStatus] = useState("checking");
  const [checking, setChecking] = useState(false);

  async function checkKeyStatus() {
    setChecking(true);
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
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void checkKeyStatus();
  }, []);

  return (
    <aside aria-label="Settings" className="ide-sidebar-panel settings-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-header-title">
          <span>SETTINGS</span>
        </span>
      </div>

      <div className="settings-content">
        {/* Editor Appearance */}
        <div className="settings-group">
          <div className="settings-group-title">
            <Palette size={14} />
            <span>Editor Appearance</span>
          </div>

          <div className="setting-row">
            <div className="setting-label-col">
              <span className="setting-name">Theme</span>
              <span className="setting-desc">Monaco editor visual style</span>
            </div>
            <select
              className="setting-select"
              onChange={(e) => onChangeTheme(e.target.value)}
              value={theme}
            >
              <option value="vs-dark">Dark (Default)</option>
              <option value="hc-black">High Contrast</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-label-col">
              <span className="setting-name">Font Size</span>
              <span className="setting-desc">Editor text size in pixels</span>
            </div>
            <select
              className="setting-select"
              onChange={(e) => onChangeFontSize(Number(e.target.value))}
              value={fontSize}
            >
              <option value="12">12 px</option>
              <option value="13">13 px</option>
              <option value="14">14 px (Default)</option>
              <option value="15">15 px</option>
              <option value="16">16 px</option>
              <option value="18">18 px</option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-label-col">
              <span className="setting-name">Tab Size</span>
              <span className="setting-desc">Number of spaces per indentation</span>
            </div>
            <select
              className="setting-select"
              onChange={(e) => onChangeTabSize?.(Number(e.target.value))}
              value={tabSize}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-label-col">
              <span className="setting-name">Word Wrap</span>
              <span className="setting-desc">Wrap long lines to fit editor</span>
            </div>
            <button
              className={`toggle-switch-btn ${wordWrap === "on" ? "active" : ""}`}
              onClick={() => onChangeWordWrap(wordWrap === "on" ? "off" : "on")}
              type="button"
            >
              <span className="toggle-switch-handle" />
            </button>
          </div>

          <div className="setting-row">
            <div className="setting-label-col">
              <span className="setting-name">Minimap</span>
              <span className="setting-desc">Show code overview navigation bar</span>
            </div>
            <button
              className={`toggle-switch-btn ${showMinimap ? "active" : ""}`}
              onClick={() => onChangeMinimap(!showMinimap)}
              type="button"
            >
              <span className="toggle-switch-handle" />
            </button>
          </div>
        </div>

        {/* AI Model & Key Status */}
        <div className="settings-group">
          <div className="settings-group-title">
            <Sparkles size={14} />
            <span>AI Assistant Configuration</span>
          </div>

          <div className="ai-config-card">
            <div className="ai-config-status-row">
              <span className="ai-status-label">Backend Provider:</span>
              <span className={`ai-badge status-${aiStatus}`}>
                {aiStatus === "ready"
                  ? "Gemini API Connected"
                  : aiStatus === "unconfigured"
                  ? "Key Missing on Server"
                  : "Server Offline"}
              </span>
            </div>

            <p className="ai-config-explanation">
              {aiStatus === "ready" ? (
                "Your Gemini API key is configured on the backend. Code analysis, test generation, and refactoring are fully functional."
              ) : (
                <>
                  To enable Gemini AI assistance, add your free key to{" "}
                  <code>server/.env</code>:
                  <pre className="env-snippet">GEMINI_API_KEY=your_key_here</pre>
                  Get your free API key at{" "}
                  <a
                    href="https://aistudio.google.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Google AI Studio
                  </a>
                  .
                </>
              )}
            </p>

            <button
              className="button button-secondary recheck-key-btn"
              disabled={checking}
              onClick={checkKeyStatus}
              type="button"
            >
              <RefreshCw className={checking ? "spin" : ""} size={12} />
              <span>{checking ? "Checking…" : "Recheck Server Status"}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
