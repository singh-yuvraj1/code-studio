import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import CssWorker from "monaco-editor/language/css/css.worker.js?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import { useParams } from "react-router-dom";

import MenuBar from "../components/MenuBar.jsx";
import ActivityBar from "../components/ActivityBar.jsx";
import FileExplorer from "../components/FileExplorer.jsx";
import SearchPane from "../components/SearchPane.jsx";
import CollaborationPane from "../components/CollaborationPane.jsx";
import SettingsPane from "../components/SettingsPane.jsx";
import EditorTabs from "../components/EditorTabs.jsx";
import Breadcrumbs from "../components/Breadcrumbs.jsx";
import BottomPanel from "../components/BottomPanel.jsx";
import AIAssistant from "../components/AIAssistant.jsx";
import StatusBar from "../components/StatusBar.jsx";
import ShortcutsModal from "../components/ShortcutsModal.jsx";
import ShareModal from "../components/ShareModal.jsx";

import {
  collapseAllFolders,
  createDefaultWorkspace,
  deleteNodeRecursively,
  detectLanguage,
  exportWorkspaceBundle,
  importFromDirectoryHandle,
  importFromFileList,
  toggleFolder,
  validateNodeName,
} from "../lib/workspaceModel.js";

import {
  connectSocket,
  emitWithAck,
  getDisplayName,
  getSocket,
} from "../lib/socket.js";

// Monaco worker initialization
self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === "json") return new JsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new CssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
    if (label === "javascript" || label === "typescript") return new TypeScriptWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });

