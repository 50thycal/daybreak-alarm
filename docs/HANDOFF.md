# Publishing handoff

Intended destinations: public GitHub repository `50thycal/daybreak-alarm` and
Vercel project `daybreak-alarm` in the user's existing `50cals-projects` account.
Account/team ID observed from existing projects: `team_8lGVtLaYL34zI4Nzzc8SKSyF`.

No remote GitHub repository has been created and no Vercel deployment is live.

## Blockers observed

- The connected Vercel API returned 403 for creation in the existing team:
  "Not authorized: Trying to access resource under scope 50cals-projects."
- Vercel CLI 63.1.2 was installed through npm exec as the documented fallback.
  It had no credentials and opened device authorization. Account authorization
  must complete before project creation/deployment. Do not change to a different
  account/team to bypass the error.
- The connected GitHub tools can write commits/files, but expose no repository
  creation endpoint. A browser fallback or user-created empty public repository
  is needed before pushing reviewed source.

## Continue

1. Obtain authorized GitHub repository creation (browser) or verify the user has
   created the empty public repository. Confirm owner and visibility.
2. Push the local main commit using an authorized git transport, or the connected
   GitHub file/tree/commit tools. Inspect the remote before replacing any files.
3. After Vercel authorization, create/link the project to that repository in the
   existing team; use framework Other, `npm run build`, `dist`, production branch main.
4. Deploy the exact reviewed commit to production, poll its terminal status, and
   verify the resulting URL. Do not label an attempted/queued deploy as successful.
5. Run native build/device verification separately. Website deployment is not a
   native alarm release.

No secrets, private records, browser state, or user-uploaded screenshot are included
in the source tree. The sound assets are original generated PCM WAV files.
