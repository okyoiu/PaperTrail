// Readiness check for the Supabase backend, run after the manual dashboard
// setup (create project, run supabase/schema.sql, create the review-photos
// bucket, enable an auth provider) and filling in .env.
//
// Usage: node --env-file=.env scripts/check-backend.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exitCode = 1
}

function ok(msg) {
  console.log(`✓ ${msg}`)
}

if (!url || !anonKey) {
  fail('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set (check .env)')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

// 1. Connection + schema: each table should exist and be selectable.
for (const table of ['profiles', 'locations', 'unlocks', 'reviews']) {
  const { error } = await supabase.from(table).select('*').limit(1)
  if (error) fail(`table "${table}": ${error.message}`)
  else ok(`table "${table}" reachable`)
}

// 2. Storage bucket for review photos.
const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
if (bucketError) {
  fail(`storage: ${bucketError.message}`)
} else if (!buckets.some((b) => b.name === 'review-photos')) {
  fail('storage bucket "review-photos" not found — create it in Supabase Storage')
} else {
  ok('storage bucket "review-photos" exists')
}

// 3. RPC function used by submitReview() to award XP.
const { error: rpcError } = await supabase.rpc('increment_xp', {
  p_user_id: '00000000-0000-0000-0000-000000000000',
  p_amount: 0,
})
// A real error about the function missing looks different from a harmless
// "no matching row" outcome (which means the function exists and ran).
if (rpcError && /function .* does not exist/i.test(rpcError.message)) {
  fail(`rpc "increment_xp": ${rpcError.message}`)
} else {
  ok('rpc "increment_xp" exists')
}

// 4. Auth provider enabled (best-effort: just confirms the auth endpoint responds).
const { error: authError } = await supabase.auth.signInWithOtp({ email: 'not-a-real-address@example.com' })
if (authError) fail(`auth: ${authError.message}`)
else ok('auth (email OTP) endpoint responding')

console.log('\nIf everything above is ✓, the backend is ready to wire into the frontend.')
