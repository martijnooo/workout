# 💪 Workout Tracker

A simple, fast, offline-capable workout tracker. Pick exercises, log weight &
reps, save your workouts, and get an adjustable rest timer between sets. All
data lives in your browser (localStorage) — no accounts, no server.

## Features

- **Pick exercises** from a built-in library (20+ common lifts) or create your
  own on the fly. Manage the library in the **Exercises** tab.
- **Track weight & reps** per set. Add or remove sets freely, and tick each set
  off as you complete it.
- **Smart prefill** — when you add an exercise, the last time you did it is
  loaded as placeholder values (and shown as a `Last: …` hint), so you can just
  confirm or nudge the numbers. Empty checked-off sets auto-fill from last time.
- **Save workouts** — hit **Finish** and the session is stored in **History**
  with total sets, volume, and duration. Tap any entry to expand the details.
- **Adjustable rest timer** between sets:
  - Auto-starts when you check off a set (toggleable).
  - Adjust on the fly with **−15s / +15s**, or **Skip**.
  - Tap the countdown to change the default duration, presets (30s–3:00),
    beep on/off, and auto-start on/off.
  - Beeps + vibrates (where supported) when time's up.
- **Mobility & stretching** (GoWod-style) in its own **Mobility** tab — instead
  of fixed routines, you build a session on demand:
  - **Pick a length** (5–20 min) and an optional **focus area** (hips,
    shoulders, upper back, hamstrings, ankles, wrists, neck, or full body).
  - The app **auto-generates a fresh, varied session** that fills the time from
    a large move pool — a different mix every time. With a focus area, ~2 of
    every 3 moves come from that area, the rest complementary.
  - **Hands-free guided player** with a per-move countdown ring that
    auto-advances, beeps + vibrates between moves, and runs left/right sides
    automatically. Pause, skip, go back, restart a move, or add 15s.
  - **Every move is explained** — the player shows a quick how-to cue plus a
    plain-language note on what the stretch targets and why it helps.
  - **Streak tracking** — completed sessions build a day streak and are counted
    per week and in total, and sync to Google Drive alongside your workouts.
- **Works offline** and is installable as a PWA (Add to Home Screen).

## Running it

It's a static site — no build step. Open `index.html` directly, or serve the
folder:

```bash
# Python
python3 -m http.server 8000
# then visit http://localhost:8000

# or Node
npx serve .
```

> Serving over `http://localhost` (rather than `file://`) is recommended so the
> service worker / offline install works.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup and modals |
| `styles.css` | Styling (dark, mobile-first) |
| `app.js` | All app logic + localStorage persistence |
| `manifest.webmanifest`, `icon.svg`, `sw.js` | PWA / offline support |

## Data & privacy

Everything is stored locally in your browser under the `wt.*` localStorage keys.
Clearing site data (or using a different browser/device) starts you fresh.
