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
};

export type ArgusSpaceView = {
  space: {
    space_id: string;
    name: string;
    description: string;
    goal: string;
    status: string;
  };
};

export type ArgusWorkItem = {
  command_id: string;
  participation_binding_id: string;
  application_name: string;
  scope_type: "workspace" | "team" | "project";
  scope_id: string;
  capability_title: string;
  purpose: "execute" | "employee";
  created_at: string;
  updated_at?: string;
};

export type ArgusEmployeeTurn = {
  command_id: string;
  user_input: string;
  answer: string;
  status: string;
};

export type ArgusCommandView = {
  employee_turns?: ArgusEmployeeTurn[];
};

export type ArgusUserData = {
  bindings: ArgusBindingView[];
  spaces: ArgusSpaceView[];
  work: Array<ArgusWorkItem & { detail: ArgusCommandView }>;
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

export async function loadArgusUserData(baseUrl: string, workspaceId: string, signal: AbortSignal): Promise<ArgusUserData> {
  const [bindings, spaces, workItems] = await Promise.all([
    readAll((cursor) => requestArgusJson<{ items: ArgusBindingView[]; next_cursor?: string }>(
      baseUrl,
      "/v1/applications/participation-bindings/list",
      { workspace_id: workspaceId, cursor, limit: 100 },
      signal,
    )),
    readAll((cursor) => requestArgusJson<{ items: ArgusSpaceView[]; next_cursor?: string }>(
      baseUrl,
      "/v1/spaces/list",
      { workspace_id: workspaceId, kind: "project", cursor, limit: 100 },
      signal,
    )),
    readAll((cursor) => requestArgusJson<{ items: ArgusWorkItem[]; next_cursor?: string }>(
      baseUrl,
      "/v1/applications/commands/work",
      { workspace_id: workspaceId, cursor, limit: 100 },
      signal,
    )),
  ]);

  const employeeWork = workItems.filter((item) => item.purpose === "employee");
  const work = await Promise.all(employeeWork.map(async (item) => ({
    ...item,
    detail: await requestArgusJson<ArgusCommandView>(
      baseUrl,
      "/v1/applications/commands/detail",
      { workspace_id: workspaceId, command_id: item.command_id },
      signal,
    ),
  })));
  return { bindings, spaces, work };
}
