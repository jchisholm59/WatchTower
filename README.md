# 🗼 WatchTower

**The ULTRALATEST Advanced Surveillance Hub & AI Intelligence Console for Frigate NVR.**

WatchTower is a comprehensive, real-time surveillance dashboard designed to supercharge your Frigate NVR experience. It combines high-performance live monitoring with intelligent background automation, multi-channel alerts, and Google Gemini AI vision assessment.

![WatchTower UI](https://raw.githubusercontent.com/blakeblackshear/frigate/master/web/src/assets/frigate.png) *(Placeholder for your awesome dashboard screenshot)*

---

## 🙏 Built On

WatchTower is a console layered on top of other people's excellent work — it doesn't replace or reimplement them:

*   **[Frigate NVR](https://frigate.video/)** by [Blake Blackshear](https://github.com/blakeblackshear) — the open-source NVR and object-detection engine that does all the actual camera processing, recording, and detection.
*   **[BirdNET-Go](https://github.com/tphakala/birdnet-go)** by [Tomi Hakala](https://github.com/tphakala) — the real-time bioacoustic bird identification engine behind the Bioacoustic Yard Intelligence features.

If you find WatchTower useful, consider starring and supporting those projects directly.

---

## 🎯 Finally Fixes Frigate's Parked-Car Problem

Your own car re-triggering as a "new" detection every time light or shadow shifts is one of the most-discussed unsolved annoyances in the Frigate community — zones, masks, object filters inside Frigate itself don't reliably fix it long-term. WatchTower doesn't try to fix it in Frigate. It sidesteps the problem entirely, with two independent mechanisms you can use together — one filters by **where** a detection is, the other by **what Frigate recognizes it as**. Both live in the **Zones Studio** tab.

### Exclusion Zones — filter by location

Draw a region directly on a camera's real live frame — around a car in the driveway, a flag, a tree branch, anything that keeps falsely triggering. Any detection centered inside that zone is silently skipped *before* a notification goes out, independent of whatever Frigate itself concludes about the object's motion. The event still records and still shows up in Review — you just stop hearing about it.

*   **Draw, drag, done:** click to place vertices, drag any vertex to reshape, drag inside the shape to move the whole zone — no redrawing from scratch when the car parks a few feet differently.
*   **Per camera, unlimited zones:** cover more than one trouble spot per camera, any polygon shape, any number of points.
*   **See it, don't guess:** the Snapshot Viewer and 10-Second Playback windows both show your configured zones overlaid on the real footage, so you can check at a glance whether a past event would have been filtered.

**The tradeoff to know about:** a zone is location-based, not identity-based. If your vehicle needs a large or awkwardly-placed zone to stay covered — say, one that also swallows the entrance to your driveway — an actual unrecognized vehicle parked in that same spot goes just as unnoticed as your own car does. A wide enough zone can trade a false-positive annoyance for a real blind spot. That's exactly what Known Vehicles is for.

### Known Vehicles — filter by identity

If you're running **Frigate+** with a custom-trained sub-label classifier (Frigate+'s own feature for recognizing a *specific* vehicle by name, not just "car" generically — see [Frigate+'s docs](https://frigate.video/plus)), WatchTower can use that classification directly: list a sub-label name (e.g. `Tundra`, `Rav4`) against a camera, and any `car` detection Frigate identifies as that specific vehicle is skipped — regardless of where in the frame it is.

Because this suppresses by *identity* rather than *location*, it doesn't create the blind spot a large exclusion zone can: your own recognized vehicle is silently filtered no matter where it's parked that day, while an unrecognized car — or a stranger's truck — sitting in that exact same spot still alerts normally. No zone to draw, no region of the frame ever goes dark.

*   **Per camera, unlimited vehicles:** list every vehicle you have a trained classifier for, per camera.
*   **Exact match required:** the name must match your Frigate+ sub-label classifier's name exactly (case-sensitive) — WatchTower doesn't do its own vehicle recognition, it just acts on what Frigate+ already decided.
*   **Complementary, not exclusive:** use Known Vehicles for your own recognized vehicles and Exclusion Zones for everything else that isn't identity-based (a flag, foliage, a chronic reflection) — a detection only needs to clear *one* of them to be skipped.

Find both in the **Zones Studio** tab (admin-only, since both write to shared notification settings).

---

## ✨ Key Features

### 🚀 Real-Time Tactical Hub
*   **High-Speed Grid:** Monitor every camera at once — WebRTC when go2rtc can offer it (real audio+video, no per-camera connection limit), falling back to polled snapshots automatically for anything it can't.
*   **Live Heartbeat:** Real-time MQTT connection status with visual "Green Light" confirmation.
*   **Dynamic Telemetry:** Live tracking of CPU usage, Coral TPU inference speeds, and system uptime directly from your NVR.
*   **Stability First:** De-duplicated event list ensures you see a single, real-time row per detection instead of hundreds of updates.

### 📧 Intelligent Background Notifications
*   **Persistent Sentinel:** Alerts are processed server-side. Receive notifications even when your browser is closed.
*   **Visual Gmail Alerts:** Receive high-resolution snapshots of detected objects embedded directly in your emails.
*   **One-Click Action:** Every alert (Gmail, Discord, Slack) includes a direct link to "View Event Recording" via your Tailscale or local network.
*   **Multi-Channel Support:** Native support for Gmail (SMTP), Discord Webhooks (with image uploads), and Slack Incoming Webhooks.
*   **Per-Camera Control:** Mute notifications for individual cameras without affecting recording or the Review feed.

### 🧠 Advanced AI Filtering & Analysis
*   **Exclusion Zones:** Draw a region around a chronic false-trigger spot (a parked car, a flag, a tree branch) — detections centered inside it never reach a notification, regardless of what Frigate itself thinks about the object's motion. See the highlight above.
*   **Known Vehicles:** Recognize a *specific* vehicle by its Frigate+ sub-label and skip it wherever it's parked, without masking off any region of the frame. See the highlight above.
*   **Parked Car Logic:** A lighter-weight companion — trusts Frigate's own `stationary` flag to filter vehicle alerts, no zone drawing or Frigate+ classifier required. Exclusion Zones/Known Vehicles are the more reliable options when that flag gets fooled by changing light/shadow.
*   **Tactical AI Briefs:** Integrated with **Google Gemini 1.5 Flash** to generate human-readable security assessments of events.
*   **Natural Language Search:** Find specific events using AI-powered search (e.g., *"Show me all the delivery trucks from yesterday morning"*).

### 📐 Zones Studio
*   **Exclusion Zones & Known Vehicles:** the two parked-car/false-trigger filters described above, in one place — see the highlight near the top of this README for the full explanation of how each works and when to use which.
*   **Admin-only:** both write to shared notification settings, so this tab (like the Notifications tab) is hidden entirely for standard user accounts.

### 🎬 Reliable Clip Playback
*   **Automatic Transcoding:** H.265/HEVC event clips (common on newer 4K cameras) are transcoded to browser-compatible H.264 on the fly — Firefox/Chrome can't decode HEVC natively.
*   **Hardware Acceleration:** Uses Intel Quick Sync (VAAPI) when available, with automatic fallback to software encoding.
*   **Clip Caching:** Transcoded clips are cached, so replaying the same event is instant after the first view.

### 🐦 Bioacoustic Yard Intelligence
*   **BirdNET-Go Integration:** Real-time bird species identification via high-fidelity audio analysis.
*   **Live Audio Sentinel:** Listen to your yard in real-time with a built-in frequency spectrogram.
*   **Diversity Report:** Automatic population summary of all species visiting your property.
*   **Audio Proof:** Play back specific bird song recordings directly from your yard history.
*   **Daily Species Sentinel:** Intelligent alerts for the first sighting of each unique species every day, preventing notification fatigue.

### 🌊 Tidal Intelligence
*   **CHS Predictions:** Official Canadian Hydrographic Service tide data (DFO IWLS API) — no API key required.
*   **Multi-Station:** Track up to four stations (home, cottage, marina) and switch between them with sub-tabs.
*   **30-Hour Curve:** Live SVG tide curve with a "now" marker, interpolated current height, and high/low markers.
*   **Upcoming Tides:** High & low table plus a "next high/low in Xh Ym" countdown.
*   **Sun & Moon:** Sunrise, sunset, and moon phase computed locally from each station's coordinates.
*   **Tide Alerts:** Optional high/low tide notifications a configurable number of minutes ahead, delivered through your existing Gmail / Slack / Discord channels, plus a live in-app banner.

### ✈️ Live Air Traffic
*   **PiAware / dump1090-fa Integration:** Live aircraft positions from your own local ADS-B receiver — no third-party tracking service required.
*   **300nm Range Map:** Street, Satellite, and Topographic layers, centered on your home with 50nm range rings and a one-click 2x zoom for the traffic cluster overhead.
*   **Flight Table:** Altitude, speed, heading, squawk, and distance from home for every aircraft currently in range.
*   **Aircraft Detail:** Click any plane for its photo, type, registration, and origin/destination — sourced from free community APIs (adsbdb.com, planespotters.net), with optional departure/arrival times via a free registered OpenSky Network API client.

### 🌤 Weather
*   **Current Conditions:** Temperature, feels-like, humidity, wind, pressure, and precipitation for your home location.
*   **7-Day Forecast:** Daily highs/lows, precipitation chance, and sunrise/sunset — no API key required (Open-Meteo).

---

## 🛠 Installation & Setup

### Prerequisites
*   A running instance of [Frigate NVR](https://frigate.video/).
*   Node.js v22+ installed on your server.
*   `ffmpeg` (and `ffprobe`) installed and on `PATH` — required for clip transcoding and BirdNET-Go live audio.

### 1. Clone & Install
```bash
git clone https://github.com/jchisholm59/WatchTower.git
cd WatchTower
npm install
```

### 2. Configure Secrets
Create your environment files in the root directory (use `.env.example` as a template).

> [!IMPORTANT]
> To prevent AI development environments from overwriting your custom settings, this project uses two environment files:
> 1.  **.env**: Managed automatically by the IDE (stores your `GEMINI_API_KEY`).
> 2.  **guardian.env**: Created by you for all other secrets (Gmail, Slack, Discord, etc.).

**Example `guardian.env`:**
```text
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-google-app-password
GMAIL_RECIPIENT=your-alerts-recipient@gmail.com
# GEMINI_API_KEY is handled in .env
```

### 3. Run for Production (Recommended)
We recommend using **PM2** to keep the sentinel running 24/7 in the background:
```bash
npm run build
pm2 start dist/server.cjs --name watchtower
```

### 4. Running with Docker (Recommended)
You can also run WatchTower using Docker, which is the recommended way for production deployment. It also supports Intel Quick Sync (VAAPI) hardware-accelerated clip transcoding when `/dev/dri` is available.

**Quick Start:**
1.  **Configure environment:** 
    - The IDE will manage your `GEMINI_API_KEY` automatically in the `.env` file.
    - Create a file named `guardian.env` for your custom secrets (use `.env.example` as a template).
2.  **Start the container:**
    ```bash
    docker compose up -d --build
    ```

The application will be available at `http://localhost:8100` (configurable via the `PORT` environment variable in `docker-compose.yml`).

**Persistent Data:**
Docker will automatically create a volume to persist your settings:
- `guardian_data`: Persists `notification_settings.json`, `mqtt_config.json`, `users.json` (login accounts), and the transcoded clip cache in the `/app/data` directory inside the container.

**Troubleshooting & Maintenance:**
- **View logs:** `docker compose logs -f`
- **Restart:** `docker compose restart`
- **Full Reset (Wipes all settings, credentials, and login accounts):**
  If you want to perform a truly clean install and wipe all persisted settings from the Docker volume — this also deletes every account, so the next start re-seeds the default `admin`/`watchtower` login:
  ```bash
  docker compose down -v
  docker compose up -d --build
  ```

### 5. Enable Live Audio in the Camera Detail View (WebRTC)

Opening a camera's expanded "Inspect & Detail" view streams over WebRTC via Frigate's embedded go2rtc — the grid also uses WebRTC when a camera supports it, but every tile there is muted by default (nobody wants 7 cameras talking over each other at once). The detail view is where you actually get sound, with a mute/unmute toggle. To get video *and* audio there, one small addition to Frigate's own `config.yml` is usually required:

```yaml
go2rtc:
  streams:
    ...(your existing camera entries)...
  webrtc:
    candidates:
      - YOUR_FRIGATE_HOST_IP:8555
```

Add `webrtc:` as a **sibling of your existing `go2rtc.streams` key** — not a second top-level `go2rtc:` block elsewhere in the file. YAML doesn't merge duplicate top-level keys; the last one silently wins, which would wipe out every camera restream you've already defined under `streams:`. Restart Frigate after saving.

**Why this is needed:** without it, go2rtc has to guess its own reachable address for WebRTC's ICE negotiation, which frequently fails on a Docker host with more than one network interface — the connection succeeds, but no media ever actually reaches the browser. This is a Frigate/go2rtc configuration detail, not something WatchTower can work around in code.

**If you get audio but no video:** that's a separate, unrelated issue — most browsers' WebRTC stack can negotiate H.265 but never actually decode it, so a camera whose stream happens to be H.265 will play audio while video silently never renders. WatchTower already works around this automatically by preferring an H.264 stream when one of the camera's configured ffmpeg inputs offers it — if a camera only has an H.265 source available at all, there's currently no fix short of changing that camera's stream encoding.

---

## 🔐 Login & Accounts
WatchTower requires signing in — there's no way to reach the dashboard, live feeds, or any API route without an account.

**First run:** if no accounts exist yet, WatchTower seeds a default one automatically:
```
Username: admin
Password: watchtower
```
Log in with that immediately and change the password (top-right **Account** menu → *Change My Password*) — don't leave it at the default, especially if this server is reachable from outside your LAN.

**Two roles:**
*   **Admin** — full access, including adding/removing accounts and changing shared system configuration: Frigate servers, MQTT, and the Notifications settings screen (which covers Gmail/Slack/Discord/Filters, BirdNET-Go, Tides, Flights/PiAware, and Weather).
*   **Standard** — identical use of the app otherwise (live feeds, event review, Birds/Tides/Flights/Weather tabs, AI search, etc.), but can't touch any of the configuration above — it's hidden from the UI entirely and rejected server-side if requested directly. Good for other household members who should be able to use WatchTower without being able to break it.

**Managing accounts:** any admin can add more accounts (admin or standard) from the **Account** menu, and reset another user's password if they forget it — there's no email-based recovery. Every logged-in user can change their own password from the same menu.

Accounts are stored in `<data dir>/users.json` (`~/.frigate-guardian/users.json`, or `/app/data/users.json` under Docker) — bcrypt-hashed passwords, never committed to git, never leave your server.

---

## 🐦 BirdNET-Go Setup
To enable bird song identification, go to **Notifications -> BirdNET-Go** in the dashboard:
1.  **Enable Integration:** Toggle the switch to ON.
2.  **MQTT Broker:** Provide the IP of the broker BirdNET-Go is publishing to.
3.  **MQTT Topic:** Set to your sightings topic (default: `birdnet-sightings`).
4.  **Web URL:** Enter your BirdNET-Go web interface address (e.g., `http://192.168.2.210:8080`) to enable audio clip playback.
5.  **Live Audio:** Enter the RTSP URL of your yard microphone to enable the live spectrogram.
6.  **Daily Alerts:** Toggle "Daily Species Sentinel" to receive notifications for the first detection of each species every day.

---

## 🌊 Tides Setup
Tide predictions come from the public **DFO / Canadian Hydrographic Service** IWLS API — no key or account needed. In the dashboard, go to **Notifications -> Tides**:
1.  **Enable Integration:** Toggle the switch to ON.
2.  **Add Stations:** Search by name or 5-digit CHS code (e.g. `Halifax`, `Digby`, `00490`) and add up to four.
3.  **Units:** Choose metres or feet.
4.  **Tide Alerts (optional):** Toggle on, set how many minutes ahead to notify, pick high and/or low tide, and choose which channels carry them. Alerts reuse the webhook URLs / SMTP credentials from the Gmail, Slack, and Discord tabs.

Predictions are cached server-side for 10 minutes. The **Tides** tab shows the curve, upcoming tides, and sun/moon panel for each configured station. Requires outbound HTTPS to `api-iwls.dfo-mpo.gc.ca`.

---

## ✈️ Flights Setup
Live air traffic requires a local **PiAware** or **dump1090-fa** ADS-B receiver on your network (a Raspberry Pi + RTL-SDR dongle is the common setup). In the dashboard, go to **Notifications -> Flights**:
1.  **Enable Integration:** Toggle the switch to ON.
2.  **PiAware Receiver Address:** Just the IP (e.g. `192.168.1.x`) — WatchTower fills in the standard `/skyaware/data/aircraft.json` path. A full URL also works for non-default installs. Use **Test Connection** to confirm it's reachable.
3.  **Home Coordinates:** Enter your latitude/longitude to center the map and range rings.
4.  **OpenSky Network (optional):** For departure/arrival times, register a free API client at [opensky-network.org](https://opensky-network.org/) and paste the Client ID/Secret in. Without it, you still get aircraft photos and routes for scheduled flights, just no timing data.

The **Flights** tab polls the receiver every few seconds — no data leaves your network except the on-demand aircraft photo/route lookups (adsbdb.com, planespotters.net, optionally OpenSky) when you click a specific plane.

---

## 🌤 Weather Setup
Uses [Open-Meteo](https://open-meteo.com/) — free, no API key or account needed. In the dashboard, go to **Notifications -> Weather**:
1.  **Enable Integration:** Toggle the switch to ON.
2.  **Home Coordinates:** Enter your latitude/longitude (the same values as Tides/Flights, if configured).

The **Weather** tab refreshes every 10 minutes, matching the server-side cache.

---

## 📥 Sorting Alerts in Gmail (Optional)

Every alert email WatchTower sends uses a predictable subject line: `🚨 [Frigate Alert] <OBJECT> detected on <camera> (<LEVEL> Threat)`. That's enough structure to auto-sort alerts out of your inbox into labels by detected object type, without touching the app itself — all Gmail-side.

**Label structure:** a parent `Frigate` label (catches every alert, archived out of the inbox) plus three sub-labels: `Frigate/Car`, `Frigate/Person`, `Frigate/Bird`.

**Known limitation — bird detection is a best-effort exclusion list, not a positive match.** Car and Person alerts (from Frigate's own object detection) literally contain the words "CAR"/"PERSON" in the subject, so those are easy exact matches. Bird alerts, via the BirdNET-Go integration above, instead carry a specific species name (e.g. "BARRED OWL", "BLACK-CAPPED CHICKADEE") rather than the word "bird" — and the same yard microphone/camera can also pick up non-bird wildlife (coyote, frog, and presumably others). So the Bird rule works by exclusion: *anything that isn't Car, Person, or a known non-bird animal* is assumed to be a bird. If a new animal type starts showing up and getting mis-filed into `Frigate/Bird`, add it to the exclusion list below and re-import.

**Setup — Gmail supports bulk filter import**, which is much less painful than the "Create filter" dialog for queries this long:
1. Save the XML below as a file (e.g. `frigate-gmail-filters.xml`).
2. In Gmail: gear icon → **See all settings** → **Filters and Blocked Addresses** tab → scroll down → **Import filters**.
3. Choose the file, review the preview Gmail shows, then **Create filters**.

```xml
<?xml version='1.0' encoding='UTF-8'?>
<feed xmlns='http://www.w3.org/2005/Atom' xmlns:apps='http://schemas.google.com/apps/2006'>
  <title>Mail Filters</title>

  <!-- 1. Catch-all: every Frigate alert gets the Frigate label and is archived out of the inbox -->
  <entry>
    <category term='filter'></category>
    <title>Mail Filter</title>
    <content></content>
    <apps:property name='hasTheWord' value='subject:("Frigate Alert")'/>
    <apps:property name='label' value='Frigate'/>
    <apps:property name='shouldArchive' value='true'/>
  </entry>

  <!-- 2. Car alerts -->
  <entry>
    <category term='filter'></category>
    <title>Mail Filter</title>
    <content></content>
    <apps:property name='hasTheWord' value='subject:("Frigate Alert") subject:(CAR)'/>
    <apps:property name='label' value='Frigate/Car'/>
  </entry>

  <!-- 3. Person alerts -->
  <entry>
    <category term='filter'></category>
    <title>Mail Filter</title>
    <content></content>
    <apps:property name='hasTheWord' value='subject:("Frigate Alert") subject:(PERSON)'/>
    <apps:property name='label' value='Frigate/Person'/>
  </entry>

  <!-- 4. Bird alerts: everything that isn't Car/Person/a known non-bird animal.
       Add more -subject:(...) exclusions here if a new non-bird animal type
       shows up (e.g. possum, opossum), then re-import. -->
  <entry>
    <category term='filter'></category>
    <title>Mail Filter</title>
    <content></content>
    <apps:property name='hasTheWord' value='subject:("Frigate Alert") -subject:(CAR) -subject:(PERSON) -subject:(COYOTE) -subject:(DOG) -subject:(CAT) -subject:("GREEN FROG") -subject:(FROG) -subject:(RACCOON) -subject:(DEER) -subject:(FOX) -subject:(SQUIRREL) -subject:(RABBIT) -subject:(SKUNK) -subject:(CHIPMUNK) -subject:(GROUNDHOG) -subject:(MOOSE) -subject:(BEAR) -subject:(MOUSE) -subject:(RAT) -subject:(BAT) -subject:(SNAKE) -subject:(TURTLE)'/>
    <apps:property name='label' value='Frigate/Bird'/>
  </entry>

</feed>
```

Gmail matches/creates labels by name on import, so re-importing after editing the exclusion list won't create duplicate labels — it just updates the filter's match criteria.

---

## 🔒 Security & Privacy
*   **Login Required:** See [Login & Accounts](#-login--accounts) above — every route requires a signed-in session, with admin/standard roles separating "use the app" from "reconfigure the app."
*   **Local First:** Your passwords, integration credentials, and account list are stored locally in `~/.frigate-guardian` (or `/app/data` under Docker) and never uploaded to the cloud.
*   **Encrypted Streams:** Supports HTTPS and secure WebSocket (WSS) for camera intercepts.

---

## 🏗 Built With
*   **Frontend:** React, Tailwind CSS, Lucide Icons, Framer Motion, Leaflet.
*   **Backend:** Node.js, Express, MQTT.js, Nodemailer, FFmpeg.
*   **AI:** Google Gemini 1.5 Flash.
*   **Data:** [Frigate NVR](https://frigate.video/) by Blake Blackshear, [BirdNET-Go](https://github.com/tphakala/birdnet-go) (MQTT) by Tomi Hakala, DFO / Canadian Hydrographic Service IWLS (tides), OpenStreetMap / Esri / OpenTopoMap (map tiles), [adsbdb.com](https://www.adsbdb.com/), [planespotters.net](https://www.planespotters.net/) and [OpenSky Network](https://opensky-network.org/) (flight & aircraft lookups), [Open-Meteo](https://open-meteo.com/) (weather).

---
*Created with ❤️ for the Frigate NVR Community.*
