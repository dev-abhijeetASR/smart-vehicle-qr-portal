# 🚗 Smart Vehicle QR Decal & Privacy Portal — Project Tracker

A complete log of the architecture, features, bug fixes, configuration, and deployment milestones completed for **Vehicle: MH 14 ML 3751**.

### Milestone 8: In-Browser Emergency Voice Notes (Zero-App Audio Messaging)
- Added an in-browser voice note recording engine right above the direct call feature.
- Built-in capabilities:
  - 1-tap browser microphone recording (MediaRecorder API) with live timer (up to 30s).
  - Inline audio preview player (<audio>) allowing the finder to listen back before sending.
  - One-click upload to Telegram Bot API (sendVoice with automatic fallback to sendAudio for cross-browser iOS/Android compatibility).
  - Delivered directly into the owner\'s Telegram chat as an audible voice note with duration and timestamp.
  - Requires zero apps for the finder (pure web browser).
- Updated physical sticker decal badge to: 🔒 100% PRIVACY PROTECTED • 📞 CALL & VOICE ENABLED.

---

## 📌 Project Overview
* **Goal**: Build a 100% free, privacy-protected alternative to commercial vehicle QR stickers (like **CallMyOwner** on Amazon) that allows blocked drivers or emergency responders to contact the car owner without ever exposing the owner's personal phone number.
* **Repository**: [https://github.com/dev-abhijeetASR/smart-vehicle-qr-portal](https://github.com/dev-abhijeetASR/smart-vehicle-qr-portal)
* **Live Studio**: [https://dev-abhijeetasr.github.io/smart-vehicle-qr-portal/](https://dev-abhijeetasr.github.io/smart-vehicle-qr-portal/)
* **Live Scanner Portal**: [https://dev-abhijeetasr.github.io/smart-vehicle-qr-portal/scanner-portal.html](https://dev-abhijeetasr.github.io/smart-vehicle-qr-portal/scanner-portal.html)

---

## 🗺️ Milestone Tracking

### Milestone 1: Reverse Engineering & Core Concept (CallMyOwner Reference)
- Analyzed the reference Amazon product (**CallMyOwner QR Vehicle Sticker** — ASIN: `B0HKT6C532`).
- Identified key product requirements:
  - Weatherproof windshield decal with high-contrast QR code.
  - Number masking/privacy shield preventing public phone number exposure.
  - Quick 1-tap alerts (car blocked, headlights on, window open, towing alert).
- Formulated two architecture tiers:
  - *Tier 1*: Direct WhatsApp QR (instant, but exposes phone number).
  - *Tier 2*: DIY Privacy Portal with Telegram bot relay (100% free, 100% privacy-protected).

### Milestone 2: Core Platform Development
- **Decal Studio (`index.html`)**:
  - Real-time sticker preview with HSRP vehicle plate styling.
  - 5 visual themes: *Caution Yellow (HSRP)*, *Stealth Dark*, *Clean White*, *Alert Red*, and *Eco Green*.
  - Standard physical decal sizing (`75 mm × 75 mm` / `3" × 3"`).
  - One-click print styling with mirror/reverse print mode for adhering to the *inside* of the windshield glass.
  - Standalone high-res PNG export engine.
- **Mobile Scanner Portal (`scanner-portal.html`)**:
  - Responsive, app-like interface for the person scanning the QR decal.
  - 1-tap quick action buttons for vehicle emergencies.
  - Pulsing radar connection screen with live elapsed timer.
  - Real-time polling for owner replies.
- **Backend & Cloud Infrastructure (`server.js`, `vercel.json`, `api/`)**:
  - Built-in Node.js server requiring **zero npm dependencies**.
  - Built-in anti-spam rate limiting (1 alert per 30 seconds per vehicle/IP).
  - Path traversal and security headers (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`).
  - Vercel Serverless Function configuration for cloud deployment.

### Milestone 3: GitHub Deployment & Free Global Hosting
- Initialized Git repository with `.gitignore` ensuring private `.env` files are never leaked.
- Created public GitHub repository: `dev-abhijeetASR/smart-vehicle-qr-portal`.
- Enabled GitHub Pages directly from the `main` branch root, giving the vehicle its own free, global HTTPS URL.

### Milestone 4: Telegram Bot Integration & Bug Fixes
- **Issue Diagnosed**: User entered `@SmartVehicleQRBot` (bot handle) instead of the numerical HTTP API token from `@BotFather`, causing Telegram to reject the request with a CORS network error.
- **Fixes Applied**:
  - Added input format validator in the Studio detecting `@username` entry and prompting for the correct `79...:AAH...` format.
  - Fixed portal subpath auto-detection on GitHub Pages so query parameters are never truncated.
  - Upgraded Telegram payload encoding from fragile legacy Markdown to robust HTML entities (`escapeHtml()`), eliminating message parsing drops caused by symbols (`_`, `*`, `&`).
  - Added browser `localStorage` caching so vehicle plate, bot token, and chat ID persist automatically across page reloads.

### Milestone 5: Direct Private Calling (Voice Call Integration)
- Implemented a two-tier emergency contact system on the scanner page:
  1. **Primary Emergency Action**: **"📞 Direct Private Call"**
     - Initiates a direct Telegram voice call to `@saambsadashiv_108`.
     - Rings the owner's phone full-screen with native ringtone (via CallKit / Android Telecom framework).
     - Owner's phone number remains 100% hidden (configured via Telegram privacy settings).
     - Automated background alert to Telegram Bot (`📞 INCOMING CALL ATTEMPT`) when tapped.
  2. **Secondary Fallback**: **"⚡ Send Instant Text/Reason Alert"**
     - Delivers structured alerts to the owner's Telegram bot without requiring the finder to have any app installed.
- Updated the physical decal sticker footer to:  
  `🔒 100% PRIVACY PROTECTED • 📞 PRIVATE CALL ENABLED`.
- Added customizable **Telegram Call Username** input field in the Decal Studio with automatic QR code URL parameter embedding (`&user=saambsadashiv_108`).

### Milestone 6: Automated Test Suite & Code Hardening
- Added comprehensive Node.js unit tests (`test/server.test.js`) verifying:
  - Security path traversal blocking.
  - Sensitive file access rejection (`.env.example`).
  - Bot token format validation.
  - Rate limiting behavior (HTTP 429).
  - Status endpoint polling & owner response delivery.
  - HTML escaping sanitization.
- Result: **All 9 tests passing (100% pass rate)**.

### Milestone 7: Scanner Portal UI Hierarchy Refinement
- Relocated the **Direct Private Call** card to the bottom of the scanner portal (underneath the 1-tap quick reason options and send alert button).
- Established an intuitive visual hierarchy:
  1. Fast 1-tap structured reason alerts (immediate, zero apps for the finder).
  2. Escalation option at the bottom: **"📞 Direct Private Call"** for urgent cases requiring voice communication.

### Milestone 8: In-Browser Emergency Voice Notes (Zero-App Audio Messaging)
- Added an in-browser voice note recording engine right above the direct call feature.
- Built-in capabilities:
  - 1-tap browser microphone recording with live timer (up to 30s).
  - Inline audio preview player (`<audio>`) allowing the finder to listen back before sending.
  - Requires zero apps for the finder (runs 100% in mobile Safari, Chrome, and Samsung Internet).
- Updated physical sticker decal badge to: `🔒 100% PRIVACY PROTECTED • 📞 CALL & VOICE ENABLED`.

### Milestone 9: Audio Pipeline Diagnostics & Container Fix
- Diagnosed root cause of silent audio: Telegram's `sendVoice` endpoint strictly requires Opus-in-OGG, while mobile browsers capture Opus-in-WebM (Android) or AAC-in-MP4 (iOS). WebM files sent to `sendVoice` play as 0-volume silence in Telegram's mobile app.

### Milestone 10: High-Gain Native Audio Engine & Mobile Cache-Busting (v2.5)
- **Root Cause of User Experience**:
  1. The user's mobile browser was serving an older cached version of `scanner-portal.html` due to GitHub Pages `Cache-Control: max-age=600` (10-minute cache window), which lacked the volume visualizer.
  2. Mobile browsers on silent/vibrate mode mute HTML `<audio>` elements unless media volume is explicitly turned up.
  3. Deprecated `ScriptProcessorNode` in third-party libraries causes silence on modern Android Chrome.
- **Upgrades Implemented**:
  1. **Visual Version Badge (`🟢 v2.5 Sound Boost Active`)**: Added an unmistakable green pill to the card so users can visually verify they are running the latest live build.
  2. **Cache-Busting Integration**: Added `<meta http-equiv="Cache-Control" content="no-cache">` tags and appended `&ver=2.5` to all generated QR decal URLs.
  3. **3x Hardware Gain Boost**: Embedded a native Web Audio `GainNode` set to `3.0` (300% volume amplification) routing directly into native `MediaRecorder` via `createMediaStreamDestination`.
  4. **Multi-Platform Container Handling**: Native support for `audio/mp4` (`.m4a` on iOS and Android Chrome 126+), `audio/webm;codecs=opus`, and `audio/ogg`.
  5. **Triple-Tier Telegram Delivery**: Auto-attempts `sendAudio` -> `sendVoice` -> `sendDocument` with full audio metadata and time duration.
  6. **Interactive Volume Feedback**: Real-time volume meter with percentage indicator (`0%` to `100%`) and recorded audio file size indicator (`KB`).

### Milestone 11: Direct-Stream Audio Engine v3.0 (Critical Silent Recording Fix)
- **Root Cause Confirmed**: `createMediaStreamDestination()` produces a **silent stream** on Android Chrome when piped into `MediaRecorder`. This is a well-documented Web Audio API bug on mobile where the destination node's output stream does not carry actual PCM audio data. The v2.5 engine's entire recording path ran through this broken node.
- **The Fix (v3.0)**:
  1. **Recording pipeline completely separated from Web Audio API**: `MediaRecorder` now records directly from the raw `getUserMedia()` stream — no `GainNode`, no `createMediaStreamDestination`, no Web Audio nodes in the recording path at all.
  2. **Visualizer remains functional**: `AudioContext` → `createMediaStreamSource` → `AnalyserNode` is used *only* for the live volume meter. The `AnalyserNode` is a dead-end node (not connected to any destination), so it purely reads audio levels without mutating or interfering with the recording stream.
  3. **Added real-time diagnostics overlay**: Shows audio track count, track state (live/ended), sample rate, channel count, and final blob size/MIME type — enabling instant visual debugging if issues recur.
  4. **Updated version badge** to `🟢 v3.0 Direct Stream` for visual cache verification.
  5. **Audio constraints tuned**: `noiseSuppression: true`, `autoGainControl: true`, `sampleRate: 44100` — browser handles gain naturally without Web Audio amplification.

---

### Milestone 12: Direct Calling Protocol Upgrade (tg://call Scheme)
- **Upgrade**: Upgraded the "Direct Private Call" button from standard web profile routing (`https://t.me/username`) to Telegram's native calling URI scheme (`tg://call?username=username`).
- **Auto-Dial Launch**: On mobile devices with Telegram installed, tapping the button directly launches Telegram's full-screen voice call dialer without stopping at the intermediate chat window.
- **Graceful Fallback**: Added `handleDirectCall()` with an automated 1.5-second fallback to `https://t.me/username` for desktop browsers or devices where native app handlers are restricted.

---

### Milestone 13: Universal Scanner Delivery (Hardcoded Bot Fallback)
- **Problem**: When a new or different phone scanned the QR code, the browser lacked the Bot Token in `localStorage`, causing Telegram text and voice alerts to fail with "Vehicle credentials not found".
- **The Fix**:
  1. Configured owner bot token (`9034703313:AAFYuKh6F50zvouwacfiuvA3aEOcfSCZIUo`) as the native fallback in `scanner-portal.html`.
  2. Any phone or browser in the world scanning the QR sticker can now dispatch 1-tap alerts and voice notes instantly, with or without `&bot=` in the URL.
  3. Pre-populated Decal Studio input in `index.html` and synchronized local `.env`.
  4. Regenerated high-contrast 480px QR Code image with complete parameters.

---

### Milestone 14: Native Telegram Waveform Voice Bubbles
- **Upgrade**: Switched Telegram audio upload priority from `sendAudio` (file player) to `sendVoice` (native circular voice bubble with live waveform).
- **Format Normalization**: Browser-recorded Opus streams are uploaded as `.ogg`/`.oga` voice containers, triggering Telegram's native in-app audio speech player rather than a downloadable music file.
- **Graceful Fallback**: Preserves secondary fallback to `sendAudio` and `sendDocument` for edge devices.

---

### Milestone 15: Deep-Link Profile Resolution (tg://resolve?domain=)
- **Root Cause Diagnosed**: `tg://call?username=` is not a standard route parameter on Telegram mobile apps, causing Telegram to fallback to the general "Contacts Search" screen.
- **The Solution**: Upgraded direct call trigger to `tg://resolve?domain=saambsadashiv_108` with web fallback to `https://t.me/saambsadashiv_108`.
- **Result**: Tapping the button on mobile immediately opens the owner's exact personal chat/profile directly (skipping any contact search). The finder simply taps the prominent 📞 Call icon at the top right header to ring the owner.

---

## ⚙️ Active Configuration Reference

| Parameter | Current Value | Notes |
|---|---|---|
| **Vehicle Registration** | `MH 14 ML 3751` | Default plate displayed across Studio and Portal |
| **Telegram Chat ID** | `790475932` | Owner's private destination chat |
| **Telegram Call Handle** | `saambsadashiv_108` | Direct private call destination (`https://t.me/saambsadashiv_108`) |
| **Telegram Bot** | `@SmartVehicleQRBot` | Dispatches instant alerts and call notifications |
| **Decal Dimensions** | `75mm × 75mm (3" × 3")` | Optimal car windshield corner size |

---

## 🔒 Owner Telegram Privacy Checklist

To ensure incoming calls ring smoothly while keeping your phone number invisible:
1. **Phone Number**: *Settings → Privacy & Security → Phone Number* → Set to **"Nobody"**.
2. **Calls**: *Settings → Privacy & Security → Calls* → Set to **"Everybody"**.

---

## 📂 Repository File Index

```text
smart-vehicle-qr-portal/
├── .github/
│   └── workflows/
│       └── antigravity-agent.yml   # Cloud agent automation workflow
├── api/
│   ├── alert.js                    # Vercel serverless alert dispatcher
│   └── test-bot.js                 # Vercel serverless credential tester
├── test/
│   └── server.test.js              # Automated test suite (9 tests)
├── .env.example                    # Environment variable template
├── .gitignore                      # Prevents secrets/logs from being committed
├── index.html                      # Decal Studio & QR Code Generator
├── package.json                    # Project metadata & run scripts
├── PROJECT_TRACKER.md              # Project history & feature tracker
├── qrcode.min.js                   # Client-side vector QR code generator
├── README.md                       # Quick start & installation guide
├── scanner-portal.html             # Mobile scanner portal for finders
├── server.js                       # Native Node.js backend server
└── vercel.json                     # Vercel deployment configuration
```
