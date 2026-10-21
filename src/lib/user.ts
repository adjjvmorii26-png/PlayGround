export interface LocalUser {
  id: string;
  name: string;
}

const STORAGE_KEY = "atelier:identity";

function randomGuest(): string {
  const names = ["Guest", "Visitor", "Builder", "Pilot"];
  const name = names[Math.floor(Math.random() * names.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${name} ${suffix}`;
}

export function loadUser(): LocalUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalUser>;
      if (typeof parsed.id === "string" && typeof parsed.name === "string") {
        return { id: parsed.id, name: parsed.name };
      }
    }
  } catch {
    // fall through to a fresh identity
  }
  const user: LocalUser = {
    id: crypto.randomUUID(),
    name: randomGuest(),
  };
  saveUser(user);
  return user;
}

export function saveUser(user: LocalUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // localStorage can be unavailable in private contexts
  }
}
