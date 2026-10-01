import type {
  ApplicationRuntime,
  RuntimeEvent,
  RuntimeEventHandler,
  RuntimeResumeRequest,
  RuntimeRunRequest,
} from "./types";

function parseEvent(eventName: string, data: string): RuntimeEvent | null {
  try {
    const value = JSON.parse(data) as Partial<RuntimeEvent> & { type?: string };
    if (!value || typeof value !== "object") return null;
    return { ...value, type: value.type || eventName } as RuntimeEvent;
  } catch {
    return null;
  }
}

async function readEventStream(
  response: Response,
  onEvent: RuntimeEventHandler,
  signal: AbortSignal,
) {
  if (!response.body) throw new Error("对话服务未返回流式内容。");
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

export class MakersApplicationRuntime implements ApplicationRuntime {
  readonly kind = "makers" as const;

  constructor(private readonly endpoint: string) {}

  async run(
    request: RuntimeRunRequest,
    { signal, onEvent }: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) {
      const details = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(details?.message || `对话服务返回 ${response.status}，请稍后重试。`);
    }
    await readEventStream(response, onEvent, signal);
  }

  async cancel(_runId: string) {
    // Aborting the browser request also aborts the upstream model stream.
  }

  async resume(
    _request: RuntimeResumeRequest,
    _options: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ) {
    throw new Error("当前公网版不包含人工审批等待流程。");
  }
}
