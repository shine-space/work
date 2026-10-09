# Argus assistant-ui + Ant Design preview

Standalone user-facing Agent conversation prototype. It uses assistant-ui for
the conversation runtime and accessibility primitives, while Ant Design owns
the visible component system and consumes a local snapshot of the Argus theme. The
workspace shell is a clean-room, Argus-branded reconstruction of the structural
patterns observed in Coze; see `NOTES.md` for source and license boundaries.

## Run

```powershell
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5174/office/overview` when running this repository by
itself. The Argus management console proxies the same workspace at
`http://127.0.0.1:5173/office/overview`, so switching surfaces keeps one origin.

Copy `.env.example` to `.env.local` when the application-building workspace is
hosted separately, then set `VITE_APPLICATION_STUDIO_URL` to its full URL.
Set `VITE_APP_BASE_PATH` only when the user workspace is mounted at a different
path; local Argus development uses `/office/`.

The conversation execution boundary is defined in
[`docs/runtime-integration.md`](docs/runtime-integration.md). The preview uses a
deterministic mock runtime by default; a backend can implement the same
normalized event contract without coupling page components to internal DTOs.

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

- The model response is a deterministic local stream; no credentials or remote
  model service are required.
- User-created projects and their configuration persist per workspace in browser storage.
- Conversation rename, removal and attachment selection remain prototype state unless backed by an Argus command record.
- Work-file folders and uploads are the exception: they persist locally in the current browser and do not call an Argus file API.
- `src/theme-assets/` contains the theme, typography and radius snapshots needed
  to run this project independently from the Argus monorepo.
- A production integration should replace the external-store callbacks with
  Argus conversation APIs and the existing Agent SSE contract.
