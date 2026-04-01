# SUB PREMIUM

## Current State
App has History page with a "Your videos" preview row and a "View all" button that sets route to "dashboard". In App.tsx, the "dashboard" route currently renders ProfilePage — no dedicated Dashboard page exists yet.

## Requested Changes (Diff)

### Add
- `DashboardPage.tsx` at route `/dashboard` — full video management UI
  - Loads all videos from localStorage where key starts with `video_` and `ownerId === authUser.id`
  - 2-column grid layout showing thumbnail, editable title input, visibility badge, delete button
  - Edit title: inline input, `onChange` updates localStorage `video_<id>` and local state immediately
  - Toggle visibility: cycles public → private → unlisted, updates localStorage + state
  - Delete: removes `video_<id>` from localStorage and filters out of state
  - Empty state if no videos

### Modify
- `App.tsx`: change the `route === "dashboard"` branch from rendering `ProfilePage` to rendering `DashboardPage` with a `setRoute` prop for back navigation

### Remove
- Nothing

## Implementation Plan
1. Create `src/frontend/src/pages/DashboardPage.tsx` with all the above logic
2. Import and render it in `App.tsx` for `route === "dashboard"`, pass `setRoute` prop
3. Keep `route === "profile"` rendering ProfilePage unchanged
