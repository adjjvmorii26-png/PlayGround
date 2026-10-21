import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  AtSign,
  Check,
  Circle,
  ListTodo,
  MessageSquare,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import type {
  Agent,
  AgentId,
  AgentStatus,
  ChatMessage,
  Presence,
  Task,
  Workspace,
} from "@shared/types";
import type { LocalUser } from "@/lib/user";
import type { RoomTab } from "@/lib/ui";
import { colorFor, friendlyStatus, timeAgo } from "@/lib/format";
import { Avatar } from "./Avatar";
import { RichText } from "./RichText";

interface RoomPanelProps {
  workspace: Workspace;
  presence: Presence[];
  user: LocalUser;
  typingAgents: Record<string, AgentStatus>;
  tab: RoomTab;
  open: boolean;
  onTabChange: (tab: RoomTab) => void;
  onSendMessage: (text: string) => Promise<void>;
  onAgentAction: (agentId: AgentId) => void;
  onUpdateTask: (task: Task, status: "todo" | "done") => void;
  onAddTask: (title: string, agentId: AgentId | null) => Promise<void>;
  onClose: () => void;
}

export function RoomPanel({
  workspace,
  presence,
  user,
  typingAgents,
  tab,
  open,
  onTabChange,
  onSendMessage,
  onAgentAction,
  onUpdateTask,
  onAddTask,
  onClose,
}: RoomPanelProps) {
  const openTasks = workspace.tasks.filter((task) => task.status !== "done").length;

  return (
    <aside className={`room-panel ${open ? "is-open" : ""}`}>
      <div className="room-head">
        <div className="room-tabs">
          <button
            className={tab === "room" ? "is-active" : ""}
            onClick={() => onTabChange("room")}
          >
            <MessageSquare size={13} />
            Room
            <span>{workspace.messages.length}</span>
          </button>
          <button
            className={tab === "board" ? "is-active" : ""}
            onClick={() => onTabChange("board")}
          >
            <ListTodo size={13} />
            Board
            <span>{openTasks}</span>
          </button>
        </div>
        <div className="room-head__right">
          <span className="room-live">
            <span className="room-live__dot" />
            live
          </span>
          <button className="icon-btn icon-btn--tiny room-close" onClick={onClose} title="Close panel">
            <X size={14} />
          </button>
        </div>
      </div>

      {tab === "room" ? (
        <RoomTabView
          workspace={workspace}
          presence={presence}
          user={user}
          typingAgents={typingAgents}
          onSendMessage={onSendMessage}
          onAgentAction={onAgentAction}
        />
      ) : (
        <BoardTabView
          workspace={workspace}
          onUpdateTask={onUpdateTask}
          onAddTask={onAddTask}
          onAgentAction={onAgentAction}
        />
      )}
    </aside>
  );
}

function agentById(workspace: Workspace, agentId?: AgentId): Agent | undefined {
  return workspace.agents.find((agent) => agent.id === agentId);
}

interface RoomTabViewProps {
  workspace: Workspace;
  presence: Presence[];
  user: LocalUser;
  typingAgents: Record<string, AgentStatus>;
  onSendMessage: (text: string) => Promise<void>;
  onAgentAction: (agentId: AgentId) => void;
}

