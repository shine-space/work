import { ArgusApplicationRuntime } from "./argus-runtime";
import { HttpApplicationRuntime } from "./http-runtime";
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
  const mode = import.meta.env.VITE_RUNTIME_MODE || "argus";
  if (mode === "argus") {
    const workspaceId = import.meta.env.VITE_ARGUS_WORKSPACE_ID?.trim() || "ws_argus_default";
    return new ArgusApplicationRuntime({
      baseUrl: import.meta.env.VITE_RUNTIME_BASE_URL || "/api",
      workspaceId,
    });
  }
  if (mode === "http") {
    return new HttpApplicationRuntime({
      baseUrl: import.meta.env.VITE_RUNTIME_BASE_URL || "/api",
      runPath: import.meta.env.VITE_RUNTIME_RUN_PATH || "/v1/runtime/runs/stream",
      cancelPath: import.meta.env.VITE_RUNTIME_CANCEL_PATH || "/v1/runtime/runs/:runId/cancel",
      resumePath: import.meta.env.VITE_RUNTIME_RESUME_PATH || "/v1/runtime/runs/:runId/resume",
    });
  }
  return new MockApplicationRuntime();
}
