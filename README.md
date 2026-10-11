# forkcast

Mobile-first Indonesian food logging PWA. The existing dashboard design is preserved. Meals can be entered manually, saved to a signed-in account when Supabase is configured, or prepared from photo candidates when Gemini is configured.

## What works

- Search the example food catalog by Indonesian name or alias. Add multiple items, change serving unit and quantity, set meal type and local date/time, review calories and macros, then save to the correct dashboard day and group.
- Nutrition totals are calculated only from stored per-100 g values and selected grams. Each meal item stores its nutrition snapshot, source label, and calculation basis. AI never supplies calorie totals.
- Local demo mode remains available without environment variables. It keeps meals, saved combinations, profile, and weight entries in this browser.
- With Supabase configured, email magic-link sign-in loads and stores private profiles, meals, items, saved combinations, and weight entries. Demo and account data stay separate.
- With Gemini configured, the server analyzes a compressed JPEG/PNG/WebP photo and returns candidate foods, approximate gram ranges, confidence, and a follow-up question. The user must review and confirm suggestions before saving. Unmatched foods require a comparable catalog choice or an explicit decision to omit them.
- Installable PWA shell, offline fallback, basic empty/error states, and an account-data erase action.

The 12 food records are **illustrative demo values**, not verified composition data. Prepared dishes vary by recipe and oil use. The calorie target is an estimate, not medical advice.

## Local development

Requires Node.js 20 or newer.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. On Windows PowerShell where `npm.ps1` is disabled, use `npm.cmd`. Leave all variables blank for demo mode.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Supabase setup

No migration was applied to your Supabase project by this work. The PostgreSQL connection string shown in the request has a password placeholder and is neither needed nor used by the app.

1. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project. In **SQL Editor**, create a new query, paste the complete contents of [`supabase/migrations/20261011000100_food_tracker.sql`](supabase/migrations/20261011000100_food_tracker.sql), and run it once on a fresh schema. The migration creates profiles, meals, meal items, saved meals, weight entries, indexes, grants, and owner-only RLS policies.
2. In **Authentication → Providers → Email**, enable email sign-in. In **Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` for local testing and allow `http://localhost:3000/**` as a redirect URL. Add your deployed HTTPS URL when you deploy. Magic links must be able to redirect back to the app.
3. In the project **Connect** dialog or **Project Settings → API Keys**, copy the **Project URL** and **publishable key**. Put them in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A legacy anon key can instead use `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are public client values; do not use a secret/service-role key in a `NEXT_PUBLIC_` variable.
4. Restart `npm run dev`. Open **Profil & target**, enter an email, use the magic link, and return to the app. A signed-in user starts with an empty private history; existing local demo entries are intentionally not imported.
5. For a disposable local Supabase database, run the RLS regression script in [`supabase/tests/20261011_user_isolation.sql`](supabase/tests/20261011_user_isolation.sql) after the migration. It checks that user A cannot read or insert user B's profile, meal, or meal items. It was not run here because Docker, PostgreSQL, and Supabase CLI are unavailable in this workspace. Do not run this test against production; it inserts temporary auth users inside a rolled-back transaction.

The browser uses the publishable key with the signed-in user's session; RLS enforces ownership in PostgreSQL. The Gemini route may verify a Supabase bearer token when both services are configured. No service-role key is required. See [Supabase's Next.js Auth guide](https://supabase.com/docs/guides/auth/quickstarts/nextjs) and [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Gemini setup

1. In [Google AI Studio](https://aistudio.google.com/), open **Dashboard → API Keys** and create or select a Gemini API key in your project. Check that Gemini API access and quota are available.
2. Put the key in `.env.local` as `GEMINI_API_KEY`. It must **not** be prefixed with `NEXT_PUBLIC_`. Optionally set `GEMINI_MODEL`; when blank, the app uses `gemini-3.5-flash-lite`. Restart the dev server.
3. Use **Analisis foto** in the meal editor. Guests can try up to three analyses per day locally, with results saved in browser storage; sign in to save meals across devices. The browser compresses the photo; the server checks MIME bytes and size, redraws it to JPEG to remove metadata, and sends it to Gemini only from the server. The image is not stored. If Gemini is missing, over quota, or unavailable, switch to **Cari manual**.

The key supplied in the chat was not written into source or `.env.local`. Configure it locally or use a new key. See [Google's API key guide](https://ai.google.dev/gemini-api/docs/api-key) and [image understanding guide](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding).

## Data and estimates

`src/lib/food.ts` contains the example catalog and deterministic calculation: for each nutrient, `total = sum(item.per100g × item.grams / 100)`. Custom entries require values per 100 g. Prior logs keep a snapshot so later catalog changes do not silently alter history.

The suggested calorie target uses Mifflin–St Jeor (`10 × weight kg + 6.25 × height cm − 5 × age + 5` for the male coefficient, or `− 161` for the female coefficient), activity factors 1.2, 1.35, 1.5, or 1.65, and goal adjustments −300, 0, or +250 kcal/day. It has a 1200 kcal floor and is editable.

## Remaining limits

- Supabase migration and real cross-user isolation cannot be verified until the project is configured. No Supabase account or project was accessed here.
- Gemini analysis requires a valid API key and available project quota. Model availability can vary by project; set `GEMINI_MODEL` if you need a different supported model.
- The API rate counter is in memory per server instance. Use a shared limiter and deployment quotas before exposing a paid endpoint at scale.
- Seed food numbers need review against a licensed Indonesian composition source before real nutrition claims.
- Account-data erase removes application rows and signs out; deleting the Auth identity itself requires a separate account-deletion flow.
