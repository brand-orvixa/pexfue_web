import { useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Button, useToast } from '../ui.jsx'

function Section({ title, text, children, footer }) {
  return (
    <div className="panel">
      <div className="split">
        <div className="panel-body"><h3 style={{ fontSize: 14 }}>{title}</h3><p className="small muted" style={{ marginTop: 6 }}>{text}</p></div>
        <div className="panel-body stack">{children}</div>
      </div>
      {footer && <div className="panel-foot" style={{ justifyContent: 'flex-end' }}>{footer}</div>}
    </div>
  )
}

export default function Settings() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [p, setP] = useState({ name: user.name, retry_max: user.retry_max, retry_delay_minutes: user.retry_delay_minutes, status_check_minutes: user.status_check_minutes })
  const [pw, setPw] = useState({ current: '', password: '' })
  const [busy, setBusy] = useState('')
  const set = (k) => (e) => setP({ ...p, [k]: e.target.value })

  const save = async (fields, label) => {
    setBusy(label)
    try { const r = await api.put('/profile', fields); setUser(r.user); toast('Saved', 'ok') } catch (ex) { toast(ex.message, 'err') } finally { setBusy('') }
  }
  const changePw = async () => {
    setBusy('pw')
    try { await api.put('/profile/password', pw); setPw({ current: '', password: '' }); toast('Password changed. Other sessions were signed out.', 'ok') } catch (ex) { toast(ex.message, 'err') } finally { setBusy('') }
  }
  const delay = Number(p.retry_delay_minutes) || 0

  return (
    <div className="stack" style={{ maxWidth: 980 }}>
      <div className="page-head"><div><h1>Settings</h1><p>Your profile, retry behaviour and security.</p></div></div>

      <Section title="Profile" text="How you appear across the workspace." footer={<Button variant="primary" loading={busy === 'profile'} onClick={() => save({ name: p.name }, 'profile')}>Save profile</Button>}>
        <label className="field"><span>Name</span><input className="input" value={p.name} onChange={set('name')} /></label>
        <label className="field"><span>Email</span><input className="input" value={user.email} disabled /></label>
        <div className="small muted">Role: <b style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{user.role || 'user'}</b></div>
      </Section>

      <Section title="Auto-retry" text="Applies to every site. Temporary failures back off exponentially; pages still not indexed after the status checks are resubmitted."
        footer={<Button variant="primary" loading={busy === 'retry'} onClick={() => save({ retry_max: p.retry_max, retry_delay_minutes: p.retry_delay_minutes, status_check_minutes: p.status_check_minutes }, 'retry')}>Save retry settings</Button>}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <label className="field" style={{ flex: '1 1 150px' }}><span>Max attempts</span><input className="input" type="number" min="1" max="10" value={p.retry_max} onChange={set('retry_max')} /></label>
          <label className="field" style={{ flex: '1 1 150px' }}><span>First retry after (min)</span><input className="input" type="number" min="1" max="1440" value={p.retry_delay_minutes} onChange={set('retry_delay_minutes')} /></label>
          <label className="field" style={{ flex: '1 1 150px' }}><span>Status check every (min)</span><input className="input" type="number" min="5" max="1440" value={p.status_check_minutes} onChange={set('status_check_minutes')} /></label>
        </div>
        <div className="box" style={{ background: 'var(--surface-2)' }}>
          <span className="small muted">Retry schedule preview</span>
          <div className="row" style={{ gap: 6 }}>
            {Array.from({ length: Math.max(0, Math.min(10, Number(p.retry_max) || 0) - 1) }, (_, i) => (
              <span key={i} className="chip"><span className="num">#{i + 2}</span> +{delay * 2 ** i >= 60 ? `${Math.round((delay * 2 ** i) / 6) / 10}h` : `${delay * 2 ** i}m`}</span>
            ))}
            {Number(p.retry_max) <= 1 && <span className="small muted">No retries</span>}
          </div>
        </div>
      </Section>

      <Section title="Password" text="Changing it signs out every other session." footer={<Button loading={busy === 'pw'} disabled={!pw.current || pw.password.length < 8} onClick={changePw}>Change password</Button>}>
        <label className="field"><span>Current password</span><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
        <label className="field"><span>New password</span><input className="input" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></label>
      </Section>
    </div>
  )
}
