# Supabase setup (backend role)

1. Create a free project at supabase.com.
2. Open the SQL editor and run `schema.sql` from this folder.
3. Storage → create a **public** bucket named `review-photos` (used by `submitReview()` for the review collages).
4. Auth → enable the sign-in method you want players to use (email magic link is fastest for a demo; swap in the persona-identity provider once that track is specced).
5. Project Settings → API → copy the Project URL and `anon` public key into the root `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
6. On first sign-in, insert a matching row into `profiles` (id = auth user id) — either via a Supabase Auth trigger or client-side right after sign-up.
