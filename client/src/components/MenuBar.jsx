import { useEffect, useRef, useState } from "react";
import {
  AppWindow,
  Braces,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileCode,
  FilePlus,
  FolderOpen,
  FolderPlus,
  HelpCircle,
  Keyboard,
  Maximize2,
  Menu,
  Minimize2,
  PanelBottom,
  PanelLeft,
  PanelRight,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Settings,
  Share2,
  Sparkles,
  UsersRound,
  WrapText,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function MenuBar({
  onNewFile,
  onNewFolder,
  onOpenFile,
  onOpenFolder,
  onSave,
  onExport,
  onCloseActiveTab,
  onTriggerFind,
  onTriggerReplace,
  onTriggerSelectAll,
  onTriggerUndo,
  onTriggerRedo,
  onToggleExplorer,
  onToggleAI,
  onToggleBottomPanel,
  onToggleWordWrap,
  onToggleMinimap,
  onOpenShortcuts,
  onOpenShare,
  showExplorer,
  showAI,
  showBottomPanel,
  wordWrap,
  showMinimap,
  saveState,
  roomId,
  connectionStatus,
  connectedCount = 1,
}) {
  const [activeMenu, setActiveMenu] = useState(null);
  const menuBarRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleMenuClick(menuName) {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  }

  function handleMenuHover(menuName) {
    if (activeMenu) {
      setActiveMenu(menuName);
    }
  }

  function executeAndClose(action) {
    setActiveMenu(null);
    if (typeof action === "function") {
      action();
    }
  }

  return (
    <header className="ide-top-bar" ref={menuBarRef}>
      {/* Left: App Logo & Menus */}
      <div className="top-bar-left">
        <Link className="ide-logo-link" to="/" title="Code Studio — Return to Dashboard">
          <span className="ide-logo-icon">
            <Braces size={16} strokeWidth={2.5} />
          </span>
          <span className="ide-logo-text">Code Studio</span>
        </Link>

        {/* Mobile / Compact Responsive Menu Trigger */}
        <div className="menu-item-wrap menu-compact-wrap">
          <button
            aria-expanded={activeMenu === "compact"}
            className={`menu-trigger-btn menu-compact-btn ${activeMenu === "compact" ? "active" : ""}`}
            onClick={() => handleMenuClick("compact")}
            title="IDE Menu"
            type="button"
          >
            <Menu size={16} />
          </button>
          {activeMenu === "compact" && (
            <div className="menu-dropdown compact-dropdown">
              <div className="compact-dropdown-section">
                <span className="compact-section-header">FILE</span>
                <button className="menu-option" onClick={() => executeAndClose(onNewFile)} type="button">
                  <FilePlus size={13} /> <span>New File</span> <kbd>Ctrl+N</kbd>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onNewFolder)} type="button">
                  <FolderPlus size={13} /> <span>New Folder</span> <kbd>Ctrl+Shift+N</kbd>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onOpenFolder)} type="button">
                  <FolderOpen size={13} /> <span>Open Folder…</span> <kbd>Ctrl+Shift+O</kbd>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onSave)} type="button">
                  <Save size={13} /> <span>Save Draft</span> <kbd>Ctrl+S</kbd>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onExport)} type="button">
                  <Download size={13} /> <span>Export Workspace</span>
                </button>
              </div>
              <div className="menu-divider" />
              <div className="compact-dropdown-section">
                <span className="compact-section-header">VIEW</span>
                <button className="menu-option" onClick={() => executeAndClose(onToggleExplorer)} type="button">
                  <PanelLeft size={13} /> <span>Toggle Explorer</span>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onToggleAI)} type="button">
                  <Sparkles size={13} /> <span>Toggle AI</span>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onToggleBottomPanel)} type="button">
                  <PanelBottom size={13} /> <span>Toggle Output Panel</span>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onToggleWordWrap)} type="button">
                  <WrapText size={13} /> <span>Word Wrap ({wordWrap})</span>
                </button>
              </div>
              <div className="menu-divider" />
              <div className="compact-dropdown-section">
                <span className="compact-section-header">TOOLS & HELP</span>
                <button className="menu-option" onClick={() => executeAndClose(onOpenShare)} type="button">
                  <Share2 size={13} /> <span>Share Room</span>
                </button>
                <button className="menu-option" onClick={() => executeAndClose(onOpenShortcuts)} type="button">
                  <Keyboard size={13} /> <span>Shortcuts (F1)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Menu Navigation */}
        <nav aria-label="Editor Menu" className="ide-menu-nav">
          {/* File Menu */}
          <div className="menu-item-wrap">
            <button
              aria-expanded={activeMenu === "file"}
              className={`menu-trigger-btn ${activeMenu === "file" ? "active" : ""}`}
              onClick={() => handleMenuClick("file")}
              onMouseEnter={() => handleMenuHover("file")}
              type="button"
            >
              File
            </button>
            {activeMenu === "file" && (
              <div className="menu-dropdown">
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onNewFile)}
                  type="button"
                >
                  <FilePlus size={14} />
                  <span>New File</span>
                  <kbd>Ctrl+N</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onNewFolder)}
                  type="button"
                >
                  <FolderPlus size={14} />
                  <span>New Folder</span>
                  <kbd>Ctrl+Shift+N</kbd>
                </button>
                <div className="menu-divider" />
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onOpenFile)}
                  type="button"
                >
                  <FileCode size={14} />
                  <span>Open File…</span>
                  <kbd>Ctrl+O</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onOpenFolder)}
                  type="button"
                >
                  <FolderOpen size={14} />
                  <span>Open Folder…</span>
                  <kbd>Ctrl+Shift+O</kbd>
                </button>
                <div className="menu-divider" />
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onSave)}
                  type="button"
                >
                  <Save size={14} />
                  <span>Save Draft</span>
                  <kbd>Ctrl+S</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onExport)}
                  type="button"
                >
                  <Download size={14} />
                  <span>Export Workspace</span>
                  <kbd>Ctrl+Shift+E</kbd>
                </button>
                <div className="menu-divider" />
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onCloseActiveTab)}
                  type="button"
                >
                  <X size={14} />
                  <span>Close File Tab</span>
                  <kbd>Ctrl+W</kbd>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="menu-item-wrap">
            <button
              aria-expanded={activeMenu === "edit"}
              className={`menu-trigger-btn ${activeMenu === "edit" ? "active" : ""}`}
              onClick={() => handleMenuClick("edit")}
              onMouseEnter={() => handleMenuHover("edit")}
              type="button"
            >
              Edit
            </button>
            {activeMenu === "edit" && (
              <div className="menu-dropdown">
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onTriggerUndo)}
                  type="button"
                >
                  <RotateCcw size={14} />
                  <span>Undo</span>
                  <kbd>Ctrl+Z</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onTriggerRedo)}
                  type="button"
                >
                  <RotateCw size={14} />
                  <span>Redo</span>
                  <kbd>Ctrl+Y</kbd>
                </button>
                <div className="menu-divider" />
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onTriggerFind)}
                  type="button"
                >
                  <Search size={14} />
                  <span>Find in File</span>
                  <kbd>Ctrl+F</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onTriggerReplace)}
                  type="button"
                >
                  <Copy size={14} />
                  <span>Replace in File</span>
                  <kbd>Ctrl+H</kbd>
                </button>
                <div className="menu-divider" />
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onTriggerSelectAll)}
                  type="button"
                >
                  <AppWindow size={14} />
                  <span>Select All</span>
                  <kbd>Ctrl+A</kbd>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="menu-item-wrap">
            <button
              aria-expanded={activeMenu === "view"}
              className={`menu-trigger-btn ${activeMenu === "view" ? "active" : ""}`}
              onClick={() => handleMenuClick("view")}
              onMouseEnter={() => handleMenuHover("view")}
              type="button"
            >
              View
            </button>
            {activeMenu === "view" && (
              <div className="menu-dropdown">
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onToggleExplorer)}
                  type="button"
                >
                  <PanelLeft size={14} />
                  <span>Toggle Explorer</span>
                  <kbd>Ctrl+B</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onToggleAI)}
                  type="button"
                >
                  <PanelRight size={14} />
                  <span>Toggle AI Assistant</span>
                  <kbd>Ctrl+Shift+A</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onToggleBottomPanel)}
                  type="button"
                >
                  <PanelBottom size={14} />
                  <span>Toggle Bottom Panel</span>
                  <kbd>Ctrl+J</kbd>
                </button>
                <div className="menu-divider" />
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onToggleWordWrap)}
                  type="button"
                >
                  <WrapText size={14} />
                  <span>Word Wrap: {wordWrap === "on" ? "On" : "Off"}</span>
                  <kbd>Alt+Z</kbd>
                </button>
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onToggleMinimap)}
                  type="button"
                >
                  <Maximize2 size={14} />
                  <span>Minimap: {showMinimap ? "Shown" : "Hidden"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div className="menu-item-wrap">
            <button
              aria-expanded={activeMenu === "help"}
              className={`menu-trigger-btn ${activeMenu === "help" ? "active" : ""}`}
              onClick={() => handleMenuClick("help")}
              onMouseEnter={() => handleMenuHover("help")}
              type="button"
            >
              Help
            </button>
            {activeMenu === "help" && (
              <div className="menu-dropdown">
                <button
                  className="menu-option"
                  onClick={() => executeAndClose(onOpenShortcuts)}
                  type="button"
                >
                  <Keyboard size={14} />
                  <span>Keyboard Shortcuts</span>
                  <kbd>F1</kbd>
                </button>
                <div className="menu-divider" />
                <a
                  className="menu-option"
                  href="https://github.com"
                  rel="noreferrer"
                  target="_blank"
                >
                  <HelpCircle size={14} />
                  <span>Documentation & Guides</span>
                </a>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Center: Workspace Room Title & Share Pill */}
      <div className="top-bar-center">
        <button
          className="workspace-pill-btn"
          onClick={onOpenShare}
          title="Click to view room collaboration details and share link"
          type="button"
        >
          <span
            className={`pill-status-dot dot-${connectionStatus}`}
            title={`Status: ${connectionStatus}`}
          />
          <span className="pill-room-id">ROOM: {roomId}</span>
          <span className="pill-user-count" title={`${connectedCount} active collaborators`}>
            <UsersRound size={12} />
            <span>{connectedCount}</span>
          </span>
        </button>
      </div>

      {/* Right: Quick IDE Actions */}
      <div className="top-bar-right">
        {/* Save Draft Indicator & Button */}
        <button
          className={`top-bar-action-btn ${saveState === "saved" ? "btn-saved" : ""}`}
          onClick={onSave}
          title="Save Workspace (Ctrl+S)"
          type="button"
        >
          {saveState === "saving" ? (
            <span className="spin">⏳</span>
          ) : saveState === "saved" ? (
            <Check size={13} />
          ) : (
            <Save size={13} />
          )}
          <span>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}</span>
        </button>

        {/* Share Button */}
        <button
          className="top-bar-action-btn btn-share"
          onClick={onOpenShare}
          title="Share Room with collaborators"
          type="button"
        >
          <Share2 size={13} />
          <span>Share</span>
        </button>

        {/* AI Assistant Quick Toggle */}
        <button
          aria-label={showAI ? "Hide AI Assistant" : "Show AI Assistant"}
          className={`top-bar-icon-btn ${showAI ? "active-accent" : ""}`}
          onClick={onToggleAI}
          title="Toggle AI Assistant (Ctrl+Shift+A)"
          type="button"
        >
          <Sparkles size={14} />
        </button>

        {/* Bottom Panel Toggle */}
        <button
          aria-label="Toggle Bottom Panel"
          className={`top-bar-icon-btn ${showBottomPanel ? "active-accent" : ""}`}
          onClick={onToggleBottomPanel}
          title="Toggle Bottom Terminal/Problems Panel (Ctrl+J)"
          type="button"
        >
          <PanelBottom size={14} />
        </button>
      </div>
    </header>
  );
}
