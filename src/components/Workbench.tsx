import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  ChevronDown,
  ChevronUp,
  CircleX,
  Clock3,
  LoaderCircle,
  Play,
  RotateCw,
  Terminal,
} from "lucide-react";
import type { FileLanguage, Presence, RunResult, Workspace, WorkspaceFile } from "@shared/types";
import type { SaveState } from "@/lib/ui";
import { baseName, formatDuration, languageLabel, timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";
import { FileGlyph } from "./FileGlyph";

const atelierTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "#d7dbe4",
      height: "100%",
      fontSize: "12.5px",
    },
    ".cm-scroller": {
      fontFamily:
        '"JetBrains Mono", "SFMono-Regular", "SF Mono", Menlo, Consolas, monospace',
      lineHeight: "1.7",
    },
    ".cm-content": {
      padding: "16px 0 40px",
      caretColor: "#d7f75b",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      border: "none",
      color: "#3f4552",
      paddingRight: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 4px 0 16px",
      minWidth: "32px",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255,255,255,0.022)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#9aa1ae",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#d7f75b",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgba(215,247,91,0.16) !important",
      },
    ".cm-panels": {
      backgroundColor: "#0c0e13",
      color: "#d7dbe4",
    },
    ".cm-tooltip": {
      backgroundColor: "#12151c",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "8px",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(215,247,91,0.14)",
      outline: "none",
    },
  },
  { dark: true },
);

function languageExtension(language: FileLanguage): Extension {
  switch (language) {
    case "javascript":
      return javascript();
    case "typescript":
      return javascript({ typescript: true });
    case "python":
      return python();
    case "markdown":
      return markdown();
    case "json":
      return json();
    default:
      return [];
  }
}

function runnable(language: FileLanguage): boolean {
  return language === "javascript" || language === "typescript" || language === "python";
}

interface WorkbenchProps {
  workspace: Workspace;
  activeFileId: string;
  presence: Presence[];
  saveState: SaveState;
  running: boolean;
  consoleOpen: boolean;
  onSelectFile: (fileId: string) => void;
  onChange: (fileId: string, content: string) => void;
  onRun: () => void;
  onToggleConsole: () => void;
}

export function Workbench({
  workspace,
  activeFileId,
  presence,
  saveState,
  running,
  consoleOpen,
  onSelectFile,
  onChange,
  onRun,
  onToggleConsole,
}: WorkbenchProps) {
  const activeFile = workspace.files.find((file) => file.id === activeFileId) ?? null;
  const extensions = useMemo(
    () => (activeFile ? [languageExtension(activeFile.language), atelierTheme] : [atelierTheme]),
    [activeFile?.language],
  );
  const editorsHere = presence.filter(
    (person) => activeFile && person.fileId === activeFile.id,
  );

  return (
    <div className="editor-column">
      <section className="workbench">
        <div className="file-tabs" role="tablist">
          {workspace.files.map((file) => (
            <button
              key={file.id}
              className={`file-tab ${file.id === activeFileId ? "is-active" : ""}`}
              onClick={() => onSelectFile(file.id)}
              role="tab"
              aria-selected={file.id === activeFileId}
            >
              <FileGlyph language={file.language} size={13} />
              <span>{baseName(file.path)}</span>
            </button>
          ))}
        </div>

        {activeFile ? (
          <>
            <div className="editor-meta">
              <span className="editor-meta__path">{activeFile.path}</span>
              <span className="editor-meta__sep">·</span>
              <span className="editor-meta__lang">{languageLabel(activeFile.language)}</span>
              <span className="editor-meta__sep">·</span>
              <span className="editor-meta__editor">
                edited by {activeFile.updatedBy} {timeAgo(activeFile.updatedAt)}
              </span>
              <span className="editor-meta__spacer" />
              {editorsHere.length > 0 ? (
                <span className="editing-now">
                  {editorsHere.slice(0, 3).map((person) => (
                    <Avatar
                      key={person.socketId}
                      name={person.name}
                      color={person.color}
                      size={18}
                      title={`${person.name} is viewing this file`}
                    />
                  ))}
                  <span>{editorsHere.length === 1 ? "here now" : "here now"}</span>
                </span>
              ) : null}
              <span className={`sync-chip sync-chip--${saveState}`}>
                <span className="sync-chip__dot" />
                {saveState === "saving" ? "syncing" : saveState === "offline" ? "offline" : "synced"}
              </span>
            </div>

            <div className="editor-surface">
              <CodeMirror
                key={activeFile.id}
                value={activeFile.content}
                height="100%"
                theme={oneDark}
                extensions={extensions}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  highlightActiveLine: true,
                  highlightActiveLineGutter: true,
                  autocompletion: false,
                  bracketMatching: true,
                  closeBrackets: true,
                  highlightSelectionMatches: false,
                  indentOnInput: true,
                  searchKeymap: true,
                }}
                onChange={(value) => onChange(activeFile.id, value)}
              />
            </div>
          </>
        ) : (
          <div className="editor-empty">
            <FileGlyph language="text" size={22} />
            <strong>No file selected</strong>
            <span>Pick a file from the tree or create a new one.</span>
          </div>
        )}

        <Console
          file={activeFile}
          run={workspace.lastRun}
          running={running}
          open={consoleOpen}
          onToggle={onToggleConsole}
          onRun={onRun}
        />
      </section>
    </div>
  );
}

