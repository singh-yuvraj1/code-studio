import { useState } from "react";
import {
  Check,
  FileCode,
  FilePlus,
  FolderOpen,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

export function detectLanguage(fileName = "") {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
      return "python";
    case "html":
    case "htm":
      return "html";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "json":
      return "json";
    case "java":
      return "java";
    case "cpp":
    case "cc":
    case "c":
    case "h":
    case "hpp":
      return "cpp";
    case "md":
    case "markdown":
      return "markdown";
    case "js":
    case "jsx":
    default:
      return "javascript";
  }
}

export function getLanguageBadge(language) {
  switch (language) {
    case "typescript":
      return { text: "TS", color: "#3178c6", bg: "#1f2a3a" };
    case "python":
      return { text: "PY", color: "#3776ab", bg: "#1f2833" };
    case "html":
      return { text: "HTML", color: "#e34f26", bg: "#331f1a" };
    case "css":
      return { text: "CSS", color: "#264de4", bg: "#1a2233" };
    case "json":
      return { text: "JSON", color: "#cbcb41", bg: "#30301a" };
    case "java":
      return { text: "JAVA", color: "#b07219", bg: "#2c2114" };
    case "cpp":
      return { text: "C++", color: "#f34b7d", bg: "#331a24" };
    case "javascript":
    default:
      return { text: "JS", color: "#d8c96c", bg: "#292716" };
  }
}

export default function FileExplorer({
  files = [],
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  unsavedMap = {},
  isOpen = true,
  onClose,
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  function handleCreateSubmit(e) {
    e?.preventDefault();
    const cleanName = newFileName.trim();
    if (!cleanName) {
      setIsCreating(false);
      return;
    }
    // Check duplicate
    if (files.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
      alert("A file with this name already exists.");
      return;
    }
    onCreateFile(cleanName);
    setNewFileName("");
    setIsCreating(false);
  }

  function handleRenameSubmit(id) {
    const cleanName = renameValue.trim();
    if (!cleanName) {
      setRenamingId(null);
      return;
    }
    if (files.some((f) => f.id !== id && f.name.toLowerCase() === cleanName.toLowerCase())) {
      alert("A file with this name already exists.");
      return;
    }
    onRenameFile(id, cleanName);
    setRenamingId(null);
  }

  function startRename(file) {
    setRenamingId(file.id);
    setRenameValue(file.name);
    setDeleteConfirmId(null);
  }

  return (
    <aside className={`file-explorer-pane ${isOpen ? "open" : "collapsed"}`} aria-label="Project Files">
      <div className="file-explorer-header">
        <div className="file-explorer-title">
          <FolderOpen size={14} />
          <span>Files ({files.length})</span>
        </div>
        <div className="file-explorer-actions">
          <button
            className="icon-button"
            onClick={() => {
              setIsCreating(true);
              setNewFileName("");
            }}
            title="Create new file"
            type="button"
          >
            <FilePlus size={14} />
          </button>
          {typeof onClose === "function" && (
            <button
              className="icon-button"
              onClick={onClose}
              title="Collapse files"
              type="button"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="file-tree">
        {isCreating && (
          <form className="file-create-form" onSubmit={handleCreateSubmit}>
            <FileCode size={13} />
            <input
              autoFocus
              className="file-input"
              onBlur={handleCreateSubmit}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsCreating(false);
              }}
              placeholder="e.g. styles.css"
              value={newFileName}
            />
          </form>
        )}

        {files.map((file) => {
          const badge = getLanguageBadge(file.language);
          const isSelected = file.id === activeFileId;
          const isUnsaved = Boolean(unsavedMap[file.id]);
          const isRenaming = renamingId === file.id;
          const isConfirmingDelete = deleteConfirmId === file.id;

          return (
            <div
              className={`file-item ${isSelected ? "selected" : ""}`}
              key={file.id}
              onClick={() => onSelectFile(file.id)}
            >
              <div className="file-item-left">
                <span
                  className="file-badge"
                  style={{ color: badge.color, backgroundColor: badge.bg }}
                >
                  {badge.text}
                </span>

                {isRenaming ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameSubmit(file.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      className="file-rename-input"
                      onBlur={() => handleRenameSubmit(file.id)}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      value={renameValue}
                    />
                  </form>
                ) : (
                  <span className="file-name" title={file.name}>
                    {file.name}
                  </span>
                )}
                {isUnsaved && <span className="unsaved-dot" title="Unsaved changes" />}
              </div>

              <div className="file-item-actions" onClick={(e) => e.stopPropagation()}>
                {isConfirmingDelete ? (
                  <div className="delete-confirm-wrap">
                    <span className="delete-confirm-text">Delete?</span>
                    <button
                      className="action-btn-danger"
                      onClick={() => {
                        onDeleteFile(file.id);
                        setDeleteConfirmId(null);
                      }}
                      title="Confirm delete"
                      type="button"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      className="action-btn-quiet"
                      onClick={() => setDeleteConfirmId(null)}
                      title="Cancel delete"
                      type="button"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="file-action-btn"
                      onClick={() => startRename(file)}
                      title="Rename file"
                      type="button"
                    >
                      <Pencil size={11} />
                    </button>
                    {files.length > 1 && (
                      <button
                        className="file-action-btn file-action-delete"
                        onClick={() => setDeleteConfirmId(file.id)}
                        title="Delete file"
                        type="button"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
