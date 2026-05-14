# NeetCode Progress Tracker Documentation

## Data Flow (Simple)
1. The Chrome extension runs on `https://neetcode.io/*` and reads:
   - `localStorage.getItem("completed-problem-list")`
2. The extension transforms raw solved problems into a topic summary object for the 20 NeetCode topics.
3. The extension upserts this payload into Supabase table `public.user_progress` keyed by `user_tag`.
4. The Next.js dashboard fetches by `user_tag`:
   - if `myTag` exists in browser local storage, it loads your progress immediately
   - users can search any other `user_tag` to view a friend's progress
   - recent searches are saved in local storage and shown as clickable chips

## Supabase Setup
1. Create a new Supabase project.
2. In SQL Editor, run the schema + RLS script below.
3. Configure environment variables for both the web app and extension.

## Configuring Environment Variables
### Web app (`/web-app/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Extension (`/extension/config.js`)
```js
const NEETCODE_TRACKER_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY"
};
```

Use the same Supabase project for both surfaces. The web app reads data, and the extension writes data with upsert.

## Aggregation Logic (How It Works)
The extension script (`/extension/scripts/content.js`) reads `completed-problem-list`, collects solved problem identifiers (URLs/slugs), normalizes them, then assigns each item to a topic using rule-based pattern matching (`TOPIC_RULES`).

- `TOPICS` defines the output keys (20 topic counters).
- `TOPIC_RULES` maps identifier patterns/keywords to a topic.
- Final payload format is:

```json
{
  "Arrays & Hashing": 12,
  "Graphs": 5
}
```

If NeetCode changes roadmap/topic naming, update:
1. `TOPICS` to add/remove/rename categories.
2. `TOPIC_RULES` regex patterns to match new problem slugs or URL formats.

## Database SQL (Table + Public RLS)
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

## Load Unpacked Extension (Chrome)
1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select the `/extension` folder from this repo.
5. Open `https://neetcode.io/` and verify the extension content script is active.

## Vercel Deployment (Web App)
1. Push the repository to GitHub.
2. In Vercel, click **Add New Project** and import the repo.
3. Set root directory to `web-app`.
4. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy. Vercel will run the Next.js build automatically.
