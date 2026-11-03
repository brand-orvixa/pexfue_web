import { useCallback, useEffect, useState } from 'react'
import { api, qs } from '../api.js'
import { Button, Empty, Pager, SkeletonRows, Url, fmtDate, useToast } from '../ui.jsx'
import { Icon } from '../icons.jsx'
import { FeedIcon } from './Dashboard.jsx'
import { UrlDetail } from './Reports.jsx'

export default function Logs() {
  const [f, setF] = useState({ engine: '', action: '', result: '', q: '', from: '', to: '' })
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [d, setD] = useState(null)
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState('')
  const toast = useToast()

  const key = qs({ ...f, page })
  const load = useCallback(() => api.get(`/logs${key}`).then(setD).catch((e) => toast(e.message, 'err')), [key, toast])
  useEffect(() => { setD(null); load() }, [load])
  useEffect(() => { const t = setTimeout(() => { setF((x) => (x.q === q ? x : { ...x, q })); setPage(1) }, 300); return () => clearTimeout(t) }, [q])

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1) }
  const exp = async (kind) => {
    setBusy(kind)
    try { await api.download(kind === 'logs' ? `/export/logs${qs(f)}` : '/export/urls', `${kind}.csv`); toast('Export downloaded', 'ok') }
    catch (e) { toast(e.message, 'err') } finally { setBusy('') }
  }
  const filtered = Object.values(f).some(Boolean)

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Logs & export</h1><p>The complete indexing history of every URL, request by request.</p></div>
        <div className="row">
          <Button icon="download" loading={busy === 'urls'} onClick={() => exp('urls')}>URL report</Button>
          <Button variant="primary" icon="download" loading={busy === 'logs'} onClick={() => exp('logs')}>Export {filtered ? 'filtered ' : ''}history</Button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="row">
            <div className="input-icon"><Icon name="search" /><input className="input" style={{ width: 230 }} placeholder="Search URL or message…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select className="select" style={{ width: 'auto' }} value={f.engine} onChange={set('engine')} aria-label="Engine"><option value="">All engines</option><option value="google">Google</option><option value="bing">Bing</option></select>
            <select className="select" style={{ width: 'auto' }} value={f.action} onChange={set('action')} aria-label="Action">
              <option value="">All actions</option>{['queue', 'validate', 'submit', 'status', 'retry'].map((a) => <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={f.result} onChange={set('result')} aria-label="Result"><option value="">All results</option><option value="success">Success</option><option value="error">Error</option><option value="info">Info</option></select>
          </div>
          <div className="row">
            <input className="input" type="date" style={{ width: 'auto' }} value={f.from} onChange={set('from')} aria-label="From" />
            <span className="muted">–</span>
            <input className="input" type="date" style={{ width: 'auto' }} value={f.to} onChange={set('to')} aria-label="To" />
            {filtered && <Button variant="ghost" size="sm" onClick={() => { setF({ engine: '', action: '', result: '', q: '', from: '', to: '' }); setQ('') }}>Reset</Button>}
          </div>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th style={{ width: 40 }} /><th>Time</th><th>URL</th><th>Engine</th><th>Action</th><th>Message</th></tr></thead>
            <tbody>
              {!d && <SkeletonRows cols={6} />}
              {d?.items.map((l) => (
                <tr key={l.id} className="clickable" onClick={() => setOpen(l.url_id)}>
                  <td><FeedIcon result={l.result} action={l.action} /></td>
                  <td className="num muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                  <td style={{ maxWidth: 300 }}><Url value={l.url} /></td>
                  <td style={{ textTransform: 'capitalize' }}>{l.engine || <span className="muted">—</span>}</td>
                  <td><span className="chip" style={{ textTransform: 'capitalize' }}>{l.action}</span></td>
                  <td className="small" style={{ color: l.result === 'error' ? 'var(--err)' : 'var(--ink-2)', minWidth: 260 }}>{l.message}{l.http_code ? <span className="num muted"> · {l.http_code}</span> : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d && d.items.length === 0 && <Empty icon="history" title="No log entries" text="Activity appears here as URLs are processed." />}
        {d && <Pager page={d.page} pages={d.pages} total={d.total} onPage={setPage} />}
      </div>
      {open && <UrlDetail id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
