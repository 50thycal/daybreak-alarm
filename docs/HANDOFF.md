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

The connected Vercel API still denied team access with a scope 403. The local CLI
could not resolve Vercel from the restricted shell. Chrome's existing GitHub sign-in
succeeded, and browser import/deployment completed in the intended team. Do not
treat the connector's access error as a failure of the verified browser deployment.

The five original WAV assets and both PNG icons are included. The prior production
build, 26 model/storage/DOM/QR interoperability tests, and production dependency
audit (zero vulnerabilities) are recorded from implementation verification.

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
