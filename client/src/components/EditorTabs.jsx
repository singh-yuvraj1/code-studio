import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { getLanguageBadge } from "../lib/workspaceModel.js";

export default function EditorTabs({
  openFileIds = [],
  nodes = [],
  activeFileId,
  unsavedMap = {},
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onNewTab,
}) {
  const [tabContextMenu, setTabContextMenu] = useState(null);
  const scrollRef = useRef(null);

  // Close context menu on click outside
  useEffect(() => {
    function handleClickOutside() {
      setTabContextMenu(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter open nodes to ensure they exist and are files
  const openFiles = openFileIds
    .map((id) => nodes.find((n) => n.id === id))
    .filter((node) => node && node.type === "file");

  function handleContextMenu(e, fileId) {
    e.preventDefault();
    e.stopPropagation();
    setTabContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId,
    });
  }

  return (
    <div className="editor-tab-bar" ref={scrollRef}>
      <div className="tab-list" role="tablist">
        {openFiles.map((file) => {
          const isActive = file.id === activeFileId;
          const isUnsaved = Boolean(unsavedMap[file.id]);
          const badge = getLanguageBadge(file.language);

          return (
            <div
              aria-selected={isActive}
              className={`editor-tab ${isActive ? "active-tab" : ""}`}
              key={file.id}
              onClick={() => onSelectTab(file.id)}
              onContextMenu={(e) => handleContextMenu(e, file.id)}
              role="tab"
              title={file.name}
            >
              <span
                className="tab-badge"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
              <span className="tab-title">{file.name}</span>

              {isUnsaved ? (
                <span className="tab-unsaved-dot" title="Unsaved changes" />
              ) : null}

              <button
                aria-label={`Close ${file.name}`}
                className="tab-close-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(file.id);
                }}
                title="Close Tab (Ctrl+W)"
                type="button"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <button
          aria-label="New file"
          className="tab-new-btn"
          onClick={onNewTab}
          title="New File"
          type="button"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Tab Context Menu */}
      {tabContextMenu && (
        <div
          className="tab-context-menu"
          style={{ top: `${tabContextMenu.y}px`, left: `${tabContextMenu.x}px` }}
        >
          <button
            className="context-menu-item"
            onClick={() => {
              onCloseTab(tabContextMenu.fileId);
              setTabContextMenu(null);
            }}
            type="button"
          >
            Close Tab
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              onCloseOtherTabs(tabContextMenu.fileId);
              setTabContextMenu(null);
            }}
            type="button"
          >
            Close Other Tabs
          </button>
          <button
            className="context-menu-item"
            onClick={() => {
              onCloseAllTabs();
              setTabContextMenu(null);
            }}
            type="button"
          >
            Close All Tabs
          </button>
        </div>
      )}
    </div>
  );
}
