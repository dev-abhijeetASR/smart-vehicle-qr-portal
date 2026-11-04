# DIY Smart Vehicle Emergency QR Decal & Scanner Portal

> 🚗 **100% Privacy-Protected Vehicle Emergency QR Decal & Scanner Portal (CallMyOwner Alternative)**  
> Allows anyone to contact the vehicle owner in emergencies (blocking vehicle, lights on, open window, towing) **without revealing the owner's personal phone number**.

---

## 🔍 What Problem Does This Solve?

In parking lots, residential driveways, and commercial spaces, vehicles frequently block others, leave hazard lights on, or leave windows cracked. Writing your personal phone number on a dashboard slip exposes your personal contact to spammers, marketers, and stalkers.

Commercial products like **CallMyOwner** solve this with a QR sticker, but charge recurring subscriptions. **Smart Vehicle QR Portal** provides a completely free, open-source, customizable alternative that you can run locally, host for free on Vercel/GitHub Pages, or use directly with zero servers.

---

## 🛠️ Included Tools & Architecture

| File | Purpose |
|---|---|
| [`index.html`](./index.html) | **Decal Studio & Generator**: Live preview, color themes (Caution Yellow, Stealth Dark, Clean White, Alert Red, Green), mirror/reverse print mode, and PNG decal export. |
| [`scanner-portal.html`](./scanner-portal.html) | **Scanner Landing Page**: The mobile web interface seen when scanning the QR code. Includes 1-tap alerts, quick note chips, optional callback number, and real-time owner response tracking. |
| [`server.js`](./server.js) | **Native Node.js Server**: Zero external dependencies. Handles rate limiting, Telegram dispatch with HTML formatting, status polling, and webhook two-way replies. |
| [`api/`](./api/) | **Vercel Serverless Functions**: Full cloud deployment support for `/api/alert`, `/api/status`, `/api/info`, `/api/test-bot`, and `/api/telegram-webhook`. |
| [`qrcode.min.js`](./qrcode.min.js) | Standalone client-side QR code generation engine. |

---

## 🚀 Setup Options: Choose Your Privacy Level

### Option A: 100% Privacy Protected via Telegram (Recommended)
Your phone number is **never** revealed to the scanner. When someone scans and taps an alert, a message instantly arrives on your Telegram with 1-tap reply buttons that appear live on the scanner's phone screen.

1. **Create a Free Telegram Bot (1 minute)**:
   - Open Telegram and search for `@BotFather`.
   - Send `/newbot`, choose a display name (e.g. `MyCarAlertBot`), and a username ending in `bot`.
   - Copy the **HTTP API Token** (e.g. `7912345678:AAHk_...`).
2. **Get your Chat ID**:
   - Message `@userinfobot` on Telegram to get your numeric ID (e.g. `790475932`).
   - Send `/start` to your newly created bot.
3. **Run or Deploy**:
   - **Local / Self-hosted**:
     ```bash
     npm start
     # Opens http://localhost:3000
     ```
   - **Vercel / Cloud**:
     Deploy using Vercel CLI or connect your GitHub repository. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as environment variables.
   - **GitHub Pages**:
     Host `scanner-portal.html` statically. Enter your Bot Token and Chat ID in the studio to generate the decal.
4. **Generate & Print Decal**:
   - Open [`index.html`](./index.html) in your browser.
   - Enter your vehicle registration number.
   - Click **Save Decal (PNG)** or **Print Decal**!

---

### Option B: Zero-Server WhatsApp Direct (5 Minutes, No Hosting)
If you prefer not to host any server or bot, and don't mind the person seeing your phone number when they initiate a chat:

1. Open [`index.html`](./index.html) and click the **💬 WhatsApp Direct** tab.
2. Enter your mobile number with country code (e.g., `919876543210` for India, no spaces or `+`).
3. Customize your pre-filled message (e.g., *"Hi! I am near your vehicle [MH 14 ML 3751]. Please check / move your car."*).
4. Click **Download PNG** or **Print Decal**!

---

## 🖨️ Printing & Windshield Mounting Guide

To ensure your decal lasts through heat, car washes, and rain:
* **Standard Size**: **75mm × 75mm (approx 3" × 3")** is standard for car windshield corners.
* **Mounting Options**:
  - **Inside Glass Mount (Best Protection)**:
    - Check the **"🪞 Mirror / Reverse Print"** checkbox in the Studio.
    - Print on **Clear Transparent Vinyl Sticker film (Reverse Print)**.
    - Stick it from the *inside* of your windshield glass. It will be 100% protected against wipers, UV degradation, car washes, and rain, while reading perfectly from the outside.
  - **Outside Mount**:
    - Print on **Weatherproof Gloss Vinyl Sticker sheet** with UV laminate film.
* **Placement**: Bottom passenger-side corner of the front windshield or driver-side quarter glass.

---

## 📡 API Reference

When running `server.js` or deploying to Vercel:

| Endpoint | Method | Description |
|---|---|---|
| `/api/info` | `GET` | Health check and server configuration status |
| `/api/alert` | `POST` | Dispatches rate-limited emergency notification to owner's Telegram |
| `/api/status?id=:id` | `GET` | Scanner polling endpoint to check if owner tapped a reply |
| `/api/telegram-webhook` | `POST` | Receives inline button tap callbacks from owner's Telegram app |
| `/api/test-bot` | `POST` | Validates bot token & chat ID by sending a test alert |

---

## 🧪 Automated Testing

Run the built-in test suite (using Node.js native test runner, zero npm dependencies required):

```bash
npm test
```

Tests cover:
* Path traversal security & containment checks
* Static asset serving with security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
* Telegram HTML sanitization and entity escaping
* Anti-spam rate limiting
* Status polling and owner reply delivery

---

## 📄 License

MIT License. Free for personal and commercial vehicle use.
