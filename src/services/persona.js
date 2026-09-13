// Groundwork for the Persona identity-verification challenge track.
//
// Persona (https://withpersona.com) runs a hosted "Inquiry" flow: the player
// verifies who they are (ID scan / selfie / database check, per your template),
// and Persona hands back an inquiry id + status. We store that id on the
// player's profile (profiles.persona_id) and treat a completed inquiry as a
// "verified explorer" badge - see features/social/VerifyIdentity.jsx.
//
// This stays inert until two env vars are set (see .env.example), so the app
// builds and runs exactly as before when the track isn't wired up yet:
//   VITE_PERSONA_TEMPLATE_ID     - the Inquiry template from the Persona dashboard (itmpl_...)
//   VITE_PERSONA_ENVIRONMENT_ID  - env-id for sandbox vs production (env_...)
//
// The client-side inquiry result is convenient but not trustworthy on its own;
// for anything that must be tamper-proof, verify server-side via a Persona
// webhook or the Persona API before granting the badge. See README "Persona".

const TEMPLATE_ID = import.meta.env.VITE_PERSONA_TEMPLATE_ID
const ENVIRONMENT_ID = import.meta.env.VITE_PERSONA_ENVIRONMENT_ID
// Pin the SDK version so the flow can't change under us mid-demo.
const PERSONA_SDK_URL = 'https://cdn.withpersona.com/dist/persona-v5.2.0.js'

export const isPersonaConfigured = Boolean(TEMPLATE_ID && ENVIRONMENT_ID)

let sdkPromise = null

// Loads Persona's hosted SDK once, on demand, so it costs nothing until a
// player actually taps "Verify". Rejects if it can't load (offline, blocked).
function loadPersonaSdk() {
  if (window.Persona) return Promise.resolve(window.Persona)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PERSONA_SDK_URL
    script.async = true
    script.onload = () => (window.Persona ? resolve(window.Persona) : reject(new Error('Persona SDK loaded but window.Persona is missing')))
    script.onerror = () => {
      sdkPromise = null // let a later attempt retry
      reject(new Error('Could not load the Persona SDK'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

// Opens the Persona inquiry as a modal and resolves with { inquiryId, status }
// when the player finishes, or null if they close it without finishing.
// referenceId ties the inquiry back to our user (their profile id) so a
// server-side webhook can match it later.
export async function startPersonaVerification({ referenceId } = {}) {
  if (!isPersonaConfigured) {
    throw new Error('Persona is not configured - set VITE_PERSONA_TEMPLATE_ID and VITE_PERSONA_ENVIRONMENT_ID.')
  }
  const Persona = await loadPersonaSdk()

  return new Promise((resolve, reject) => {
    const client = new Persona.Client({
      templateId: TEMPLATE_ID,
      environmentId: ENVIRONMENT_ID,
      referenceId,
      onReady: () => client.open(),
      onComplete: ({ inquiryId, status }) => resolve({ inquiryId, status }),
      onCancel: () => resolve(null),
      onError: (error) => reject(new Error(error?.message ?? 'Persona verification failed')),
    })
  })
}

// A profile counts as verified once it carries a Persona inquiry id.
export function isVerified(profile) {
  return Boolean(profile?.persona_id)
}
