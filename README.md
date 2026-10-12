# forkcast

Mobile-first Indonesian food logging PWA. The existing dashboard design is preserved. Meals can be entered manually, saved to a signed-in account when Supabase is configured, or prepared from photo candidates when Gemini is configured.

## What works

- Search the example food catalog by Indonesian name or alias. Add multiple items, change serving unit and quantity, set meal type and local date/time, review calories and macros, then save to the correct dashboard day and group.
- Nutrition totals are calculated only from stored per-100 g values and selected grams. Each meal item stores its nutrition snapshot, source label, and calculation basis. AI never supplies calorie totals.
- Local demo mode remains available without environment variables. It keeps meals, saved combinations, profile, target history, and weight entries in this browser.
- With Supabase configured, email/password sign-up, sign-in, recovery, and the existing magic-link option load private profiles, meals, items, saved combinations, target history, and weight entries. Demo and account data stay separate; an eligible new account can import demo data once.
- With Gemini configured, the server analyzes a compressed JPEG/PNG/WebP photo and returns candidate foods, approximate gram ranges, confidence, and a follow-up question. The user must review and confirm suggestions before saving. Unmatched foods require a comparable catalog choice or an explicit decision to omit them.
- Personal Meal Memory lets users create, edit, delete, search, and reuse saved combinations. Recent foods use actual logged meal times; frequent foods count item occurrences in the last 30 days. Photo corrections are retained as private structured choices and offered only for exact normalized candidate or alias matches. Every reused suggestion requires review before logging.
- Weekly summary in **Progres** shows Monday–Sunday meal counts, recorded calorie and macro averages, historical target comparisons, weight entries, and descriptive insights. Days without logs remain missing rather than zero.
- Installable PWA shell, offline fallback, basic empty/error states, and an account-data erase action.

The 12 food records are **illustrative demo values**, not verified composition data. Prepared dishes vary by recipe and oil use. The calorie target is an estimate, not medical advice.

## Personal Meal Memory rules

- **Recent foods** show each food's most recently logged portion, ordered by the meal's recorded eating time. **Frequent foods** count diary item occurrences during the preceding 30 days, ordered by count, then most recent use. Deleting a diary meal removes it from these lists. No health or goal score is used.
- Saved combinations keep item and nutrition snapshots. Selecting one opens the existing editor for date, meal type, and portion review. Changing or deleting a combination never changes diary entries already saved from it.
- After a confirmed photo review, a changed food or serving can be stored as a private structured correction. Later photo reviews offer a prior correction or saved combination only when the normalized candidate text exactly matches its recorded candidate, alias, or saved name. The user must accept the suggestion and confirm the review; nothing is logged automatically. Forkcast does not train Gemini on these records or send the meal history with the photo.
- The local demo stores these records in this browser. Signed-in records are scoped to the authenticated user by Supabase RLS. The app currently loads the 200 newest corrections for matching.

## Weekly summary rules

- The week runs Monday–Sunday using local calendar dates. The app has no stored timezone preference, so the summary defaults to **Asia/Makassar (UTC+08:00)**. Existing diary `local_date` and weight `entry_date` fields are used as recorded; older entries created while the device used another timezone are not rewritten.
- A logged day has at least one diary meal. Future dates are excluded. Daily calories and each macro come from the diary item snapshots. If any item lacks a valid value for a nutrient, that entire day is excluded from that nutrient's average and the summary marks the data incomplete. A meal with no items is also incomplete. Valid recorded zero values remain zero.
- Averages use only days with complete data for that nutrient; the UI shows each denominator. Displayed calories are rounded to whole kilocalories and macros to one decimal gram. No unlogged day is added as zero.
- A target is comparable only if a target-history record was effective before the end of that local date. The newest such record is used; the current profile target is never backfilled into earlier dates. The UI shows below, equal, or above counts only for days with complete calories and an active target. Insight comparisons require at least two comparable days.
- Weight differences use the earliest and latest valid weight records within the selected week, with their dates shown. A single weight record has no inferred change. Insights are deterministic descriptions of these aggregates; Gemini is not used.
- The summary reuses the current user's already loaded meal, target, and weight records. Signed-in records remain protected by the existing Supabase RLS policies; no new table, migration, API key, or dashboard step is needed for MVP 4.

## Local development

Requires Node.js 20 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. On Windows PowerShell where `npm.ps1` is disabled, use `npm.cmd`. Leave all variables blank for demo mode.

The PWA, iOS home screen, and favicon use [`assets/Forkcast-Concept-03-500x500.png`](assets/Forkcast-Concept-03-500x500.png). Run `npm run icons` after replacing this source image to regenerate the PNG exports.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Supabase setup

