# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Daily Backup and Restore

This project now includes database backup APIs and an admin UI section in Settings.

### 1. Create backup table in Supabase

Run the SQL in `scripts/sql/system_backups.sql` in the Supabase SQL editor.

### 2. Configure cron secret

Add `BACKUP_CRON_SECRET` in Vercel project environment variables.

### 3. Automatic daily backup

`vercel.json` schedules `/api/backups/cron` at `0 2 * * *` (daily at 02:00 UTC).

### 4. Manual backup and restore

Admin users can:
- Open Settings -> Backup & Restore
- Click `Create Backup Now`
- Restore any listed snapshot using `Restore`

Restore replaces current `occupancy`, `stay_history`, and `meal_exclusions` with the selected snapshot.
