import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, qs } from '../api.js'
import { useWorkspace } from '../components/AppLayout.jsx'
import { BingIcon, GoogleIcon, Icon } from '../icons.jsx'
import { Button, Drawer, Empty, EngineTags, Pager, SkeletonRows, Status, Tabs, Url, fmtDate, timeAgo, useToast } from '../ui.jsx'
import { FeedIcon } from './Dashboard.jsx'

export function UrlDetail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState('')
  const toast = useToast()
  const load = useCallback(() => api.get(`/urls/${id}`).then(setD).catch((e) => toast(e.message, 'err')), [id, toast])
  useEffect(() => { load() }, [load])

  const act = async (action) => {
    setBusy(action)
    try {
      const r = await api.post('/urls/bulk', { ids: [id], action })
      toast(r.affected ? (action === 'check' ? 'Status check queued' : 'Resubmitted') : 'Already being processed', r.affected ? 'ok' : 'info')
      load(); onChanged?.()
    } catch (e) { toast(e.message, 'err') } finally { setBusy('') }
  }

  const u = d?.url
  return (
    <Drawer title={u ? <Url value={u.url} /> : 'Loading…'} subtitle={u && <Status status={u.status} long />} onClose={onClose}>
      {!d ? <div className="skeleton" style={{ height: 240 }} /> : (
        <div className="stack">
          <div className="row">
            <Button size="sm" icon="refresh" loading={busy === 'resubmit'} onClick={() => act('resubmit')}>Resubmit</Button>
            <Button size="sm" icon="search" loading={busy === 'check'} onClick={() => act('check')}>Check now</Button>
            <a href={u.url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon="external">Open page</Button></a>
          </div>
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {['google', 'bing'].filter((e) => u.engines.includes(e)).map((e) => (
              <div className="box" key={e}>
                <div className="row between">
                  <span className="eng" style={{ color: 'var(--ink)', fontSize: 13 }}>{e === 'google' ? <GoogleIcon /> : <BingIcon />}{e === 'google' ? 'Google' : 'Bing'}</span>
                  <Status status={u[`${e}_status`]} />
                </div>
                <div className="small muted">{u[`${e}_detail`] || '—'}</div>
              </div>
            ))}
          </div>
          <dl className="dl">
            <dt>Added</dt><dd>{fmtDate(u.created_at)}</dd>
            <dt>Last submitted</dt><dd>{fmtDate(u.submitted_at)}</dd>
            <dt>Last checked</dt><dd>{fmtDate(u.last_checked_at)}</dd>
            {u.status === 'indexed' && <><dt>Indexed</dt><dd>{fmtDate(u.indexed_at)}</dd></>}
            <dt>Submissions</dt><dd className="num">{u.submit_count}</dd>
            <dt>Status checks</dt><dd className="num">{u.check_count}</dd>
          </dl>
          <div className="divider" style={{ margin: '4px 0' }} />
          <div className="row between">
            <h4 style={{ fontSize: 13.5 }}>History</h4>
            <Button size="sm" variant="ghost" icon="download" onClick={() => api.download(`/export/logs${qs({ url_id: id })}`, 'history.csv')}>CSV</Button>
          </div>
          <div className="timeline">
            {d.logs.map((l, i) => (
              <div className="tl" key={l.id} style={{ animationDelay: `${Math.min(i, 12) * 0.03}s` }}>
                <FeedIcon result={l.result} action={l.action} />
                <div style={{ minWidth: 0 }}>
                  <div className="row between" style={{ gap: 6 }}>
                    <span style={{ fontSize: 13 }}><b style={{ fontWeight: 550, textTransform: 'capitalize' }}>{l.action}</b>
                      {l.engine && <span className="muted"> · {l.engine}</span>}{l.http_code && <span className="muted num"> · {l.http_code}</span>}</span>
                    <span className="num muted" style={{ fontSize: 11.5 }}>{fmtDate(l.created_at)}</span>
                  </div>
                  <div className="small" style={{ color: 'var(--ink-2)', marginTop: 2 }}>{l.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default function Reports() {
  const { sites, siteId: wsSite } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [sel, setSel] = useState(new Set())
  const [open, setOpen] = useState(null)
  const [q, setQ] = useState(params.get('q') || '')
  const toast = useToast()

  const f = {
    status: params.get('status') || '',
    site_id: params.get('site_id') ?? wsSite ?? '',
    engine: params.get('engine') || '',
    q: params.get('q') || '',
    page: params.get('page') || 1,
  }
  const key = qs(f)
  const setF = (patch) => {
    const n = { ...f, page: 1, ...patch }
    setParams(Object.fromEntries(Object.entries(n).filter(([k, v]) => (k === 'site_id' ? true : v) && !(k === 'page' && Number(v) === 1))))
  }

  const load = useCallback(() => api.get(`/urls${key}`).then(setData).catch((e) => toast(e.message, 'err')), [key, toast])
  useEffect(() => { setData(null); setSel(new Set()); load() }, [load])

  const live = data?.items.some((u) => ['queued', 'pending', 'crawled'].includes(u.status))
  useEffect(() => {
    if (!live) return
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [live, load])

  useEffect(() => {
    const t = setTimeout(() => q !== f.q && setF({ q }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const all = data?.items || []
  const allSel = all.length > 0 && all.every((u) => sel.has(u.id))
  const toggle = (id) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const bulk = async (action) => {
    if (action === 'delete' && !confirm(`Delete ${sel.size} URL(s) and their history?`)) return
    try {
      const r = await api.post('/urls/bulk', { ids: [...sel], action })
      toast(`${r.affected} URL(s) ${action === 'delete' ? 'deleted' : action === 'check' ? 'queued for a status check' : 'resubmitted'}`, 'ok')
      setSel(new Set()); load()
    } catch (e) { toast(e.message, 'err') }
  }
  const one = async (e, id, action) => {
    e.stopPropagation()
    try { const r = await api.post('/urls/bulk', { ids: [id], action }); toast(r.affected ? 'Resubmitted' : 'Already being processed', r.affected ? 'ok' : 'info'); load() } catch (ex) { toast(ex.message, 'err') }
  }

  const c = data?.counts || {}
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Live report</h1><p>Every URL with its current Google and Bing status{live && ' · updating live'}.</p></div>
        <div className="row">
          <Button icon="download" onClick={() => api.download(`/export/urls${qs({ ...f, page: '' })}`, 'urls.csv').catch((e) => toast(e.message, 'err'))}>Export CSV</Button>
          <Link to="/app/submit"><Button variant="primary" icon="plus">Add URLs</Button></Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <Tabs value={f.status} onChange={(v) => setF({ status: v })} items={[
            { value: '', label: 'All', count: c.all },
            { value: 'indexed', label: 'Indexed', count: c.indexed },
            { value: 'pending', label: 'Pending', count: c.pending },
            { value: 'error', label: 'Fix required', count: c.error },
          ]} />
          <div className="row">
            <div className="input-icon"><Icon name="search" /><input className="input" style={{ width: 220 }} placeholder="Filter by URL…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select className="select" style={{ width: 'auto' }} value={f.site_id} onChange={(e) => setF({ site_id: e.target.value })} aria-label="Site">
              <option value="">All sites</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.domain}</option>)}
            </select>
            <select className="select" style={{ width: 'auto' }} value={f.engine} onChange={(e) => setF({ engine: e.target.value })} aria-label="Engine">
              <option value="">All engines</option><option value="google">Google</option><option value="bing">Bing</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr>
                <th style={{ width: 34 }}><input type="checkbox" className="cb" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(all.map((u) => u.id)))} aria-label="Select all" /></th>
                <th>URL</th><th>Status</th><th className="hide-sm">Google</th><th className="hide-sm">Bing</th><th className="hide-sm">Checks</th><th className="hide-sm">Updated</th><th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {!data && <SkeletonRows cols={8} />}
              {all.map((u) => (
                <tr key={u.id} className={`clickable ${sel.has(u.id) ? 'sel' : ''}`} onClick={() => setOpen(u.id)}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="cb" checked={sel.has(u.id)} onChange={() => toggle(u.id)} aria-label="Select" /></td>
                  <td style={{ maxWidth: 440 }}><Url value={u.url} /><div style={{ marginTop: 3 }}><EngineTags engines={u.engines} /></div></td>
                  <td><Status status={u.status} /></td>
                  <td className="hide-sm" title={u.google_detail || ''}>{u.google_status ? <Status status={u.google_status} /> : <span className="muted">—</span>}</td>
                  <td className="hide-sm" title={u.bing_detail || ''}>{u.bing_status ? <Status status={u.bing_status} /> : <span className="muted">—</span>}</td>
                  <td className="hide-sm num muted">{u.check_count}</td>
                  <td className="hide-sm num muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(u.updated_at)}</td>
                  <td><span className="row-actions row" style={{ gap: 2, flexWrap: 'nowrap' }}>
                    <Button size="sm" variant="ghost" className="btn-icon" icon="refresh" title="Resubmit" onClick={(e) => one(e, u.id, 'resubmit')} />
                    <Button size="sm" variant="ghost" className="btn-icon" icon="chevronRight" title="Details" />
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && all.length === 0 && (
          <Empty icon="list" title={f.status || f.q ? 'Nothing matches these filters' : 'No URLs yet'} text={f.status || f.q ? 'Try a different tab or clear the search.' : 'Submit URLs to see their live indexing status here.'}
            action={!f.status && !f.q && <Link to="/app/submit"><Button variant="primary" icon="send">Submit URLs</Button></Link>} />
        )}
        {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => setF({ page: p })} />}
      </div>

      {sel.size > 0 && (
        <div className="bulkbar">
          <span className="num" style={{ marginRight: 8 }}>{sel.size} selected</span>
          <Button size="sm" icon="refresh" onClick={() => bulk('resubmit')}>Resubmit</Button>
          <Button size="sm" icon="search" onClick={() => bulk('check')}>Check status</Button>
          <Button size="sm" icon="trash" onClick={() => bulk('delete')}>Delete</Button>
          <Button size="sm" className="btn-icon" icon="x" onClick={() => setSel(new Set())} aria-label="Clear selection" />
        </div>
      )}
      {open && <UrlDetail id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  )
}
