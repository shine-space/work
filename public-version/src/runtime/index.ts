import { HttpApplicationRuntime } from "./http-runtime";
import { MakersApplicationRuntime } from "./makers-runtime";
import { MockApplicationRuntime } from "./mock-runtime";
import type { ApplicationRuntime } from "./types";

export type {
  ApplicationRuntime,
  RuntimeAttachment,
  RuntimeEvent,
  RuntimeParticipant,
  RuntimeParticipantStatus,
  RuntimeResumeRequest,
  RuntimeRunRequest,
  RuntimeTarget,
} from "./types";

export function createApplicationRuntime(): ApplicationRuntime {
  if (import.meta.env.VITE_RUNTIME_MODE === "mock") {
    return new MockApplicationRuntime();
  }
  if (import.meta.env.VITE_RUNTIME_MODE === "http") {
    return new HttpApplicationRuntime({
      baseUrl: import.meta.env.VITE_RUNTIME_BASE_URL || "/api",
      runPath: import.meta.env.VITE_RUNTIME_RUN_PATH || "/v1/runtime/runs/stream",
      cancelPath: import.meta.env.VITE_RUNTIME_CANCEL_PATH || "/v1/runtime/runs/:runId/cancel",
      resumePath: import.meta.env.VITE_RUNTIME_RESUME_PATH || "/v1/runtime/runs/:runId/resume",
    });
  }
  return new MakersApplicationRuntime(import.meta.env.VITE_MAKERS_CHAT_URL || "/api/chat");
}
