# AI Food Tracker PWA — Codex Build Brief

> Copy this brief into Codex Agent in VS Code after opening the project folder. The agent should inspect the existing repository first, then implement the MVP in small, verifiable steps.

## Product direction

Build a mobile-first Progressive Web App for fast food logging. The initial audience is Indonesian users who want to track calories and macros for weight management or fitness, but often eat local meals that are difficult to find in generic food databases.

The product's core promise:

> **Log a meal quickly, understand that the nutrition is an estimate, and correct it without friction.**

This is an original product in the calorie-tracking category. Do not copy Cal AI branding, wording, assets, or proprietary implementation.

## How to work in this repository

1. Inspect the project structure, package manager, existing UI, and current functionality before editing.
2. Preserve working features and established visual patterns. Do not replace the app wholesale.
3. Summarize the current architecture and propose a short implementation plan before making broad changes.
4. Implement in small slices. Run the relevant lint, typecheck, and tests after each slice.
5. If credentials or external services are not configured, implement a safe mock/demo path and document exactly what configuration is needed. Never invent credentials.
6. Do not expose API keys in browser code, commit secrets, or log uploaded image contents.
7. Use clear empty, loading, success, error, offline, and permission-denied states.
8. Keep user-facing copy in Indonesian by default, with an easy path to add English later.

## MVP scope

### P0 — Required

- Installable, responsive PWA optimized for phone screens.
- Basic profile setup: display name (optional), age, height, weight, activity level, and goal (lose, maintain, or gain weight).
- Calculate a suggested daily calorie target using a clearly documented, conventional formula and conservative activity multipliers. Let users edit the target. Explain that it is an estimate, not medical advice.
- Daily dashboard with calorie and macro progress, meals grouped by meal type, and date navigation.
- Add a meal through:
  1. photo analysis,
  2. text search/manual entry,
  3. saved/recent meals.
- AI photo analysis returns candidate foods and estimated serving sizes. The user must be able to review and edit the food, quantity, and serving unit before saving.
- Nutrition totals must be calculated from structured nutrition records and quantities in application code. Do not ask the model to make up exact calorie totals.
- Save meal history and weight entries for the signed-in user.
- Basic progress view for weight and daily calorie history.
- Demo mode that remains usable without Gemini credentials, using seeded foods and clearly labeled sample AI results.

### P1 — After core flow is stable

- Indonesian packaged-food barcode lookup.
- Nutrition-label photo OCR with user review.
- Water and exercise logging.
- Gentle reminders and optional weekly summaries.
- More granular dietary preferences and saved recipes.

### Explicitly out of scope for MVP

- Medical diagnosis, treatment, or disease-specific meal plans.
- Claims of clinical accuracy or guaranteed weight loss.
- Automatically generated strict diet prescriptions.
- Social feed, public profiles, payments, and subscription billing.
- Dependence on a phone depth sensor. The PWA should work with an ordinary photo and user-correctable serving estimates.

## Recommended technical architecture

Use existing project conventions if already established. If starting from an empty repository, use:

- **Frontend:** Next.js App Router + TypeScript.
- **UI:** Tailwind CSS with accessible, reusable components; use the project's existing component library if present.
- **PWA:** Web app manifest, installable icons, service worker/offline shell, and install guidance. Do not cache private meal data in a shared or public cache.
- **Backend and data:** Supabase Postgres + Supabase Auth. Add Row Level Security so each user can read and mutate only their own profile, meals, food corrections, and weight entries.
- **AI:** Gemini API called only from a server-side route or server-side function. Keep the key in a server-only environment variable such as `GEMINI_API_KEY`.
- **Hosting:** Vercel or the existing project host.
- **Charts:** Use an existing chart dependency if available; otherwise choose a small maintained library.

Suggested environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

Only the Supabase public/anonymous key belongs in the browser. The service-role key and Gemini key must remain server-side. Never add actual secret values to this file or source control.

## AI meal-analysis flow

Implement a server endpoint such as `POST /api/meal/analyze`.

### Input

- One compressed JPEG, PNG, or WebP image.
- Optional user-provided context, such as meal name, ingredients, or a correction.
- Enforce a small upload-size limit, allowed MIME types, and request throttling.
- Strip image metadata when feasible. Do not persist the image by default.

### Model task

Ask the vision model to identify only visible candidate foods and likely components. It must:

- return structured JSON that validates against a schema;
- identify ambiguous items and lower confidence rather than pretending certainty;
- return portion estimates as ranges or clearly approximate units;
- identify likely hidden ingredients as unknown unless visible or supplied by the user;
- avoid medical or weight-loss coaching in this endpoint;
- never claim a precise measured calorie value based on the image alone.

Suggested response shape:

```json
{
  "items": [
    {
      "candidateName": "nasi putih",
      "candidateNameId": "nasi putih",
      "estimatedServing": {
        "value": 1,
        "unit": "centong",
        "gramsMin": 100,
        "gramsMax": 150
      },
      "visibleNotes": "Porsi tampak sekitar satu centong",
      "confidence": "medium",
      "needsConfirmation": true
    }
  ],
  "followUpQuestion": "Ayamnya digoreng atau dibakar?",
  "disclaimer": "Perkiraan dari foto; periksa dan sesuaikan sebelum menyimpan."
}
```

