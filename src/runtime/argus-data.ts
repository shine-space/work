import { requestArgusJson } from "./argus-api";
import { listUserApplicationBindings, type ArgusBindingView } from "./argus-bindings";
import { loadTeamResources } from "./team-resources";
import type { TeamResourceGroup } from "../data";

export type { ArgusBindingView } from "./argus-bindings";

export type ArgusCatalogApplication = {
  application_id: string;
  name: string;
  team_id?: string;
  current_version: number;
  version_id: string;
  published_at: string;
  manifest: {
    category?: string;
    description?: string;
    capabilities?: Array<{ title?: string; key: string }>;
    representatives?: Array<{ name: string; description?: string; primary: boolean }>;
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

export type ArgusSkillCatalogItem = {
  skill_id: string;
  name: string;
  description: string;
  use_when: string;
  source_status: string;
  readiness: {
    ready: boolean;
    status?: "ready" | "needs_configuration" | "unavailable" | "check_on_use";
    reason?: string;
  };
};

type ArgusSkillCatalog = {
  items: ArgusSkillCatalogItem[];
  has_more?: boolean;
  next_cursor?: string;
};

export type ArgusUserData = {
  applications: ArgusCatalogApplication[];
  bindings: ArgusBindingView[];
  work: Array<ArgusWorkItem & { detail: ArgusCommandView }>;
  skills: ArgusSkillCatalogItem[];
  resources: TeamResourceGroup[];
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

export async function loadArgusUserData(baseUrl: string, workspaceId: string, signal: AbortSignal, teamId: string | null): Promise<ArgusUserData> {
  // Discovery belongs to the organization; installation targets belong to the team.
  const loadSkills = () => readAll((cursor) => requestArgusJson<ArgusSkillCatalog>(
    baseUrl, "/skills/catalog", { workspace_id: workspaceId, cursor, limit: 200 }, signal,
  ));
  if (!teamId) return { applications: [], bindings: [], work: [], skills: await loadSkills(), resources: [] };
  const [applications, bindings, workItems, skillCatalog, resources] = await Promise.all([
    readAll((cursor) => requestArgusJson<{ items: ArgusCatalogApplication[]; next_cursor?: string }>(
      baseUrl,
      "/v1/applications/catalog/list",
      { workspace_id: workspaceId, cursor, limit: 100 },
      signal,
    )),
    listUserApplicationBindings(baseUrl, workspaceId, signal, teamId),
    readAll((cursor) => requestArgusJson<{ items: ArgusWorkItem[]; next_cursor?: string }>(
      baseUrl,
      "/v1/applications/commands/work",
      { workspace_id: workspaceId, scope_type: "team", scope_id: teamId, cursor, limit: 100 },
      signal,
    )),
    loadSkills(),
    loadTeamResources(baseUrl, workspaceId, teamId, signal),
  ]);

  const employeeWork = workItems.filter((item) => item.purpose === "employee" && item.scope_type === "team" && item.scope_id === teamId);
  const work = await Promise.all(employeeWork.map(async (item) => ({
    ...item,
    detail: await requestArgusJson<ArgusCommandView>(
      baseUrl,
      "/v1/applications/commands/detail",
      { workspace_id: workspaceId, command_id: item.command_id },
      signal,
    ),
  })));
  const boundApplications = new Set(bindings.map(item => item.deployment_revision.application_id));
  return {
    applications: applications.filter(item => item.team_id === teamId || boundApplications.has(item.application_id)),
    bindings, work, resources,
    skills: skillCatalog,
  };
}
