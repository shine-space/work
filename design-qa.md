# Design QA: Conversation Quick Navigator

**Source visual truth**

- `design-qa/quick-nav-reference.png`
- Original source: `C:\Users\ishin\AppData\Local\Temp\codex-clipboard-a38b9a7d-e7cd-4951-ab96-5cdaec1bc4a5.png`
- Source pixels: 600 × 304.

**Rendered implementation**

- `design-qa/quick-nav-implementation.png`
- Comparison board: `design-qa/quick-nav-comparison.png`
- Route: `http://172.16.26.84:5173/projects/project-operations/conversations/conversation-equipment`
- Browser: Codex in-app Browser.
- Browser viewport: 1319 × 1223 CSS px, device pixel ratio 1.5.
- Captured implementation pixels: 1319 × 1223. The browser capture was already normalized to CSS-pixel dimensions.
- Focused implementation crop: 600 × 304, aligned beside the 600 × 304 source in the comparison board.
- State: light theme, non-empty conversation, first navigation marker focused with its message preview open.

## Full-view comparison evidence

- The navigator stays fixed on the left edge of the conversation viewport without shifting the centered message column or composer.
- The preview floats above the conversation like the source and does not block persistent composer controls.
- At 1280 × 900 the navigator remains visible and usable. At 390 × 844 it is intentionally hidden and the page has no horizontal overflow.

## Focused region comparison evidence

- Compared `design-qa/quick-nav-reference.png` and the focused crop from `design-qa/quick-nav-implementation.png` together in `design-qa/quick-nav-comparison.png`.
- The refined preview dimensions are 480 × 72 px with a 16 px radius, retaining the source card structure at the denser product typography requested in the latest review.
- Every marker rests at 8 px wide. Active navigation changes color without changing width; hover or keyboard focus temporarily extends the marker to 34 px. Flagged markers use the full primary-color line throughout. The 16 px bookmark icon, subtle border, white elevated surface, and low-opacity shadow preserve the source hierarchy.

## Required fidelity surfaces

- **Fonts and typography:** Existing Argus system font stack retained. Title and secondary copy both use 12 px; title uses the primary text token at weight 600, while secondary copy uses the tertiary text token and single-line ellipsis.
- **Spacing and layout rhythm:** Rail-to-card gap, 16 px card radius, internal padding, two-line text hierarchy, and right-aligned bookmark follow the reference. The card remains overlay-only and does not reflow messages.
- **Colors and visual tokens:** All foregrounds, borders, surfaces, and shadows use the active Ant Design theme tokens. Active markers use primary text; inactive markers use translucent tertiary text.
- **Image and icon fidelity:** The reference contains no raster imagery. The bookmark uses the existing Lucide icon system already used by the product; no placeholder or handcrafted asset is used.
- **Copy and content:** Preview title and subtitle are generated from the real message content. Long text truncates instead of changing card height.

## Interaction evidence

- Clicking a marker focuses and scrolls to its corresponding real message node.
- Clicking the bookmark toggles the flag state and adds a visible flagged marker cue.
- Flag state survives a full page reload through per-conversation local storage.
- Keyboard focus opens the same preview and provides visible focus treatment.
- The rail is a sibling of the scrolling viewport, so its viewport position stays unchanged while long conversations scroll. A forced 1347 px scroll test measured a 0 px rail-position delta.
- A 14 px invisible hover bridge joins each marker to its preview. Pointer traversal from marker, across the gap, and into the card kept the preview mounted at every step.
- Reduced-motion users receive near-instant transitions through the existing global reduced-motion rule.
- A clean browser reload produced no new console warnings or errors.

## Comparison history

1. **Initial P2:** Long messages produced nearly uniform marker lengths, unlike the source's staggered rhythm. The two-line detail also increased the preview card to about 110 px high.
2. **Fix:** Replaced content-length sizing with a deterministic staggered marker sequence and constrained preview detail to one ellipsized line.
3. **Post-fix evidence:** The preview card measured 480 × 92 px before the later density refinement.
4. **Density and interaction refinement:** Unified both text rows at 12 px with primary/tertiary token colors, reduced the bookmark to 16 px, tightened the card to 480 × 72 px, detached the rail from the scrolling viewport, and added the hover bridge.
5. **Marker-state refinement:** Unified resting and active marker widths at 8 px, retained the 34 px hover/focus expansion, and replaced the flagged dot with a full-line primary-color highlight.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: The visible number of rail markers naturally follows the current conversation fixture, so the three-message persisted state contains fewer ticks than the long-thread source crop.

## Implementation checklist

