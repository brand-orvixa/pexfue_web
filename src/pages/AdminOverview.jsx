import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Button, Counter, Empty, Sparkline, Url, timeAgo } from '../ui.jsx'

export default function AdminOverview() {
  const [d, setD] = useState(null)
  useEffect(() => {
    let alive = true
    const load = () => api.get('/admin/overview').then((r) => alive && setD(r)).catch(() => {})
    load()
    const t = setInterval(load, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const t = d?.totals || {}
  const u = d?.urls || {}
  const j = d?.jobs || {}
  const series = d?.series || []
  const indexedPct = t.urls ? Math.round(((u.indexed || 0) / t.urls) * 100) : 0
  const failRate = (j.done || 0) + (j.failed || 0) ? Math.round(((j.failed || 0) / ((j.done || 0) + (j.failed || 0))) * 100) : 0

  return (
    <div className="stack">
      <div className="page-head">
        <div><div className="eyebrow-sm">Administration</div><h1>System overview</h1><p>Platform-wide usage, queue health and recent failures across all accounts.</p></div>
        <Link to="/app/admin/users"><Button icon="users" arrow>Manage users</Button></Link>
      </div>

      <div className="panel kpis stagger">
        {[
          ['Users', t.users, `${t.active || 0} active this week`, series.map((s) => s.signups), 'var(--ink)'],
          ['Sites', t.sites, 'Across all accounts', null, 'var(--blue)'],
          ['URLs tracked', t.urls, `${indexedPct}% indexed`, series.map((s) => s.submitted), 'var(--ok)'],
          ['Job failure rate', failRate, `${(j.failed || 0).toLocaleString()} failed jobs`, null, 'var(--err)', '%'],
        ].map(([l, v, sub, sp, c, suf]) => (
          <div className="kpi" key={l} style={{ '--c': c }}>
            <div className="k-label"><i />{l}</div>
            <div className="k-val">{d ? <><Counter value={v || 0} />{suf}</> : '–'}</div>
            <div className="k-sub">{sub}</div>
            {sp && <Sparkline data={sp} color={c} />}
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><div><h3>Queue health</h3><p>{d?.oldest_due ? `Oldest due job waiting since ${timeAgo(d.oldest_due)}. Check the worker.` : 'Worker is keeping up'}</p></div>
            <span className="status live" style={{ '--c': d?.oldest_due ? 'var(--warn)' : 'var(--ok)' }}><i />{d?.oldest_due ? 'Backlog' : 'Healthy'}</span></div>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            {['queued', 'running', 'done', 'failed', 'cancelled'].map((s) => (
              <div className="kpi" key={s} style={{ padding: '14px 16px' }}><div className="k-label" style={{ textTransform: 'capitalize' }}>{s}</div><div className="k-val" style={{ fontSize: 22 }}>{(j[s] || 0).toLocaleString()}</div></div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><h3>URL states</h3><p>All accounts</p></div></div>
          <div className="panel-body">
            <div className="meter">
              {[['indexed', 'var(--ok)'], ['crawled', 'var(--blue)'], ['pending', 'var(--warn)'], ['queued', 'var(--faint)'], ['error', 'var(--err)'], ['not_indexed', 'var(--err)']].map(([k, c]) => (u[k] || 0) > 0 && <i key={k} style={{ width: `${(u[k] / Math.max(1, t.urls)) * 100}%`, background: c }} />)}
            </div>
            <div className="meter-legend">
              {[['Indexed', 'indexed', 'var(--ok)'], ['Crawled', 'crawled', 'var(--blue)'], ['Pending / queued', null, 'var(--warn)'], ['Fix required', 'error', 'var(--err)']].map(([l, k, c]) => (
                <div key={l}><i style={{ background: c }} />{l}<b>{(k ? (u[k] || 0) + (k === 'error' ? u.not_indexed || 0 : 0) : (u.pending || 0) + (u.queued || 0)).toLocaleString()}</b></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><div><h3>Recent failures</h3><p>Latest errors across every account</p></div></div>
        {d && d.errors.length === 0 && <Empty icon="checkCircle" title="No recent errors" />}
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>URL</th><th>Account</th><th>Engine</th><th>Message</th><th>When</th></tr></thead>
            <tbody>
              {d?.errors.map((e) => (
                <tr key={e.id}>
                  <td style={{ maxWidth: 300 }}><Url value={e.url} /></td>
                  <td className="small">{e.email}</td>
                  <td style={{ textTransform: 'capitalize' }}>{e.engine || '—'}</td>
                  <td className="small" style={{ color: 'var(--err)', minWidth: 240 }}>{e.message}</td>
                  <td className="num muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
