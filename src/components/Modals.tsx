import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Check,
  Copy,
  FilePlus2,
  Link2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { Agent, Presence, Workspace } from "@shared/types";
import { Avatar } from "./Avatar";

interface ModalProps {
  eyebrow: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

function Modal({ eyebrow, title, description, onClose, children }: ModalProps) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function starterContent(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const name = (path.split("/").pop() ?? "module").replace(/\.[^.]+$/, "");
  const camel = name.replace(/[-_]+(.)?/g, (_, char: string) => (char ? char.toUpperCase() : ""));
  switch (ext) {
    case "js":
      return `export function ${camel || "run"}() {\n  return "ready";\n}\n\nconsole.log(${camel || "run"}());\n`;
    case "ts":
      return `export function ${camel || "run"}(input: string): string {\n  return input.trim();\n}\n`;
    case "py":
      return `def ${name.replace(/[^a-z0-9_]/gi, "_") || "main"}():\n    print("hello from ${path}")\n\n\nif __name__ == "__main__":\n    main()\n`;
    case "md":
      return `# ${name.replace(/[-_]/g, " ")}\n\nContext for the room.\n\n## Decisions\n\n- \n`;
    case "json":
      return `{\n  "name": "${name}"\n}\n`;
    case "css":
      return `:root {\n  --ink: #0a0c10;\n}\n`;
    case "html":
      return `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>${name}</title>\n  </head>\n  <body>\n    <main></main>\n  </body>\n</html>\n`;
    default:
      return "";
  }
}

interface ModalsProps {
  modal: "new-file" | "new-space" | "share" | "profile";
  workspace: Workspace;
  user: { id: string; name: string };
  presence: Presence[];
  onClose: () => void;
  onCreateFile: (path: string, content: string) => Promise<void>;
  onCreateSpace: (name: string) => Promise<void>;
  onRename: (name: string) => void;
}

export function Modals({
  modal,
  workspace,
  user,
  presence,
  onClose,
  onCreateFile,
  onCreateSpace,
  onRename,
}: ModalsProps) {
  if (modal === "new-file") {
    return (
      <NewFileModal
        onClose={onClose}
        onCreate={async (path, content) => {
          await onCreateFile(path, content);
          onClose();
        }}
      />
    );
  }
  if (modal === "new-space") {
    return (
      <NewSpaceModal
        onClose={onClose}
        onCreate={async (name) => {
          await onCreateSpace(name);
          onClose();
        }}
      />
    );
  }
  if (modal === "share") {
    return (
      <ShareModal
        workspace={workspace}
        presence={presence}
        user={user}
        onClose={onClose}
      />
    );
  }
  return (
    <ProfileModal
      name={user.name}
      onClose={onClose}
      onSave={(name) => {
        onRename(name);
        onClose();
      }}
    />
  );
}

function NewFileModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (path: string, content: string) => Promise<void>;
}) {
  const [path, setPath] = useState("src/new-module.js");
  const [busy, setBusy] = useState(false);
  const preview = starterContent(path);

  const submit = async () => {
    if (!path.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(path.trim(), preview);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      eyebrow="New file"
      title="Add to the shared tree"
      description="Everyone in the room sees it instantly. JavaScript, Python, and Markdown run or render well."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="field-label" htmlFor="new-file-path">
          Path
        </label>
        <div className="input-with-icon">
          <FilePlus2 size={15} />
          <input
            id="new-file-path"
            autoFocus
            value={path}
            onChange={(event) => setPath(event.target.value)}
            placeholder="src/feature.js"
            maxLength={140}
            spellCheck={false}
          />
        </div>
        <div className="file-preview">
          <span className="eyebrow">Starter</span>
          <pre>{preview || "Empty file"}</pre>
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={!path.trim() || busy}>
            {busy ? "Creating…" : "Create file"}
            <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewSpaceModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      await onCreate(name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      eyebrow="New shared space"
      title="Start a clean room"
      description="A new code space with its own files, agents, board, and sandbox. The current room stays untouched."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="field-label" htmlFor="new-space-name">
          Space name
        </label>
        <input
          id="new-space-name"
          autoFocus
          className="text-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Relay service"
          maxLength={48}
        />
        <div className="space-preview">
          <span className="space-preview__glyph">{(name || "A").slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{name || "Untitled space"}</strong>
            <span>2 starter files · 4 agents · 1 sandbox</span>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={name.trim().length < 2 || busy}>
            {busy ? "Creating…" : "Create space"}
            <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ShareModal({
  workspace,
  presence,
  user,
  onClose,
}: {
  workspace: Workspace;
  presence: Presence[];
  user: { id: string; name: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${window.location.pathname}?space=${workspace.id}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1_800);
    } catch {
      window.prompt("Copy this room link", url);
    }
  };

  return (
    <Modal
      eyebrow="Invite"
      title={`Share ${workspace.name}`}
      description="Anyone with the link can join this room as a human. Agents are already on the floor."
      onClose={onClose}
    >
      <div className="share-link">
        <Link2 size={15} />
        <input readOnly value={url} onFocus={(event) => event.target.select()} />
        <button className="primary-btn primary-btn--compact" onClick={() => void copy()}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="share-section">
        <span className="eyebrow">Humans in the room</span>
        <div className="share-people">
          <div className="share-person">
            <Avatar name={user.name} size={26} color="#d7f75b" />
            <div>
              <strong>{user.name}</strong>
              <span>this tab</span>
            </div>
          </div>
          {presence
            .filter((person) => person.userId !== user.id)
            .slice(0, 6)
            .map((person) => (
              <div className="share-person" key={person.socketId}>
                <Avatar name={person.name} color={person.color} size={26} />
                <div>
                  <strong>{person.name}</strong>
                  <span>live now</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="share-section">
        <span className="eyebrow">Agents on the floor</span>
        <div className="share-agents">
          {workspace.agents.map((agent: Agent) => (
            <div className="share-agent" key={agent.id}>
              <Avatar name={agent.name} color={agent.color} kind="agent" size={26} />
              <div>
                <strong>{agent.name}</strong>
                <span>{agent.role}</span>
              </div>
              <span className="share-agent__state">{agent.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="share-note">
        <ShieldCheck size={14} />
        <span>
          Files are shared, credentials are not. The sandbox gets a copy of the tree and a hard
          time limit.
        </span>
      </div>
    </Modal>
  );
}

function ProfileModal({
  name,
  onClose,
  onSave,
}: {
  name: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(name);

  return (
    <Modal
      eyebrow="Your identity"
      title="How the room sees you"
      description="Stored locally in this browser. Changing it updates presence immediately."
      onClose={onClose}
    >
      <form
        className="modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim().length >= 2) onSave(value.trim().slice(0, 40));
        }}
      >
        <label className="field-label" htmlFor="profile-name">
          Display name
        </label>
        <div className="input-with-icon">
          <UserRound size={15} />
          <input
            id="profile-name"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={40}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-btn" disabled={value.trim().length < 2}>
            Save identity
          </button>
        </div>
      </form>
    </Modal>
  );
}