- [x] Real message-derived markers and previews.
- [x] Smooth message jump and active-position tracking.
- [x] Toggleable, persistent per-conversation flags.
- [x] Desktop and mobile responsive behavior.
- [x] Keyboard labels, focus state, and reduced motion.
- [x] Fixed rail position during message scrolling and uninterrupted pointer travel into the preview.
- [x] Browser console and production build verification.

final result: passed

---

# Design QA: Scheduled Tasks Workspace Panel

## Source visual truth

- **Reference:** `C:\Users\ishin\AppData\Local\Temp\codex-clipboard-bf6209dd-390d-46b8-9e48-4d9e018b3b2a.png`.
- **Requested fidelity:** Reuse only the two-section layout and task content hierarchy; use the existing Argus component styles instead of the reference gradient treatment.

## Rendered implementation

- **Route:** `http://172.16.26.84:5173/projects/project-operations/conversations/conversation-equipment`
- **Entry:** The project toolbar includes a `Timer` icon with the label `定时任务`.
- **Panel:** The existing project-workspace shell renders `进行中` and `为你推荐`, with token-based borders, radii, colors, typography, and buttons.

## Interaction evidence

- The toolbar entry opens and closes the scheduled-tasks panel within the existing resizable workspace.
- The active row shows `周末安排推荐` with `每周五 09:00` aligned to the trailing edge.
- `手动添加` reuses the shared `创建定时任务` modal, including name, frequency, optional end date, prompt validation, and create/cancel actions.
- Creating `每日重点事项汇总` in the shared modal closes the dialog and adds `每天 09:00` to the current target's `进行中` list.
- All seven recommended templates render as accessible actions with their matching icons, titles, descriptions, and plus affordances.
- Activating `每日优先事项简报` fills the left conversation composer with its editable task-creation prompt and `每天 08:30` schedule; it does not send automatically.
- Long descriptions wrap inside the card without clipping or horizontal overflow.
- Browser console error check returned `[]`.
- Production TypeScript and Vite build completed successfully; only the existing bundle-size warning remains.

## Findings

- No actionable P0, P1, or P2 differences remain for the requested component-system adaptation.
- The reference gradient is intentionally omitted, matching the user's instruction to follow existing component styling.

## Implementation checklist

- [x] `Timer` toolbar entry.
- [x] Active and recommended task sections.
- [x] Shared manual scheduled-task creation modal.
- [x] Reusable task cards using existing theme tokens.
- [x] Functional quick-fill interaction with the shared conversation composer.
- [x] Browser layout, interaction, and console verification.
- [x] Production build.

final result: passed

---

# Design QA: Run Detail Panel

## Source visual truth

- **Reference:** Browser annotation screenshot of the Coze task-detail panel at `https://www.coze.cn/session/7631124374040641807`.
- **Reference capture:** In-session Codex in-app Browser screenshot, 1491 × 1223 CSS px, light theme, completed task state. The browser connector did not expose a persistent filesystem path for this capture.
- **Requested fidelity:** Adapt the task-detail hierarchy and card treatment to the existing Argus toolbar panel; do not copy Coze branding or unrelated shell elements.

## Rendered implementation

- **Route:** `http://172.16.26.84:5173/projects/project-operations/conversations/conversation-equipment`
- **Implementation capture:** In-session Codex in-app Browser screenshot, 1491 × 1223 CSS px, light theme, 420 px panel width. The browser connector did not expose a persistent filesystem path for this capture.
- **State:** Completed current-conversation run with the task result expanded.

## Full-view and focused comparison evidence

- The reference and implementation were opened at the same 1491 × 1223 viewport and compared in their completed, expanded-result states.
- Both use a compact header with task-detail title, green completion state, and close action; an elevated task card with identity, prompt, and timing metadata; and a separate result card with a collapsible summary row and inset result surface.
- Argus intentionally retains its existing 420 px resizable workspace width, Ant Design token palette, typography, toolbar, and live conversation content instead of copying the reference product shell.
- A separate focused crop was unnecessary because the right-side panel text, spacing, icons, radii, and states were clearly readable in the full-size same-viewport captures.

## Required fidelity surfaces

- **Fonts and typography:** Existing Argus system stack retained. Header is 14 px; card title and content use 13/12 px with 20 px body line height; metadata uses 11 px.
- **Spacing and layout rhythm:** 12 px panel inset, 10 px card gap, 14 px card padding, 14 px radius, and compact 52 px header reproduce the reference density without changing the surrounding workspace.
- **Colors and visual tokens:** Surfaces, borders, fills, primary text, tertiary metadata, and success state all use current Ant Design theme tokens.
- **Image and icon fidelity:** The reference contains no required raster assets. Existing Lucide icons are used for the task, Agent badge, disclosure, success state, and close action; no placeholder or handcrafted asset is used.
- **Copy and content:** Title, prompt, worker name, and result are derived from the active Argus conversation and digital employee rather than hardcoded reference content.

