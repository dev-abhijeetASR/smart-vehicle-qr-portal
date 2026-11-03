# DIY Smart Vehicle QR Decal (CallMyOwner Alternative)

This project allows you to create your own **100% Privacy-Protected Vehicle Emergency QR Code Sticker** just like commercial products such as **CallMyOwner**.

---

## 🔍 What is the Amazon Product (CallMyOwner)?

The Amazon product you referenced (`amzn.in/d/0a8qtO7m`) is the **CallMyOwner QR Vehicle Sticker**:
* **The Problem It Solves**: In crowded parking lots or public spaces, people often block other vehicles, leave lights on, or leave windows cracked. Writing your personal phone number on a paper slip exposes your phone number to stalkers, spammers, and marketers.
* **How It Works**:
  1. A weatherproof vinyl QR decal is affixed to the vehicle windshield.
  2. A finder/driver blocked by your car scans the QR code using any smartphone camera.
  3. The finder is taken to a web page where they can notify you or request a call.
  4. **Privacy Protection**: The owner's personal phone number is completely masked/hidden. The call or message is relayed through a virtual gateway or app notification.

---

## 🛠️ What We Built For You

In this workspace directory (`C:\Users\abhij\.gemini\antigravity\scratch\vehicle-qr-sticker`), you have two complete, ready-to-run tools:

| File | Purpose |
|---|---|
| [`index.html`](file:///C:/Users/abhij/.gemini/antigravity/scratch/vehicle-qr-sticker/index.html) | **Decal Studio & Generator**: Live preview, color themes (Caution Yellow, Stealth Dark, White, Alert Red), QR rendering, and print-ready decal layout. |
| [`scanner-portal.html`](file:///C:/Users/abhij/.gemini/antigravity/scratch/vehicle-qr-sticker/scanner-portal.html) | **Scanner Landing Page**: The mobile web interface the finder sees when they scan the QR code. Includes 1-tap alerts (*"Car blocking my way"*, *"Lights on"*, *"Window open"*, *"Towing alert"*). |
| [`qrcode.min.js`](file:///C:/Users/abhij/.gemini/antigravity/scratch/vehicle-qr-sticker/qrcode.min.js) | Offline JavaScript QR code rendering engine. |

---

## 🚀 Setup Options: Choose Your Privacy Level

### Option A: 100% Privacy Protected via Telegram (Recommended & Free)
Your phone number is **never** shown to the scanner. When someone scans and taps an alert, a message instantly arrives on your Telegram.

1. **Create a Free Telegram Bot (takes 1 minute)**:
   - Open Telegram and search for `@BotFather`.
   - Send `/newbot`, give it a name (e.g., `MyCarAlertBot`), and pick a username.
   - Copy the **Bot Token** (e.g., `7123456789:AA...`).
2. **Get your Chat ID**:
   - Message `@userinfobot` on Telegram to get your numeric ID (e.g. `123456789`).
   - Send `/start` to your newly created bot.
3. **Deploy the Scanner Portal**:
   - Upload `scanner-portal.html` to **GitHub Pages**, **Vercel**, or **Netlify** (all free).
4. **Generate Your Sticker**:
   - Open `index.html` in your browser.
   - Enter your vehicle registration number.
   - In **Portal Base URL**, paste your hosted portal URL.
   - Enter your Bot Token and Chat ID.
   - Click **Print Decal Sticker**!

---

### Option B: Zero-Server WhatsApp Direct (5 Minutes, No Hosting)
If you don't mind the person seeing your phone number when they initiate a chat:
1. Open `index.html` and switch to the **Direct WhatsApp** tab.
2. Enter your mobile number with country code (e.g., `919876543210`).
3. The QR code will automatically generate a direct WhatsApp link that pre-fills:
   > *"Hi! I am near your vehicle [DL 01 AB 1234]. Please check / move your car."*
4. Click **Print Decal Sticker**!

---

## 🖨️ Printing & Windshield Mounting Guide

To ensure your decal lasts in heat and rain:
* **Dimensions**: 75mm x 75mm (approx 3" x 3") is standard for car corner windshields.
* **Paper Type**:
  - **Option 1 (Inside Glass Mount - Best)**: Print on **Clear Transparent Vinyl Sticker film (Reverse / Mirror Print)**. Stick it from the *inside* of the windshield. It is 100% protected from car washes, rain, wipers, and sun fading.
  - **Option 2 (Outside Mount)**: Print on **Weatherproof Gloss Vinyl Sticker sheet** with UV laminate.
* **Position**: Bottom passenger-side corner of the front windshield or driver-side quarter glass.
