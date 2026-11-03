import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useWorkspace } from '../components/AppLayout.jsx'
import { BingIcon, GoogleIcon, Icon } from '../icons.jsx'
import { Button, Status, Url, useToast } from '../ui.jsx'

const looksValid = (u) => /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]+/i.test(u)

export default function Submit() {
  const { meta } = useAuth()
  const { sites, siteId: wsSite, reloadPulse } = useWorkspace()
  const toast = useToast()
  const fileRef = useRef(null)
  const [text, setText] = useState('')
  const [engines, setEngines] = useState(['google', 'bing'])
  const [siteId, setSiteId] = useState(wsSite || '')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)

  const parsed = useMemo(() => {
    const raw = text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)
    const list = [...new Set(raw)]
    return { list, dupes: raw.length - list.length, invalid: list.filter((u) => !looksValid(u)).length }
  }, [text])
  const verified = sites.filter((s) => s.verified)
  const toggle = (e) => setEngines((l) => (l.includes(e) ? l.filter((x) => x !== e) : [...l, e]))

  const readFile = async (file) => {
    if (!file) return
    const urls = (await file.text()).match(/https?:\/\/[^\s"'<>,;]+/gi) || []
    setText((cur) => [cur.trim(), ...urls].filter(Boolean).join('\n'))
    toast(`Loaded ${urls.length.toLocaleString()} URL(s) from ${file.name}`, 'ok')
  }

  const submit = async () => {
    setBusy(true); setResult(null)
    try {
      const r = await api.post('/urls', { urls: parsed.list, engines, site_id: siteId || undefined })
      setResult(r)
      reloadPulse()
      if (r.accepted) {
        toast(r.processed_inline ? 'Indexing request sent' : `${r.accepted.toLocaleString()} URL(s) added to the queue`, 'ok')
        setText(r.rejected.map((x) => x.url).join('\n'))
      } else toast('No URLs were accepted. See the reasons below.', 'err')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const n = parsed.list.length
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Submit URLs</h1><p>One URL is sent immediately. Lists of two or more go through the queue.</p></div>
        <Link to="/app/reports"><Button icon="list">Open live report</Button></Link>
      </div>

      {verified.length === 0 && (
        <div className="alert info"><Icon name="shieldCheck" />
          <span>Add and verify a website before submitting. <Link to="/app/sites?add=1" style={{ color: 'var(--ink)', fontWeight: 550 }}>Add a site →</Link></span>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="panel"
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files[0]) }}>
          <div className="panel-head">
            <div className="row" style={{ gap: 14 }}>
              <h3>URLs</h3>
              <span className="row small muted" style={{ gap: 12 }}>
                <span><span className="num" style={{ color: 'var(--ink)' }}>{n.toLocaleString()}</span> unique</span>
                {parsed.dupes > 0 && <span><span className="num">{parsed.dupes}</span> duplicates removed</span>}
                {parsed.invalid > 0 && <span style={{ color: 'var(--err)' }}><span className="num">{parsed.invalid}</span> invalid</span>}
              </span>
            </div>
            <div className="row">
              <input ref={fileRef} type="file" accept=".txt,.csv,.xml,text/plain,text/csv" hidden onChange={(e) => { readFile(e.target.files[0]); e.target.value = '' }} />
              <Button size="sm" icon="upload" onClick={() => fileRef.current.click()}>Import file</Button>
              {text && <Button size="sm" variant="ghost" onClick={() => { setText(''); setResult(null) }}>Clear</Button>}
            </div>
          </div>
          <div style={{ padding: 12, position: 'relative' }}>
            <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
              style={{ minHeight: 360, border: 0, boxShadow: drag ? 'var(--ring)' : 'none', background: drag ? 'var(--accent-soft)' : 'var(--surface-2)' }}
              placeholder={'https://yoursite.com/tours/goa-beach-holiday\nhttps://yoursite.com/flights/delhi-to-dubai\n\nOne per line. Commas and spaces work too.\nDrop a .txt, .csv or sitemap.xml anywhere here.'} />
          </div>
          <div className="panel-foot">
            <span>Max {meta.max_bulk?.toLocaleString()} per batch · duplicates are skipped</span>
            <span className="row" style={{ gap: 6 }}><span className="kbd">⌘</span><span className="kbd">↵</span> to submit</span>
          </div>
        </div>

        <div className="stack" style={{ position: 'sticky', top: 76 }}>
          <div className="panel">
            <div className="panel-head"><div><h3>Destination</h3><p>Where the indexing request goes</p></div></div>
            <div className="panel-body stack" style={{ gap: 10 }}>
              {[['google', 'Google', 'Indexing API · URL Inspection', GoogleIcon], ['bing', 'Bing', 'Webmaster API · IndexNow', BingIcon]].map(([k, label, d, Ico]) => (
                <label key={k} className={`opt ${engines.includes(k) ? 'on' : ''}`}>
                  <input type="checkbox" checked={engines.includes(k)} onChange={() => toggle(k)} />
                  <Ico width={22} height={22} />
                  <div><b>{label}</b><div className="small muted">{d}</div></div>
                  <span className={`switch ${engines.includes(k) ? 'on' : ''}`} />
                </label>
              ))}
              <label className="field" style={{ marginTop: 6 }}><span>Site</span>
                <select className="select" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                  <option value="">Detect from each URL</option>
                  {verified.map((s) => <option key={s.id} value={s.id}>{s.domain}</option>)}
                </select>
              </label>
            </div>
            <div className="panel-foot" style={{ display: 'block' }}>
              <Button variant="primary" size="lg" style={{ width: '100%' }} loading={busy} disabled={!n || !engines.length} onClick={submit} arrow={!busy}>
                {n > 1 ? `Queue ${n.toLocaleString()} URLs` : 'Request indexing'}
              </Button>
            </div>
          </div>
          <div className="panel panel-body">
            <ol className="steps-mini">
              <li>Validated and matched to your verified site</li>
              <li>Live check, then sent to the selected engines</li>
              <li>Status checked automatically, up to {meta.status_checks || 5} times</li>
              <li>Failures retried, and every step logged</li>
            </ol>
          </div>
        </div>
      </div>

      {result && (
        <div className="panel" style={{ animation: 'pageIn .5s var(--ease-out) both' }}>
          <div className="panel-head">
            <div><h3>Result</h3><p>{result.accepted.toLocaleString()} accepted · {result.rejected.length.toLocaleString()} rejected{result.processed_inline ? ' · sent immediately' : ' · queued'}</p></div>
            {result.accepted > 0 && <Link to="/app/reports"><Button size="sm" variant="primary" arrow>View in report</Button></Link>}
          </div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>URL</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {result.items.map((u) => (
                  <tr key={u.id}><td><Url value={u.url} /></td><td><Status status={u.status} /></td>
                    <td className="small muted">{[u.google_detail && `Google: ${u.google_detail}`, u.bing_detail && `Bing: ${u.bing_detail}`].filter(Boolean).join(' · ') || 'Queued'}</td></tr>
                ))}
                {result.rejected.map((r) => (
                  <tr key={r.url}><td><Url value={r.url} /></td><td><span className="chip err">Rejected</span></td><td className="small" style={{ color: 'var(--err)' }}>{r.reason}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Hotkey onSubmit={() => n && engines.length && !busy && submit()} />
    </div>
  )
}

function Hotkey({ onSubmit }) {
  const ref = useRef(onSubmit)
  useEffect(() => { ref.current = onSubmit })
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); ref.current() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  return null
}
