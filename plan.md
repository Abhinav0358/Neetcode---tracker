## NeetCode Progress Tracker Implementation Plan

### Problem
Build a monorepo solution where a Chrome extension reads NeetCode completion data from local storage, aggregates it by the 20 standard NeetCode topics, stores it in Supabase by `user_tag`, and a Next.js dashboard displays your own and friends' progress with recent-search support.

### Proposed Approach
1. Define shared progress data shape and a topic aggregation utility that maps raw solved-problem entries into topic completion counts.
2. Implement extension foundations (Manifest V3, content script extraction, background/storage sync, Supabase upsert integration).
3. Set up web app Supabase client and build a search-first dashboard with local-storage based fast load and recent searches.
4. Configure database schema and RLS for public read + upsert workflows keyed by `user_tag`.
5. Document setup and deployment for Supabase, extension loading, and Vercel hosting.

### Implementation Steps
1. Create `/extension/manifest.json` with `storage` permission, NeetCode host permissions, and content script registration.
2. Implement extension script(s) to read `completed-problem-list` from `https://neetcode.io/*`.
3. Build aggregation logic for all 20 NeetCode topics and normalize output JSON.
4. Add Supabase client/config in extension and upsert into `public.user_progress` using `user_tag`.
5. Add `/web-app/lib/supabase.ts` client initialization using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
6. Build dashboard UI:
   - auto-load `myTag` from browser local storage
   - searchable `user_tag` lookup
   - clickable recent-search chips from local storage
   - progress bars per topic
7. Add loading/error/empty states for search and dashboard data.
8. Add SQL schema + RLS policies for `user_progress`.
9. Write root-level documentation for data flow, Supabase setup, extension loading, and Vercel deployment.
10. Run lint/build checks and verify end-to-end behavior.

### Notes
- Use consistent `user_tag` trimming and casing rules across extension and web app.
- Keep Supabase keys in environment variables only (no hardcoded secrets).
- Prefer idempotent writes (`upsert`) and stable JSON shape for dashboard rendering.
