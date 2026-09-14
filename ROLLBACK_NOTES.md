# ⏪ Rollback Notes

Backup points created before risky deploys to the live NUC (`192.168.2.210:8100`, pm2 process `watchtower`), and how to revert to them.

---

## 2026-09-14 — Persist notification delivery logs + day-by-day navigation

Before deploying (commit `7b584ca`), a backup point was made of the last-known-good build (commit `e6f1a46` — Live grid WebRTC, running live and stable at the time).

**Git tag:** [`pre-delivery-log-persist-2026-09-14`](https://github.com/jchisholm59/WatchTower/tree/pre-delivery-log-persist-2026-09-14) at commit `e6f1a46`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-delivery-log-persist-20260914-080005/`

User reported the Delivery Log only ever showed ~4 entries. Root cause: it was in-memory only, capped at 100 entries, wiped on every pm2 restart — with how often this app gets redeployed, that left barely any real history. Now persisted to `notification_logs.json` in DATA_DIR, pruned by age (30 days) instead of a count cap, with a Previous/Next Day navigator in the UI instead of a flat unfilterable list. Verified locally: seeded entries dated today and yesterday, restarted the dev server, confirmed the log line `[Notifications] Loaded 2 log entries from disk` and that day navigation correctly split them. On the NUC itself, no prior log file existed to load (expected — this is the first deploy of persistence), so nothing to verify there beyond a clean restart.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-delivery-log-persist-20260914-080005 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-delivery-log-persist-2026-09-14 -- server.ts src/components/NotificationSettingsView.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-13 — Live grid uses WebRTC when available, not just snapshot polling

Before deploying (commit `e6f1a46`), a backup point was made of the last-known-good build (commit `6b90fc7` — 500ms snapshot polling, running live and stable at the time).

**Git tag:** [`pre-grid-webrtc-2026-09-13`](https://github.com/jchisholm59/WatchTower/tree/pre-grid-webrtc-2026-09-13) at commit `6b90fc7`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-grid-webrtc-20260913-121757/`

User asked whether WebRTC (already used for the single-camera detail view) could replace snapshot polling in the grid too, for smoother video across all 7 cameras at once — inspired by a separate Direct-NVR deployment (`192.168.2.73:3010`, a Proxmox LXC) that runs all 7 cameras over WebRTC smoothly. First attempt: tested locally via this session's own browser automation tooling, which showed severe frame drops (94-100%, `getVideoPlaybackQuality()`) running all 7 simultaneously — but that's very likely a limitation of the automation browser itself (no GPU-accelerated decode available in that sandboxed context) rather than a real architectural ceiling, given a real separate deployment handles the same load fine in an actual browser. Reverted that first attempt, then re-deployed after this discussion since the user's own browser is the only reliable way to judge real-world video decode performance — this session's testing tooling isn't representative for concurrent hardware-decoded video.

`LiveGrid` now computes `useWebrtc = Boolean(camera.frigate_url && camera.go2rtcStreamName)` per camera and uses WebRTC when available, falling back to snapshot mode for simulated cameras or a stale camera list (needs "Resync Feeds" to pick up `go2rtcStreamName`) — same guard pattern as `CameraDetailModal`. **Not independently verified working smoothly in a real browser as of this deploy** — the user needs to confirm it actually performs well on their end; if it doesn't, the fast-path revert below is the way back to the known-good snapshot-polling grid.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-grid-webrtc-20260913-121757 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-grid-webrtc-2026-09-13 -- src/components/LiveGrid.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-13 — Speed up Live grid snapshot polling from 2s to 500ms

Before deploying (commit `6b90fc7`), a backup point was made of the last-known-good build (commit `cea0146` — WebRTC codec fix, running live and stable at the time).

**Git tag:** [`pre-snapshot-500ms-2026-09-13`](https://github.com/jchisholm59/WatchTower/tree/pre-snapshot-500ms-2026-09-13) at commit `cea0146`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-snapshot-500ms-20260913-120133/`

User noticed the Live grid (fixed earlier to poll still images instead of holding a permanent MJPEG connection per tile) looked noticeably jerky at the original 2-second poll interval — ~0.5fps vs the camera's native ~5fps. Since each poll is a short-lived request rather than a held-open connection, tightening the interval doesn't reintroduce the original per-origin connection-limit bug it was built to avoid — just `CameraFeedCanvas`'s `snapshotIntervalMs` default changed from 2000 to 500. Verified live against all 7 real cameras: requests fire at the new cadence, mostly `200 OK` with only occasional benign `net::ERR_ABORTED` (a newer poll superseding one still in flight), no error spam or backlog after a sustained check post-restart.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-snapshot-500ms-20260913-120133 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-snapshot-500ms-2026-09-13 -- src/components/CameraFeedCanvas.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-13 — WebRTC: pick an H.264 stream, not just whichever is tagged audio

Before deploying (commit `cea0146`), a backup point was made of the last-known-good build (commit `86d5325` — initial WebRTC audio feature, running live and stable at the time).

**Git tag:** [`pre-webrtc-codec-fix-2026-09-13`](https://github.com/jchisholm59/WatchTower/tree/pre-webrtc-codec-fix-2026-09-13) at commit `86d5325`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-webrtc-codec-fix-20260913-110620/`

User reported the just-shipped WebRTC detail view had audio but no video, after a full Firefox restart ruled out a stale tab. Root cause: Firefox's WebRTC stack can't decode H.265 — the connection negotiates and audio plays fine, but video silently never renders (`readyState` stuck at 0). Confirmed live via go2rtc's own stream/codec info that porch and driveway's Frigate-tagged "audio" stream (`_1`) is H.265, while their other stream (`_2`) is H.264 *and* also carries audio despite not being role-tagged for it — Frigate's static YAML role tags don't reliably reflect either the real codec or which streams actually have audio. (Every other camera already used H.264 on both streams, which is why testing against reo-yard earlier hadn't caught this.)

`fetch-config` now queries go2rtc's live `/api/go2rtc/streams` info once and scores each camera's candidate go2rtc streams by (not H.265) + (has audio), instead of trusting the ffmpeg 'audio' role tag alone. Falls back to the old tag-based heuristic if that query fails. Verified live: porch/driveway now resolve to `_2` instead of `_1`; the detail view shows real decoding video (`readyState 4`, correct 1280x720) with live audio on porch, the exact camera that was previously audio-only.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-webrtc-codec-fix-20260913-110620 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-webrtc-codec-fix-2026-09-13 -- server.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-13 — Live audio in the camera detail view (WebRTC via go2rtc)

Before deploying (commit `86d5325`), a backup point was made of the last-known-good build (commit `908cd87` — Live grid connection-limit fix, running live and stable at the time).

**Git tag:** [`pre-webrtc-audio-2026-09-13`](https://github.com/jchisholm59/WatchTower/tree/pre-webrtc-audio-2026-09-13) at commit `908cd87`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-webrtc-audio-20260913-105638/`

User noticed the "Inspect & Detail" expanded camera view had no audio and asked if that was a regression — it wasn't: that view (and the grid) has always streamed MJPEG, which has no audio channel at all, so there was never audio there to lose. Built a real fix: the detail view now uses Frigate's embedded go2rtc WebRTC output instead (new `/api/frigate/proxy/webrtc` SDP signaling proxy in server.ts, a `streamMode="webrtc"` path in `CameraFeedCanvas` using a real `RTCPeerConnection`, and a mute/unmute control in `CameraDetailModal`). The grid and Zone Studio still use MJPEG/snapshot mode — WebRTC is deliberately only used where one camera is mounted at a time.

**This also required a companion change on the Frigate side**, not just WatchTower: go2rtc couldn't reliably advertise its own reachable address for WebRTC's ICE negotiation on this multi-homed Docker host (NUC has 4+ network interfaces), so media was being sent but never reaching the browser (confirmed via go2rtc's own stream stats — packets sent, high drop rate, video element stuck at `readyState 0`). Fixed by adding an explicit `go2rtc.webrtc.candidates: [192.168.2.210:8555]` block to `~/frigate/config/config.yml`, as a **sibling of the existing `go2rtc.streams` key** (not a new top-level `go2rtc:` block — YAML doesn't merge duplicate top-level keys, and a naive append would have silently wiped out all 19 configured camera restreams). Frigate's config was backed up first to `~/frigate/config/config.yml.pre-webrtc-candidates-20260913-105405` before editing, and Frigate was restarted via `docker restart frigate` to apply it.

Verified live against the real 7-camera server: after the go2rtc config fix, confirmed real audio+video on two cameras with different go2rtc stream naming (`porch_1`, `reo-yard_2`) via direct track/`readyState` inspection (not just visually), confirmed the mute toggle actually mutes the `<video>` element, and confirmed WebRTC sessions cleanly close (0 lingering `webrtc/whep` consumers in go2rtc) when the detail modal is dismissed.

### To revert

**WatchTower code — fast path (restores the exact build that was running, no rebuild, back in seconds):**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-webrtc-audio-20260913-105638 dist && pm2 restart watchtower"
```

**WatchTower code — full path (also rolls back the source tree to that commit):**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-webrtc-audio-2026-09-13 -- server.ts src/components/CameraDetailModal.tsx src/components/CameraFeedCanvas.tsx src/types.ts && npm run build && pm2 restart watchtower"
```

**Frigate config (only needed if the go2rtc.webrtc.candidates change itself causes a problem — it's harmless to leave in place even if the WatchTower code above is rolled back):**
```bash
ssh 192.168.2.210 "cp ~/frigate/config/config.yml.pre-webrtc-candidates-20260913-105405 ~/frigate/config/config.yml && docker restart frigate"
```

After either WatchTower revert, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-13 — Fix black camera tiles past the 5th camera in Live Streams grid

Before deploying (commit `908cd87`), a backup point was made of the last-known-good build (commit `ad89215` — BirdNET retention-window fix, running live and stable at the time).

**Git tag:** [`pre-live-grid-connection-fix-2026-09-13`](https://github.com/jchisholm59/WatchTower/tree/pre-live-grid-connection-fix-2026-09-13) at commit `ad89215`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-live-grid-connection-fix-20260913-081955/`

User has 7 cameras (Porch, Driveway, Tapo-Deck, Reo-Deck, Livingroom, Reo-Yard, Family Room); the first 5 always displayed in the Live Streams grid, the last 2 were always black. Root cause: every grid tile mounted its own permanent MJPEG stream (`<img src="/api/frigate/proxy/stream?...">`), held open indefinitely. Browsers cap concurrent connections per origin at 6 (HTTP/1.1), and WatchTower's own live-events SSE connection already occupies one of those, leaving exactly 5 slots — any camera past the 5th queues forever and never renders. Reproduced live against the user's real 7-camera Frigate server (local dev pointed at `192.168.2.210:5000`): Porch/Driveway/Livingroom/Tapo-Deck/Reo-Deck got `200 OK`, Reo-Yard and Family Room stuck pending indefinitely — confirmed positional (depends on which 5 connect first), not tied to those two cameras' identity.

Separately diagnosed and confirmed as a genuinely different, camera-side issue (not fixed here, nothing to fix in WatchTower): Family Room's camera at `192.168.50.73` is unreachable from the NUC (`Destination Host Unreachable`) and Frigate hasn't received a frame from it since May 17 — needs the physical camera/network checked.

Fix: `CameraFeedCanvas` gained a `streamMode` prop — `'live'` (default, unchanged) holds one continuous MJPEG connection, used where only one or two instances are ever mounted at once (camera detail view, Zone Studio); `'snapshot'` instead polls a still image every 2s via the existing image-proxy endpoint, which only ever needs one short-lived request per tile at a time. `LiveGrid` now passes `streamMode="snapshot"` so a grid of any size stays under the browser's connection cap. Verified live: after switching the local dev instance to the real Home Frigate server, all 7 cameras showed `200 OK` on every poll tick, and a screenshot confirmed Reo-Yard and Family Room rendering real (non-black) frames alongside the other 5.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-live-grid-connection-fix-20260913-081955 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-live-grid-connection-fix-2026-09-13 -- src/components/CameraFeedCanvas.tsx src/components/LiveGrid.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-13 — BirdNET 500-entry cap replaced with 7-day retention window

Before deploying (commit `ad89215`), a backup point was made of the last-known-good build (commit `79be2fa` — today-only sightings filter, running live and stable at the time).

**Git tag:** [`pre-bird-retention-fix-2026-09-13`](https://github.com/jchisholm59/WatchTower/tree/pre-bird-retention-fix-2026-09-13) at commit `79be2fa`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-bird-retention-fix-20260913-075342/`

User flagged that the just-deployed today-only filter (previous entry below) could be undercounting: they routinely get well over 500 bird detections in 24h. Confirmed via `pm2 logs` (1253+ "[BirdNET] Heard:" lines in the recent buffer) and the stored file being pinned at exactly 500 entries — `birdSightings.unshift(sighting); if (birdSightings.length > 500) birdSightings.pop();` was a hard count cap, not a per-day one, silently evicting same-day sightings once a busy day blew past 500, well before midnight. Replaced with age-based pruning in `saveBirdSightings()` (keep last 7 days, no count limit) instead of the old `slice(0, 1000)`-that-never-ran-because-the-array-never-got-that-big dead code. Verified live: restarted, confirmed the stored file grew to 501 entries (past the old hard ceiling) on the very next detection instead of staying pinned at 500.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-bird-retention-fix-20260913-075342 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-bird-retention-fix-2026-09-13 -- server.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-13 — BirdNET sightings feed defaults to today only

Before deploying (commit `79be2fa`), a backup point was made of the last-known-good build (commit `b860e07` — box coordinate/bird-alert-persistence fix, running live and stable at the time).

**Git tag:** [`pre-bird-today-filter-2026-09-13`](https://github.com/jchisholm59/WatchTower/tree/pre-bird-today-filter-2026-09-13) at commit `b860e07`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-bird-today-filter-20260913-075023/`

User noticed the Birds tab was cumulatively listing every sighting since the app was started the day before, not just today's — despite the UI already labeling the count "Signals Processed Today". `GET /api/birds/sightings` returned the entire stored history (up to the 500-entry cap) with no date filtering at all. Confirmed on the live NUC's `bird_sightings.json`: 500 stored sightings spanning 2026-09-12 15:59 through 2026-09-13 07:49. Now filters to the server's local calendar day (reusing the same `localDateKey()` helper added for the BirdNET daily-alert dedup fix) by default; `?all=true` still returns the full stored history if ever needed. Verified by replicating the exact filter logic against the real stored file: 500 total → 205 for today (2026-09-13), matching expectations.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-bird-today-filter-20260913-075023 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-bird-today-filter-2026-09-13 -- server.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Fix Frigate box coordinate order/resolution (driveway spam) + persist BirdNET daily-alert dedup

Before deploying (commit `b860e07`), a backup point was made of the last-known-good build (commit `8dabf18` — zone auto-create fix, running live and stable at the time).

**Git tag:** [`pre-box-geometry-fix-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-box-geometry-fix-2026-09-12) at commit `8dabf18`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-box-geometry-fix-20260912-174849/`

User reported still getting truck/driveway emails despite drawing exclusion zones there, escalating to "a car in driveway alert about every ten seconds." Root cause, confirmed by capturing a real live `frigate/events` MQTT payload for the driveway camera and cross-checking it against Frigate's own normalized `path_data` on the same event: Frigate's `box` field is `[x_min, y_min, x_max, y_max]` in the camera's **detect** resolution (driveway is 1280x720), not `[y_min, x_min, y_max, x_max]` and not the 1920x1080 we'd hardcoded. Both bugs together put every computed detection centroid in roughly the wrong quadrant of the frame, so it never landed inside a drawn zone — the truck kept re-triggering "new" Frigate events (it's a live tracker, not a single static detection) and every one of them dispatched. Fixed the coordinate order and added a per-camera detect-resolution lookup (`getCameraDetectResolution`, cached, sourced from Frigate's `/api/config`) in both the live MQTT dispatch path and the historical `/api/frigate/servers/fetch-events` path, replacing the hardcoded 1920x1080 divisor.

Same trip also fixed a second, unrelated bug the user flagged: BirdNET's "first sighting today" alert dedup (`dailyAlertedSpecies`) was in-memory only, so it silently reset on every `pm2 restart` — including every one of this session's earlier deploys — letting already-alerted species (Blue Jay, American Crow, Black-capped Chickadee, Common Raven) re-fire as "first detection today" repeatedly, confirmed via `pm2 logs` showing the same species logged as "First detection today" dozens of times in one calendar day with zero "Daily alert tracking reset" lines in between. Now persisted to `~/.frigate-guardian/bird_alert_state.json`, keyed by local (server timezone, `America/Halifax`) date so restarts and even a mid-evening UTC-day rollover no longer cause a repeat. Note: because the in-memory set from before this deploy is gone, any species already alerted earlier today may alert once more this session before the persisted file takes over — expected, one-time only.

Verified live: watched `pm2 logs` after restart and confirmed real driveway MQTT events (`1789246178.131952-3d99my`) now log `[MQTT Alert] Notification skipped: Filtered out: inside exclusion zone "Tundra"` instead of dispatching.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-box-geometry-fix-20260912-174849 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-box-geometry-fix-2026-09-12 -- server.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Exclusion zone "click does nothing on a fresh camera" fix

Before deploying (commit `8dabf18`), a backup point was made of the last-known-good build (commit `a74bef9` — reference-frame loading states, running live and stable at the time).

**Git tag:** [`pre-zone-autocreate-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-zone-autocreate-2026-09-12) at commit `a74bef9`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-zone-autocreate-20260912-171048/`

Fixes "left clicking does nothing" — `handleCanvasClick` bailed out with no active zone, which is exactly the state a camera with zero zones starts in; the only way to make clicking work was to already know to hit "+ Add" first. Clicking empty canvas now creates a zone on the fly (using that click as its first point) if none is active. Verified live: reproduced the exact "no zone selected, 0 excluded areas" state on a real camera, confirmed the first click now seeds a new zone, and confirmed subsequent clicks add further vertices normally.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-zone-autocreate-20260912-171048 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-zone-autocreate-2026-09-12 -- src/components/ExclusionZoneModal.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Exclusion zone reference-frame loading/error states

Before deploying (commit `a74bef9`), a backup point was made of the last-known-good build (commit `e8fc78c` — zone dragging, running live and stable at the time).

**Git tag:** [`pre-zone-loading-state-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-zone-loading-state-2026-09-12) at commit `e8fc78c`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-zone-loading-state-20260912-170400/`

Fixes "the drawing area is currently black" in the exclusion zone editor — the reference-frame image had no loading/error feedback, so the real (but brief) network round-trip through WatchTower to the camera server looked identical to a broken fetch. Added a loading spinner, a distinct error+Retry state, a manual "Refresh Frame" button, and cache-busting on every load. Traced live end-to-end before concluding it was a timing issue, not a broken proxy — raw Frigate snapshot, WatchTower's proxied response, and the browser's loaded `<img>` were all confirmed correct; only the missing loading indicator was the actual bug. Verified the fix by catching the spinner mid-fetch via Refresh Frame and confirming it resolves cleanly.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-zone-loading-state-20260912-170400 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-zone-loading-state-2026-09-12 -- src/components/ExclusionZoneModal.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Exclusion zone drag-to-move/reshape

Before deploying (commit `e8fc78c`), a backup point was made of the last-known-good build (commit `13ef340` — exclusion zones feature, running live and stable at the time).

**Git tag:** [`pre-zone-dragging-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-zone-dragging-2026-09-12) at commit `13ef340`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-zone-dragging-20260912-165010/`

Adds real dragging to the exclusion zone editor: drag a vertex to reshape a corner, or drag inside the shape to move the whole zone — previously the only way to adjust an existing zone was Clear Vertices + redraw. Verified live: dragged a zone as a whole shape, then reshaped one vertex into an irregular quadrilateral, confirmed no stray vertex from either drag's trailing click, confirmed the result persists correctly after Save.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-zone-dragging-20260912-165010 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-zone-dragging-2026-09-12 -- src/components/ExclusionZoneModal.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Exclusion zones feature

Before deploying (commit `13ef340`), a backup point was made of the last-known-good build (commit `79f290b` — BirdNET clip-link fix, running live and stable at the time).

**Git tag:** [`pre-exclusion-zones-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-exclusion-zones-2026-09-12) at commit `79f290b`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-exclusion-zones-20260912-163837/`

Adds notification-layer exclusion zones (Alert Rules → Exclusion Zones): draw a polygon per camera, any detection centered inside it is silently skipped before dispatch — independent of Frigate's own `stationary` heuristic, which is exactly what's unreliable for parked cars under changing light/shadow. Also repurposes the Snapshot/Playback "Box ON/OFF" toggle to show these zones instead of the old per-event box. Verified end-to-end against real data: drew a zone over real deck furniture using the camera's live frame, confirmed the ray-casting filter against the real saved polygon, and confirmed the overlay renders correctly on both a real snapshot and a real playing video clip with the toggle working both directions.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-exclusion-zones-20260912-163837 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-exclusion-zones-2026-09-12 -- server.ts src/App.tsx src/components/EventsReview.tsx src/components/NotificationSettingsView.tsx src/components/SnapshotViewerModal.tsx src/components/TenSecondPlaybackModal.tsx src/types.ts && git rm -f src/components/ExclusionZoneModal.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — BirdNET alert clip link fix

Before deploying (commit `79f290b`), a backup point was made of the last-known-good build (commit `ab6dd95` — all-cameras-muted fix, running live and stable at the time).

**Git tag:** [`pre-birdnet-cliplink-fix-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-birdnet-cliplink-fix-2026-09-12) at commit `ab6dd95`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-birdnet-cliplink-fix-20260912-125812/`

Fixes BirdNET alert emails/Slack/Discord messages linking to `<frigateServerUrl>/api/events/<birdDetectionId>/clip.mp4` — a URL that can never exist, since a BirdNET-Go detection ID is never a real Frigate event ID. Bird alerts now link straight to BirdNET-Go's own `/api/v2/audio/<id>` endpoint (mirroring how camera alerts already link straight to Frigate rather than through WatchTower). Verified directly against the live BirdNET-Go instance: HTTP 200, `Content-Type: audio/wav`, `Content-Disposition: inline` — plays immediately, no login required.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-birdnet-cliplink-fix-20260912-125812 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-birdnet-cliplink-fix-2026-09-12 -- server.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — All-cameras-muted fix

Before deploying (commit `ab6dd95`), a backup point was made of the last-known-good build (commit `44d081c` — Add Frigate Server form defaults fix, running live and stable at the time).

**Git tag:** [`pre-camera-mute-fix-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-camera-mute-fix-2026-09-12) at commit `44d081c`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-camera-mute-fix-20260912-125144/`

Fixes "unable to disable all camera alerts": `filters.selectedCameras` is an allow-list where empty means "no filter, notify every camera" — muting cameras one at a time through Alert Rules empties that array on the last one, which both the UI and the server's dispatch check read as "no restriction," silently re-enabling everything. Added `filters.allCamerasMuted` as an unambiguous flag, plus a "Mute All" button. Verified live in the browser: muted 3 real cameras one at a time down to zero, confirmed the UI shows an explicit "all muted" banner instead of reverting, confirmed the persisted settings carry `allCamerasMuted: true`, and confirmed re-enabling one camera correctly drops back to an explicit allow-list.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-camera-mute-fix-20260912-125144 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-camera-mute-fix-2026-09-12 -- server.ts src/types.ts src/components/NotificationSettingsView.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Add Frigate Server form stale-default fix

Before deploying (commit `44d081c`), a backup point was made of the last-known-good build (commit `18319b3` — BirdNET channel fix, running live and stable at the time).

**Git tag:** [`pre-hostmodal-defaults-fix-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-hostmodal-defaults-fix-2026-09-12) at commit `18319b3`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-hostmodal-defaults-fix-20260912-123726/`

Fixes "Server Base URL" and "MQTT Broker Host" in the Add Frigate Server form defaulting to real pre-filled values (`http://localhost:5000`, `localhost`) instead of starting empty — typing into them without first selecting-all inserted at the cursor instead of replacing, producing a garbled concatenated URL that could never connect. Verified live: added a real remote Frigate server (over Tailscale) end-to-end — clean URL, successful probe (discovered its actual cameras), and confirmed it persisted correctly across a reload — before cleaning up the test entry.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-hostmodal-defaults-fix-20260912-123726 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-hostmodal-defaults-fix-2026-09-12 -- src/components/HostConnectorModal.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Clip transcode cache pre-warming

Before deploying the MQTT-triggered background clip-transcode warming (commit `0a4fbf2`), a backup point was made of the last-known-good build (commit `36c3bcb` — BirdNET alert filter fix + PORT default fix, running live and stable at the time).

**Git tag:** [`pre-clip-cache-warm-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-clip-cache-warm-2026-09-12) at commit `36c3bcb`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-clip-cache-warm-20260912-082612/`

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-clip-cache-warm-20260912-082612 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-clip-cache-warm-2026-09-12 -- server.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Flight route city-name display

Before deploying the flight-detail city-name change (commit `568437b`), a backup point was made of the last-known-good build (commit `0a4fbf2` — clip transcode cache pre-warming, running live and stable at the time).

**Git tag:** [`pre-flight-route-cities-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-flight-route-cities-2026-09-12) at commit `0a4fbf2`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-flight-route-cities-20260912-083732/`

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-flight-route-cities-20260912-083732 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-flight-route-cities-2026-09-12 -- flights.ts src/components/FlightDetailModal.tsx src/types.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Fix .env leak in Download ZIP feature (security)

Before deploying the fix for `.env`/`guardian.env` (real Gmail SMTP password, Slack/Discord webhooks, Gemini API key) being bundled into the "Download ZIP" feature's output — reachable by anyone hitting the unauthenticated web UI — a backup point was made of the last-known-good build (commit `568437b` — flight route city names, running live and stable at the time).

**Git tag:** [`pre-env-zip-leak-fix-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-env-zip-leak-fix-2026-09-12) at commit `568437b`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-env-zip-leak-fix-20260912-084630/`

⚠️ **Do not revert this one without a reason that outweighs the security fix** — rolling back re-opens the leak (anyone who can reach the web UI can re-download `.env` in plaintext). If you ever do revert it, rotate the exposed Gmail app password, Slack webhook, Discord webhook, and Gemini API key immediately after.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-env-zip-leak-fix-20260912-084630 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-env-zip-leak-fix-2026-09-12 -- scripts/make-zip.cjs server.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Username/password login

Before deploying optional login (commit `215b9f2`), a backup point was made of the last-known-good build (commit `1477464` — the `.env` zip-leak fix, running live and stable at the time).

**Git tag:** [`pre-login-auth-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-login-auth-2026-09-12) at commit `1477464`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-login-auth-20260912-085509/`

This one shipped inert — auth only turns on once `AUTH_USERNAME`/`AUTH_PASSWORD` are set in `.env` on the NUC and the app is restarted. Verified live immediately after deploy: `/api/auth/status` returned `authEnabled: false` and `/api/birds/sightings` was still reachable, i.e. zero behavior change until credentials are actually configured.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-login-auth-20260912-085509 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit (also removes the login UI/routes entirely, not just disables them):**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-login-auth-2026-09-12 -- server.ts src/App.tsx src/components/Navbar.tsx package.json package-lock.json .env.example && git rm -f src/components/LoginView.tsx && npm install && npm run build && pm2 restart watchtower"
```

Simpler alternative if login is on and just needs to come back off without a full revert: remove/comment out `AUTH_USERNAME`/`AUTH_PASSWORD` from `.env` and `pm2 restart watchtower` — the app falls back to open access immediately, no rebuild needed.

After any of the above, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Role-based multi-user accounts (login now always on)

Before deploying multi-user accounts (commit `a96a683`), a backup point was made of the last-known-good build (commit `215b9f2` — the opt-in login, which was still inert/off at the time, running live and stable).

**Git tag:** [`pre-rbac-users-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-rbac-users-2026-09-12) at commit `215b9f2`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-rbac-users-20260912-091102/`

⚠️ **This deploy is a real behavior change, not inert** — the app now always requires login. On this restart it seeded a fresh `admin`/`watchtower` account (`<data dir>/users.json`) and immediately started returning 401 to unauthenticated requests. Verified live: `/api/auth/status` → `authEnabled: true, authenticated: false`, `/api/birds/sightings` → 401 without a session. **Log in and change that password immediately** (top-right Account menu once logged in).

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-rbac-users-20260912-091102 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-rbac-users-2026-09-12 -- server.ts src/App.tsx src/components/Navbar.tsx .env.example && git rm -f src/components/AccountModal.tsx && npm run build && pm2 restart watchtower"
```

Note: reverting to the `215b9f2` opt-in-login version leaves `<data dir>/users.json` on disk unused — harmless, but delete it if you want a clean slate (`rm ~/.frigate-guardian/users.json` on the NUC), since if this feature is ever redeployed later it reads that file first rather than re-seeding.

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — Flights map default to Satellite

Trivial one-line change (commit `7014670`) — before deploying, a backup point was made of the last-known-good build (commit `a96a683` — RBAC multi-user accounts, running live and stable at the time).

**Git tag:** [`pre-satellite-default-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-satellite-default-2026-09-12) at commit `a96a683`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-satellite-default-20260912-092030/`

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-satellite-default-20260912-092030 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-satellite-default-2026-09-12 -- src/components/FlightMap.tsx && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## 2026-09-12 — BirdNET Gmail/Discord dispatch fix + per-channel alerts

Before deploying (commit `18319b3`), a backup point was made of the last-known-good build (commit `7014670` — Satellite map default, running live and stable at the time).

**Git tag:** [`pre-birdnet-channel-fix-2026-09-12`](https://github.com/jchisholm59/WatchTower/tree/pre-birdnet-channel-fix-2026-09-12) at commit `7014670`

**Build snapshot on the NUC:** `/home/jim/watchtower-backups/dist-pre-birdnet-channel-fix-20260912-102858/`

Fixes BirdNET alerts throwing (and silently failing) on Gmail/Discord because `event.id` from BirdNET-Go is a number, not a string — `!event.id.startsWith('test-')` crashed, invisibly, for both senders. Also adds `birdnet.alertChannels` so bird alerts can target a different channel set than camera alerts. Verified locally end-to-end before deploy (login, toggled Gmail/Slack on, confirmed the channel chips select/deselect correctly and persist via `/api/notifications/settings`) — could not verify against the live instance directly since the login system (working as intended) means only the account holder can drive it.

### To revert

**Fast path — restores the exact build that was running, no rebuild, back in seconds:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && rm -rf dist && cp -r ../watchtower-backups/dist-pre-birdnet-channel-fix-20260912-102858 dist && pm2 restart watchtower"
```

**Full path — also rolls back the source tree to that commit:**
```bash
ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && git checkout pre-birdnet-channel-fix-2026-09-12 -- server.ts src/components/NotificationSettingsView.tsx src/types.ts && npm run build && pm2 restart watchtower"
```

After either, confirm it came back up:
```bash
curl -s http://192.168.2.210:8100/api/birds/status
```

---

## General pattern for future backup points

Before deploying a change you might want to undo:

1. **Tag the currently-deployed commit** (from your local checkout, once you've confirmed the NUC is on that exact commit via `git log --oneline -1` over SSH):
   ```bash
   git tag -a pre-<change-name>-$(date +%Y-%m-%d) <commit-sha> -m "Backup point before <change-name>"
   git push origin pre-<change-name>-$(date +%Y-%m-%d)
   ```

2. **Snapshot the running build on the NUC** before pulling/rebuilding:
   ```bash
   ssh 192.168.2.210 "cd /home/jim/Frigate-Guardian-Secure && mkdir -p ../watchtower-backups && cp -r dist ../watchtower-backups/dist-pre-<change-name>-\$(date +%Y%m%d-%H%M%S)"
   ```

3. Deploy as normal (`git pull`, `npm run build`, `pm2 restart watchtower`).

4. Add an entry to this file with the tag name, backup directory, and exact revert commands — future-you (or Claude) shouldn't have to reconstruct paths and timestamps from shell history.

**Housekeeping:** `/home/jim/watchtower-backups/` isn't pruned automatically — old snapshots should be deleted by hand once you're confident a deploy is solid.
