import type {
  ApplicationRuntime,
  RuntimeEventHandler,
  RuntimeParticipant,
  RuntimeResumeRequest,
  RuntimeRunRequest,
} from "./types";

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("生成已停止", "AbortError"));
      },
      { once: true },
    );
  });

function runtimeId(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${value}`;
}

function createAnswer(request: RuntimeRunRequest, participant: RuntimeParticipant) {
  if (request.prompt.includes("失败")) {
    return "模拟请求失败：当前演示已展示可恢复错误状态。请修改问题后重试，或使用消息下方的重新生成操作。";
  }
  const attachmentLine = request.attachments.length
    ? `\n\n已收到 ${request.attachments.length} 个本地附件：${request.attachments.map((file) => file.name).join("、")}。当前演示只显示附件，不上传文件。`
    : "";
  const contextLine = participant.contextId === "none"
    ? "当前应用：不使用上下文。"
    : `当前应用：${participant.contextLabel ?? "对话"}。`;
  return `本轮由${participant.name}处理。\n\n${contextLine}\n\n我已处理“${request.prompt}”。建议先确认目标、时间边界和可用资料，再执行具体动作。正式接入 Argus 后，这里会显示真实 Agent 的流式回答、工具进度、知识引用与审批结果。${attachmentLine}`;
}

function updateParticipant(
  onEvent: RuntimeEventHandler,
  participantId: string,
  status: "queued" | "running" | "waiting" | "success" | "error",
) {
  onEvent({ type: "participant.updated", participantId, status });
}

export class MockApplicationRuntime implements ApplicationRuntime {
  readonly kind = "mock" as const;

  async run(
    request: RuntimeRunRequest,
    { signal, onEvent }: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ) {
    const runId = runtimeId("mock-run");
    onEvent({ type: "run.started", runId });

    let activeParticipant: RuntimeParticipant | undefined;
    try {
      for (const participant of request.participants) {
        activeParticipant = participant;
        updateParticipant(onEvent, participant.id, "running");
        const messageId = runtimeId("assistant");
        onEvent({ type: "message.started", messageId, participantId: participant.id });
        const answer = createAnswer(request, participant);

        // Keep the pre-token state observable in the demo. A real backend naturally
        // spends this time preparing the first streamed chunk.
        await delay(1800, signal);

        for (let index = 0; index < answer.length; index += 2) {
          await delay(24, signal);
          onEvent({
            type: "message.delta",
            messageId,
            participantId: participant.id,
            delta: answer.slice(index, index + 2),
          });
        }
        updateParticipant(onEvent, participant.id, "success");
      }

      if (request.prompt.includes("失败")) {
        if (activeParticipant) updateParticipant(onEvent, activeParticipant.id, "error");
        onEvent({
          type: "run.failed",
          participantId: activeParticipant?.id,
          message: "演示请求返回失败状态；会话内容已经保留，可以直接重试。",
        });
        return;
      }

      if (request.prompt.includes("确认") || request.prompt.includes("审批")) {
        if (activeParticipant) updateParticipant(onEvent, activeParticipant.id, "waiting");
        if (activeParticipant) onEvent({ type: "run.waiting", participantId: activeParticipant.id });
        return;
      }

      onEvent({ type: "run.completed" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        onEvent({ type: "run.cancelled" });
      }
      throw error;
    }
  }

  async cancel() {
    // The caller owns the AbortController for the in-browser mock runtime.
  }

  async resume(
    request: RuntimeResumeRequest,
    { signal, onEvent }: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ) {
    updateParticipant(onEvent, request.participantId, "running");
    try {
      await delay(1200, signal);
      updateParticipant(onEvent, request.participantId, "success");
      onEvent({ type: "run.completed" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        onEvent({ type: "run.cancelled" });
      }
      throw error;
    }
  }
}
