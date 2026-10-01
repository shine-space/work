# Argus 数字员工公网版

Standalone user-facing Agent conversation prototype. It uses assistant-ui for
the conversation runtime and accessibility primitives, while Ant Design owns
the visible component system and consumes a local snapshot of the Argus theme.

## Run

```powershell
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5175`.

Copy `.env.example` to `.env.local` when the application-building workspace is
hosted separately, then set `VITE_APPLICATION_STUDIO_URL` to its full URL.

The conversation execution boundary is defined in
[`docs/runtime-integration.md`](docs/runtime-integration.md). The public build
uses the same-origin `/api/chat` Makers Cloud Function and normalizes its SSE
events before they reach the page components.

## EdgeOne Makers deployment

- Project root: `public-version`
- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build`
- Output: `dist`
- Node.js: `22.11.0`

Configure these as server-side Makers environment variables. Do not prefix them
with `VITE_` and do not commit their values:

```ini
MAKERS_MODELS_KEY=<created in Makers Models>
AI_GATEWAY_BASE_URL=https://ai-gateway.edgeone.link/v1
AI_GATEWAY_MODEL=@makers/deepseek-v4-flash
```

## Pages

- `/apps` shows the five reusable Agent applications and can launch a preconfigured standalone conversation.
- `/projects/:projectId` is a standalone project home with history and generated-file tabs.
- `/projects/:projectId/conversations/:conversationId` opens the assistant-ui conversation workspace.
- `/conversations/:conversationId` opens a standalone conversation that does not belong to a project.
- Project files use a Coze-inspired work-file tree grouped by source conversation, with search, sorting, previews and downloads.
- Users can create project folders and upload files up to 2 MB. These folders and uploads persist per project in browser storage.
- The sidebar keeps standalone conversations in `对话`; each project expands its own history inline under `项目`.
- The fixed sidebar keeps only the primary `工作台` and `应用` entries; project files remain available from project pages and the right tool rail.
- A generic new conversation starts without an application; sending stays disabled until one is selected.
- Desktop navigation can be fully collapsed and restores that preference after reload.
- Mobile navigation is presented as a drawer; the slim desktop tool rail is hidden.

## Boundaries

- The browser never receives the model key. Model calls are made only by
  `cloud-functions/api/chat.ts` and streamed back over the same origin.
- Application, project, Agent, project/conversation rename, delete and conversation attachment selection are
  prototype state only and reset on reload. Seeded project and conversation URLs
  remain directly addressable.
- Work-file folders and uploads are the exception: they persist locally in the current browser and do not call an Argus file API.
- `src/theme-assets/` contains the theme, typography and radius snapshots needed
  to run this project independently from the Argus monorepo.
- Conversation and project persistence remain browser-local in this first
  public version; the model response itself is live.
