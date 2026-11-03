// "Continue with Google" via Google Identity Services (token popup).
// The backend verifies the token was issued to our client ID before signing in.
let loader = null

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  loader ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { loader = null; reject(new Error('Could not load Google sign-in. Check your connection.')) }
    document.head.appendChild(s)
  })
  return loader
}

/** Opens the Google account chooser and resolves with an OAuth access token. */
export async function googleAccessToken(clientId) {
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: (r) => (r.error ? reject(new Error(r.error_description || 'Google sign-in was cancelled.')) : resolve(r.access_token)),
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Allow pop-ups and try again.')),
    })
    client.requestAccessToken()
  })
}