For production deployment, also read [the Supabase and Vercel guide](docs/deploy-vercel.md). No migration was applied to your Supabase project by this repository change. The PostgreSQL password in the earlier connection-string example was a placeholder and is not used by the app.

1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project and **SQL Editor**. Run [the initial migration](supabase/migrations/20261011000100_food_tracker.sql) first if it has not already been applied, then [the account and target migration](supabase/migrations/20261011000200_accounts_targets.sql) if needed. Finally run [the Personal Meal Memory migration](supabase/migrations/20261012000100_personal_meal_memory.sql) once. The third migration extends the existing saved-meal table and creates private food-correction records with owner-only RLS.
2. In **Authentication -> Providers -> Email**, enable the Email provider. In **Authentication -> URL Configuration** (separate from the Email provider panel), set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/**` as a Redirect URL. Also add the production HTTPS origin and redirect pattern before deploying. Email confirmation, password recovery, and magic links must redirect to the app.
3. In **Connect** or **Project Settings -> API Keys**, copy the Project URL and publishable key into local `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A legacy anon key may use `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put a service-role or secret key in a `NEXT_PUBLIC_` variable.
4. Restart the local server (`npm.cmd run dev` in PowerShell). In **Profil & target**, register or sign in. Save the profile, review the suggested or manual target, and save a target entry. A new account with local demo data can explicitly use **Impor data demo**; the local copy is retained. If you use email confirmation, follow the message before signing in.
5. For a disposable local Supabase database, run [the RLS regression script](supabase/tests/20261011_user_isolation.sql) after all three migrations. It checks cross-user access to profiles, meals, meal items, saved meals, corrections, target history, and weight history. Do not run it against production; it inserts temporary Auth users inside a rolled-back transaction.

The browser uses the publishable key with the signed-in user's session; PostgreSQL RLS enforces ownership. The profile and target save functions run as the signed-in database role, so RLS still applies. No service-role key is required. See [Supabase's Auth guide](https://supabase.com/docs/guides/auth/passwords) and [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Gemini setup

1. In [Google AI Studio](https://aistudio.google.com/), open **Dashboard → API Keys** and create or select a Gemini API key in your project. Check that Gemini API access and quota are available.
2. Put the key in `.env.local` as `GEMINI_API_KEY`. It must **not** be prefixed with `NEXT_PUBLIC_`. Optionally set `GEMINI_MODEL`; when blank, the app uses `gemini-3.5-flash-lite`. Restart the dev server.
3. Use **Analisis foto** in the meal editor. Guests can try up to three analyses per day locally, with results saved in browser storage; sign in to save meals across devices. The browser compresses the photo; the server checks MIME bytes and size, redraws it to JPEG to remove metadata, and sends it to Gemini only from the server. The image is not stored. If Gemini is missing, over quota, or unavailable, switch to **Cari manual**.

The key supplied in the chat was not written into source or `.env.local`. Configure it locally or use a new key. See [Google's API key guide](https://ai.google.dev/gemini-api/docs/api-key) and [image understanding guide](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding).

## Data and estimates

`src/lib/food.ts` contains the example catalog and deterministic meal nutrition: for each nutrient, `total = sum(item.per100g * item.grams / 100)`. Custom entries require values per 100 g. Prior logs keep a snapshot so later catalog changes do not silently alter history.

`src/lib/target.ts` calculates the suggested target using Mifflin-St Jeor (`10 * weight kg + 6.25 * height cm - 5 * age + 5` for the male coefficient, or `-161` for the female coefficient), activity factors 1.2, 1.35, 1.5, or 1.65, and goal adjustments -300, 0, or +250 kcal/day. It rounds to 10 kcal with a 1200 kcal floor. Choosing "prefer not to say" disables automatic estimation and leaves manual entry available. Profile changes never silently replace the active target; each saved target records its source, inputs, formula version, effective time, and optional note. Measurements use cm and kg, and the app language is Indonesian.

## Remaining limits

- The new Supabase migration and real cross-user isolation require verification in a disposable Supabase database or your configured project. No Supabase account or project was accessed here.
- Gemini analysis requires a valid API key and available project quota. Model availability can vary by project; set `GEMINI_MODEL` if you need a different supported model.
- The API rate counter is in memory per server instance. Use a shared limiter and deployment quotas before exposing a paid endpoint at scale.
- Seed food numbers need review against a licensed Indonesian composition source before real nutrition claims.
- Account-data erase removes application rows and signs out; deleting the Auth identity itself requires a separate account-deletion flow.
