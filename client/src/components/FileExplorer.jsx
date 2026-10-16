import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  buildTree,
  getLanguageBadge,
  getNodePath,
  validateNodeName,
} from "../lib/workspaceModel.js";

export default function FileExplorer({
  nodes = [],
  activeFileId,
  unsavedMap = {},
  onSelectFile,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onToggleFolder,
  onCollapseAll,
  onOpenFolder,
  onOpenFile,
  onExportWorkspace,
  workspaceName = "WORKSPACE",
}) {
  // Creation state: { type: 'file' | 'folder', parentId: string | null }
  const [creatingState, setCreatingState] = useState(null);
  const [createInputName, setCreateInputName] = useState("");
  const [createError, setCreateError] = useState("");

  // Rename state: nodeId
  const [renamingId, setRenamingId] = useState(null);
  const [renameInputName, setRenameInputName] = useState("");
  const [renameError, setRenameError] = useState("");

  // Delete confirmation modal / state: node
  const [deleteConfirmNode, setDeleteConfirmNode] = useState(null);

  // Selected folder or node for contextual creation
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  // Custom Context Menu: { x, y, node }
  const [contextMenu, setContextMenu] = useState(null);
  const explorerRef = useRef(null);
  const createInputRef = useRef(null);
  const renameInputRef = useRef(null);

  // Close context menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (contextMenu && !e.target.closest(".explorer-context-menu")) {
        setContextMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  // Focus create input when opening creation
  useEffect(() => {
    if (creatingState && createInputRef.current) {
      createInputRef.current.focus();
      createInputRef.current.select();
    }
  }, [creatingState]);

  // Focus rename input when opening rename
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  function startCreate(type, parentId = selectedFolderId) {
    // If target parent is a closed folder, ensure it expands
    if (parentId) {
      const parentNode = nodes.find((n) => n.id === parentId);
      if (parentNode && !parentNode.isOpen) {
        onToggleFolder(parentId, true);
      }
    }
    setCreatingState({ type, parentId });
    setCreateInputName("");
    setCreateError("");
    setContextMenu(null);
  }

  function handleCreateSubmit(e) {
    if (e) e.preventDefault();
    if (!creatingState) return;

    const { type, parentId } = creatingState;
    const isFolder = type === "folder";
    const validation = validateNodeName(createInputName, parentId, nodes, isFolder);

    if (!validation.valid) {
      setCreateError(validation.error);
      return;
    }

    onCreateNode({
      name: validation.sanitizedName,
      type,
      parentId,
    });

    setCreatingState(null);
    setCreateInputName("");
    setCreateError("");
  }

  function startRename(node) {
    setRenamingId(node.id);
    setRenameInputName(node.name);
    setRenameError("");
    setContextMenu(null);
  }

  function handleRenameSubmit(e) {
    if (e) e.preventDefault();
    if (!renamingId) return;

    const node = nodes.find((n) => n.id === renamingId);
    if (!node) {
      setRenamingId(null);
      return;
    }

    const isFolder = node.type === "folder";
    const validation = validateNodeName(
      renameInputName,
      node.parentId,
      nodes,
      isFolder,
      node.id
    );

    if (!validation.valid) {
      setRenameError(validation.error);
      return;
    }

    onRenameNode(node.id, validation.sanitizedName);
    setRenamingId(null);
    setRenameInputName("");
    setRenameError("");
  }

  function handleContextMenu(e, node = null) {
    e.preventDefault();
    e.stopPropagation();

    const explorerRect = explorerRef.current?.getBoundingClientRect();
    const x = Math.min(e.clientX, window.innerWidth - 200);
    const y = Math.min(e.clientY, window.innerHeight - 250);

    setContextMenu({ x, y, node });
    if (node && node.type === "folder") {
      setSelectedFolderId(node.id);
    }
  }

  async function handleCopyPath(node) {
    const path = getNodePath(nodes, node.id);
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      // ignore
    }
    setContextMenu(null);
  }

  function handleDownloadNode(node) {
    if (node.type === "file") {
      const blob = new Blob([node.content || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = node.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    setContextMenu(null);
  }

  // Recursive tree rendering helper
  function renderTreeNode(item, depth = 0) {
    const isFolder = item.type === "folder";
    const isSelected = item.id === activeFileId;
    const isUnsaved = Boolean(unsavedMap[item.id]);
    const isRenaming = renamingId === item.id;
    const badge = !isFolder ? getLanguageBadge(item.language) : null;
    const paddingLeft = 12 + depth * 14;

    return (
      <div className="tree-node-wrapper" key={item.id}>
        <div
          className={`tree-node-item ${isFolder ? "folder-item" : "file-item"} ${
            isSelected ? "selected-node" : ""
          } ${selectedFolderId === item.id ? "focused-folder" : ""}`}
          onClick={() => {
            if (isFolder) {
              onToggleFolder(item.id);
              setSelectedFolderId(item.id);
            } else {
              onSelectFile(item.id);
              setSelectedFolderId(item.parentId || null);
            }
          }}
          onContextMenu={(e) => handleContextMenu(e, item)}
          style={{ paddingLeft: `${paddingLeft}px` }}
          title={getNodePath(nodes, item.id)}
        >
          {/* Chevron for folder or indent spacer for file */}
          {isFolder ? (
            <span
              className="tree-chevron"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFolder(item.id);
              }}
            >
              {item.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="tree-leaf-spacer" />
          )}

          {/* Icon */}
          <span className="tree-item-icon">
            {isFolder ? (
              item.isOpen ? (
                <FolderOpen className="icon-folder-open" size={15} />
              ) : (
                <Folder className="icon-folder" size={15} />
              )
            ) : (
              <span
                className="file-type-badge"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            )}
          </span>

          {/* Node Label or Inline Rename Form */}
          {isRenaming ? (
            <form
              className="tree-rename-form"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleRenameSubmit}
            >
              <input
                className="tree-inline-input"
                onBlur={handleRenameSubmit}
                onChange={(e) => {
                  setRenameInputName(e.target.value);
                  if (renameError) setRenameError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setRenamingId(null);
                }}
                ref={renameInputRef}
                value={renameInputName}
              />
              {renameError && (
                <span className="tree-input-error" title={renameError}>
                  {renameError}
                </span>
              )}
            </form>
          ) : (
            <span className="tree-item-name">{item.name}</span>
          )}

          {/* Unsaved indicator */}
          {isUnsaved && <span className="tree-unsaved-dot" title="Unsaved changes" />}

          {/* Hover Actions */}
          {!isRenaming && (
            <div className="tree-hover-actions" onClick={(e) => e.stopPropagation()}>
              {isFolder && (
                <>
                  <button
                    className="node-hover-btn"
                    onClick={() => startCreate("file", item.id)}
                    title="New File in this folder"
                    type="button"
                  >
                    <FilePlus size={12} />
                  </button>
                  <button
                    className="node-hover-btn"
                    onClick={() => startCreate("folder", item.id)}
                    title="New Subfolder"
                    type="button"
                  >
                    <FolderPlus size={12} />
                  </button>
                </>
              )}
              <button
                className="node-hover-btn"
                onClick={() => startRename(item)}
                title="Rename (F2)"
                type="button"
              >
                <Pencil size={11} />
              </button>
              <button
                className="node-hover-btn btn-danger"
                onClick={() => setDeleteConfirmNode(item)}
                title="Delete"
                type="button"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Children if folder is expanded */}
        {isFolder && item.isOpen && (
          <div className="tree-children-container">
            {/* Inline creation form inside this folder */}
            {creatingState && creatingState.parentId === item.id && (
              <form
                className="tree-create-row"
                onSubmit={handleCreateSubmit}
                style={{ paddingLeft: `${paddingLeft + 16}px` }}
              >
                <span className="tree-item-icon">
                  {creatingState.type === "folder" ? (
                    <Folder className="icon-folder" size={14} />
                  ) : (
                    <FileCode size={14} />
                  )}
                </span>
                <input
                  className="tree-inline-input"
                  onBlur={handleCreateSubmit}
                  onChange={(e) => {
                    setCreateInputName(e.target.value);
                    if (createError) setCreateError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setCreatingState(null);
                  }}
                  placeholder={
                    creatingState.type === "folder" ? "folder-name" : "file.js"
                  }
                  ref={createInputRef}
                  value={createInputName}
                />
                {createError && (
                  <span className="tree-input-error" title={createError}>
                    {createError}
                  </span>
                )}
              </form>
            )}

            {Array.isArray(item.children) &&
              item.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const tree = buildTree(nodes, null);

  return (
    <aside
      aria-label="Workspace Explorer"
      className="ide-sidebar-panel explorer-sidebar"
      onContextMenu={(e) => handleContextMenu(e, null)}
      ref={explorerRef}
    >
      {/* Explorer Header */}
      <div className="sidebar-header">
        <span className="sidebar-header-title">
          <span>EXPLORER:</span> <b>{workspaceName}</b>
        </span>

        {/* Top Explorer Actions */}
        <div className="sidebar-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="sidebar-icon-btn"
            onClick={() => startCreate("file", selectedFolderId)}
            title="New File"
            type="button"
          >
            <FilePlus size={14} />
          </button>
          <button
            className="sidebar-icon-btn"
            onClick={() => startCreate("folder", selectedFolderId)}
            title="New Folder"
            type="button"
          >
            <FolderPlus size={14} />
          </button>
          <button
            className="sidebar-icon-btn"
            onClick={onOpenFolder}
            title="Open Local Folder (showDirectoryPicker)"
            type="button"
          >
            <FolderOpen size={14} />
          </button>
          <button
            className="sidebar-icon-btn"
            onClick={onCollapseAll}
            title="Collapse All Folders"
            type="button"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Hierarchical Tree Body */}
      <div
        className="explorer-tree-scroll"
        onClick={() => setSelectedFolderId(null)}
      >
        {/* Root level inline create form */}
        {creatingState && creatingState.parentId === null && (
          <form
            className="tree-create-row root-create"
            onSubmit={handleCreateSubmit}
            style={{ paddingLeft: "14px" }}
          >
            <span className="tree-item-icon">
              {creatingState.type === "folder" ? (
                <Folder className="icon-folder" size={14} />
              ) : (
                <FileCode size={14} />
              )}
            </span>
            <input
              className="tree-inline-input"
              onBlur={handleCreateSubmit}
              onChange={(e) => {
                setCreateInputName(e.target.value);
                if (createError) setCreateError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCreatingState(null);
              }}
              placeholder={creatingState.type === "folder" ? "folder-name" : "file.js"}
              ref={createInputRef}
              value={createInputName}
            />
            {createError && (
              <span className="tree-input-error" title={createError}>
                {createError}
              </span>
            )}
          </form>
        )}

        {tree.length === 0 ? (
          <div className="explorer-empty-state">
            <FolderOpen size={28} />
            <p>No files in workspace</p>
            <div className="empty-state-buttons">
              <button
                className="empty-btn primary"
                onClick={() => startCreate("file", null)}
                type="button"
              >
                <FilePlus size={13} />
                <span>New File</span>
              </button>
              <button
                className="empty-btn"
                onClick={() => startCreate("folder", null)}
                type="button"
              >
                <FolderPlus size={13} />
                <span>New Folder</span>
              </button>
              <button className="empty-btn" onClick={onOpenFolder} type="button">
                <FolderOpen size={13} />
                <span>Open Folder</span>
              </button>
            </div>
          </div>
        ) : (
          tree.map((rootNode) => renderTreeNode(rootNode, 0))
        )}
      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="explorer-context-menu"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
        >
          <button
            className="context-menu-item"
            onClick={() =>
              startCreate(
                "file",
                contextMenu.node?.type === "folder" ? contextMenu.node.id : contextMenu.node?.parentId || null
              )
            }
            type="button"
          >
            <FilePlus size={13} />
            <span>New File</span>
          </button>
          <button
            className="context-menu-item"
            onClick={() =>
              startCreate(
                "folder",
                contextMenu.node?.type === "folder" ? contextMenu.node.id : contextMenu.node?.parentId || null
              )
            }
            type="button"
          >
            <FolderPlus size={13} />
            <span>New Folder</span>
          </button>
          <div className="context-menu-divider" />

          {contextMenu.node && (
            <>
              <button
                className="context-menu-item"
                onClick={() => startRename(contextMenu.node)}
                type="button"
              >
                <Pencil size={13} />
                <span>Rename…</span>
                <kbd>F2</kbd>
              </button>
              <button
                className="context-menu-item"
                onClick={() => handleCopyPath(contextMenu.node)}
                type="button"
              >
                <Copy size={13} />
                <span>Copy Path</span>
              </button>
              {contextMenu.node.type === "file" && (
                <button
                  className="context-menu-item"
                  onClick={() => handleDownloadNode(contextMenu.node)}
                  type="button"
                >
                  <Download size={13} />
                  <span>Download File</span>
                </button>
              )}
              <div className="context-menu-divider" />
              <button
                className="context-menu-item item-danger"
                onClick={() => {
                  setDeleteConfirmNode(contextMenu.node);
                  setContextMenu(null);
                }}
                type="button"
              >
                <Trash2 size={13} />
                <span>Delete {contextMenu.node.type === "folder" ? "Folder" : "File"}</span>
              </button>
            </>
          )}

          {!contextMenu.node && (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  setContextMenu(null);
                  onOpenFolder();
                }}
                type="button"
              >
                <FolderOpen size={13} />
                <span>Open Folder…</span>
              </button>
              <button
                className="context-menu-item"
                onClick={() => {
                  setContextMenu(null);
                  onOpenFile();
                }}
                type="button"
              >
                <Upload size={13} />
                <span>Import File…</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmNode && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmNode(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete {deleteConfirmNode.type === "folder" ? "Folder" : "File"}?</h3>
              <button
                className="modal-close-btn"
                onClick={() => setDeleteConfirmNode(null)}
                type="button"
              >
                <X size={15} />
              </button>
            </div>
            <p className="modal-message">
              Are you sure you want to permanently delete{" "}
              <b>&apos;{deleteConfirmNode.name}&apos;</b>
              {deleteConfirmNode.type === "folder" && " and all files and subfolders inside it"}?
            </p>
            <div className="modal-actions">
              <button
                className="button button-secondary"
                onClick={() => setDeleteConfirmNode(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                onClick={() => {
                  onDeleteNode(deleteConfirmNode.id);
                  setDeleteConfirmNode(null);
                }}
                type="button"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
