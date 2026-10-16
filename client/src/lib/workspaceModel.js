export function detectLanguage(fileName = "") {
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "py":
    case "pyw":
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
    case "cxx":
    case "hpp":
    case "h":
    case "c":
      return "cpp";
    case "rs":
      return "rust";
    case "go":
      return "go";
    case "sql":
      return "sql";
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "yaml":
    case "yml":
      return "yaml";
    case "xml":
    case "svg":
      return "xml";
    case "md":
    case "markdown":
      return "markdown";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
    default:
      return "javascript";
  }
}

export function getLanguageBadge(language = "javascript") {
  switch (language) {
    case "typescript":
      return { text: "TS", color: "#38bdf8", bg: "#0c4a6e" };
    case "python":
      return { text: "PY", color: "#fbbf24", bg: "#451a03" };
    case "html":
      return { text: "HTML", color: "#f97316", bg: "#431407" };
    case "css":
      return { text: "CSS", color: "#60a5fa", bg: "#1e3a8a" };
    case "json":
      return { text: "{}", color: "#eab308", bg: "#3b3306" };
    case "java":
      return { text: "JAVA", color: "#ea580c", bg: "#431407" };
    case "cpp":
      return { text: "C++", color: "#ec4899", bg: "#500724" };
    case "rust":
      return { text: "RS", color: "#f97316", bg: "#431407" };
    case "go":
      return { text: "GO", color: "#06b6d4", bg: "#083344" };
    case "sql":
      return { text: "SQL", color: "#a855f7", bg: "#3b0764" };
    case "shell":
      return { text: "SH", color: "#4ade80", bg: "#052e16" };
    case "yaml":
      return { text: "YML", color: "#f43f5e", bg: "#4c0519" };
    case "markdown":
      return { text: "MD", color: "#94a3b8", bg: "#1e293b" };
    case "javascript":
    default:
      return { text: "JS", color: "#facc15", bg: "#422006" };
  }
}

export function createDefaultWorkspace() {
  return [
    {
      id: "dir-src",
      name: "src",
      type: "folder",
      parentId: null,
      isOpen: true,
    },
    {
      id: "dir-components",
      name: "components",
      type: "folder",
      parentId: "dir-src",
      isOpen: true,
    },
    {
      id: "f-editor",
      name: "Editor.jsx",
      type: "file",
      parentId: "dir-components",
      language: "javascript",
      content: `import React from 'react';\n\nexport function Editor({ code, onCodeChange }) {\n  return (\n    <div className="editor-container">\n      <textarea \n        value={code} \n        onChange={(e) => onCodeChange(e.target.value)} \n        placeholder="Write code..."\n      />\n    </div>\n  );\n}\n`,
    },
    {
      id: "f-navbar",
      name: "Navbar.jsx",
      type: "file",
      parentId: "dir-components",
      language: "javascript",
      content: `export function Navbar({ title = "Code Studio" }) {\n  return (\n    <header className="navbar">\n      <div className="logo">{title}</div>\n      <nav>\n        <a href="#files">Files</a>\n        <a href="#collab">Collaborate</a>\n        <a href="#ai">AI Assistant</a>\n      </nav>\n    </header>\n  );\n}\n`,
    },
    {
      id: "dir-utils",
      name: "utils",
      type: "folder",
      parentId: "dir-src",
      isOpen: false,
    },
    {
      id: "f-helpers",
      name: "helpers.js",
      type: "file",
      parentId: "dir-utils",
      language: "javascript",
      content: `/**\n * Utility functions for Code Studio\n */\nexport function formatDate(timestamp) {\n  return new Intl.DateTimeFormat('en-US', {\n    hour: '2-digit',\n    minute: '2-digit',\n    second: '2-digit'\n  }).format(new Date(timestamp));\n}\n\nexport function debounce(fn, ms = 200) {\n  let timer;\n  return (...args) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  };\n}\n`,
    },
    {
      id: "f-app",
      name: "App.jsx",
      type: "file",
      parentId: "dir-src",
      language: "javascript",
      content: `import { useState } from 'react';\nimport { Navbar } from './components/Navbar';\nimport { Editor } from './components/Editor';\n\nexport default function App() {\n  const [code, setCode] = useState('// Welcome to Code Studio');\n\n  return (\n    <div className="app-shell">\n      <Navbar title="Code Studio Workspace" />\n      <main>\n        <Editor code={code} onCodeChange={setCode} />\n      </main>\n    </div>\n  );\n}\n`,
    },
    {
      id: "f-main",
      name: "main.jsx",
      type: "file",
      parentId: "dir-src",
      language: "javascript",
      content: `// Welcome to your Code Studio workspace!\n// Real-time collaboration, Monaco editor, and AI coding assistant.\n\nfunction greet(name) {\n  return \`Hello, \${name}! Let's build something extraordinary.\`;\n}\n\nconsole.log(greet("world"));\n`,
    },
    {
      id: "dir-public",
      name: "public",
      type: "folder",
      parentId: null,
      isOpen: false,
    },
    {
      id: "f-index-html",
      name: "index.html",
      type: "file",
      parentId: "dir-public",
      language: "html",
      content: `<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Code Studio App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n`,
    },
    {
      id: "f-package",
      name: "package.json",
      type: "file",
      parentId: null,
      language: "json",
      content: `{\n  "name": "code-studio-workspace",\n  "version": "1.0.0",\n  "type": "module",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  },\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1"\n  }\n}\n`,
    },
    {
      id: "f-readme",
      name: "README.md",
      type: "file",
      parentId: null,
      language: "markdown",
      content: `# Code Studio Workspace\n\nWelcome to your professional collaborative coding environment.\n\n### Key Features\n- **Monaco Code Editor**: VS Code-grade editing with syntax highlighting, autocomplete, and diagnostics.\n- **Full Folder Management**: Create, rename, delete, and nest folders & files with instant synchronization.\n- **Real-Time Collaboration**: Share your Room ID with teammates for live multiplayer coding.\n- **Gemini AI Coding Assistant**: Explain code, find bugs, optimize performance, and write unit tests.\n- **Local & Remote Persistence**: Automatic saving to browser storage and Socket.IO workspace broadcast.\n`,
    },
  ];
}