interface ConsoleProps {
  file: WorkspaceFile | null;
  run: RunResult | null;
  running: boolean;
  open: boolean;
  onToggle: () => void;
  onRun: () => void;
}

function Console({ file, run, running, open, onToggle, onRun }: ConsoleProps) {
  const status = running ? "running" : (run?.status ?? "idle");
  const canRun = file ? runnable(file.language) : false;

  return (
    <section className={`console ${open ? "is-open" : "is-collapsed"}`}>
      <div className="console__bar">
        <button className="console__toggle" onClick={onToggle} title="Toggle console">
          <Terminal size={13} />
          <span>Console</span>
          <span className={`console-status console-status--${status}`}>
            {running ? (
              <>
                <LoaderCircle size={10} className="spin" /> running
              </>
            ) : status === "success" ? (
              <>
                <span className="console-status__dot" /> passed
              </>
            ) : status === "error" || status === "timeout" ? (
              <>
                <CircleX size={10} /> {status}
              </>
            ) : (
              "idle"
            )}
          </span>
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        <div className="console__meta">
          {run && !running ? (
            <>
              <span className="console__file">{baseName(run.filePath)}</span>
              <span className="console__dot">·</span>
              <span>
                <Clock3 size={11} /> {formatDuration(run.durationMs)}
              </span>
              <span className="console__dot">·</span>
              <span>exit {run.exitCode ?? "—"}</span>
            </>
          ) : running ? (
            <span className="console__running">
              Executing in an ephemeral {file?.language === "python" ? "Python" : "Node"} sandbox…
            </span>
          ) : (
            <span>Nothing executed yet</span>
          )}
        </div>

        <div className="console__actions">
          <button
            className="console__action"
            onClick={onRun}
            disabled={!canRun || running}
            title="Run active file"
          >
            <RotateCw size={12} />
            Re-run
          </button>
        </div>
      </div>

      {open ? (
        <div className="console__body">
          {running ? (
            <div className="console__loading">
              <span className="terminal-caret">$</span>
              <span>node {file ? baseName(file.path) : "…"}</span>
              <span className="loading-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
          ) : run ? (
            <>
              <div className="console__command">
                <span className="terminal-caret">$</span>
                <span>
                  {run.runtime} {baseName(run.filePath)}
                </span>
                <span className={`console-exit console-exit--${run.status}`}>
                  exit {run.exitCode ?? "timeout"}
                </span>
              </div>
              {run.stdout ? <pre className="console__stdout">{run.stdout}</pre> : null}
              {run.stderr ? <pre className="console__stderr">{run.stderr}</pre> : null}
              {!run.stdout && !run.stderr ? (
                <div className="console__quiet">Process finished without output.</div>
              ) : null}
            </>
          ) : (
            <div className="console__empty">
              <div className="console__empty-icon">
                <Terminal size={20} />
              </div>
              <div>
                <strong>Sandbox output lands here.</strong>
                <span>
                  {canRun
                    ? `Run ${file ? baseName(file.path) : "the active file"} to execute it in a throwaway workspace.`
                    : "Select a JavaScript, TypeScript, or Python file to run."}
                </span>
              </div>
              <button className="console__run-empty" onClick={onRun} disabled={!canRun}>
                <Play size={12} fill="currentColor" />
                Run file
              </button>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
