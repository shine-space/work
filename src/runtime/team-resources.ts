import { requestArgusJson } from "./argus-api";
import type { TeamResourceGroup, TeamResource } from "../data";

type KnowledgeBase = { knowledge_base_id: string; name: string; knowledge_module?: string; module_provisioning_state?: string };
type Document = { id: string | number; filename?: string; file_name?: string; title?: string; updated_at?: string };

export async function loadTeamResources(baseUrl: string, workspaceId: string, teamId: string, signal: AbortSignal): Promise<TeamResourceGroup[]> {
  const bases: KnowledgeBase[] = [];
  let before: number | undefined;
  do {
    const page = await requestArgusJson<{ knowledge_bases: KnowledgeBase[]; has_more?: boolean; next_before_id?: number }>(
      baseUrl, "/knowledge/bases/list", { workspace_id: workspaceId, space_id: teamId, before_id: before, limit: 100 }, signal,
    );
    bases.push(...page.knowledge_bases);
    if (!page.has_more) break;
    if (!page.next_before_id || page.next_before_id === before) throw new Error("团队资源分页异常");
    before = page.next_before_id;
  } while (!signal.aborted);
  return Promise.all(bases.map(async base => {
    const documents: Document[] = [];
    if (base.knowledge_module === "weknora") {
      if (base.module_provisioning_state === "ready") {
        let page = 1;
        while (!signal.aborted) {
          const result = await requestArgusJson<{ success: boolean; data: Document[]; total?: number }>(baseUrl, "/knowledge/module/content", {
            workspace_id: workspaceId, knowledge_base_id: base.knowledge_base_id, operation: "documents.list", page, page_size: 100,
          }, signal);
          if (!result.success || !Array.isArray(result.data)) throw new Error(`无法读取团队资源：${base.name}`);
          documents.push(...result.data);
          if (result.data.length < 100 || (result.total !== undefined && documents.length >= result.total)) break;
          page += 1;
        }
      }
    } else {
      let cursor: number | undefined;
      do {
        const result = await requestArgusJson<{ documents: Document[]; has_more?: boolean; next_before_id?: number }>(baseUrl, "/knowledge/documents/list", {
          workspace_id: workspaceId, knowledge_base_id: base.knowledge_base_id, before_id: cursor, limit: 100,
        }, signal);
        documents.push(...result.documents);
        if (!result.has_more) break;
        if (!result.next_before_id || result.next_before_id === cursor) throw new Error("团队文件分页异常");
        cursor = result.next_before_id;
      } while (!signal.aborted);
    }
    return {
      id: base.knowledge_base_id, name: base.name,
      resources: documents.map((doc): TeamResource => ({
        id: `${base.knowledge_base_id}:${doc.id}`, name: doc.filename || doc.file_name || doc.title || String(doc.id),
        updatedAt: doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("zh-CN") : "",
        content: "", knowledgeBaseId: base.knowledge_base_id,
      })),
    };
  }));
}
