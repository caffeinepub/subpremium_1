export interface AuthToken {
  type: "verify" | "reset";
  token: string;
  userId: string;
  expires: number;
}

export function saveToken(t: AuthToken): void {
  const tokens: AuthToken[] = JSON.parse(
    localStorage.getItem("tokens") || "[]",
  );
  tokens.push(t);
  localStorage.setItem("tokens", JSON.stringify(tokens));
}

export function getToken(
  token: string,
  type: "verify" | "reset",
): AuthToken | null {
  const tokens: AuthToken[] = JSON.parse(
    localStorage.getItem("tokens") || "[]",
  );
  return tokens.find((t) => t.token === token && t.type === type) ?? null;
}

export function deleteToken(token: string): void {
  const tokens: AuthToken[] = JSON.parse(
    localStorage.getItem("tokens") || "[]",
  );
  localStorage.setItem(
    "tokens",
    JSON.stringify(tokens.filter((t) => t.token !== token)),
  );
}

export function updateUser(id: string, data: Record<string, unknown>): void {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const updated = users.map((u: Record<string, unknown>) =>
    u.id === id ? { ...u, ...data } : u,
  );
  localStorage.setItem("users", JSON.stringify(updated));
}

export function getUpdatedUser(
  id: string,
  data: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const users = JSON.parse(localStorage.getItem("users") || "[]");
  const updated = users.map((u: Record<string, unknown>) =>
    u.id === id ? { ...u, ...data } : u,
  );
  localStorage.setItem("users", JSON.stringify(updated));
  return updated.find((u: Record<string, unknown>) => u.id === id);
}
