import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  Maximize2,
  Minimize2,
  Radio,
  RotateCcw,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from "lucide-react";
import { getNodePath } from "../lib/workspaceModel.js";

export default function BottomPanel({
  isOpen = true,
  onClose,
  problems = [],
  outputLogs = [],
  collabLogs = [],
  nodes = [],
  onJumpToProblem,
  onClearOutput,
  onClearCollabLogs,
}) {
  const [activeTab, setActiveTab] = useState("terminal"); // 'problems' | 'output' | 'terminal' | 'collab'
  const [isMaximized, setIsMaximized] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState([
    { text: "Code Studio Terminal v1.0.0", type: "system" },
    { text: "Type 'help' to see available developer commands.", type: "system" },
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const commandHistoryRef = useRef([]);

  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (activeTab === "terminal") {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory, activeTab]);

  function handleTerminalSubmit(e) {
    e.preventDefault();
    const raw = terminalInput.trim();
    if (!raw) return;

    // Add to history
    commandHistoryRef.current.push(raw);
    setHistoryIndex(-1);

    const parts = raw.split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    const newEntries = [{ text: `guest@codestudio:~$ ${raw}`, type: "command" }];

    switch (cmd) {
      case "help":
        newEntries.push({
          text: `Available commands:
  help              - Show this help manual
  ls                - List files and directories in current workspace
  pwd               - Print working directory
  cat <filename>    - Display contents of a file
  stats             - Display workspace statistics
  echo <message>    - Print text to console
  date              - Show current date & time
  clear             - Clear terminal screen
  run [filename]    - Execute JavaScript in active file`,
          type: "output",
        });
        break;

      case "clear":
      case "cls":
        setTerminalHistory([]);
        setTerminalInput("");
        return;

      case "ls":
      case "dir": {
        const rootNodes = nodes.filter((n) => n.parentId === null);
        const listing = rootNodes
          .map((n) => (n.type === "folder" ? `📁 ${n.name}/` : `📄 ${n.name}`))
          .join("    ");
        newEntries.push({ text: listing || "(empty workspace)", type: "output" });
        break;
      }

      case "pwd":
        newEntries.push({ text: "/workspace/codesync-project", type: "output" });
        break;

      case "date":
        newEntries.push({ text: new Date().toString(), type: "output" });
        break;

      case "echo":
        newEntries.push({ text: args.join(" "), type: "output" });
        break;

      case "stats": {
        const fileCount = nodes.filter((n) => n.type === "file").length;
        const folderCount = nodes.filter((n) => n.type === "folder").length;
        const totalLines = nodes
          .filter((n) => n.type === "file")
          .reduce((acc, f) => acc + (f.content || "").split("\n").length, 0);

        newEntries.push({
          text: `Workspace Statistics:
  Total Files:        ${fileCount}
  Total Folders:      ${folderCount}
  Total Lines of Code: ${totalLines}`,
          type: "output",
        });
        break;
      }

      case "cat": {
        const fileName = args[0];
        if (!fileName) {
          newEntries.push({ text: "Usage: cat <filename>", type: "error" });
        } else {
          const file = nodes.find(
            (n) => n.type === "file" && n.name.toLowerCase() === fileName.toLowerCase()
          );
          if (file) {
            newEntries.push({ text: file.content || "(empty file)", type: "output" });
          } else {
            newEntries.push({ text: `cat: ${fileName}: No such file`, type: "error" });
          }
        }
        break;
      }

      case "run":
      case "node": {
        const targetFileName = args[0];
        let fileToRun = null;
        if (targetFileName) {
          fileToRun = nodes.find(
            (n) => n.type === "file" && n.name.toLowerCase() === targetFileName.toLowerCase()
          );
        } else {
          fileToRun = nodes.find((n) => n.type === "file" && n.language === "javascript");
        }

        if (!fileToRun) {
          newEntries.push({
            text: "No JavaScript file specified or found in workspace.",
            type: "error",
          });
        } else {
          newEntries.push({
            text: `Running ${fileToRun.name}...`,
            type: "system",
          });

          try {
            const logs = [];
            const safeConsole = {
              log: (...a) => logs.push(a.map(String).join(" ")),
              info: (...a) => logs.push(a.map(String).join(" ")),
              warn: (...a) => logs.push(`[WARN] ${a.map(String).join(" ")}`),
              error: (...a) => logs.push(`[ERROR] ${a.map(String).join(" ")}`),
            };

            const runFn = new Function("console", fileToRun.content);
            runFn(safeConsole);

            if (logs.length > 0) {
              logs.forEach((log) => newEntries.push({ text: log, type: "output" }));
            } else {
              newEntries.push({
                text: "Script executed successfully with no output.",
                type: "system",
              });
            }
          } catch (err) {
            newEntries.push({ text: `Runtime Error: ${err.message}`, type: "error" });
          }
        }
        break;
      }

      default:
        newEntries.push({
          text: `Command not found: ${cmd}. Type 'help' for available commands.`,
          type: "error",
        });
        break;
    }

    setTerminalHistory((prev) => [...prev, ...newEntries]);
    setTerminalInput("");
  }

  function handleTerminalKeyDown(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const history = commandHistoryRef.current;
      if (history.length > 0) {
        const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setTerminalInput(history[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const history = commandHistoryRef.current;
      if (historyIndex !== -1) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < history.length) {
          setHistoryIndex(nextIndex);
          setTerminalInput(history[nextIndex]);
        } else {
          setHistoryIndex(-1);
          setTerminalInput("");
        }
      }
    }
  }

  if (!isOpen) return null;

  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warningCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <section aria-label="Bottom Panel" className={`ide-bottom-panel ${isMaximized ? "is-maximized" : ""}`}>
      {/* Panel Tab Bar */}
      <div className="bottom-panel-header">
        <div className="panel-tab-group" role="tablist">
          {/* Problems Tab */}
          <button
            aria-selected={activeTab === "problems"}
            className={`panel-tab ${activeTab === "problems" ? "active" : ""}`}
            onClick={() => setActiveTab("problems")}
            role="tab"
            type="button"
          >
            <span>Problems</span>
            {problems.length > 0 && (
              <span className={`panel-badge ${errorCount > 0 ? "badge-error" : "badge-warn"}`}>
                {problems.length}
              </span>
            )}
          </button>

          {/* Terminal Tab */}
          <button
            aria-selected={activeTab === "terminal"}
            className={`panel-tab ${activeTab === "terminal" ? "active" : ""}`}
            onClick={() => setActiveTab("terminal")}
            role="tab"
            type="button"
          >
            <TerminalIcon size={13} />
            <span>Terminal</span>
          </button>

          {/* Output Tab */}
          <button
            aria-selected={activeTab === "output"}
            className={`panel-tab ${activeTab === "output" ? "active" : ""}`}
            onClick={() => setActiveTab("output")}
            role="tab"
            type="button"
          >
            <span>Output</span>
          </button>

          {/* Collab Log Tab */}
          <button
            aria-selected={activeTab === "collab"}
            className={`panel-tab ${activeTab === "collab" ? "active" : ""}`}
            onClick={() => setActiveTab("collab")}
            role="tab"
            type="button"
          >
            <Radio size={12} />
            <span>Collaboration</span>
          </button>
        </div>

        {/* Panel Right Controls */}
        <div className="panel-controls">
          {activeTab === "output" && (
            <button
              className="panel-icon-btn"
              onClick={onClearOutput}
              title="Clear Output"
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}
          {activeTab === "collab" && (
            <button
              className="panel-icon-btn"
              onClick={onClearCollabLogs}
              title="Clear Collab Log"
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}
          {activeTab === "terminal" && (
            <button
              className="panel-icon-btn"
              onClick={() => setTerminalHistory([])}
              title="Clear Terminal"
              type="button"
            >
              <RotateCcw size={13} />
            </button>
          )}
          <button
            className="panel-icon-btn"
            onClick={() => setIsMaximized((prev) => !prev)}
            title={isMaximized ? "Restore Size" : "Maximize Panel"}
            type="button"
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            className="panel-icon-btn"
            onClick={onClose}
            title="Close Panel (Ctrl+J)"
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Panel Body Content */}
      <div className="bottom-panel-body">
        {/* Problems View */}
        {activeTab === "problems" && (
          <div className="problems-view">
            {problems.length === 0 ? (
              <div className="panel-empty-state">
                <CheckCircle2 className="icon-success" size={16} />
                <span>No problems detected in the workspace.</span>
              </div>
            ) : (
              <div className="problems-list">
                {problems.map((p, idx) => (
                  <div
                    className="problem-row"
                    key={idx}
                    onClick={() => onJumpToProblem(p.fileId, p.line, p.column)}
                  >
                    <span className="problem-icon">
                      {p.severity === "error" ? (
                        <AlertCircle className="icon-error" size={14} />
                      ) : (
                        <AlertTriangle className="icon-warn" size={14} />
                      )}
                    </span>
                    <span className="problem-message">{p.message}</span>
                    <span className="problem-location">
                      [{p.fileName} Ln {p.line}, Col {p.column}]
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Terminal View */}
        {activeTab === "terminal" && (
          <div className="terminal-view" onClick={() => document.getElementById("terminal-cmd-input")?.focus()}>
            <div className="terminal-output-scroll">
              {terminalHistory.map((item, idx) => (
                <div className={`terminal-line terminal-${item.type}`} key={idx}>
                  <pre>{item.text}</pre>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            <form className="terminal-input-row" onSubmit={handleTerminalSubmit}>
              <span className="terminal-prompt">guest@codestudio:~$</span>
              <input
                autoComplete="off"
                className="terminal-cmd-input"
                id="terminal-cmd-input"
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={handleTerminalKeyDown}
                spellCheck={false}
                value={terminalInput}
              />
            </form>
          </div>
        )}

        {/* Output View */}
        {activeTab === "output" && (
          <div className="output-view">
            {outputLogs.length === 0 ? (
              <div className="panel-empty-state">
                <Info size={15} />
                <span>No system output.</span>
              </div>
            ) : (
              <div className="output-list">
                {outputLogs.map((log, idx) => (
                  <div className="output-line" key={idx}>
                    <span className="log-time">{log.time}</span>
                    <span className="log-text">{log.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collaboration Log View */}
        {activeTab === "collab" && (
          <div className="collab-log-view">
            {collabLogs.length === 0 ? (
              <div className="panel-empty-state">
                <Radio size={15} />
                <span>No collaboration events yet.</span>
              </div>
            ) : (
              <div className="output-list">
                {collabLogs.map((event, idx) => (
                  <div className="output-line" key={idx}>
                    <span className="log-time">{event.time}</span>
                    <span className={`collab-tag tag-${event.type}`}>{event.type}</span>
                    <span className="log-text">{event.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
