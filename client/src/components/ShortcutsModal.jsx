import { useEffect } from "react";
import { Command, Keyboard, X } from "lucide-react";

const SHORTCUT_GROUPS = [
  {
    category: "File & Workspace Management",
    items: [
      { keys: ["Ctrl", "N"], desc: "Create new file" },
      { keys: ["Ctrl", "Shift", "N"], desc: "Create new folder" },
      { keys: ["Ctrl", "O"], desc: "Open single file" },
      { keys: ["Ctrl", "Shift", "O"], desc: "Open local folder (directory picker)" },
      { keys: ["Ctrl", "S"], desc: "Save workspace draft" },
      { keys: ["Ctrl", "Shift", "E"], desc: "Export workspace bundle" },
      { keys: ["Ctrl", "W"], desc: "Close active file tab" },
      { keys: ["F2"], desc: "Rename selected file or folder" },
    ],
  },
  {
    category: "IDE Views & Panels",
    items: [
      { keys: ["Ctrl", "B"], desc: "Toggle File Explorer sidebar" },
      { keys: ["Ctrl", "Shift", "A"], desc: "Toggle AI Assistant panel" },
      { keys: ["Ctrl", "J"], desc: "Toggle Bottom Panel (Terminal/Problems)" },
      { keys: ["Ctrl", "Shift", "F"], desc: "Focus Workspace Search" },
      { keys: ["Alt", "Z"], desc: "Toggle editor word wrap" },
      { keys: ["F1"], desc: "Open Keyboard Shortcuts" },
    ],
  },
  {
    category: "Editor Actions",
    items: [
      { keys: ["Ctrl", "F"], desc: "Find in active file" },
      { keys: ["Ctrl", "H"], desc: "Find and replace in file" },
      { keys: ["Ctrl", "Z"], desc: "Undo" },
      { keys: ["Ctrl", "Y"], desc: "Redo" },
      { keys: ["Ctrl", "A"], desc: "Select all" },
    ],
  },
  {
    category: "AI Coding Assistant",
    items: [
      { keys: ["Ctrl", "Enter"], desc: "Send prompt or code query to AI" },
      { keys: ["Esc"], desc: "Cancel prompt or close modal" },
    ],
  },
];

export default function ShortcutsModal({ isOpen = false, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card shortcuts-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Keyboard size={16} />
            <h3>Keyboard Shortcuts</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={15} />
          </button>
        </div>

        <div className="shortcuts-modal-body">
          {SHORTCUT_GROUPS.map((group, gIdx) => (
            <div className="shortcut-group" key={gIdx}>
              <h4 className="shortcut-category-title">{group.category}</h4>
              <div className="shortcut-items-grid">
                {group.items.map((item, iIdx) => (
                  <div className="shortcut-row" key={iIdx}>
                    <span className="shortcut-desc">{item.desc}</span>
                    <div className="shortcut-keys">
                      {item.keys.map((k, kIdx) => (
                        <kbd key={kIdx}>{k}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
