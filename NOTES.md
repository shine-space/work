# Coze-inspired workspace reconstruction

## Source and mode

- Reference: `https://www.coze.cn/session/...`, inspected in an authenticated browser on 2026-09-19.
- Complexity: L3 SPA/SaaS shell reconstruction.
- Mode: visual and structural reconstruction with Argus content replacement.
- License boundary: Coze is a proprietary product. This example does not copy source code, branding, user content, images, APIs, tracking, or other protected assets.

## Structure mapping

| Reference pattern | Argus implementation |
| --- | --- |
| Full-height navigation | Argus brand, new conversation, workspace links, standalone conversations and expandable projects |
| Sidebar collapse | The sidebar is fully removed and a reopen control remains in the main header |
| Fixed workspace links | The Argus sidebar keeps only the primary workbench and applications destinations |
| Standalone conversation group | Conversations without a project live in a peer `对话` section and open directly |
| Context selector | Five capabilities are exposed as reusable applications; generic new conversations begin unconfigured |
| Project list | Each project expands its history inline and still opens a standalone home with conversation and generated-file tabs |
| Work files | The generated-file tab uses a dense toolbar, breadcrumbs, expandable conversation folders, file actions and an in-page preview state |
| Bottom account block | Local demo quota, profile, theme and settings controls |
| Right tool rail | Knowledge, files, calendar, mail, canvas and presentation placeholders |
| Floating composer | assistant-ui composer with attachments and five project-context scopes |

## Fidelity and known gaps

- Reconstructed: information hierarchy, expanded/collapsed shell, density, main header, bottom composer, utility rail, responsive drawer and the work-file list/preview states.
- Local prototype additions: per-project folders and uploads up to 2 MB persist in browser storage; text-like files can be previewed and all uploaded files can be downloaded.
- Intentionally replaced: product name, icons, labels, avatars, data and colors.
- Not reconstructed: Coze backend behavior, private APIs, proprietary assets, account system, billing, tool runtime and server-side file persistence.
- The fixed navigation and utility rail use explicit local-demo notices until their Argus contracts exist.

## Run

```powershell
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`.

## AgentMore-inspired applications page refresh

- Reference: `https://agentmore.chatglm.cn/skills`, inspected from the deployed Vite SPA on 2026-09-22.
- Scope: the Argus `/apps` page only.
- Mode: visual and structural adaptation; existing Argus navigation, application data, filtering, search, list view and launch behavior are preserved.
- Extracted patterns: compact left-aligned hero, static abstract illustration, constrained reading width, underlined category navigation, right-aligned pill search and three-column information cards.
- Replaced content: all labels, categories, icons and application data remain Argus-owned. No AgentMore source code, branding, user data, tracking, APIs or proprietary assets are copied.
- Animation change: the previous Lottie runtime, package dependency and `team-apps.json` asset were removed. The hero decoration is static CSS and respects the existing theme tokens.