## Interaction evidence

- The toolbar button opens and closes the run panel.
- The result summary exposes `aria-expanded` and toggles the real result content between expanded and collapsed states.
- The panel remains within the existing resizable workspace contract.
- Production build and TypeScript checks pass. The final reload introduced no new console warning; the only retained log entries predate the final reload and came from the replaced deprecated Tag prop.

## Comparison history

1. **Initial P2:** The prior Argus panel was only a three-row event list and lacked the task prompt, completion state, duration, and result hierarchy visible in the reference.
2. **Fix:** Replaced the list with a task-detail header, prompt card, runtime metadata, and collapsible result card driven by the active conversation.
3. **Initial P2:** The first implementation used a deprecated Ant Design Tag property and produced a console warning.
4. **Fix:** Replaced it with the current filled Tag variant and rebuilt successfully.
5. **Post-fix evidence:** Browser capture shows the intended completed/expanded state; collapse and re-expand were exercised through the accessible button state.

## Findings

- No actionable P0, P1, or P2 differences remain for the requested Argus adaptation.
- P3: The task card is shorter than the reference when the real Argus prompt is shorter; it intentionally grows with real content instead of enforcing a fixed height.

## Implementation checklist

- [x] Reference task-detail hierarchy.
- [x] Active-conversation prompt and result content.
- [x] Completed status and runtime metadata.
- [x] Functional accessible result disclosure.
- [x] Theme-token-based surfaces, borders, typography, and icons.
- [x] Production build, browser interaction, and console verification.

final result: passed

---

# Design QA: Overview Task Dashboard

## Source visual truth

- **Reference:** Browser annotation screenshot for the QoderWake task board at `http://127.0.0.1:19820/work-management?machineId=5010a483-fd0f-4481-b2e1-a2f975325e93`.
- **Reference viewport:** 1319 × 1223 CSS px, light theme, populated task-board state.
- **Requested fidelity:** Reuse the content modules and information hierarchy inside the existing Argus product shell; the request did not require a pixel-identical brand clone.

## Rendered implementation

- **Route:** `http://172.16.26.84:5173/overview`
- **Desktop evidence:** Captured in the in-app browser at 1319 × 1223 and 1280 × 900 CSS px.
- **Responsive evidence:** Captured at 390 × 844 CSS px; the page and summary measured within the viewport with zero document-level horizontal overflow.
- **State:** Real conversation and task fixtures drive the metrics, recent results, filters, table, and navigation destinations.

## Full-view comparison

- **Information hierarchy:** Matches the reference sequence: page heading, work summary, operation/result tabs, then searchable and filterable task records.
- **Summary module:** Preserves the period selector and four-card metric layout, with a two-column mobile collapse.
- **Task activity:** Preserves separate attention and result states. When no task needs action, the results tab is selected automatically instead of presenting a misleading empty primary view.
- **Task records:** Preserves search, scope, status, time filters, tabular records, and pagination. Labels are translated to Argus product language such as 数字员工 and 群组项目.
- **Visual system:** Intentionally uses the current Argus tokens, radii, border, shadow, and navigation shell rather than copying the reference's green decorative background.

## Interaction evidence

- Searching for `合同` narrowed the live task table to two matching records.
- The selected activity tab exposed the corresponding `aria-selected` state.
- Selecting a result or table row routes to the associated real conversation.
- The data-period control updates both summary metrics and the table's time window.
- Pagination shows ten records per page and enables previous/next traversal.
- Desktop and mobile checks found no horizontal page overflow; the table keeps its own bounded horizontal scroll on narrow screens.
- The production build completed successfully; only the existing bundle-size warning remains.

## Findings

- No actionable P0, P1, or P2 differences remain for the requested module-level adaptation.
- P3: The reference's decorative green summary texture is intentionally omitted so the new page remains consistent with the current Argus component system.

## Implementation checklist

- [x] Overview route and navigation entry.
- [x] Period-aware summary metrics.
- [x] Attention and result tabs with real counts.
- [x] Search, scope, status, and time filters.
- [x] Real task rows, conversation navigation, and pagination.
- [x] Desktop and mobile responsive behavior.
- [x] Production build and browser verification.

final result: passed
