# SubPremium

## Current State
- WatchPage has a Save button that opens a Playlist modal (not a Watch Later system)
- Up Next section uses `suggestions` computed from allVideos (creator match + title word match + views sort)
- View count is displayed but NOT incremented on watch — no per-user dedup tracking
- No Watch Later page exists; no route `watchLater` in App.tsx
- Actions row has: Like, Dislike, Share, Save (opens playlist modal), Download, More

## Requested Changes (Diff)

### Add
- Watch Later localStorage system: `saveToWatchLater(video)` with duplicate prevention using `video.id`
- "Save" button in actions row triggers Watch Later save (toast feedback, shows saved state)
- `/watchLater` route in App.tsx → `WatchLaterPage` component
- `WatchLaterPage`: loads from `localStorage.getItem("watchLater")`, shows grid of saved videos, click → open video
- Smart Up Next: recommendations filtered from allVideos — same ownerId OR title first-word match, excluding current video, vertical list with thumbnail + title + @username
- Real view count: on video open, check `viewed_<id>` key in localStorage. If current user.id not in list, increment `video.views`, save viewer, update `video_<id>` in localStorage after 3s delay
- 👁️ view count display in video info row

### Modify
- WatchPage `Save` action button: change from playlist modal trigger to Watch Later save, show active state if already saved
- WatchPage `suggestions` section: rename to "Up Next", improve recommendation to use `ownerId` match + first-word title match
- WatchPage: add `useEffect` that fires a `setTimeout(3000)` on mount to count the view (once per user per video)
- App.tsx: add `watchLater` to the Route type and render WatchLaterPage
- BottomNav or MenuPage: add entry point to Watch Later page

### Remove
- Nothing removed; playlist modal still exists as separate feature

## Implementation Plan
1. Create `WatchLaterPage.tsx` — loads `watchLater` from localStorage, shows 2-col grid, click → onVideoSelect
2. Add `watchLater` to Route type in App.tsx, render WatchLaterPage in main router, add navigation to it from MenuPage
3. In WatchPage: wire Save button to `saveToWatchLater(video)` helper with duplicate check + toast; add saved indicator state
4. In WatchPage: improve Up Next suggestions to prioritize ownerId match + first-word title match
5. In WatchPage: add 3-second view count effect — check `viewed_<id>` in localStorage, increment + save if user not in list, update `video_<id>` key
6. Display 👁️ {video.views} in the video info area (already shows formatViews, just ensure it updates live)
