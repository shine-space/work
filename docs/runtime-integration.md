# User runtime integration boundary

The user-facing workspace depends on the `ApplicationRuntime` contract in
`src/runtime/types.ts`, not on an Agent vendor response or an Argus management
DTO. The default `MockApplicationRuntime` keeps the preview deterministic. Two
real-service adapters are available:

- `VITE_RUNTIME_MODE=argus` calls the existing formal Argus Application
  binding and representative command APIs. This is the first integration
  stage: one digital employee, non-streaming response, real authorization and
  durable command continuation.
- `VITE_RUNTIME_MODE=http` selects the future normalized streaming contract.

## Responsibilities

- UI owns rendering, optimistic message shells, task-island presentation and
  local cancellation intent.
- The runtime adapter owns transport, authentication cookies, stream parsing
  and translation from backend events to normalized runtime events.
- The backend owns authorization, durable messages, execution state,
  idempotency, cancellation, approvals, artifacts and recovery after reload.
- Secrets must never use a `VITE_` variable or enter the browser bundle.

## Existing Argus command mode

Set `VITE_RUNTIME_MODE=argus`, `VITE_RUNTIME_BASE_URL=/api` and
`VITE_ARGUS_WORKSPACE_ID` to the authorized workspace ID. The user client and
management UI must share an origin (or an equivalent trusted auth handoff) so
the client can reuse the existing `argus.access_token` and refresh token.

The adapter resolves the participant's original application name against
`/api/v1/applications/participation-bindings/list`, then calls
`/api/v1/applications/representative/run` with the active binding revision.
The last command ID is stored per local conversation and sent as
`previous_command_id` after reload. Renaming a digital employee does not change
the management-side application name used for binding resolution.

In the same startup load, the user-facing Skill directory reads
`/api/skills/catalog` for the current `VITE_ARGUS_WORKSPACE_ID`. Names,
descriptions and usage guidance therefore come from the management-side
available-capability catalog. The four visible categories use the same
name/Skill-ID classification rules as the management UI; no demo Skill catalog
is used in Argus mode.

This mode intentionally rejects project fan-out and raw local attachments.
Project conversations must use the project Agent contract; attachments must be
uploaded first and represented by durable server file references. Local abort
does not claim to cancel a durable backend run because the current formal
Application Command contract has no matching cancellation operation.

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
2. Use `argus` mode for the first real, non-streaming single-employee loop.
3. Add the server-side ApplicationCommand streaming endpoint.
4. Map durable command/run identifiers to `run.started` and support the cancel
   route.
5. Add idempotency, event cursors and reload recovery before enabling the HTTP
   runtime by default.
6. Add attachment upload references, approvals and artifacts incrementally.
