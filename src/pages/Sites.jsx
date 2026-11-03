import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useWorkspace } from '../components/AppLayout.jsx'
import { BingIcon, GoogleIcon, Icon } from '../icons.jsx'
import { Button, CopyBox, Empty, Modal, Popover, Tabs, fmtDate, useToast } from '../ui.jsx'

function AddSite({ onClose, onAdded }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('')
    try { const r = await api.post('/sites', { site_url: url }); onAdded(r.site) } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  return (
    <Modal title="Add a website" subtitle="You’ll verify ownership in the next step" onClose={onClose} width={480}>
      <form onSubmit={submit} className="stack">
        {err && <div className="alert err"><Icon name="alert" />{err}</div>}
        <label className="field"><span>Website URL</span>
          <div className="input-icon"><Icon name="globe" /><input className="input" autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.yoursite.com" required /></div>
          <small>Covers this domain and all of its subdomains.</small>
        </label>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={busy} arrow={!busy}>Continue</Button>
        </div>
      </form>
    </Modal>
  )
}

function SiteSettings({ site: initial, onClose, onChange }) {
  const { meta } = useAuth()
  const toast = useToast()
  const [site, setSite] = useState(initial)
  const [tab, setTab] = useState(initial.verified ? 'google' : 'verify')
  const [busy, setBusy] = useState('')
  const [checks, setChecks] = useState(null)
  const [g, setG] = useState({ json: '', property: initial.gsc_property || '', quota: initial.google_daily_quota })
  const [b, setB] = useState({ key: '', indexnow: initial.indexnow_key || '' })

  const update = (s) => { setSite(s); onChange(s) }
  const run = async (name, fn) => { setBusy(name); try { await fn() } catch (e) { toast(e.message, 'err') } finally { setBusy('') } }
  const verify = () => run('verify', async () => {
    const r = await api.post(`/sites/${site.id}/verify`)
    setChecks(r.checks); update(r.site)
    toast(r.ok ? 'Ownership verified' : 'Verification not found yet', r.ok ? 'ok' : 'err')
    if (r.ok) setTab('google')
  })
  const save = (body, msg) => run('save', async () => { const r = await api.put(`/sites/${site.id}`, body); update(r.site); toast(msg, 'ok') })
  const test = () => run('test', async () => { const r = await api.post(`/sites/${site.id}/test`); update(r.site); toast('Connection test finished', 'info') })
  const token = site.verify_token

  return (
    <Modal title={site.domain} subtitle={site.site_url} onClose={onClose} width={600}>
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'verify', label: 'Ownership', icon: <Icon name="shieldCheck" width={14} height={14} /> },
        { value: 'google', label: 'Google', icon: <GoogleIcon width={14} height={14} /> },
        { value: 'bing', label: 'Bing', icon: <BingIcon width={14} height={14} /> },
      ]} />

      {tab === 'verify' && (
        <div className="stack" key="v" style={{ animation: 'pageIn .4s var(--ease-out)' }}>
          {site.verified
            ? <div className="alert ok"><Icon name="checkCircle" />Verified via {site.verify_method} on {fmtDate(site.verified_at)}.</div>
            : <p className="small muted">Use <b style={{ color: 'var(--ink)' }}>any one</b> of these methods, then click Verify.</p>}
          {[
            ['HTML file', `Upload to your site root so it opens at this address`, `${site.site_url}paxfue-verify-${token}.txt`, true],
            ['Meta tag', 'Add inside the <head> of your home page', `<meta name="paxfue-site-verification" content="${token}">`],
            ['DNS TXT record', `Add a TXT record on ${site.domain}`, `paxfue-verify=${token}`],
          ].map(([t, d, code, file], i) => (
            <div className="box" key={t}>
              <div className="row between"><b style={{ fontWeight: 550 }}><span className="num muted" style={{ marginRight: 8 }}>0{i + 1}</span>{t}</b>
                {file && <Button size="sm" variant="ghost" icon="download" onClick={() => api.download(`/sites/${site.id}/verify-file`, `paxfue-verify-${token}.txt`)}>Download</Button>}</div>
              <span className="small muted">{d}</span>
              <CopyBox text={code} />
            </div>
          ))}
          {checks && !site.verified && (
            <div className="alert err"><Icon name="alert" /><div>{Object.entries(checks).map(([k, v]) => <div key={k}><b style={{ textTransform: 'capitalize' }}>{k}:</b> {v}</div>)}</div></div>
          )}
          <Button variant="primary" icon="shieldCheck" loading={busy === 'verify'} onClick={verify}>{site.verified ? 'Verify again' : 'Verify ownership'}</Button>
        </div>
      )}

      {tab === 'google' && (
        <div className="stack" key="g" style={{ animation: 'pageIn .4s var(--ease-out)' }}>
          <div className={`alert ${site.google_ok ? 'ok' : 'info'}`}><Icon name={site.google_ok ? 'checkCircle' : 'info'} />
            {site.google_message || 'Connect a Google Cloud service account to use the Indexing API and URL Inspection.'}</div>
          <ol className="steps-mini">
            <li>In Google Cloud, enable the <b>Web Search Indexing API</b> and <b>Google Search Console API</b>.</li>
            <li>Create a service account and download its JSON key.</li>
            <li>In Search Console → Settings → Users, add the service-account email as an <b>Owner</b>.</li>
          </ol>
          {site.google_client_email && <div className="small">Service account <code>{site.google_client_email}</code></div>}
          <label className="field"><span>Service-account JSON {site.has_google_credentials && <span className="muted">· saved, paste to replace</span>}</span>
            <textarea className="textarea" style={{ minHeight: 100 }} value={g.json} onChange={(e) => setG({ ...g, json: e.target.value })} placeholder='{"type": "service_account", …}' />
            <input type="file" accept=".json,application/json" className="small" onChange={async (e) => { const f = e.target.files[0]; if (f) setG({ ...g, json: await f.text() }) }} />
          </label>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <label className="field" style={{ flex: '2 1 220px' }}><span>Search Console property</span>
              <input className="input" value={g.property} onChange={(e) => setG({ ...g, property: e.target.value })} placeholder={`sc-domain:${site.domain}`} /></label>
            <label className="field" style={{ flex: '1 1 120px' }}><span>Daily quota</span>
              <input className="input" type="number" min="1" value={g.quota} onChange={(e) => setG({ ...g, quota: e.target.value })} /></label>
          </div>
          <div className="row between">
            {site.has_google_credentials ? <Button variant="danger" size="sm" icon="trash" onClick={() => save({ remove_google: 1 }, 'Google credentials removed')}>Remove</Button> : <span />}
            <div className="row">
              <Button loading={busy === 'save'} onClick={() => save({ ...(g.json ? { google_credentials: g.json } : {}), gsc_property: g.property, google_daily_quota: g.quota }, 'Google settings saved').then(() => setG((x) => ({ ...x, json: '' })))}>Save</Button>
              <Button variant="primary" icon="zap" loading={busy === 'test'} onClick={test} disabled={!site.has_google_credentials && !meta.simulate}>Test connection</Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'bing' && (
        <div className="stack" key="b" style={{ animation: 'pageIn .4s var(--ease-out)' }}>
          <div className={`alert ${site.bing_ok || site.indexnow_key ? 'ok' : 'info'}`}><Icon name={site.bing_ok ? 'checkCircle' : 'info'} />
            {site.bing_message || 'Add a Bing Webmaster API key for submission and status, or an IndexNow key for submission only.'}</div>
          <label className="field"><span>Bing Webmaster API key {site.has_bing_api_key && <span className="muted">· saved</span>}</span>
            <input className="input" type="password" value={b.key} onChange={(e) => setB({ ...b, key: e.target.value })} placeholder={site.has_bing_api_key ? '••••••••••••' : 'Bing Webmaster → Settings → API access'} autoComplete="off" /></label>
          <label className="field"><span>IndexNow key <span className="muted">· optional</span></span>
            <input className="input" value={b.indexnow} onChange={(e) => setB({ ...b, indexnow: e.target.value })} placeholder="e.g. 3f1c9a7e2b54…" />
            <small>Host it at <code>{site.site_url}{b.indexnow || '{key}'}.txt</code></small></label>
          <div className="row between">
            {site.has_bing_api_key ? <Button variant="danger" size="sm" icon="trash" onClick={() => save({ remove_bing: 1 }, 'Bing key removed')}>Remove key</Button> : <span />}
            <div className="row">
              <Button loading={busy === 'save'} onClick={() => save({ ...(b.key ? { bing_api_key: b.key } : {}), indexnow_key: b.indexnow }, 'Bing settings saved').then(() => setB((x) => ({ ...x, key: '' })))}>Save</Button>
              <Button variant="primary" icon="zap" loading={busy === 'test'} onClick={test}>Test connection</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Sites() {
  const { sites, reloadSites, setSiteId } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [loaded, setLoaded] = useState(false)
  const [edit, setEdit] = useState(null)
  const toast = useToast()
  const adding = params.get('add') === '1'
  const setAdding = (v) => setParams(v ? { add: '1' } : {})

  useEffect(() => { reloadSites().finally(() => setLoaded(true)) }, [reloadSites])

  const remove = async (s) => {
    if (!confirm(`Remove ${s.domain}? All of its URLs and history will be deleted.`)) return
    try { await api.del(`/sites/${s.id}`); toast(`${s.domain} removed`, 'ok'); setSiteId(''); reloadSites() } catch (e) { toast(e.message, 'err') }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Sites & ownership</h1><p>Verify the websites you own and connect them to Google and Bing.</p></div>
        <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add site</Button>
      </div>

      {loaded && sites.length === 0 && (
        <div className="panel"><Empty icon="globe" title="No websites yet" text="Add your website, prove you own it, then connect the search engines." action={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add your first site</Button>} /></div>
      )}

      <div className="sites-grid stagger">
        {sites.map((s) => {
          const total = Object.values(s.stats).reduce((a, x) => a + x, 0)
          const ok = s.stats.indexed || 0
          const bad = (s.stats.error || 0) + (s.stats.not_indexed || 0)
          return (
            <div className="panel site-tile spot" key={s.id}>
              <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
                <span className="fav">{s.domain.charAt(0).toUpperCase()}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.domain}</b>
                  <span className="small muted mono">{s.site_url}</span>
                </div>
                <Popover width={190} trigger={({ toggle }) => <Button variant="ghost" size="sm" className="btn-icon" icon="more" onClick={toggle} aria-label="Site actions" />}>
                  {(close) => (
                    <>
                      <button className="item" onClick={() => { close(); setEdit(s) }}><Icon name="settings" />Settings</button>
                      <button className="item" onClick={() => { close(); setSiteId(String(s.id)) }}><Icon name="check" />Use as workspace</button>
                      <hr />
                      <button className="item" style={{ color: 'var(--err)' }} onClick={() => { close(); remove(s) }}><Icon name="trash" />Remove site</button>
                    </>
                  )}
                </Popover>
              </div>
              <div className="row" style={{ gap: 14 }}>
                <span className="status" style={{ '--c': s.verified ? 'var(--ok)' : 'var(--warn)' }}><i />{s.verified ? 'Verified' : 'Not verified'}</span>
                <span className="eng"><GoogleIcon />{s.google_ok ? 'Connected' : 'Not connected'}</span>
                <span className="eng"><BingIcon />{s.bing_ok ? 'Connected' : s.indexnow_key ? 'IndexNow' : 'Not connected'}</span>
              </div>
              <div>
                <div className="meter" style={{ height: 6 }}>
                  {total > 0 && <i style={{ width: `${(ok / total) * 100}%`, background: 'var(--ok)' }} />}
                  {total > 0 && <i style={{ width: `${(bad / total) * 100}%`, background: 'var(--err)' }} />}
                </div>
                <div className="stat-row" style={{ marginTop: 10 }}><span><b>{total}</b> URLs</span><span><b>{ok}</b> indexed</span><span><b>{bad}</b> need fixing</span></div>
              </div>
              <div className="row">
                <Button size="sm" variant={s.verified ? '' : 'primary'} icon={s.verified ? 'settings' : 'shieldCheck'} onClick={() => setEdit(s)}>{s.verified ? 'Configure' : 'Verify now'}</Button>
                {s.verified && <Link to={`/app/reports?site_id=${s.id}`}><Button size="sm" variant="ghost" arrow>View URLs</Button></Link>}
              </div>
            </div>
          )
        })}
      </div>

      {adding && <AddSite onClose={() => setAdding(false)} onAdded={(s) => { setAdding(false); reloadSites(); setEdit(s); toast(`${s.domain} added. Now verify ownership.`, 'ok') }} />}
      {edit && <SiteSettings site={edit} onClose={() => { setEdit(null); reloadSites() }} onChange={() => reloadSites()} />}
    </div>
  )
}
