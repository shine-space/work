import type {
  ApplicationRuntime,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeResumeRequest,
  RuntimeRunRequest,
} from "./types";

type HttpRuntimeOptions = {
  baseUrl: string;
  runPath: string;
  cancelPath: string;
  resumePath: string;
};

function joinUrl(baseUrl: string, pathname: string) {
  return `${baseUrl.replace(/\/$/, "")}/${pathname.replace(/^\//, "")}`;
}

function parseEvent(eventName: string, data: string): RuntimeEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RuntimeEvent> & { type?: string };
  const type = candidate.type || eventName;
  if (!type) return null;
  return { ...candidate, type } as RuntimeEvent;
}

async function readEventStream(
  response: Response,
  onEvent: RuntimeEventHandler,
  signal: AbortSignal,
) {
  if (!response.body) throw new Error("运行服务未返回流式内容。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      let eventName = "message";
      const data: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      }
      if (data.length) {
        const event = parseEvent(eventName, data.join("\n"));
        if (event) onEvent(event);
      }
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }
}

export class HttpApplicationRuntime implements ApplicationRuntime {
  readonly kind = "http" as const;

  constructor(private readonly options: HttpRuntimeOptions) {}

  async run(
    request: RuntimeRunRequest,
    { signal, onEvent }: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ) {
    const response = await fetch(joinUrl(this.options.baseUrl, this.options.runPath), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      credentials: "include",
      signal,
    });
    if (!response.ok) {
      throw new Error(`运行服务返回 ${response.status}，请稍后重试。`);
    }
    await readEventStream(response, onEvent, signal);
  }

  async cancel(runId: string) {
    const path = this.options.cancelPath.replace(":runId", encodeURIComponent(runId));
    const response = await fetch(joinUrl(this.options.baseUrl, path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    if (!response.ok) throw new Error("停止任务失败，请重试。");
  }

  async resume(
    request: RuntimeResumeRequest,
    { signal, onEvent }: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ) {
    const path = this.options.resumePath.replace(":runId", encodeURIComponent(request.runId));
    const response = await fetch(joinUrl(this.options.baseUrl, path), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ participantId: request.participantId }),
      credentials: "include",
      signal,
    });
    if (!response.ok) throw new Error("继续执行失败，请重试。");
    await readEventStream(response, onEvent, signal);
  }
}
