import { requestArgusJson } from "./argus-api";

export type ArgusBindingView = {
  application_name: string;
  available: boolean;
  access?: { executable?: boolean };
  manifest: {
    category?: string;
    description?: string;
    capabilities?: Array<{ title?: string; key: string }>;
    representatives?: Array<{ name: string; description?: string; primary: boolean }>;
  };
  binding: {
    participation_binding_id: string;
    scope_type: "workspace" | "team" | "project";
    scope_id: string;
    enabled: boolean;
  };
  revision: { participation_binding_revision_id: string; enabled: boolean };
  deployment_revision: { application_id: string; application_version_id: string };
};

async function readAll<T>(
  read: (cursor: string) => Promise<{ items: T[]; next_cursor?: string }>,
) {
  const items: T[] = [];
  const visited = new Set<string>();
  let cursor = "";
  do {
    if (visited.has(cursor)) throw new Error("运行入口分页异常");
    visited.add(cursor);
    const page = await read(cursor);
    items.push(...page.items);
    cursor = page.next_cursor ?? "";
  } while (cursor);
  return items;
}

export async function listUserApplicationBindings(
  baseUrl: string,
  workspaceId: string,
  signal: AbortSignal,
  teamId: string | null,
) {
  if (!teamId) return [];
  const bindings = await readAll((cursor) => requestArgusJson<{ items: ArgusBindingView[]; next_cursor?: string }>(
    baseUrl, "/v1/applications/participation-bindings/list",
    { workspace_id: workspaceId, scope_type: "team", scope_id: teamId, cursor, limit: 100 }, signal,
  ));
  return [...new Map(bindings.filter(item => item.binding.scope_type === "team" && item.binding.scope_id === teamId)
    .map(item => [item.binding.participation_binding_id, item])).values()];
}
