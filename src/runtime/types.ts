export type RuntimeParticipantStatus = "queued" | "running" | "waiting" | "success" | "error";

export type RuntimeAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  runtimeRef?: string;
};

export type RuntimeParticipant = {
  id: string;
  name: string;
  avatar?: string;
  contextId?: string;
  contextLabel?: string;
  /** Stable management-side application name used to resolve a real binding. */
  backendApplicationName?: string;
  /** Stable management-side application ID used to avoid ambiguous names. */
  backendApplicationId?: string;
};

export type RuntimeTarget = {
  id: string;
  type: "digital-employee" | "project";
};

export type RuntimeRunRequest = {
  idempotencyKey: string;
  conversationId: string;
  prompt: string;
  attachments: RuntimeAttachment[];
  participants: RuntimeParticipant[];
  target: RuntimeTarget;
};

export type RuntimeResumeRequest = {
  runId: string;
  participantId: string;
};

type RuntimeEventEnvelope = {
  eventId?: string;
  sequence?: number;
};

export type RuntimeEvent = RuntimeEventEnvelope & (
  | { type: "run.started"; runId: string }
  | {
      type: "participant.updated";
      participantId: string;
      status: RuntimeParticipantStatus;
    }
  | {
      type: "message.started";
      messageId: string;
      participantId: string;
    }
  | {
      type: "message.delta";
      messageId: string;
      participantId: string;
      delta: string;
    }
  | { type: "run.waiting"; participantId: string }
  | { type: "run.completed" }
  | { type: "run.failed"; participantId?: string; message: string }
  | { type: "run.cancelled" }
);

export type RuntimeEventHandler = (event: RuntimeEvent) => void;

export interface ApplicationRuntime {
  readonly kind: "mock" | "http" | "argus";
  run(
    request: RuntimeRunRequest,
    options: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ): Promise<void>;
  resume(
    request: RuntimeResumeRequest,
    options: { signal: AbortSignal; onEvent: RuntimeEventHandler },
  ): Promise<void>;
  cancel(runId: string): Promise<void>;
}
