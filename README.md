# Daybreak

A gentler alarm clock: **quiet now, earn dismissal**. A calming sound starts the
morning; an optional short game, out-of-bed QR mission, and delayed check-in help
you complete your routine. Every feature has its own switch and settings.

## Status

- **Web:** implemented, production build and automated model/DOM integration tests pass.
- **iPhone:** Swift/AlarmKit companion source is included. It has not been compiled
  or tested on a real iPhone in this Linux workspace. Do not rely on it as your
  only alarm until the native checklist passes.
- **Hosting:** ready for Vercel. Publication requires an authorized Vercel connection.
- **Privacy:** device-local records. No account, backend database, tracking scripts,
  or cloud sync. Web and native stores are separate; export/import transfers data.

## What is included

- Dark, responsive schedule screen with an interactive 24-hour dial, accessible
  time inputs, weekday selection, and planned time in bed.
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

Visit `http://localhost:3000`. The browser edition plays sound only while the page
is active and the browser allows audio. Screen wake lock is best effort. Installing
it on the Home Screen does **not** give it native alarm privileges. Keep Apple
Clock as a separate backup. Daybreak does not control Apple Clock alarms.

The Set/Arm button schedules the **next selected morning**, not an indefinite
recurrence. Arm the following morning from Tonight after your session. Day selection
chooses the next date; the native fixed date will not shift automatically if you
change timezone. Re-arm after travel or schedule changes.

## Publish the public repository and deploy

Create an empty public `50thycal/daybreak-alarm` GitHub repository, then push the
reviewed source. Import that repository into the intended Vercel team. Select
framework **Other**, build command `npm run build`, output directory `dist`.
No environment variables, database, or paid integrations are needed. `vercel.json`
includes content/security headers. Vercel will deploy future pushes automatically
after Git integration is connected.

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
physical iPhone. A visual browser pass was unavailable in the managed environment.
Run the real-device checklist in `docs/DEVICE_TESTING.md` before trusting alarms.

MIT licensed. Dependencies retain their own licenses. Private morning data must
never be committed into this public repository.
