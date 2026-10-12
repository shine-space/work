# User runtime integration boundary

The user-facing workspace depends on the `ApplicationRuntime` contract in
`src/runtime/types.ts`, not on an Agent vendor response or an Argus management
DTO. The public build defaults to `MakersApplicationRuntime`; a mock runtime remains available for local UI work. An
HTTP backend can be selected with `VITE_RUNTIME_MODE=http` after it implements
the normalized contract.

## Responsibilities

- UI owns rendering, optimistic message shells, task-island presentation and
  local cancellation intent.
- The runtime adapter owns transport, authentication cookies, stream parsing
  and translation from backend events to normalized runtime events.
- The backend owns authorization, durable messages, execution state,
  idempotency, cancellation, approvals, artifacts and recovery after reload.
- Secrets must never use a `VITE_` variable or enter the browser bundle.

## Run request

The HTTP adapter sends a JSON `RuntimeRunRequest` containing the conversation,
target, prompt, a client-generated idempotency key, participant descriptors and
attachment references/metadata.
Real uploads must complete before `run`; raw file bytes are not embedded in
this request.

## Stream events

The response uses `text/event-stream`. Each `data:` payload is JSON and carries
one of these normalized event types:

- `run.started`
- `participant.updated`
- `message.started`
- `message.delta`
- `run.waiting`
- `run.completed`
- `run.failed`
- `run.cancelled`

Waiting tasks resume through the runtime's `resume` operation, while stopping a
task uses `cancel`. Closing the browser stream alone must not be treated as a
durable backend cancellation.

The event payload must match `RuntimeEvent`. Production events should also carry
an `eventId` and monotonic `sequence` so reconnecting clients can resume and
deduplicate delivery. A production Argus adapter should
translate ApplicationCommand and child Agent/Workflow events into these event
types instead of exposing internal DTOs to UI components.

## Migration sequence

1. Keep `VITE_RUNTIME_MODE=mock` while UI behavior is verified.
2. Add the server-side ApplicationCommand streaming endpoint.
3. Map durable command/run identifiers to `run.started` and support the cancel
   route.
4. Add idempotency, event cursors and reload recovery before enabling the HTTP
   runtime by default.
5. Add attachment upload references, approvals and artifacts incrementally.
