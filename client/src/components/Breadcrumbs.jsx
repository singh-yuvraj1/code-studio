import { ChevronRight, FileCode, Folder } from "lucide-react";
import { getNodeBreadcrumbs } from "../lib/workspaceModel.js";

export default function Breadcrumbs({
  nodes = [],
  activeFileId,
  workspaceName = "workspace",
}) {
  if (!activeFileId) return null;

  const crumbs = getNodeBreadcrumbs(nodes, activeFileId, workspaceName);

  return (
    <div className="editor-breadcrumbs">
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <div className="breadcrumb-segment" key={crumb.id}>
            {idx > 0 && <ChevronRight className="breadcrumb-separator" size={12} />}
            <span className="breadcrumb-item">
              {crumb.type === "folder" ? (
                <Folder className="breadcrumb-folder-icon" size={13} />
              ) : (
                <FileCode className="breadcrumb-file-icon" size={13} />
              )}
              <span className={`breadcrumb-name ${isLast ? "current-file" : ""}`}>
                {crumb.name}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
