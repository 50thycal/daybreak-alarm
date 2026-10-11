# Publishing status

The complete source is published in the public repository:
https://github.com/50thycal/daybreak-alarm

The five original WAV assets and both PNG icons are included.
The production build and 26 automated model/storage/DOM tests passed.

## Vercel continuation

Target: project `daybreak-alarm` in the existing `50cals-projects` team
(`team_8lGVtLaYL34zI4Nzzc8SKSyF`). Do not switch accounts to bypass permissions.

The connected API denied project creation in this team (403). Browser sign-in
briefly displayed the correct account and repository, but clicking Import
returned the session to the sign-up screen. A fresh Vercel page showed signed out.
No project or live deployment is verified.

1. Complete Vercel sign-in and import `50thycal/daybreak-alarm`.
2. Select framework Other, build `npm run build`, output `dist`, branch `main`.
3. No environment variables, database, or paid integrations are needed.
4. Deploy, wait for Ready, then verify the production URL and practice mission.
5. Verify native compilation and physical-device behavior separately using
   `DEVICE_TESTING.md`. Website publishing is not a native alarm release.

No credentials, private sleep records, browser state, or user screenshot are
included in this public repository.
