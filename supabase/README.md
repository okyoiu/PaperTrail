# Supabase setup (backend role)

1. Create a free project at supabase.com.
2. Open the SQL editor and run `schema.sql` from this folder. **Re-run it whenever it changes** - it's idempotent. The current version adds `profiles.location_visibility` (who sees you on the map), `unlocks.explored_at` (buildings you've reviewed, kept in sync by a trigger on `reviews`), and the players-map RLS policy; the app degrades gracefully without them, but other players won't show up and explored buildings won't be persisted until it has been run.
3. Storage → create a **public** bucket named `review-photos` (used by `submitReview()` for the review collages).
4. Auth → Providers → make sure **Email** is enabled (magic link is the default). Then Auth → Email Templates → **Magic Link**: add the 6-digit code to the body, e.g.

   ```html
   <p>Your sign-in code is <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>
   ```

   The sign-in screen asks for that code, which is what makes signing in from the installed home-screen app work (a tapped link opens in the browser instead). Without `{{ .Token }}` in the template only the link works.
5. Auth → URL Configuration → add every origin the app is served from (the Vercel URL, `http://localhost:5173`, any tunnel) to **Redirect URLs**, so the magic link returns to the right place.
6. Project Settings → API → copy the Project URL and `anon` public key into the root `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
7. Database → Replication (or Realtime) → confirm `live_locations` is in the `supabase_realtime` publication (`schema.sql` adds it). The players map also polls every 15 s, so it still works without Realtime, just less instantly.

Profiles are created client-side on first sign-in (`ensureProfile()` in `src/features/backend/api.js`) with the explorer picked on the sign-in screen; no Auth trigger is needed.
