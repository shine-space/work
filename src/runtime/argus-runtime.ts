import { requestArgusJson } from "./argus-api";
import type {
  ApplicationRuntime,
  RuntimeEventHandler,
  RuntimeResumeRequest,
  RuntimeRunRequest,
} from "./types";

type BindingView = {
  application_name: string;
  available: boolean;
  access?: { executable?: boolean };
  binding: {
    participation_binding_id: string;
    scope_type: string;
    scope_id: string;
    enabled: boolean;
  };
  revision: {
    participation_binding_revision_id: string;
    enabled: boolean;
  };
};

type CommandView = {
  command: { command_id: string; runtime_run_id: string };
  employee_turns?: Array<{
    command_id: string;
    answer: string;
    status: string;
  }>;
};

type ArgusRuntimeOptions = {
  baseUrl: string;
  workspaceId: string;
};

const COMMAND_STORAGE_PREFIX = "argus-user-client-command:";

export class ArgusApplicationRuntime implements ApplicationRuntime {
  readonly kind = "argus" as const;
  private bindingsPromise: Promise<BindingView[]> | null = null;

  constructor(private readonly options: ArgusRuntimeOptions) {}

  private async listBindings(signal: AbortSignal) {
    this.bindingsPromise ??= requestArgusJson<{ items: BindingView[] }>(
      this.options.baseUrl,
      "/v1/applications/participation-bindings/list",
      { workspace_id: this.options.workspaceId, cursor: "", limit: 100 },
      signal,
    ).then(({ items }) => items);
    try {
      return await this.bindingsPromise;
    } catch (error) {
      this.bindingsPromise = null;
      throw error;
    }
  }

  private async resolveBinding(request: RuntimeRunRequest, signal: AbortSignal) {
    if (request.target.type !== "digital-employee" || request.participants.length !== 1) {
      throw new Error("当前真实接入仅支持单个数字员工对话；群组项目将在项目 Agent 接口接入后开放。");
    }
    const participant = request.participants[0];
    const applicationName = participant.backendApplicationName?.trim() || participant.name.trim();
    const candidates = (await this.listBindings(signal)).filter((item) => (
      item.application_name === applicationName
      && item.available
      && item.binding.enabled
      && item.revision.enabled
      && item.access?.executable !== false
    ));
    if (candidates.length === 0) {
      throw new Error(`管理端没有找到可执行的“${applicationName}”数字员工绑定，请先发布并启用。`);
    }
    const workspaceBinding = candidates.find((item) => item.binding.scope_type === "workspace");
    return workspaceBinding ?? candidates[0];
  }

  async run(
    request: RuntimeRunRequest,
    { signal, onEvent }: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ) {
    if (request.attachments.length > 0) {
      throw new Error("附件必须先上传到管理端并取得文件引用，当前版本暂不支持直接发送本地附件。");
    }
    const participant = request.participants[0];
    const binding = await this.resolveBinding(request, signal);
    const previousCommandId = window.localStorage.getItem(
      `${COMMAND_STORAGE_PREFIX}${request.conversationId}`,
    ) || undefined;

    onEvent({ type: "participant.updated", participantId: participant.id, status: "running" });
    const view = await requestArgusJson<CommandView>(
      this.options.baseUrl,
      "/v1/applications/representative/run",
      {
        workspace_id: this.options.workspaceId,
        participation_binding_id: binding.binding.participation_binding_id,
        expected_binding_revision_id: binding.revision.participation_binding_revision_id,
        user_input: request.prompt,
        idempotency_key: request.idempotencyKey,
        ...(previousCommandId ? { previous_command_id: previousCommandId } : {}),
      },
      signal,
    );
    if (signal.aborted) return;

    const runId = view.command.runtime_run_id || view.command.command_id;
    const messageId = `message-${view.command.command_id}`;
    const turn = [...(view.employee_turns ?? [])].reverse().find((item) => (
      item.command_id === view.command.command_id && item.answer.trim()
    )) ?? [...(view.employee_turns ?? [])].reverse().find((item) => item.answer.trim());
    if (!turn) throw new Error("数字员工命令已受理，但尚未返回可展示的回答，请稍后在工作记录中查看。");

    window.localStorage.setItem(`${COMMAND_STORAGE_PREFIX}${request.conversationId}`, view.command.command_id);
    onEvent({ type: "run.started", runId });
    onEvent({ type: "message.started", messageId, participantId: participant.id });
    onEvent({ type: "message.delta", messageId, participantId: participant.id, delta: turn.answer });
    onEvent({ type: "participant.updated", participantId: participant.id, status: "success" });
    onEvent({ type: "run.completed" });
  }

  async resume(_request: RuntimeResumeRequest) {
    throw new Error("正式数字员工命令不支持从用户端恢复等待状态，请在管理端处理后重新发送。");
  }

  async cancel() {
    // The current formal Application Command contract has no durable cancel API.
    // The caller still aborts its local request; do not pretend that this stops the backend run.
  }
}
