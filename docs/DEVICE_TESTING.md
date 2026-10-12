# Native release gate

Native code is implementation source, not a verified iPhone release. The following
checks require macOS/Xcode and a physical iPhone. Record device, iOS build, Xcode
version, outcome, and any native logs without exporting personal data.

1. Build with Xcode 26+ and a real signing team. Resolve all compile errors against
   the installed SDK; do not silently remove alarm functionality to make it build.
2. Alarm authorization: deny permission, then authorize in Settings. Failed
   scheduling must show an error and must never display a successful armed state.
3. Schedule an alarm two minutes ahead. Lock the phone and enable Silent/Focus.
   Confirm actual audio and the system Stop action. Test offline and force-closed.
   For quick repeat runs, Tonight → "Test: ring in 15 seconds with this routine"
   schedules a real AlarmKit alarm (with its follow-ups) using the current settings;
   lock the phone right after tapping it. Test sessions are labelled and never count
   toward trends. It refuses to run while a real alarm is armed, because scheduling
   replaces the armed suite.
4. Quiet once: current audio stops immediately, the mission opens, a follow-up
   stays armed, and repeated Quiet taps cannot extend the mission deadline.
5. Complete memory, math, and ordered-number missions independently. Combine a
   game and QR: neither alone should cancel the remaining alarms.
6. Abandon the mission, force-close during the quiet window, and let all follow-up
   intervals expire. Confirm the repeat limit and correct recorded ordinal.
7. Enable delayed check-in. Complete the mission, leave the app, ignore check-in.
   Confirm the native backup sounds. Confirm an on-time check-in cancels it.
8. Disable follow-ups: an unfinished mission is recorded as expired, and there is
   no secretly scheduled follow-up. Disable every challenge: Quiet dismisses normally.
9. Snooze: confirm the duration and limit, including native force-close behavior.
10. Skip: all alarms belonging to the current session are cancelled, with no
    accidental success. Settings for a later morning are preserved.
11. Test QR permission denial, camera cancellation, wrong QR, correct QR, and
    scanner availability. Confirm no camera frames leave the device.
12. Export JSON/CSV and QR PNG via the iOS share sheet, print the QR, import an
    export, and delete records. Confirm scheduled alarms are cancelled on import/delete.
13. Restart the app during each lifecycle state. Confirm persistent event
    delivery, no duplicated session, and correct current settings snapshot.
14. Adjust native sound level/ramp and verify the audible per-loop ramp behavior;
    test system volume, Bluetooth routing, speaker, and simultaneous system alarms.
15. Test timezone/DST changes; re-arm the fixed next-morning schedule after travel.
16. On the web: responsive layout on narrow iPhone and desktop, keyboard navigation,
    SVG dragging, camera access over HTTPS, PWA install/offline cache, audio permission,
    reduced motion and large text. Browser alarms are never marketed as reliable
    background iPhone alarms.

Release only after the locked-screen alarm → quiet → mission → cancellation path
passes on the target device, including failure and abandoned-session paths.
