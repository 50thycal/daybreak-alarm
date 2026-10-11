# Publishing status

The complete source is published in the public, MIT-licensed repository:
https://github.com/50thycal/daybreak-alarm

Production website: https://daybreak-alarm.vercel.app
Vercel project: https://vercel.com/50cals-projects/daybreak-alarm

## Verified deployment — October 11, 2026

- Team: existing `50cals-projects` (`team_8lGVtLaYL34zI4Nzzc8SKSyF`).
- Account: `50thycal`; no alternate account or team was used.
- Project: `daybreak-alarm`; Git integration: `50thycal/daybreak-alarm`.
- Production branch: `main`.
- Framework: Other; build: `npm run build`; output: `dist`.
- No environment variables, database, or paid integrations were added.
- Initial production deployment: `dpl_BfREXdNLaAimVTVfGN8BNT8CtLyU`.
- Initial deployed commit: `d3a95a7a4743a13806bcd07559d117ec7127d2f9`.
- Immutable deployment URL: https://daybreak-alarm-bqcb2dg9j-50cals-projects.vercel.app
- Vercel's Production Deployment panel showed Ready and the production domain.
- The production domain rendered the actual Daybreak UI in desktop Chrome.

During the initial deployment, the connected Vercel API denied team access with a
scope 403 and the local CLI could not reach Vercel, so the project was imported in
the browser. That 403 no longer occurs: in the re-verification below the connector
read the team's project, deployments, alias, and build logs.

The five original WAV assets and both PNG icons are included. The prior production
build, 26 model/storage/DOM/QR interoperability tests, and production dependency
audit (zero vulnerabilities) are recorded from implementation verification.

## Re-verification through the Vercel API — October 11, 2026

Read-only checks with the Vercel connector, scoped to `team_8lGVtLaYL34zI4Nzzc8SKSyF`:

- Project `prj_ZdQeUfjIGz5QgEiWtsAW6XpPzgFd` (`daybreak-alarm`), framework Other,
  domains `daybreak-alarm.vercel.app`, `daybreak-alarm-50cals-projects.vercel.app`,
  `daybreak-alarm-git-main-50cals-projects.vercel.app`.
- Three production deployments, all READY, all created by `50thycal` from `main`:
  `dpl_BfREXdNLaAimVTVfGN8BNT8CtLyU` (`d3a95a7`), `dpl_4MsWQRYd9gZ8mnbUuaNwWeMC5gPh`
  (`6f25808`), `dpl_CyZwFjcu4Zm6RwtBui3PFvtt3QeE` (`178814a`).
- Alias `daybreak-alarm.vercel.app` → `dpl_CyZwFjcu4Zm6RwtBui3PFvtt3QeE`
  (https://daybreak-alarm-ivi09ofus-50cals-projects.vercel.app).
- Build log: clone `main@178814a`, `npm run build` (`node scripts/build.mjs`), output
  `dist`, "Deployment completed". No environment variables were involved.
- The production domain returned HTTP 200 with every `vercel.json` security header.
  Vercel ETags (content MD5) matched a local `npm run build` of `178814a` exactly:
  `index.html` `950f27b2…`, `app.js` `3b1fb233…` (200,731 bytes, also byte-compared),
  `style.css` `4193c257…`, `sw.js` `b8e13a24…`, `manifest.json` `4d0c8fa1…`,
  `sounds/piano.wav` `097a8bc8…` (1,234,844 bytes, `audio/wave`).
- Deployment Protection is Standard (`all_except_custom_domains`): generated
  deployment and preview URLs require Vercel sign-in, and project domains such as
  `daybreak-alarm.vercel.app` do not. Content was fetched through the connector's
  temporary protection-bypass link, so confirm anonymous access once in a private
  browser window.

Because the production files equal the local build, `npm run smoke` ran against that
build served with the same `vercel.json` headers over HTTPS. (The build container's
network policy blocked direct requests to `*.vercel.app`.) Headless Chromium: 40/40
checks passed, covering every tab, previews of all five presets with playback
advancing and stopping after 8 s, independent settings persisting after reload, a
saved custom preset, practice ringing → immediate quiet → math mission with a retry
hint and the 10 s engagement time → complete, practice excluded from Insights,
JSON/CSV export, service worker activation and offline reload, a QR mission completed
by scanning the saved code from a synthetic camera feed, zero CSP violations or
console errors, and no horizontal overflow at mobile width. Unit/DOM suite: 26/26.
Production dependency audit: 0 vulnerabilities.

The same pass caught two layout defects, now fixed in `web/style.css`:
- Fixed-width time inputs cut off "PM"/"AM" at every viewport width. Inputs now size
  to their content with a viewport-scaled font and fit from 320 to 1600 px.
- `.text-link` buttons, such as "Save current", showed the browser's grey button
  background.
They reach production when the change merges to `main`, which redeploys automatically.

The "Ambient + greeting" preset reuses the ambient bed (`voice.wav` is identical to
`ambient.wav`) and adds a device-spoken greeting in the foreground, as documented.

## Live browser smoke test

On the production domain in desktop Chrome:

1. Tonight, Routine, and Insights rendered.
2. Piano preview showed the preview message and Chrome's audio-playing indicator.
3. Changed the game to Morning math and engagement time to 10 seconds.
4. Disabled delayed check-in independently; game and follow-ups stayed enabled.
5. Reloaded: the game, duration, and check-in settings persisted.
6. Started a Practice session; Chrome showed Audio playing.
7. Quiet opened the timed mission; the audio-playing indicator disappeared.
8. Solved all three arithmetic questions; the routine showed complete.
9. Insights showed one completed Practice journal entry, zero real mornings,
   and no practice contribution to routine-effectiveness totals.

These are UI/playback-state checks, not a physical speaker audibility or sound
quality measurement. Browser testing used local test settings and a Practice
record; no real sleep records, exports, credentials, browser state, or private
user screenshots were committed.

## Remaining verification

- Every feature remains independently configurable. Test one routine change at
  a time when comparing real mornings.
- Native companion source has not been compiled or tested on an iPhone.
  Follow `DEVICE_TESTING.md` with macOS, Xcode 26+, signing, and a physical device.
- Verify camera scanning, mobile layout/accessibility, PWA installation/offline,
  audio routing, and native locked-screen delivery on the target devices.
- Browser alarms require an active page and permitted audio. They cannot reliably
  wake a locked iPhone or control Apple Clock. Keep a separate backup alarm.
- Arming schedules the next selected morning, not indefinite recurrence.
  Re-arm after each morning and timezone/schedule changes.
- Records are device-local; no cloud sync or sleep-stage detection.

Pushes to `main` automatically create new production deployments. Documentation
updates after this smoke test do not change application code; the immutable URL
above identifies the exact build that was tested.
