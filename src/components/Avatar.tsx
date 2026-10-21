import type { CSSProperties } from "react";
import { initials, colorFor } from "@/lib/format";

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  kind?: "human" | "agent" | "system";
  status?: "online" | "idle" | "thinking";
  title?: string;
}

export function Avatar({
  name,
  color,
  size = 28,
  kind = "human",
  status,
  title,
}: AvatarProps) {
  const tint = color ?? colorFor(name);
  const style = {
    "--avatar-color": tint,
    width: size,
    height: size,
    borderRadius: Math.max(8, Math.round(size * 0.34)),
    fontSize: Math.max(9, Math.round(size * 0.36)),
    background: `${tint}1c`,
    color: tint,
    borderColor: `${tint}40`,
  } as CSSProperties;

  return (
    <span
      className={`avatar avatar--${kind}`}
      style={style}
      title={title ?? name}
      aria-hidden="true"
    >
      {initials(name)}
      {status ? (
        <span
          className={`avatar__dot avatar__dot--${status}`}
          style={{ width: Math.max(6, size * 0.26), height: Math.max(6, size * 0.26) }}
        />
      ) : null}
    </span>
  );
}

interface AvatarStackProps {
  people: Array<{ id: string; name: string; color?: string }>;
  max?: number;
  size?: number;
}

export function AvatarStack({ people, max = 3, size = 26 }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;
  return (
    <div className="avatar-stack">
      {shown.map((person) => (
        <Avatar
          key={person.id}
          name={person.name}
          color={person.color}
          size={size}
          title={person.name}
        />
      ))}
      {overflow > 0 ? (
        <span className="avatar-stack__more" style={{ width: size, height: size }}>
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
