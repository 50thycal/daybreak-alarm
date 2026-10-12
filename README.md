# Daybreak

A gentler alarm clock: **quiet now, earn dismissal**. A calming sound starts the
morning; an optional short game, out-of-bed QR mission, and delayed check-in help
you complete your routine. Every feature has its own switch and settings.

## Status

- **Web:** implemented, production build and automated model/DOM integration tests pass.
- **iPhone:** Swift/AlarmKit companion source is included. It has not been compiled
  or tested on a real iPhone in this Linux workspace. Do not rely on it as your
  only alarm until the native checklist passes.
- **Repository:** public source is published at https://github.com/50thycal/daybreak-alarm.
- **Hosting:** live at https://daybreak-alarm.vercel.app in the existing `50cals-projects` Vercel team. Production deployment was verified Ready on October 11, 2026, and re-verified the same day through the Vercel API: the production alias serves the `main` build, byte-identical to a local `npm run build` (see `docs/HANDOFF.md`).
- **Privacy:** device-local records. No account, backend database, tracking scripts,
  or cloud sync. Web and native stores are separate; export/import transfers data.

## What is included

- Dark, responsive schedule screen with an interactive 24-hour dial, accessible
  time inputs, weekday selection, and planned time in bed. Drag a handle to change
  bedtime or wake time; drag the arc itself (or focus it and use the arrow keys:
  5 min, Shift ×3, Page Up/Down 1 h) to move both together and keep the duration.
- Five original sound presets: soft piano, synthesized birds, ocean/chimes,
  warm ambient, and ambient plus a device-spoken greeting.
- Adjustable audio level and ramp; preview every preset.
- Immediate quieting, a fixed mission window, configurable follow-up intervals
  and repeat limits, and optional limited snooze.
- Memory sequences, short arithmetic, and ordered-number games.
- Private QR generation, download/printing, and camera scanning. The browser QR
  decoder is bundled, so scanning does not need a server or native BarcodeDetector.
- Delayed check-in, optionally requiring the QR code again.
- Intentional skip that is recorded separately from completion.
- Built-in and named custom routine presets, independent feature switches.
- Optional morning alertness, pleasantness, stayed-up report, bedtime, interruptions.
- History and comparisons with settings snapshots. Practice sessions do not count
  toward routine effectiveness; missing self-reports do not count as failures.
- JSON/CSV export, validated JSON import, and deletion of device-local data.
- Installable PWA and offline asset caching, original application icon.
- Offline native interface, AlarmKit scheduling, persistent alarm mapping, prearmed
  backup alarms, custom Stop intent, camera scanning, iOS share/export and printing.

## Run the website

Node.js 22+ is required. The generated audio assets are committed; Python is only
needed if you want to regenerate them.

```sh
npm ci
npm run build
npm test
npm run dev
```

Visit `http://localhost:3000`.

To smoke-test a running site in a throwaway headless Chromium profile (UI, sleep
dial handle and whole-window dragging, all five sound previews, independent settings and persistence, practice math mission, QR
camera mission with a synthetic camera feed, insights, exports, service worker and
offline reload over HTTPS, CSP violations, and mobile widths):

```sh
npm i --no-save playwright && npx playwright install chromium
BASE_URL=https://daybreak-alarm.vercel.app/ npm run smoke
```

Playwright is intentionally not a project dependency, so deployments stay lean.

### Test the alarm in 15 seconds

On Tonight, tap **Test: ring in 15 seconds with this routine**. It schedules through
the same path as a real alarm (AlarmKit in the iPhone build) with your current
settings, shows a countdown, then rings and runs your routine. Test sessions are
labelled "Test" and excluded from trends and comparisons; CSV exports include a
`test` column. To protect a real alarm, the test refuses to run while one is armed.
In a browser, keep the tab open and in front: a locked iPhone or hidden tab can pause
browser timers, which is exactly what this test lets you observe.

Automated version, with real timers and audio in Chromium (two routines: simple
dismiss, and game → math mission → complete):

