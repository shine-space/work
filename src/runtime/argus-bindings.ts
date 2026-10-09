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

type SpaceView = {
  space: {
    space_id: string;
    kind: "team" | "project";
  };
};

async function readAll<T>(
  read: (cursor: string) => Promise<{ items: T[]; next_cursor?: string }>,
) {
  const items: T[] = [];
  let cursor = "";
  do {
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
) {
  const teams = await readAll((cursor) => requestArgusJson<{ items: SpaceView[]; next_cursor?: string }>(
    baseUrl,
    "/v1/spaces/list",
    { workspace_id: workspaceId, kind: "team", cursor, limit: 100 },
    signal,
  ));
  const teamIds = [...new Set(teams.map((item) => item.space.space_id).filter(Boolean))];
  const scopes: Array<{ scope_type: "workspace" | "team"; scope_id: string }> = [
    { scope_type: "workspace", scope_id: workspaceId },
    ...teamIds.map((teamId) => ({ scope_type: "team" as const, scope_id: teamId })),
  ];
  const bindingsByScope = await Promise.all(scopes.map((scope) => readAll((cursor) => (
    requestArgusJson<{ items: ArgusBindingView[]; next_cursor?: string }>(
      baseUrl,
      "/v1/applications/participation-bindings/list",
      { workspace_id: workspaceId, ...scope, cursor, limit: 100 },
      signal,
    )
  ))));
  const uniqueBindings = new Map<string, ArgusBindingView>();
  bindingsByScope.flat().forEach((binding) => {
    if (!uniqueBindings.has(binding.binding.participation_binding_id)) {
      uniqueBindings.set(binding.binding.participation_binding_id, binding);
    }
  });
  return [...uniqueBindings.values()];
}