The exact schema can change if the selected model requires it, but responses must be validated server-side before returning them.

### Nutrition calculation

- Match confirmed candidates against the application's food records.
- Calculate calories and macros from per-100g or per-serving nutrition values and the selected quantity.
- If no reliable match exists, label the value as unavailable or an estimate and ask the user to choose a comparable item.
- Store the nutrition record/source and calculation basis with the meal snapshot so old logs do not silently change when food data is updated.
- Never represent model-generated numbers as laboratory measurements.

### Correction loop

After analysis, show an editable review screen. Let the user:
- change the food name;
- add or remove components;
- select a serving unit and quantity;
- answer a follow-up question;
- save a corrected combination as a reusable meal.

For MVP, personalization means remembering the user's saved meals and choices. Do not claim that the model is being trained on private corrections.

## Food data strategy

Prioritize Indonesian foods and serving language. Start with a small, carefully reviewed seed dataset that covers common foods and ingredients. Use an authoritative Indonesian composition source where its terms permit the intended use. Evaluate packaged-food barcode coverage separately; a third-party or crowdsourced database may have missing or incorrect entries.

Each food record should include:
- localized name and aliases;
- category;
- serving units and gram conversion;
- calories, protein, carbohydrates, fat, and optional fiber/sugar;
- source, source date, and confidence/quality label;
- whether the values describe a raw ingredient, cooked food, or branded product.

Do not silently treat a generic ingredient as an exact match for a prepared Indonesian dish.

## Initial data model

Adapt to the existing schema rather than duplicating it.

- `profiles`: user id, locale, age, height, current weight, activity level, goal, editable calorie target, created/updated timestamps.
- `foods`: name, localized aliases, category, serving conversion, nutrition per 100g or serving, source, source date, quality label.
- `meals`: user id, eaten-at timestamp, meal type, title, entry method, optional image reference (nullable), notes, created timestamp.
- `meal_items`: meal id, food id (nullable for custom entries), name snapshot, quantity, unit, grams, nutrition snapshot, estimate/source label, user-corrected flag.
- `saved_meals`: user id, title, reusable item snapshots, created/updated timestamps.
- `weight_entries`: user id, date, weight, optional note.

Use UUIDs where appropriate, foreign keys, sensible indexes, and RLS policies. Do not store a photo URL or image file unless there is a clear user-facing need and an explicit retention/privacy design.

## UX and accessibility requirements

- Primary use is one-handed mobile use.
- Make the primary action to log food obvious.
- Do not block manual search when the camera is unavailable or denied.
- Show AI results as candidates that need review, not as final facts.
- Let users correct common portion amounts quickly.
- Use readable text, accessible contrast, semantic controls, keyboard support, and screen-reader labels.
- Do not rely on color alone for calorie/macro status.
- Avoid guilt-inducing copy, punitive streaks, or shame-based progress messages.
- Clearly label estimates and show how to correct them.

## Privacy and security

- Analyze images in memory where possible; do not retain them by default.
- If image storage is later added, make it opt-in, private, access-controlled, and deletable.
- Enforce per-user data access in the database with RLS, not only in the UI.
- Validate uploads and AI output on the server.
- Add basic rate limits and usage caps to prevent accidental API cost spikes.
- Provide a way to delete account data.
- Do not send profile or meal history to the AI unless required for a user-requested feature and disclosed.
- Avoid logging personal health data, raw prompts containing it, or image bytes.

## Suggested implementation sequence

1. **Repository audit:** identify framework, routes, components, styling, package manager, tests, and any existing backend.
2. **App shell:** responsive navigation, manifest, design tokens, and dashboard with seeded demo data.
3. **Food logging:** manual search, meal editor, nutrition calculation, and local/demo persistence.
4. **Database:** Supabase schema, auth, RLS, migrations, and user-owned meal history.
5. **AI route:** server-side Gemini integration, validated structured response, upload limits, rate limits, and safe mock fallback.
6. **Review flow:** edit AI candidates, adjust portions, save meals, and reuse recent/saved meals.
7. **Progress:** weight entries and basic history chart.
8. **Quality pass:** mobile layout, accessibility, empty/error/offline states, privacy review, and production build.

Do not begin by implementing every feature in one large change. Complete and verify each slice before moving on.

## Acceptance criteria

- The app works on common phone viewport sizes and can be installed as a PWA.
- A user can create a meal manually without using AI.
- With Gemini configured, a user can submit an image and receive schema-validated candidate foods.
- The user can edit the candidates and portions before saving.
- Nutrition totals come from food records and deterministic calculations, not unsupported model claims.
- A missing API key or exhausted AI quota produces a clear, recoverable message and leaves manual logging available.
- User A cannot access User B's data through direct API/database requests.
- Images are not retained by default.
- The project passes its relevant lint, typecheck, tests, and production build.
- README documents setup, environment variables, migrations, demo mode, and known estimate limitations.

## First action for Codex

Inspect the repository and report:
1. what is already implemented;
2. which parts of this brief fit the existing architecture;
3. any conflicts or missing credentials;
4. the smallest first implementation slice.

Then proceed with that first slice without changing unrelated working features.
