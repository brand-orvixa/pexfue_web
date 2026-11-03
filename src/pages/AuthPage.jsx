import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { googleAccessToken } from '../google.js'
import { GoogleIcon, Icon } from '../icons.jsx'
import { useToast } from '../ui.jsx'

const COPY = {
  login: { title: 'Welcome back', sub: 'Sign in to keep your pages moving into the index.' },
  register: { title: 'Create your account', sub: 'Start in sandbox mode. No API keys needed to try it.' },
  forgot: { title: 'Forgot your password?', sub: 'Enter your account email and we’ll send you a reset link.' },
  reset: { title: 'Set a new password', sub: 'Choose a password with at least 8 characters.' },
}
const PATH = 'M 20,120 C 140,120 150,40 260,40 S 410,96 500,30'

function Field({ label, type = 'text', reveal, id, ...rest }) {
  const [show, setShow] = useState(false)
  return (
    <div className="ax-field">
      <input id={id} type={reveal ? (show ? 'text' : 'password') : type} placeholder=" " {...rest} />
      <label htmlFor={id}>{label}</label>
      {reveal && (
        <button type="button" className="ax-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
          <Icon name={show ? 'eyeOff' : 'eye'} />
        </button>
      )}
    </div>
  )
}

function Route() {
  return (
    <div className="ax-route" aria-hidden="true">
      <svg viewBox="0 0 520 150" preserveAspectRatio="none">
        <path className="path" d={PATH} vectorEffect="non-scaling-stroke" />
        <path className="trail" d={PATH} vectorEffect="non-scaling-stroke" />
        <g className="jet">
          <path transform="scale(1.15)" d="M-10,-1.2 L5,-1.2 Q10,0 5,1.2 L-10,1.2 Z M-2,-1 L-7,-9 L-4,-9 L3,-1 Z M-2,1 L-7,9 L-4,9 L3,1 Z M-9,-1 L-12,-5 L-10,-5 L-6,-1 Z M-9,1 L-12,5 L-10,5 L-6,1 Z" />
          <animateMotion dur="4.8s" repeatCount="indefinite" rotate="auto" path={PATH} keyPoints="0;1;1" keyTimes="0;0.7;1" calcMode="linear" />
        </g>
      </svg>
      <div className="ax-node" style={{ left: '3.8%', top: '80%', '--c': '#8fa3d9' }}><i /><span>Submitted</span></div>
      <div className="ax-node label-up" style={{ left: '50%', top: '26.7%', '--c': '#4d8dff' }}><i /><span>Crawled</span></div>
      <div className="ax-node label-up" style={{ left: '96.2%', top: '20%', '--c': '#3ccf8e' }}><i /><span>Indexed</span></div>
    </div>
  )
}

