import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileCode, Search, X } from "lucide-react";
import { getLanguageBadge, searchWorkspace } from "../lib/workspaceModel.js";

export default function SearchPane({
  nodes = [],
  onSelectFileAndLine,
}) {
  const [query, setQuery] = useState("");
  const [collapsedFiles, setCollapsedFiles] = useState({});

  const searchResults = useMemo(() => {
    return searchWorkspace(nodes, query);
  }, [nodes, query]);

  const totalMatches = useMemo(() => {
    return searchResults.reduce((acc, curr) => acc + curr.matchCount, 0);
  }, [searchResults]);

  function toggleFileCollapse(fileId) {
    setCollapsedFiles((prev) => ({
      ...prev,
      [fileId]: !prev[fileId],
    }));
  }

  return (
    <aside aria-label="Search Workspace" className="ide-sidebar-panel search-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-header-title">
          <span>SEARCH</span>
        </span>
      </div>

      <div className="search-input-container">
        <div className="search-input-wrap">
          <Search size={14} />
          <input
            autoFocus
            className="search-input"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across files..."
            value={query}
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => setQuery("")}
              type="button"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {query && (
        <div className="search-summary">
          <span>
            {totalMatches} {totalMatches === 1 ? "result" : "results"} across{" "}
            {searchResults.length} {searchResults.length === 1 ? "file" : "files"}
          </span>
        </div>
      )}

      <div className="search-results-list">
        {query.trim() === "" ? (
          <div className="search-empty-prompt">
            <Search size={22} />
            <p>Type to search all files in this workspace.</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="search-empty-prompt">
            <p>No results found for &quot;{query}&quot;.</p>
          </div>
        ) : (
          searchResults.map((result) => {
            const isCollapsed = Boolean(collapsedFiles[result.fileId]);
            const badge = getLanguageBadge(result.language);

            return (
              <div className="search-result-group" key={result.fileId}>
                <div
                  className="search-result-header"
                  onClick={() => toggleFileCollapse(result.fileId)}
                >
                  <span className="search-chevron">
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  </span>
                  <span
                    className="file-type-badge"
                    style={{ color: badge.color, backgroundColor: badge.bg }}
                  >
                    {badge.text}
                  </span>
                  <span className="search-filename" title={result.filePath}>
                    {result.fileName}
                  </span>
                  <span className="search-filepath-hint">{result.filePath}</span>
                  <span className="search-match-badge">{result.matchCount}</span>
                </div>

                {!isCollapsed && (
                  <div className="search-matches-lines">
                    {result.matches.map((match, idx) => (
                      <div
                        className="search-line-row"
                        key={idx}
                        onClick={() =>
                          onSelectFileAndLine(result.fileId, match.line)
                        }
                      >
                        <span className="search-line-number">{match.line}</span>
                        <span className="search-line-preview">{match.preview}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
