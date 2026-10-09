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
  deployment_revision: {
    application_id: string;
  };
};

type CommandView = {
  command: { command_id: string; runtime_run_id: string };
  agent_run?: {
    status: string;
  };
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
const COMMAND_POLL_INTERVAL_MS = 1_000;
const COMMAND_POLL_TIMEOUT_MS = 10 * 60_000;

function employeeTurn(view: CommandView) {
  return [...(view.employee_turns ?? [])].reverse().find((item) => (
    item.command_id === view.command.command_id && item.answer.trim()
  )) ?? [...(view.employee_turns ?? [])].reverse().find((item) => item.answer.trim());
}

function waitForPoll(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, COMMAND_POLL_INTERVAL_MS);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

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
      (participant.backendApplicationId
        ? item.deployment_revision.application_id === participant.backendApplicationId
        : item.application_name === applicationName)
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
    let view = await requestArgusJson<CommandView>(
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
    window.localStorage.setItem(`${COMMAND_STORAGE_PREFIX}${request.conversationId}`, view.command.command_id);
    onEvent({ type: "run.started", runId });

    const pollStartedAt = Date.now();
    let turn = employeeTurn(view);
    while (!turn) {
      const status = view.agent_run?.status;
      if (status === "failed") {
        throw new Error("数字员工运行失败，请在管理端运行记录中查看原因后重试。");
      }
      if (status === "canceled" || status === "cancelled") {
        onEvent({ type: "participant.updated", participantId: participant.id, status: "error" });
        onEvent({ type: "run.cancelled" });
        return;
      }
      if (Date.now() - pollStartedAt >= COMMAND_POLL_TIMEOUT_MS) {
        throw new Error("数字员工仍在处理中，请稍后重试或到管理端运行记录查看进度。");
      }
      await waitForPoll(signal);
      view = await requestArgusJson<CommandView>(
        this.options.baseUrl,
        "/v1/applications/commands/detail",
        { workspace_id: this.options.workspaceId, command_id: view.command.command_id },
        signal,
      );
      if (signal.aborted) return;
      turn = employeeTurn(view);
    }

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
