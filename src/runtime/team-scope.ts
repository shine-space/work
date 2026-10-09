import { requestArgusJson } from "./argus-api";

export type UserTeam = { id: string; name: string; avatarColor: string };
let teams: UserTeam[] = [];
let selectedTeam: UserTeam | null = null;
let identity = "";
let selectionKey = "";

export const getUserTeams = () => teams;
export const getActiveTeam = () => selectedTeam;
export const teamStorageKey = (key: string) => `${key}:user:${identity}:team:${selectedTeam?.id ?? "none"}`;

export async function initializeTeamScope(baseUrl: string, workspaceId: string, signal: AbortSignal) {
  const user = await requestArgusJson<{ id: number }>(baseUrl, "/user/me", {}, signal);
  const available: UserTeam[] = [];
  const visited = new Set<string>();
  let cursor = "";
  do {
    if (visited.has(cursor)) throw new Error("团队列表分页异常，请重试。");
    visited.add(cursor);
    const page = await requestArgusJson<{ items: Array<{ space: { space_id: string; name: string; status: string } }>; next_cursor?: string }>(
      baseUrl, "/v1/spaces/list", { workspace_id: workspaceId, kind: "team", cursor, limit: 100 }, signal,
    );
    for (const item of page.items) {
      if (item.space.status === "active" && !available.some(team => team.id === item.space.space_id)) {
        available.push({ id: item.space.space_id, name: item.space.name, avatarColor: "var(--ui-color-neutral-8)" });
      }
    }
    cursor = page.next_cursor ?? "";
  } while (cursor);
  if (signal.aborted) return;
  identity = `${workspaceId}:${user.id}`;
  selectionKey = `argus:selected-team:${identity}`;
  teams = available;
  const remembered = window.localStorage.getItem(selectionKey);
  selectedTeam = teams.find(team => team.id === remembered) ?? teams[0] ?? null;
  if (selectedTeam) window.localStorage.setItem(selectionKey, selectedTeam.id);
  else window.localStorage.removeItem(selectionKey);
}

export function selectTeam(id: string, destination: string) {
  if (!teams.some(team => team.id === id) || id === selectedTeam?.id) return;
  window.localStorage.setItem(selectionKey, id);
  // A new document disposes every request, runtime cache and open resource preview.
  // The new scope is validated again before rendering any workspace data.
  window.location.assign(destination);
}