export default function AuthPage({ mode }) {
  const { login, register, loginWithGoogle, meta } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [sent, setSent] = useState(null)
  const c = COPY[mode]
  const social = mode === 'login' || mode === 'register'
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const run = async (name, fn) => {
    setErr(''); setBusy(name)
    try { await fn() } catch (ex) { if (!/cancelled/i.test(ex.message)) setErr(ex.message) } finally { setBusy('') }
  }

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'login') return run('email', async () => { await login(f.email, f.password); nav('/app') })
    if (mode === 'register') return run('email', async () => { await register(f.name, f.email, f.password); nav('/app') })
    if (mode === 'forgot') return run('email', async () => setSent(await api.post('/auth/forgot', { email: f.email })))
    return run('email', async () => {
      if (f.password !== f.confirm) throw new Error('The two passwords don’t match.')
      await api.post('/auth/reset', { token: params.get('token') || '', password: f.password })
      toast('Password updated. Sign in with your new password.', 'ok')
      nav('/login')
    })
  }

  const google = () => run('google', async () => {
    if (!meta.google_client_id) throw new Error('Google sign-in isn’t switched on yet. The site owner needs to add a Google OAuth client ID in the server settings.')
    const r = await loginWithGoogle(await googleAccessToken(meta.google_client_id))
    if (r.created) toast('Welcome to Paxfue! Your account is ready.', 'ok')
    nav('/app')
  })

  return (
    <div className="ax">
      <SiteHeader />
      <div className="ax-sky" aria-hidden="true">
        <div className="grid" /><div className="warm" />
        <svg className="orbit" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <ellipse cx="500" cy="300" rx="480" ry="270" /><ellipse cx="500" cy="300" rx="380" ry="200" />
          <ellipse className="arc" cx="500" cy="300" rx="480" ry="270" />
        </svg>
      </div>

      <section className="ax-left">
        <div className="ax-hero">
          <span className="ax-eyebrow">Paxfue Travel · Indexing workspace</span>
          <h1>
            <span className="ln" style={{ '--i': 0 }}>Every new page,</span>
            <span className="ln" style={{ '--i': 1 }}>on its way to</span>
            <span className="ln" style={{ '--i': 2 }}>the <span className="serif">index.<svg viewBox="0 0 200 30" preserveAspectRatio="none" aria-hidden="true"><path d="M4 22 C 60 6, 140 4, 196 14" /></svg></span></span>
          </h1>
          <p>Send URLs to Google and Bing, watch them move from submitted to indexed, and let failed requests retry themselves.</p>
          <Route />
          <div className="ax-proof">
            <div><Icon name="shieldCheck" />Official Google &amp; Bing APIs</div>
            <div><Icon name="repeat" />Automatic retries</div>
            <div><Icon name="download" />CSV history</div>
          </div>
        </div>
        <footer className="ax-foot">
          <span>© {new Date().getFullYear()} Paxfue Travel Holiday</span>
          <Link to="/">Website</Link>
          <a href="/#faq">FAQ</a>
        </footer>
      </section>

      <section className="ax-right">
        <div style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
          <div className="ax-card">
            {social ? (
              <nav className={`ax-switch ${mode === 'register' ? 'right' : ''}`} aria-label="Account">
                <span className="pill" />
                <Link to="/login" className={mode === 'login' ? 'on' : ''}>Sign in</Link>
                <Link to="/register" className={mode === 'register' ? 'on' : ''}>Sign up</Link>
              </nav>
            ) : (
              <Link to="/login" className="ax-back"><Icon name="chevronLeft" />Back to sign in</Link>
            )}

            {sent ? (
              <div className="ax-done">
                <span className="ok"><Icon name="mail" /></span>
                <h2>Check your inbox</h2>
                <p>{sent.message} The link is valid for one hour.</p>
                {sent.dev_link && <div className="ax-dev">Development mode: <a href={sent.dev_link.replace(/^https?:\/\/[^/]+/, '')}>open the reset link</a> (no mail server needed).</div>}
              </div>
            ) : (
              <div key={mode} style={{ animation: 'axIn .45s var(--ease-out) both', opacity: 0 }}>
                <h2>{c.title}</h2>
                <p className="sub">{c.sub}</p>
                <form className="ax-form" onSubmit={submit}>
                  {social && (
                    <>
                      <button type="button" className="ax-btn google" onClick={google} disabled={!!busy}>
                        {busy === 'google' ? <span className="spinner" /> : <GoogleIcon />}
                        {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                      </button>
                      <div className="ax-or">or use your email</div>
                    </>
                  )}

                  {err && <div className="ax-err" role="alert"><Icon name="alert" /><span>{err}</span></div>}

                  {mode === 'register' && <Field id="ax-name" label="Full name" value={f.name} onChange={set('name')} required minLength={2} autoComplete="name" />}
                  {mode !== 'reset' && <Field id="ax-email" label="Email address" type="email" value={f.email} onChange={set('email')} required autoComplete="email" autoFocus={mode === 'forgot'} />}
                  {mode !== 'forgot' && (
                    <Field id="ax-pass" label={mode === 'login' ? 'Password' : 'New password'} reveal value={f.password} onChange={set('password')} required
                      minLength={mode === 'login' ? 1 : 8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  )}
                  {mode === 'reset' && <Field id="ax-confirm" label="Repeat new password" reveal value={f.confirm} onChange={set('confirm')} required minLength={8} autoComplete="new-password" />}

                  {mode === 'login' && <div className="ax-row"><span /><Link to="/forgot-password" className="ax-link">Forgot password?</Link></div>}
                  {mode === 'register' && <div className="ax-row"><span>At least 8 characters</span></div>}

                  <button type="submit" className="ax-btn primary" disabled={!!busy} style={{ marginTop: 6 }}>
                    {busy === 'email' && <span className="spinner" />}
                    {{ login: 'Sign in', register: 'Create account', forgot: 'Send reset link', reset: 'Update password' }[mode]}
                    {busy !== 'email' && <Icon name="arrowRight" className="arrow" />}
                  </button>
                </form>
              </div>
            )}

            <p className="ax-fine">By continuing, you agree to use Paxfue only for websites you own or are authorised to manage.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