export function buildTree(nodes = [], parentId = null) {
  const children = nodes.filter((node) => (node.parentId ?? null) === parentId);

  // Sort: folders first, then alphabetical
  children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  });

  return children.map((node) => {
    if (node.type === "folder") {
      return {
        ...node,
        children: buildTree(nodes, node.id),
      };
    }
    return node;
  });
}

export function getNodePath(nodes = [], nodeId) {
  const segments = [];
  let current = nodes.find((n) => n.id === nodeId);
  while (current) {
    segments.unshift(current.name);
    current = current.parentId ? nodes.find((n) => n.id === current.parentId) : null;
  }
  return segments.join("/");
}

export function getNodeBreadcrumbs(nodes = [], nodeId, rootName = "workspace") {
  const crumbs = [];
  let current = nodes.find((n) => n.id === nodeId);
  while (current) {
    crumbs.unshift({ id: current.id, name: current.name, type: current.type });
    current = current.parentId ? nodes.find((n) => n.id === current.parentId) : null;
  }
  crumbs.unshift({ id: "root", name: rootName, type: "folder" });
  return crumbs;
}

export function validateNodeName(name = "", parentId = null, nodes = [], isFolder = false, excludeId = null) {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: `${isFolder ? "Folder" : "File"} name cannot be empty.` };
  }

  if (trimmed.length > 80) {
    return { valid: false, error: "Name must be 80 characters or fewer." };
  }

  // Prevent illegal filesystem characters: / \ : * ? " < > |
  if (/[/\\:*?"<>|]/.test(trimmed)) {
    return {
      valid: false,
      error: `Name cannot contain special characters like / \\ : * ? " < > |`,
    };
  }

  if (trimmed === "." || trimmed === "..") {
    return { valid: false, error: "Invalid name." };
  }

  // Check uniqueness within the same parent folder
  const siblingDuplicate = nodes.some(
    (node) =>
      node.id !== excludeId &&
      (node.parentId ?? null) === (parentId ?? null) &&
      node.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (siblingDuplicate) {
    return {
      valid: false,
      error: `A ${isFolder ? "folder" : "file"} named "${trimmed}" already exists in this folder.`,
    };
  }

  return { valid: true, sanitizedName: trimmed };
}

export function findDescendantIds(nodes = [], folderId) {
  const descendantIds = new Set();
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = nodes.filter((n) => n.parentId === currentId);
    for (const child of children) {
      descendantIds.add(child.id);
      if (child.type === "folder") {
        queue.push(child.id);
      }
    }
  }

  return Array.from(descendantIds);
}

export function deleteNodeRecursively(nodes = [], nodeId) {
  const toDelete = new Set([nodeId, ...findDescendantIds(nodes, nodeId)]);
  return nodes.filter((node) => !toDelete.has(node.id));
}

export function toggleFolder(nodes = [], folderId, forceState = null) {
  return nodes.map((node) => {
    if (node.id === folderId && node.type === "folder") {
      return {
        ...node,
        isOpen: forceState !== null ? forceState : !node.isOpen,
      };
    }
    return node;
  });
}