```sh
BASE_URL=https://daybreak-alarm.vercel.app/ npm run test:alarm
HEADED=1 BASE_URL=https://daybreak-alarm.vercel.app/ npm run test:alarm  # watch and hear it
``` The browser edition plays sound only while the page
is active and the browser allows audio. Screen wake lock is best effort. Installing
it on the Home Screen does **not** give it native alarm privileges. Keep Apple
Clock as a separate backup. Daybreak does not control Apple Clock alarms.

The Set/Arm button schedules the **next selected morning**, not an indefinite
recurrence. Arm the following morning from Tonight after your session. Day selection
chooses the next date; the native fixed date will not shift automatically if you
change timezone. Re-arm after travel or schedule changes.

## Publish the public repository and deploy

The public `50thycal/daybreak-alarm` GitHub repository is connected to the
`daybreak-alarm` project in Vercel's existing `50cals-projects` team. Production
branch: `main`. Framework: **Other**. Build command: `npm run build`. Output: `dist`.
No environment variables, database, or paid integrations are needed. `vercel.json`
includes content/security headers. Future pushes to `main` deploy automatically.

The native app is distributed separately through Xcode/TestFlight/App Store.
Deploying the website does not install the native app on an iPhone.

## Install the iPhone companion

Requires macOS, Xcode 26+, an iOS 26+ device, and XcodeGen. Install XcodeGen using
your preferred package manager, then:

```sh
npm ci
npm run ios:prepare
cd ios
xcodegen generate
open Daybreak.xcodeproj
```

In Xcode, choose your signing team and a unique bundle identifier. Select your
physical iPhone and run. Allow alarms and camera access when prompted. The app
bundles the same interface and all assets; no internet is required to sound a
scheduled native alarm or complete its mission. No widget extension is needed:
this version schedules fixed alarms rather than AlarmKit countdown presentations.

The native Stop button stops the current system alert and opens the mission.
Follow-up alarms remain armed until the mission state cancels/reschedules them.
Users can revoke permissions, delete the app, or power off the phone; the routine
is deliberately not an unbypassable lockout.

## Sound behavior

All WAV files are generated from the repository's original synthesis script, not
copied from Apple's Clock app or downloaded recordings. They are mono PCM LE16,
22050 Hz, 28 seconds. Native ramps are baked into a per-alarm file in Library/Sounds
and restart when that sound repeats. System volume remains relevant; this does
not override iOS volume policy. A 45-second ramp cannot continue seamlessly across
native sound-file loops, so verify actual behavior on device. The spoken greeting
uses the device's speech synthesizer only in the foreground; the background preset
falls back to the ambient track.

```sh
npm run sounds
```

## Structure

| Path | Purpose |
| --- | --- |
| `web/` | Interface, style, original sound assets, offline worker |
| `src/model.js` | Pure configuration, scheduling and wake-up transitions |
| `src/storage.js` | Versioned local records and import/export validation |
| `ios/Daybreak/` | Native AlarmKit and trusted local web bridge |
| `tests/` | Model, storage, DOM flow and QR interoperability tests |
| `docs/` | Product plan, device verification and project handoff |

## Verification limits

The automated suite covers lifecycle rules and DOM wiring, including QR encoder/
decoder interoperability. It does not prove camera permissions, audible delivery,
locked-screen behavior, OS dismissal actions, or offline PWA installation on a
physical iPhone. On October 11, 2026, live desktop Chrome verification confirmed
the schedule/routine/insights UI, piano preview and practice audio playback indicators,
independent check-in configuration, settings persistence after reload, immediate
quieting, a timed arithmetic mission, and a completed practice journal record excluded
from effectiveness totals. A follow-up headless Chromium run of `npm run smoke` against
the production build (served locally with the same `vercel.json` headers, because the
build container could not reach `*.vercel.app` directly) passed all 40 checks,
including all five previews, a camera-scanned QR mission from a synthetic video feed,
service-worker offline reload, zero CSP violations, and 320–1600 px layouts.
Speaker audibility/quality, real-camera scanning, physical-iPhone PWA/offline
behavior, and native delivery remain device checks.
Run the real-device checklist in `docs/DEVICE_TESTING.md` before trusting alarms.

MIT licensed. Dependencies retain their own licenses. Private morning data must
never be committed into this public repository.
