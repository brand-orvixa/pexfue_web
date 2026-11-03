import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { useWorkspace } from '../components/AppLayout.jsx'
import { BingIcon, GoogleIcon } from '../icons.jsx'
import { Button, CopyBox, Counter, Empty, Pager, SkeletonRows, Tabs, Url, timeAgo, useToast } from '../ui.jsx'
import { UrlDetail } from './Reports.jsx'

const JOB = { queued: 'var(--faint)', running: 'var(--blue)', done: 'var(--ok)', failed: 'var(--err)', cancelled: 'var(--faint)' }

export default function Queue() {
  const { reloadPulse } = useWorkspace()
  const [tab, setTab] = useState('active')
  const [page, setPage] = useState(1)
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState('')
  const [open, setOpen] = useState(null)
  const toast = useToast()

  const load = useCallback(() => api.get(`/queue?status=${tab}&page=${page}`).then(setD).catch((e) => toast(e.message, 'err')), [tab, page, toast])
  useEffect(() => { setD(null); load() }, [load])
  useEffect(() => { const t = setInterval(load, 5000); return () => clearInterval(t) }, [load])

  const act = async (name, fn) => {
    setBusy(name)
    try { await fn(); load(); reloadPulse() } catch (e) { toast(e.message, 'err') } finally { setBusy('') }
  }
  const run = () => act('run', async () => { const r = await api.post('/queue/run', { limit: 25 }); toast(r.processed ? `Processed ${r.processed} job(s)` : 'No jobs are due right now', r.processed ? 'ok' : 'info') })
  const retry = () => act('retry', async () => { const r = await api.post('/queue/retry-failed'); toast(`${r.affected} failed URL(s) re-queued`, r.affected ? 'ok' : 'info') })
  const cancel = (id) => act('c' + id, async () => { await api.post(`/queue/${id}/cancel`); toast('Job cancelled', 'ok') })

  const c = d?.counts || {}
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Queue</h1><p>Bulk submissions, status checks and retries run here in the background.</p></div>
        <div className="row">
          <Button icon="refresh" loading={busy === 'retry'} onClick={retry}>Retry all failed</Button>
          <Button variant="primary" icon="play" loading={busy === 'run'} onClick={run}>Run now{c.due ? ` · ${c.due} due` : ''}</Button>
        </div>
      </div>

      <div className="panel kpis">
        {[['Queued', c.queued, 'var(--faint)'], ['Running', c.running, 'var(--blue)'], ['Completed', c.done, 'var(--ok)'], ['Failed', c.failed, 'var(--err)']].map(([l, v, col]) => (
          <div className="kpi" key={l} style={{ '--c': col }}><div className="k-label"><i />{l}</div><div className="k-val">{d ? <Counter value={v || 0} /> : '–'}</div></div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <Tabs value={tab} onChange={(v) => { setTab(v); setPage(1) }} items={[
            { value: 'active', label: 'Active', count: (c.queued || 0) + (c.running || 0) },
            { value: 'failed', label: 'Failed', count: c.failed }, { value: 'done', label: 'Done', count: c.done },
            { value: 'cancelled', label: 'Cancelled', count: c.cancelled }, { value: 'all', label: 'All' },
          ]} />
          <span className="row small muted"><span className="status live" style={{ '--c': 'var(--ok)' }}><i /></span>Refreshing every 5s</span>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>URL</th><th>Job</th><th>State</th><th>Attempt</th><th className="hide-sm">{tab === 'active' ? 'Runs' : 'Updated'}</th><th className="hide-sm">Last error</th><th /></tr></thead>
            <tbody>
              {!d && <SkeletonRows cols={7} />}
              {d?.items.map((j) => (
                <tr key={j.id} className="clickable" onClick={() => setOpen(j.url_id)}>
                  <td style={{ maxWidth: 360 }}><Url value={j.url} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}><span className="eng" style={{ color: 'var(--ink-2)' }}>{j.engine === 'google' ? <GoogleIcon /> : <BingIcon />}{j.type === 'submit' ? 'Index request' : 'Status check'}</span></td>
                  <td><span className={`status ${j.status === 'running' ? 'live' : ''}`} style={{ '--c': JOB[j.status] }}><i />{j.status}</span></td>
                  <td className="num">{Number(j.attempts) + (j.status === 'done' ? 0 : 1)}</td>
                  <td className="hide-sm num muted" style={{ whiteSpace: 'nowrap' }}>{tab === 'active' ? (j.status === 'running' ? 'now' : timeAgo(j.available_at)) : timeAgo(j.updated_at)}</td>
                  <td className="hide-sm small" style={{ color: 'var(--err)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={j.last_error || ''}>{j.last_error || ''}</td>
                  <td onClick={(e) => e.stopPropagation()}>{j.status === 'queued' && <Button size="sm" variant="ghost" loading={busy === 'c' + j.id} onClick={() => cancel(j.id)}>Cancel</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {d && d.items.length === 0 && <Empty icon="layers" title={tab === 'active' ? 'The queue is clear' : 'Nothing here'} text={tab === 'active' ? 'New bulk submissions will appear here while they are processed.' : undefined} />}
        {d && <Pager page={d.page} pages={d.pages} total={d.total} onPage={setPage} />}
      </div>

      <div className="panel panel-body row between">
        <div><b style={{ fontWeight: 550 }}>Background worker</b><p className="small muted" style={{ marginTop: 3 }}>In production, run the worker from cron every minute.</p></div>
        <div style={{ flex: '1 1 340px', maxWidth: 520 }}><CopyBox text="* * * * * php /path/to/backend/spark queue:work" /></div>
      </div>

      {open && <UrlDetail id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  )
}