export function collapseAllFolders(nodes = []) {
  return nodes.map((node) => {
    if (node.type === "folder") {
      return { ...node, isOpen: false };
    }
    return node;
  });
}

export function expandAllFolders(nodes = []) {
  return nodes.map((node) => {
    if (node.type === "folder") {
      return { ...node, isOpen: true };
    }
    return node;
  });
}

export function searchWorkspace(nodes = [], query = "") {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const results = [];

  for (const node of nodes) {
    if (node.type !== "file") continue;
    const path = getNodePath(nodes, node.id);
    const content = node.content || "";
    const lines = content.split("\n");

    const matches = [];
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(trimmed)) {
        matches.push({
          line: index + 1,
          preview: line.trim(),
        });
      }
    });

    const nameMatches = node.name.toLowerCase().includes(trimmed);

    if (nameMatches || matches.length > 0) {
      results.push({
        fileId: node.id,
        fileName: node.name,
        filePath: path,
        language: node.language || "text",
        matches: matches.slice(0, 15), // cap matches per file
        matchCount: matches.length,
      });
    }
  }

  return results;
}

export async function importFromDirectoryHandle(dirHandle) {
  const nodes = [];
  const folderQueue = [{ handle: dirHandle, parentId: null, path: "" }];

  const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    ".cache",
    ".vscode",
    ".idea",
  ]);

  while (folderQueue.length > 0) {
    const { handle, parentId, path } = folderQueue.shift();

    for await (const entry of handle.values()) {
      if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;

      if (entry.kind === "directory") {
        if (IGNORED_DIRS.has(entry.name)) continue;

        const folderId = `dir-${crypto.randomUUID().slice(0, 8)}`;
        nodes.push({
          id: folderId,
          name: entry.name,
          type: "folder",
          parentId,
          isOpen: path === "", // expand root folders
        });

        folderQueue.push({
          handle: entry,
          parentId: folderId,
          path: `${path}/${entry.name}`,
        });
      } else if (entry.kind === "file") {
        try {
          const file = await entry.getFile();
          if (file.size > 800 * 1024) continue; // skip files > 800KB
          const text = await file.text();
          const fileId = `f-${crypto.randomUUID().slice(0, 8)}`;
          nodes.push({
            id: fileId,
            name: entry.name,
            type: "file",
            parentId,
            language: detectLanguage(entry.name),
            content: text,
          });
        } catch (e) {
          console.warn(`Unable to read file ${entry.name}`, e);
        }
      }
    }
  }

  return nodes;
}

export async function importFromFileList(fileList) {
  const nodes = [];
  const folderPathMap = new Map(); // path -> folderId

  const IGNORED_PARTS = new Set(["node_modules", ".git", "dist", "build"]);

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split("/").filter(Boolean);

    // If it has folder prefix, e.g. "my-repo/src/App.jsx", skip root folder if top-level
    const pathParts = parts.length > 1 ? parts.slice(1) : parts;
    if (pathParts.some((p) => IGNORED_PARTS.has(p))) continue;

    let currentParentId = null;
    let accumulatedPath = "";

    // Build directory chain
    for (let j = 0; j < pathParts.length - 1; j++) {
      const folderName = pathParts[j];
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${folderName}` : folderName;

      if (!folderPathMap.has(accumulatedPath)) {
        const folderId = `dir-${crypto.randomUUID().slice(0, 8)}`;
        folderPathMap.set(accumulatedPath, folderId);
        nodes.push({
          id: folderId,
          name: folderName,
          type: "folder",
          parentId: currentParentId,
          isOpen: j === 0,
        });
      }
      currentParentId = folderPathMap.get(accumulatedPath);
    }

    const fileName = pathParts[pathParts.length - 1];
    try {
      if (file.size <= 800 * 1024) {
        const content = await file.text();
        const fileId = `f-${crypto.randomUUID().slice(0, 8)}`;
        nodes.push({
          id: fileId,
          name: fileName,
          type: "file",
          parentId: currentParentId,
          language: detectLanguage(fileName),
          content,
        });
      }
    } catch (e) {
      console.warn(`Could not read file ${fileName}`, e);
    }
  }

  return nodes;
}

export function exportWorkspaceBundle(nodes = [], roomId = "local") {
  const filesOnly = nodes.filter((n) => n.type === "file");
  const bundle = {
    workspaceId: roomId,
    exportedAt: new Date().toISOString(),
    totalFiles: filesOnly.length,
    structure: nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      parentId: n.parentId,
      path: getNodePath(nodes, n.id),
      language: n.language,
      content: n.content,
    })),
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `code-studio-${roomId.toLowerCase()}-workspace.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
