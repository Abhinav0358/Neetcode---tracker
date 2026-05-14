# NeetCode Progress Tracker

A monorepo project that tracks your NeetCode progress and lets you compare with friends.

- **`extension/`**: Chrome extension that scrapes your NeetCode practice page and syncs progress to Supabase.
- **`web-app/`**: Next.js dashboard to view your own progress and search by friend tag.

---

## Use the Production Version (Vercel)

If the web app is already deployed:

1. Open the deployed app URL (for example: `https://YOUR-APP.vercel.app`).
2. Load the extension locally (Chrome → `chrome://extensions` → **Load unpacked** → select `extension/`).
3. In extension `config.js`, set Supabase URL + anon key.
4. Open `https://neetcode.io/practice`, set your tag in the extension popup, and click **Sync Now**.
5. Go to the deployed dashboard and search your tag.

You do **not** need to run the Next.js app locally to use the deployed version.

---

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd "Neetcode Progress tracker"
cd web-app
npm install
```

### 2. Configure environment variables

Copy placeholders and fill real values:

- `web-app/.env.example` → `web-app/.env.local`
- `extension/.config.example.js` → `extension/config.js`

Required keys:

```bash
# web-app/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

```js
// extension/config.js
const NEETCODE_TRACKER_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
};
```

### 3. Create database table in Supabase

Run this in Supabase SQL editor:

```sql
create table if not exists public.user_progress (
  user_tag text primary key,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "public_select_user_progress" on public.user_progress;
create policy "public_select_user_progress"
on public.user_progress
for select
to anon, authenticated
using (true);

drop policy if exists "public_insert_user_progress" on public.user_progress;
create policy "public_insert_user_progress"
on public.user_progress
for insert
to anon, authenticated
with check (char_length(trim(user_tag)) > 0);

drop policy if exists "public_update_user_progress" on public.user_progress;
create policy "public_update_user_progress"
on public.user_progress
for update
to anon, authenticated
using (true)
with check (char_length(trim(user_tag)) > 0);
```

### 4. Run web app locally

```bash
cd web-app
npm run dev
```

Open `http://localhost:3000`.

### 5. Load extension locally

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder

---

## Technical Workflow (Simple)

1. You open `https://neetcode.io/practice`.
2. Extension content script reads accordion sections (`app-accordion`) from the Angular UI.
3. It extracts solved counts per topic (from label `X / Y`, with fallback DOM counting).
4. Extension reads `user_tag` from `chrome.storage.local`.
5. Extension upserts `{ user_tag, progress, updated_at }` to Supabase `user_progress`.
6. Dashboard (`web-app`) fetches `progress` by `user_tag` and renders animated comparison cards.

---

## Typical Usage

1. Set tag in extension popup (for example, `abhinav`).
2. Click **Sync Now** on NeetCode practice page.
3. Open dashboard and view:
   - **My Tag · My Progress** (from localStorage tag)
   - Friend progress (search by tag)

---

## Notes

- The dashboard currently uses a fixed topic order and totals map matching this repo’s current NeetCode setup.
- If NeetCode changes topic labels, update aliases/mapping in `web-app/app/page.tsx` and scraper logic in `extension/scripts/content.js`.