export default function WorkspacePage() {
  const { roomId = "" } = useParams();
  const storageNodesKey = useMemo(() => `codesync:room:${roomId}:nodes`, [roomId]);
  const storageOpenTabsKey = useMemo(() => `codesync:room:${roomId}:open_tabs`, [roomId]);
  const storageActiveKey = useMemo(() => `codesync:room:${roomId}:active_node`, [roomId]);

  // Load workspace nodes
  const [nodes, setNodes] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageNodesKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Check legacy flat files key
      const legacySaved = window.localStorage.getItem(`codesync:room:${roomId}:files`);
      if (legacySaved) {
        const parsed = JSON.parse(legacySaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((f) => ({
            id: f.id,
            name: f.name,
            type: "file",
            parentId: null,
            language: f.language || detectLanguage(f.name),
            content: f.content,
          }));
        }
      }
    } catch (e) {
      console.warn("Unable to read saved workspace nodes", e);
    }
    return createDefaultWorkspace();
  });

  // Open tabs list
  const [openFileIds, setOpenFileIds] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageOpenTabsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    const firstFiles = nodes.filter((n) => n.type === "file").slice(0, 3).map((n) => n.id);
    return firstFiles.length > 0 ? firstFiles : ["f-main"];
  });

  // Active file node ID
  const [activeFileId, setActiveFileId] = useState(() => {
    try {
      const saved = window.localStorage.getItem(storageActiveKey);
      if (saved && nodes.some((n) => n.id === saved && n.type === "file")) return saved;
    } catch {
      // ignore
    }
    const firstFile = nodes.find((n) => n.type === "file");
    return firstFile ? firstFile.id : "f-main";
  });

  // Active file node object
  const activeFile = useMemo(() => {
    const found = nodes.find((n) => n.id === activeFileId && n.type === "file");
    if (found) return found;
    const first = nodes.find((n) => n.type === "file");
    return first || { id: "empty", name: "untitled.js", type: "file", content: "", language: "javascript" };
  }, [nodes, activeFileId]);

  // UI layout and view state
  const [activeSidebarView, setActiveSidebarView] = useState("explorer"); // 'explorer' | 'search' | 'collab' | 'settings'
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAI, setShowAI] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1200 : true));
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Editor preferences
  const [theme, setTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(2);
  const [wordWrap, setWordWrap] = useState("on");
  const [showMinimap, setShowMinimap] = useState(false);

  // Status and logs state
  const [saveState, setSaveState] = useState("idle");
  const [unsavedMap, setUnsavedMap] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [users, setUsers] = useState([]);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1, selectionLength: 0 });
  const [selectedCode, setSelectedCode] = useState("");
  const [problems, setProblems] = useState([]);
  const [outputLogs, setOutputLogs] = useState(() => [
    { time: new Date().toLocaleTimeString(), text: `Workspace initialized for Room ${roomId}.` },
  ]);
  const [collabLogs, setCollabLogs] = useState(() => [
    { time: new Date().toLocaleTimeString(), type: "join", text: `Connected as ${getDisplayName()}.` },
  ]);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const lastSyncedCodeRef = useRef(activeFile.content);
  const hasJoinedRoomRef = useRef(false);

  // Hidden directory input ref for fallback folder import
  const folderInputRef = useRef(null);
  const fileInputRef = useRef(null);

  function logOutput(text) {
    setOutputLogs((prev) => [
      ...prev.slice(-100),
      { time: new Date().toLocaleTimeString(), text },
    ]);
  }

  function logCollab(type, text) {
    setCollabLogs((prev) => [
      ...prev.slice(-100),
      { time: new Date().toLocaleTimeString(), type, text },
    ]);
  }

  // Update recent workspaces in local storage
  useEffect(() => {
    if (!roomId) return;
    try {
      const recentsKey = "codesync:recent_workspaces";
      const existing = JSON.parse(window.localStorage.getItem(recentsKey) || "[]");
      const filtered = existing.filter((item) => item.id !== roomId);
      filtered.unshift({
        id: roomId,
        title: `Workspace ${roomId}`,
        updatedAt: Date.now(),
        fileCount: nodes.filter((n) => n.type === "file").length,
        language: activeFile.language,
      });
      window.localStorage.setItem(recentsKey, JSON.stringify(filtered.slice(0, 8)));
    } catch {
      // ignore
    }
  }, [roomId, nodes, activeFile.language]);

  // Persist open tabs and active file selection
  useEffect(() => {
    try {
      window.localStorage.setItem(storageOpenTabsKey, JSON.stringify(openFileIds));
      window.localStorage.setItem(storageActiveKey, activeFileId);
    } catch {
      // ignore
    }
  }, [openFileIds, activeFileId, storageOpenTabsKey, storageActiveKey]);

  // Auto-save nodes to localStorage with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(storageNodesKey, JSON.stringify(nodes));
      } catch (e) {
        console.warn("Unable to save workspace to localStorage", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes, storageNodesKey]);

  // Socket.IO Room Joining & Event Listeners
  const joinRoom = useCallback(
    async (socket) => {
      const response = await emitWithAck(socket, "room:join", {
        roomId,
        displayName: getDisplayName(),
      });

      // If server has stored workspace files, sync them
      if (Array.isArray(response.files) && response.files.length > 0) {
        setNodes(response.files);
        logCollab("sync", "Received remote workspace tree from room.");
      } else if (typeof response.code === "string" && response.code) {
        lastSyncedCodeRef.current = response.code;
        setNodes((prev) =>
          prev.map((n) => (n.id === activeFileId ? { ...n, content: response.code } : n))
        );
      }

      setUsers(response.users || []);
      hasJoinedRoomRef.current = true;
      setConnectionStatus("connected");
      logCollab("join", `Joined room ${roomId} with ${response.users?.length || 1} peers.`);
    },
    [roomId, activeFileId]
  );

  useEffect(() => {
    let disposed = false;
    const socket = getSocket();

    function onConnect() {
      if (!hasJoinedRoomRef.current || disposed) return;
      setConnectionStatus("connecting");
      joinRoom(socket).catch(() => {
        if (!disposed) setConnectionStatus("error");
      });
    }

    function onDisconnect() {
      if (disposed) return;
      setConnectionStatus("reconnecting");
    }

    function onConnectError() {
      if (disposed) return;
      setConnectionStatus("error");
    }

    function onRoomUsers(payload) {
      if (payload?.roomId === roomId && Array.isArray(payload.users)) {
        setUsers(payload.users);
      }
    }

    function onCodeSync(payload) {
      if (typeof payload?.code !== "string") return;
      lastSyncedCodeRef.current = payload.code;
      setNodes((prev) =>
        prev.map((n) => (n.id === activeFileId ? { ...n, content: payload.code } : n))
      );
      if (payload.updatedBy) {
        logCollab("edit", `${payload.updatedBy} edited code.`);
      }
    }

    function onFileSync(payload) {
      const { fileId, content, updatedBy } = payload || {};
      if (!fileId || typeof content !== "string") return;
      setNodes((prev) =>
        prev.map((n) => (n.id === fileId ? { ...n, content } : n))
      );
      if (fileId === activeFileId) {
        lastSyncedCodeRef.current = content;
      }
      if (updatedBy) {
        logCollab("edit", `${updatedBy} updated file.`);
      }
    }

    function onWorkspaceSynced(payload) {
      if (Array.isArray(payload?.files)) {
        setNodes(payload.files);
        logCollab("sync", `Workspace updated by ${payload.updatedBy || "collaborator"}.`);
      }
    }

    function onTreeAction(payload) {
      const { action, node, nodeId, files, updatedBy } = payload || {};
      if (Array.isArray(files)) {
        setNodes(files);
      }
      logCollab("tree", `${updatedBy || "Peer"}: ${action} ${node?.name || ""}`);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("room:users", onRoomUsers);
    socket.on("code:sync", onCodeSync);
    socket.on("file:sync", onFileSync);
    socket.on("workspace:synced", onWorkspaceSynced);
    socket.on("tree:action", onTreeAction);

    async function initialize() {
      try {
        setConnectionStatus("connecting");
        await connectSocket(socket);
        if (!disposed) await joinRoom(socket);
      } catch (e) {
        if (disposed) return;
        setConnectionStatus("error");
      }
    }

    void initialize();

    return () => {
      disposed = true;
      hasJoinedRoomRef.current = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room:users", onRoomUsers);
      socket.off("code:sync", onCodeSync);
      socket.off("file:sync", onFileSync);
      socket.off("workspace:synced", onWorkspaceSynced);
      socket.off("tree:action", onTreeAction);
      if (socket.connected) socket.emit("room:leave");
    };
  }, [joinRoom, roomId, activeFileId]);

  // Synchronize active file changes over Socket.IO (debounced)
  useEffect(() => {
    if (connectionStatus !== "connected" || activeFile.content === lastSyncedCodeRef.current) {
      return undefined;
    }

    const socket = getSocket();
    const timeoutId = window.setTimeout(() => {
      socket.emit("file:change", {
        fileId: activeFile.id,
        content: activeFile.content,
        language: activeFile.language,
      });
      lastSyncedCodeRef.current = activeFile.content;
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [activeFile.id, activeFile.content, activeFile.language, connectionStatus]);

  // Editor content change
  function handleCodeChange(newContent) {
    const text = newContent ?? "";
    setNodes((prev) =>
      prev.map((n) => (n.id === activeFile.id ? { ...n, content: text } : n))
    );
    setUnsavedMap((prev) => ({ ...prev, [activeFile.id]: true }));
  }

  // File selection
  function handleSelectFile(fileId) {
    setActiveFileId(fileId);
    if (!openFileIds.includes(fileId)) {
      setOpenFileIds((prev) => [...prev, fileId]);
    }
  }

  // Jump to file and line (from Problems or Search)
  function handleSelectFileAndLine(fileId, line, column = 1) {
    handleSelectFile(fileId);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealPositionInCenter({ lineNumber: line, column });
        editorRef.current.setPosition({ lineNumber: line, column });
        editorRef.current.focus();
      }
    }, 50);
  }

  // Close tab
  function handleCloseTab(fileId) {
    const nextTabs = openFileIds.filter((id) => id !== fileId);
    setOpenFileIds(nextTabs);
    if (activeFileId === fileId) {
      setActiveFileId(nextTabs[nextTabs.length - 1] || "");
    }
  }

  function handleCloseOtherTabs(fileId) {
    setOpenFileIds([fileId]);
    setActiveFileId(fileId);
  }

  function handleCloseAllTabs() {
    setOpenFileIds([]);
    setActiveFileId("");
  }

  // Create node (file or folder)
  function handleCreateNode({ name, type, parentId }) {
    const isFolder = type === "folder";
    const newNode = {
      id: `${isFolder ? "dir" : "f"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      type,
      parentId,
      ...(isFolder
        ? { isOpen: true }
        : {
            language: detectLanguage(name),
            content: `// ${name}\n`,
          }),
    };

    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);

    if (!isFolder) {
      handleSelectFile(newNode.id);
    }

    logOutput(`Created ${type} '${name}'`);

    // Broadcast tree action to room
    if (connectionStatus === "connected") {
      getSocket().emit("tree:action", {
        action: `create-${type}`,
        node: newNode,
        files: nextNodes,
      });
    }
  }

  // Rename node
  function handleRenameNode(nodeId, newName) {
    const nextNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          name: newName,
          ...(node.type === "file" ? { language: detectLanguage(newName) } : {}),
        };
      }
      return node;
    });

    setNodes(nextNodes);
    logOutput(`Renamed node to '${newName}'`);

    if (connectionStatus === "connected") {
      getSocket().emit("tree:action", {
        action: "rename",
        nodeId,
        files: nextNodes,
      });
    }
  }

  // Delete node
  function handleDeleteNode(nodeId) {
    const target = nodes.find((n) => n.id === nodeId);
    const nextNodes = deleteNodeRecursively(nodes, nodeId);
    setNodes(nextNodes);

    // If active or open file was deleted, update tabs
    const validOpenTabs = openFileIds.filter((id) => nextNodes.some((n) => n.id === id && n.type === "file"));
    setOpenFileIds(validOpenTabs);
    if (!nextNodes.some((n) => n.id === activeFileId && n.type === "file")) {
      const remainingFile = nextNodes.find((n) => n.type === "file");
      setActiveFileId(remainingFile ? remainingFile.id : "");
    }

    logOutput(`Deleted ${target?.name || "node"}`);

    if (connectionStatus === "connected") {
      getSocket().emit("tree:action", {
        action: "delete",
        nodeId,
        files: nextNodes,
      });
    }
  }

  // Toggle folder open/closed
  function handleToggleFolder(folderId, forceState) {
    setNodes((prev) =>
      prev.map((n) => (n.id === folderId ? { ...n, isOpen: forceState ?? !n.isOpen } : n))
    );
  }

  // Collapse all folders
  function handleCollapseAll() {
    setNodes((prev) => collapseAllFolders(prev));
  }

  // Save workspace draft
  function handleSaveDraft() {
    setSaveState("saving");
    setTimeout(() => {
      try {
        window.localStorage.setItem(storageNodesKey, JSON.stringify(nodes));
        setSaveState("saved");
        setUnsavedMap({});
        logOutput("Workspace draft saved successfully.");
        setTimeout(() => setSaveState("idle"), 1800);
      } catch (e) {
        setSaveState("error");
        logOutput("Failed to save workspace draft.");
      }
    }, 150);
  }

  // Open Local Folder (showDirectoryPicker or input fallback)
  async function handleOpenFolder() {
    if (typeof window.showDirectoryPicker === "function") {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const importedNodes = await importFromDirectoryHandle(dirHandle);
        if (importedNodes.length > 0) {
          setNodes(importedNodes);
          const firstFile = importedNodes.find((n) => n.type === "file");
          if (firstFile) {
            setOpenFileIds([firstFile.id]);
            setActiveFileId(firstFile.id);
          }
          logOutput(`Opened folder '${dirHandle.name}' with ${importedNodes.length} items.`);

          // Sync to room
          if (connectionStatus === "connected") {
            getSocket().emit("workspace:sync", {
              files: importedNodes,
              activeFileId: firstFile?.id,
            });
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("showDirectoryPicker failed, opening file input fallback", err);
          folderInputRef.current?.click();
        }
      }
    } else {
      folderInputRef.current?.click();
    }
  }

  // Folder input change event (fallback)
  async function handleFolderInputChange(e) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    try {
      const importedNodes = await importFromFileList(fileList);
      if (importedNodes.length > 0) {
        setNodes(importedNodes);
        const firstFile = importedNodes.find((n) => n.type === "file");
        if (firstFile) {
          setOpenFileIds([firstFile.id]);
          setActiveFileId(firstFile.id);
        }
        logOutput(`Imported ${fileList.length} files into workspace.`);

        if (connectionStatus === "connected") {
          getSocket().emit("workspace:sync", {
            files: importedNodes,
            activeFileId: firstFile?.id,
          });
        }
      }
    } catch (err) {
      console.error("Unable to import files from input", err);
    }
  }

  // Open single file
  function handleOpenFile() {
    fileInputRef.current?.click();
  }

  async function handleFileInputChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const newFileNode = {
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        type: "file",
        parentId: null,
        language: detectLanguage(file.name),
        content: text,
      };
      setNodes((prev) => [...prev, newFileNode]);
      handleSelectFile(newFileNode.id);
      logOutput(`Imported file '${file.name}'.`);
    } catch (err) {
      console.error("Failed to read file", err);
    }
  }

  // Export workspace
  function handleExportWorkspace() {
    exportWorkspaceBundle(nodes, roomId);
    logOutput("Exported workspace bundle as JSON.");
  }

  // Apply code suggested by AI
  function handleApplyAICode(newCode) {
    if (editorRef.current && selectedCode.trim()) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      editor.executeEdits("ai-assistant", [
        {
          range: selection,
          text: newCode,
          forceMoveMarkers: true,
        },
      ]);
      const updated = editor.getValue();
      handleCodeChange(updated);
    } else {
      handleCodeChange(newCode);
    }
    logOutput("Applied AI code snippet to active editor.");
  }

  // Global Keyboard Shortcuts
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveDraft();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setActiveSidebarView("explorer");
        setShowSidebar(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setActiveSidebarView("explorer");
        setShowSidebar(true);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "O") {
        e.preventDefault();
        void handleOpenFolder();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setShowSidebar((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setShowAI((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "j") {
        e.preventDefault();
        setShowBottomPanel((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (activeFileId) handleCloseTab(activeFileId);
      } else if (e.altKey && e.key === "z") {
        e.preventDefault();
        setWordWrap((prev) => (prev === "on" ? "off" : "on"));
      } else if (e.key === "F1") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [nodes, activeFileId]);

  return (
    <div className="ide-layout-root">
      {/* Hidden file inputs for folder & file importing */}
      <input
        directory=""
        multiple
        onChange={handleFolderInputChange}
        ref={folderInputRef}
        style={{ display: "none" }}
        type="file"
        webkitdirectory=""
      />
      <input
        onChange={handleFileInputChange}
        ref={fileInputRef}
        style={{ display: "none" }}
        type="file"
      />

      {/* Top Menu Bar */}
      <MenuBar
        connectedCount={users.length || 1}
        connectionStatus={connectionStatus}
        onCloseActiveTab={() => activeFileId && handleCloseTab(activeFileId)}
        onExport={handleExportWorkspace}
        onNewFile={() => {
          setActiveSidebarView("explorer");
          setShowSidebar(true);
        }}
        onNewFolder={() => {
          setActiveSidebarView("explorer");
          setShowSidebar(true);
        }}
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenFolder}
        onOpenShare={() => setShowShareModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onSave={handleSaveDraft}
        onToggleAI={() => setShowAI((prev) => !prev)}
        onToggleBottomPanel={() => setShowBottomPanel((prev) => !prev)}
        onToggleExplorer={() => setShowSidebar((prev) => !prev)}
        onToggleMinimap={() => setShowMinimap((prev) => !prev)}
        onToggleWordWrap={() => setWordWrap((prev) => (prev === "on" ? "off" : "on"))}
        onTriggerFind={() => editorRef.current?.getAction("actions.find")?.run()}
        onTriggerRedo={() => editorRef.current?.trigger("menu", "redo")}
        onTriggerReplace={() =>
          editorRef.current?.getAction("editor.action.startFindReplaceAction")?.run()
        }
        onTriggerSelectAll={() =>
          editorRef.current?.trigger("menu", "editor.action.selectAll")
        }
        onTriggerUndo={() => editorRef.current?.trigger("menu", "undo")}
        roomId={roomId}
        saveState={saveState}
        showAI={showAI}
        showBottomPanel={showBottomPanel}
        showExplorer={showSidebar}
        showMinimap={showMinimap}
        wordWrap={wordWrap}
      />

      {/* Main Middle Container: Activity Bar + Sidebar + Editor + AI Panel */}
      <div className="ide-middle-container">
        {/* Left-rail Activity Bar */}
        <ActivityBar
          activeView={activeSidebarView}
          connectedCount={users.length || 1}
          connectionStatus={connectionStatus}
          onOpenSettings={() => {
            setActiveSidebarView("settings");
            setShowSidebar(true);
          }}
          onOpenShortcuts={() => setShowShortcutsModal(true)}
          onSelectView={(view) => {
            setActiveSidebarView(view);
            setShowSidebar(true);
          }}
          onToggleAI={() => setShowAI((prev) => !prev)}
          onToggleView={() => setShowSidebar((prev) => !prev)}
          showAI={showAI}
        />

        {/* Primary Sidebar */}
        {showSidebar && (
          <div className="ide-primary-sidebar">
            {activeSidebarView === "explorer" && (
              <FileExplorer
                activeFileId={activeFileId}
                nodes={nodes}
                onCollapseAll={handleCollapseAll}
                onCreateNode={handleCreateNode}
                onDeleteNode={handleDeleteNode}
                onExportWorkspace={handleExportWorkspace}
                onOpenFile={handleOpenFile}
                onOpenFolder={handleOpenFolder}
                onRenameNode={handleRenameNode}
                onSelectFile={handleSelectFile}
                onToggleFolder={handleToggleFolder}
                unsavedMap={unsavedMap}
                workspaceName={roomId}
              />
            )}

            {activeSidebarView === "search" && (
              <SearchPane
                nodes={nodes}
                onSelectFileAndLine={handleSelectFileAndLine}
              />
            )}

            {activeSidebarView === "collab" && (
              <CollaborationPane
                connectionStatus={connectionStatus}
                onCreateRoom={() => {
                  const newRoomId = `CS-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
                  window.location.href = `/room/${newRoomId}`;
                }}
                onJoinRoom={(newRoomId) => {
                  window.location.href = `/room/${newRoomId}`;
                }}
                onCopyLink={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                roomId={roomId}
                users={users}
              />
            )}

            {activeSidebarView === "settings" && (
              <SettingsPane
                fontSize={fontSize}
                onChangeFontSize={setFontSize}
                onChangeMinimap={setShowMinimap}
                onChangeTabSize={setTabSize}
                onChangeTheme={setTheme}
                onChangeWordWrap={setWordWrap}
                showMinimap={showMinimap}
                tabSize={tabSize}
                theme={theme}
                wordWrap={wordWrap}
              />
            )}
          </div>
        )}

        {/* Editor Main Column */}
        <main className="ide-editor-column">
          {/* File Tabs Bar */}
          <EditorTabs
            activeFileId={activeFileId}
            nodes={nodes}
            onCloseAllTabs={handleCloseAllTabs}
            onCloseOtherTabs={handleCloseOtherTabs}
            onCloseTab={handleCloseTab}
            onNewTab={() => {
              const fileCount = nodes.filter((n) => n.type === "file").length;
              handleCreateNode({
                name: `untitled${fileCount + 1}.js`,
                type: "file",
                parentId: null,
              });
            }}
            onSelectTab={handleSelectFile}
            openFileIds={openFileIds}
            unsavedMap={unsavedMap}
          />

          {/* Breadcrumbs Navigation */}
          {activeFileId && (
            <Breadcrumbs
              activeFileId={activeFileId}
              nodes={nodes}
              workspaceName={roomId}
            />
          )}

          {/* Monaco Editor Pane */}
          <div className="monaco-host-pane">
            {openFileIds.length === 0 || !activeFile.id ? (
              <div className="editor-empty-welcome">
                <div className="welcome-inner">
                  <h2>Code Studio</h2>
                  <p>Open a file from the explorer or create a new file to start coding.</p>
                  <div className="welcome-shortcuts-grid">
                    <div className="welcome-shortcut-item">
                      <span>New File</span>
                      <kbd>Ctrl+N</kbd>
                    </div>
                    <div className="welcome-shortcut-item">
                      <span>Open Folder</span>
                      <kbd>Ctrl+Shift+O</kbd>
                    </div>
                    <div className="welcome-shortcut-item">
                      <span>Toggle AI Assistant</span>
                      <kbd>Ctrl+Shift+A</kbd>
                    </div>
                    <div className="welcome-shortcut-item">
                      <span>Keyboard Shortcuts</span>
                      <kbd>F1</kbd>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Editor
                language={activeFile.language}
                onChange={handleCodeChange}
                onMount={(editor, monacoInstance) => {
                  editorRef.current = editor;
                  monacoRef.current = monacoInstance;

                  // Listen to cursor position changes
                  editor.onDidChangeCursorPosition((e) => {
                    setCursorPos((prev) => ({
                      ...prev,
                      line: e.position.lineNumber,
                      col: e.position.column,
                    }));
                  });

                  // Listen to selection changes
                  editor.onDidChangeCursorSelection((e) => {
                    const sel = e.selection;
                    const model = editor.getModel();
                    const text = model ? model.getValueInRange(sel) : "";
                    setSelectedCode(text);
                    setCursorPos((prev) => ({
                      ...prev,
                      selectionLength: text.length,
                    }));
                  });

                  // Listen to marker diagnostics changes
                  monacoInstance.editor.onDidChangeMarkers(() => {
                    const markers = monacoInstance.editor.getModelMarkers({});
                    const formatted = markers.map((m) => ({
                      severity: m.severity === 8 ? "error" : "warning",
                      message: m.message,
                      line: m.startLineNumber,
                      column: m.startColumn,
                      fileName: activeFile.name,
                      fileId: activeFile.id,
                    }));
                    setProblems(formatted);
                  });
                }}
                options={{
                  minimap: { enabled: showMinimap },
                  fontSize,
                  fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
                  lineHeight: 22,
                  padding: { top: 12, bottom: 12 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  renderLineHighlight: "gutter",
                  automaticLayout: true,
                  wordWrap,
                  tabSize,
                }}
                theme={theme}
                value={activeFile.content}
              />
            )}
          </div>

          {/* Bottom Dockable Drawer */}
          <BottomPanel
            collabLogs={collabLogs}
            isOpen={showBottomPanel}
            nodes={nodes}
            onClearCollabLogs={() => setCollabLogs([])}
            onClearOutput={() => setOutputLogs([])}
            onClose={() => setShowBottomPanel(false)}
            onJumpToProblem={(fileId, line, col) => handleSelectFileAndLine(fileId, line, col)}
            outputLogs={outputLogs}
            problems={problems}
          />
        </main>

        {/* AI Assistant Right Panel */}
        {showAI && (
          <AIAssistant
            activeCode={activeFile.content}
            activeFileName={activeFile.name}
            activeLanguage={activeFile.language}
            onApplyCode={handleApplyAICode}
            onClose={() => setShowAI(false)}
            roomId={roomId}
            selectedCode={selectedCode}
          />
        )}
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        aiStatus="ready"
        connectedCount={users.length || 1}
        connectionStatus={connectionStatus}
        cursorCol={cursorPos.col}
        cursorLine={cursorPos.line}
        errorCount={problems.filter((p) => p.severity === "error").length}
        language={activeFile.language}
        onOpenCollab={() => {
          setActiveSidebarView("collab");
          setShowSidebar(true);
        }}
        onToggleAI={() => setShowAI((prev) => !prev)}
        onToggleBottomPanel={() => setShowBottomPanel((prev) => !prev)}
        roomId={roomId}
        saveState={saveState}
        selectionLength={cursorPos.selectionLength}
        warningCount={problems.filter((p) => p.severity === "warning").length}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        roomId={roomId}
        users={users}
      />
    </div>
  );
}