function RoomTabView({
  workspace,
  presence,
  user,
  typingAgents,
  onSendMessage,
  onAgentAction,
}: RoomTabViewProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const thinking = workspace.agents.filter(
    (agent) => agent.status === "thinking" || typingAgents[agent.id] === "thinking",
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [workspace.messages.length, thinking.length]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      await onSendMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const mention = (agent: Agent) => {
    setDraft((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@${agent.name} `);
    inputRef.current?.focus();
  };

  return (
    <div className="room-tab">
      <div className="room-context">
        <span className="room-context__humans">
          <span className="room-context__dot" />
          {presence.length || 1} human{presence.length === 1 ? "" : "s"}
        </span>
        <span className="room-context__sep">·</span>
        <span>{workspace.agents.length} agents</span>
        <span className="room-context__sep">·</span>
        <span>shared context</span>
      </div>

      <div className="message-scroll" ref={scrollRef}>
        <div className="room-daybreak">
          <span />
          Today in {workspace.name}
          <span />
        </div>
        {workspace.messages.map((message) => (
          <MessageRow
            key={message.id}
            message={message}
            agent={agentById(workspace, message.agentId)}
            presence={presence}
          />
        ))}
        {thinking.length > 0 ? (
          <div className="typing-row">
            <span className="typing-row__avatars">
              {thinking.map((agent) => (
                <Avatar
                  key={agent.id}
                  name={agent.name}
                  color={agent.color}
                  size={22}
                  kind="agent"
                  status="thinking"
                />
              ))}
            </span>
            <span className="typing-row__text">
              {thinking.map((agent) => agent.name).join(" + ")}{" "}
              {thinking.length === 1 ? "is" : "are"} thinking
              <span className="typing-dots">
                <i />
                <i />
                <i />
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="composer">
        <div className="mention-row">
          <AtSign size={12} />
          {workspace.agents.map((agent) => (
            <button
              key={agent.id}
              className="mention-chip"
              style={{ color: agent.color, borderColor: `${agent.color}33` }}
              onClick={() => mention(agent)}
              title={`Mention ${agent.name}`}
            >
              {agent.name}
            </button>
          ))}
        </div>
        <div className="composer-box">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Message the room… use @Nova to hand off a move"
            rows={2}
            maxLength={4000}
          />
          <button
            className="composer-send"
            onClick={() => void submit()}
            disabled={!draft.trim() || sending}
            title="Send message"
          >
            <ArrowUp size={15} />
          </button>
        </div>
        <div className="composer-hint">
          <span>↵ send</span>
          <span>shift + ↵ newline</span>
          <span className="composer-hint__name">{user.name}</span>
        </div>
      </div>

      <div className="room-handoff">
        <Sparkles size={12} />
        <span>Hand off:</span>
        <button onClick={() => onAgentAction("atlas")}>plan</button>
        <button onClick={() => onAgentAction("nova")}>build</button>
        <button onClick={() => onAgentAction("sage")}>review</button>
        <button onClick={() => onAgentAction("echo")}>run tests</button>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  agent,
  presence,
}: {
  message: ChatMessage;
  agent?: Agent;
  presence: Presence[];
}) {
  const isAgent = message.authorKind === "agent";
  const human = presence.find((person) => person.userId === message.authorId);
  const color = isAgent
    ? agent?.color
    : (human?.color ?? colorFor(message.authorId));

  return (
    <article className={`message ${isAgent ? "message--agent" : "message--human"}`}>
      <Avatar
        name={message.authorName}
        color={color}
        kind={isAgent ? "agent" : "human"}
        size={26}
      />
      <div className="message__body">
        <div className="message__head">
          <strong>{message.authorName}</strong>
          {isAgent && agent ? <span className="message__role">{agent.role}</span> : null}
          <span className="message__time">{timeAgo(message.createdAt)}</span>
        </div>
        <div className="message__text">
          <RichText text={message.text} />
        </div>
      </div>
    </article>
  );
}

interface BoardTabViewProps {
  workspace: Workspace;
  onUpdateTask: (task: Task, status: "todo" | "done") => void;
  onAddTask: (title: string, agentId: AgentId | null) => Promise<void>;
  onAgentAction: (agentId: AgentId) => void;
}

function BoardTabView({ workspace, onUpdateTask, onAddTask, onAgentAction }: BoardTabViewProps) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<AgentId | "">("");
  const [adding, setAdding] = useState(false);

  const done = workspace.tasks.filter((task) => task.status === "done").length;
  const total = workspace.tasks.length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  const groups: Array<{ key: Task["status"]; label: string; tasks: Task[] }> = [
    {
      key: "in_progress",
      label: "In progress",
      tasks: workspace.tasks.filter((task) => task.status === "in_progress"),
    },
    { key: "todo", label: "Queued", tasks: workspace.tasks.filter((task) => task.status === "todo") },
    { key: "done", label: "Done", tasks: workspace.tasks.filter((task) => task.status === "done") },
  ];

  const submit = async () => {
    const value = title.trim();
    if (!value || adding) return;
    setAdding(true);
    try {
      await onAddTask(value, assignee || null);
      setTitle("");
      setAssignee("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="board-tab">
      <div className="board-summary">
        <div className="board-summary__top">
          <div>
            <span className="eyebrow">Session progress</span>
            <strong>
              {done} of {total} moves landed
            </strong>
          </div>
          <span className="board-percent">{percent}%</span>
        </div>
        <div className="board-progress">
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="board-summary__meta">
          <span>{workspace.tasks.filter((task) => task.status === "in_progress").length} moving</span>
          <span>{workspace.tasks.filter((task) => task.status === "todo").length} queued</span>
        </div>
      </div>

      <div className="board-scroll">
        {groups.map((group) =>
          group.tasks.length ? (
            <div className="task-group" key={group.key}>
              <div className="task-group__label">
                <span>{group.label}</span>
                <span>{group.tasks.length}</span>
              </div>
              {group.tasks.map((task) => {
                const agent = agentById(workspace, task.agentId ?? undefined);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    agent={agent}
                    onToggle={() => onUpdateTask(task, task.status === "done" ? "todo" : "done")}
                  />
                );
              })}
            </div>
          ) : null,
        )}
        {workspace.tasks.length === 0 ? (
          <div className="board-empty">
            <ListTodo size={18} />
            <strong>The board is clear.</strong>
            <span>Atlas can turn the room into a plan, or add the first move below.</span>
          </div>
        ) : null}
      </div>

      <div className="task-add">
        <div className="task-add__row">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
            placeholder="Add a tracked move…"
            maxLength={160}
          />
          <button
            className="task-add__button"
            onClick={() => void submit()}
            disabled={!title.trim() || adding}
            title="Add task"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="task-add__assign">
          <span>Assign</span>
          <select
            value={assignee}
            onChange={(event) => setAssignee(event.target.value as AgentId | "")}
          >
            <option value="">unassigned</option>
            {workspace.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="board-plan" onClick={() => onAgentAction("atlas")}>
        <Sparkles size={13} />
        Ask Atlas to re-plan the room
      </button>
    </div>
  );
}

function TaskRow({
  task,
  agent,
  onToggle,
}: {
  task: Task;
  agent?: Agent;
  onToggle: () => void;
}) {
  return (
    <div className={`task-row ${task.status === "done" ? "is-done" : ""}`}>
      <button
        className={`task-check ${task.status === "done" ? "is-checked" : task.status === "in_progress" ? "is-active" : ""}`}
        onClick={onToggle}
        title={task.status === "done" ? "Reopen task" : "Mark done"}
      >
        {task.status === "done" ? <Check size={11} /> : null}
        {task.status === "in_progress" ? <Circle size={7} fill="currentColor" /> : null}
      </button>
      <div className="task-row__body">
        <span className="task-row__title">{task.title}</span>
        <span className="task-row__meta">
          {agent ? (
            <>
              <Avatar name={agent.name} color={agent.color} size={15} kind="agent" />
              {agent.name}
            </>
          ) : (
            "unassigned"
          )}
        </span>
      </div>
      <span className="task-row__status">{friendlyStatus(task.status)}</span>
    </div>
  );
}
