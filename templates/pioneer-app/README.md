# Pioneer App Template

Copy this directory into `apps/<app>/`, then replace placeholder names and selectors.

Required follow-up:

- Register the app in `config/apps.ts`.
- Add app URL variables to `.env.example`.
- Add a smoke command or documentation entry to `README.md`.
- Run `yarn ts` and `npx playwright test apps/<app>/flows/smoke.spec.ts --list`.
- Run the smoke test locally and inspect artifacts.
