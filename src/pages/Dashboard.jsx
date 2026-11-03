import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { useWorkspace } from '../components/AppLayout.jsx'
import { BingIcon, GoogleIcon, Icon } from '../icons.jsx'
import { Button, Counter, Empty, Sparkline, Tabs, Url, timeAgo, useToast } from '../ui.jsx'

const C = { submitted: 'var(--ink)', indexed: 'var(--ok)', errors: 'var(--accent)' }

function ActivityChart({ series }) {
  const [hover, setHover] = useState(null)
  const wrap = useRef(null)
  const W = 720, H = 250, P = { l: 30, r: 6, t: 10, b: 24 }
  const max = Math.max(4, ...series.map((d) => Math.max(d.submitted, d.indexed, d.errors)))
  const nice = Math.ceil(max / 4) * 4
  const n = series.length
  const slot = (W - P.l - P.r) / n
  const bw = Math.max(3, Math.min(14, slot * 0.28))
  const y = (v) => H - P.b - (v / nice) * (H - P.t - P.b)
  const cx = (i) => P.l + slot * i + slot / 2
  const line = series.map((d, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(d.errors).toFixed(1)}`).join('')
  const every = n > 14 ? 5 : n > 7 ? 2 : 1

  const move = (e) => {
    const r = wrap.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setHover(Math.max(0, Math.min(n - 1, Math.floor((px - P.l) / slot))))
  }

  return (
    <div className="chart-wrap" ref={wrap} onMouseMove={move} onMouseLeave={() => setHover(null)}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Indexing activity">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}><line className="grid" x1={P.l} x2={W - P.r} y1={y(nice * f)} y2={y(nice * f)} strokeDasharray={f ? '2 4' : ''} />
            <text x={P.l - 8} y={y(nice * f) + 4} textAnchor="end">{Math.round(nice * f)}</text></g>
        ))}
        {hover !== null && <rect x={P.l + slot * hover + 2} y={P.t} width={slot - 4} height={H - P.t - P.b} rx="6" fill="var(--sunken)" />}
        {series.map((d, i) => (
          <g key={d.date} style={{ opacity: hover === null || hover === i ? 1 : 0.45, transition: 'opacity .2s' }}>
            <rect className="bar" x={cx(i) - bw - 1} y={y(d.submitted)} width={bw} height={Math.max(0, H - P.b - y(d.submitted))} rx="2.5" fill={C.submitted} style={{ animationDelay: `${i * 25}ms` }} />
            <rect className="bar" x={cx(i) + 1} y={y(d.indexed)} width={bw} height={Math.max(0, H - P.b - y(d.indexed))} rx="2.5" fill={C.indexed} style={{ animationDelay: `${i * 25 + 60}ms` }} />
            {i % every === 0 && <text x={cx(i)} y={H - 6} textAnchor="middle">{new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</text>}
          </g>
        ))}
        <path className="line" d={line} stroke={C.errors} />
        {series.map((d, i) => d.errors > 0 && <circle key={i} cx={cx(i)} cy={y(d.errors)} r="3" fill="var(--surface)" stroke={C.errors} strokeWidth="1.5" />)}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: `${(cx(hover) / W) * 100}%`, top: `${(y(Math.max(series[hover].submitted, series[hover].indexed)) / H) * 100}%` }}>
          <b>{new Date(series[hover].date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
          <div><span><i style={{ background: '#9a9ca6' }} />Submitted</span><span className="num">{series[hover].submitted}</span></div>
          <div><span><i style={{ background: '#3ccf8e' }} />Indexed</span><span className="num">{series[hover].indexed}</span></div>
          <div><span><i style={{ background: '#ff6a33' }} />Errors</span><span className="num">{series[hover].errors}</span></div>
        </div>
      )}
    </div>
  )
}

export function FeedIcon({ result, action }) {
  const [ic, bg, fg] = action === 'retry' ? ['repeat', 'var(--warn-soft)', 'var(--warn)']
    : result === 'success' ? ['check', 'var(--ok-soft)', 'var(--ok)']
      : result === 'error' ? ['x', 'var(--err-soft)', 'var(--err)']
        : ['info', 'var(--sunken)', 'var(--muted)']
  return <span className="fi" style={{ background: bg, color: fg }}><Icon name={ic} /></span>
}

function delta(arr) {
  const h = Math.floor(arr.length / 2)
  const a = arr.slice(0, h).reduce((x, y) => x + y, 0)
  const b = arr.slice(h).reduce((x, y) => x + y, 0)
  if (!a && !b) return null
  if (!a) return { up: true, v: 'new' }
  const p = Math.round(((b - a) / a) * 100)
  return { up: p >= 0, v: `${p >= 0 ? '+' : ''}${p}%` }
}

function Onboarding({ sites, total }) {
  const nav = useNavigate()
  const steps = [
    ['Add your website', sites.length > 0, '/app/sites?add=1'],
    ['Verify ownership', sites.some((s) => s.verified), '/app/sites'],
    ['Connect Google or Bing', sites.some((s) => s.google_ok || s.bing_ok || s.indexnow_key), '/app/sites'],
    ['Submit your first URL', total > 0, '/app/submit'],
  ]
  const done = steps.filter((s) => s[1]).length
  if (done === steps.length) return null
  return (
    <div className="panel">
      <div className="panel-head"><div><h3>Get set up</h3><p>{done} of {steps.length} complete</p></div><div className="progress" style={{ width: 160 }}><i style={{ width: `${(done / steps.length) * 100}%` }} /></div></div>
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', padding: 12, gap: 10 }}>
        {steps.map(([t, ok, to], i) => (
          <button key={t} className="opt" onClick={() => nav(to)} style={{ opacity: ok ? 0.55 : 1 }}>
            <span className="fi" style={{ background: ok ? 'var(--ok-soft)' : 'var(--sunken)', color: ok ? 'var(--ok)' : 'var(--muted)' }}>{ok ? <Icon name="check" /> : <span className="num" style={{ fontSize: 11 }}>{i + 1}</span>}</span>
            <b style={{ textDecoration: ok ? 'line-through' : 'none' }}>{t}</b>
            {!ok && <Icon name="arrowRight" width={14} height={14} style={{ marginLeft: 'auto', color: 'var(--muted)' }} />}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { sites, reloadPulse } = useWorkspace()
  const toast = useToast()
  const [days, setDays] = useState(14)
  const [d, setD] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => api.get(`/dashboard?days=${days}`).then((r) => alive && setD(r)).catch(() => {})
    load()
    const t = setInterval(load, 10000)
    return () => { alive = false; clearInterval(t) }
  }, [days])

  const s = d?.status || {}
  const pending = (s.queued || 0) + (s.pending || 0) + (s.crawled || 0)
  const errors = (s.error || 0) + (s.not_indexed || 0)
  const total = d?.total || 0
  const rate = total ? Math.round(((s.indexed || 0) / total) * 100) : 0

  const series = useMemo(() => d?.series || [], [d])
  const sp = useMemo(() => ({
    submitted: series.map((x) => x.submitted),
    indexed: series.map((x) => x.indexed),
    pending: series.map((x) => Math.max(0, x.submitted - x.indexed)),
    errors: series.map((x) => x.errors),
  }), [series])

  const kpis = [
    { label: 'Total URLs', val: total, c: 'var(--ink)', spark: sp.submitted, sub: `${sites.length} site${sites.length === 1 ? '' : 's'}`, dl: delta(sp.submitted) },
    { label: 'Indexed', val: s.indexed || 0, c: 'var(--ok)', spark: sp.indexed, sub: `${rate}% coverage`, dl: delta(sp.indexed) },
    { label: 'Pending', val: pending, c: 'var(--warn)', spark: sp.pending, sub: `${d?.queue || 0} jobs in queue` },
    { label: 'Fix required', val: errors, c: 'var(--err)', spark: sp.errors, sub: errors ? 'Needs attention' : 'All clear', dl: delta(sp.errors), invert: true },
  ]

  const parts = [
    ['Indexed', s.indexed || 0, 'var(--ok)'],
    ['Crawled', s.crawled || 0, 'var(--blue)'],
    ['Pending', (s.pending || 0) + (s.queued || 0), 'var(--warn)'],
    ['Fix required', errors, 'var(--err)'],
  ]

  const runQueue = async () => {
    setRunning(true)
    try { const r = await api.post('/queue/run', { limit: 25 }); toast(r.processed ? `Processed ${r.processed} job(s)` : 'No jobs are due yet', r.processed ? 'ok' : 'info'); reloadPulse() }
    catch (e) { toast(e.message, 'err') } finally { setRunning(false) }
  }

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const jobs = d?.jobs || {}

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="eyebrow-sm">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{greet}, {user?.name?.split(' ')[0]}</h1>
          <p>Here’s how your pages are doing across Google and Bing.</p>
        </div>
        <div className="row">
          <Tabs value={days} onChange={setDays} items={[{ value: 7, label: '7d' }, { value: 14, label: '14d' }, { value: 30, label: '30d' }]} />
          <Button icon="download" onClick={() => api.download('/export/urls', 'urls.csv')}>Export</Button>
          <Link to="/app/submit"><Button variant="accent" icon="send">Submit URLs</Button></Link>
        </div>
      </div>

      {d && <Onboarding sites={sites} total={total} />}

      <div className="panel kpis stagger">
        {kpis.map((k) => (
          <div className="kpi" key={k.label} style={{ '--c': k.c }}>
            <div className="k-label"><i />{k.label}</div>
            <div className="k-val">{d ? <Counter value={k.val} /> : <span className="skeleton" style={{ display: 'block', height: 28, width: 70 }} />}</div>
            <div className="k-sub">
              {k.dl && <span className={`delta ${(k.invert ? !k.dl.up : k.dl.up) ? 'up' : 'down'}`}>{k.dl.v}</span>}
              {k.sub}
            </div>
            <Sparkline data={k.spark} color={k.c} />
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><h3>Indexing activity</h3><p>Requests sent vs. pages confirmed indexed</p></div>
            <div className="legend"><span><i style={{ background: C.submitted }} />Submitted</span><span><i style={{ background: C.indexed }} />Indexed</span><span><i style={{ background: C.errors, borderRadius: 4 }} />Errors</span></div>
          </div>
          <div className="panel-body">{d ? <ActivityChart key={days} series={series} /> : <div className="skeleton" style={{ height: 250 }} />}</div>
        </div>

        <div className="panel">
          <div className="panel-head"><div><h3>Index coverage</h3><p>Share of URLs confirmed in the index</p></div></div>
          <div className="panel-body">
            <div className="row" style={{ alignItems: 'baseline', gap: 10 }}>
              <span className="big-num">{d ? <Counter value={rate} /> : 0}%</span>
              <span className="muted small">{(s.indexed || 0).toLocaleString()} of {total.toLocaleString()} URLs</span>
            </div>
            <div className="meter" style={{ marginTop: 18 }}>
              {parts.map(([l, v, c]) => v > 0 && <i key={l} style={{ width: `${(v / Math.max(1, total)) * 100}%`, background: c }} />)}
            </div>
            <div className="meter-legend">
              {parts.map(([l, v, c]) => <div key={l}><i style={{ background: c }} />{l}<b>{v.toLocaleString()}</b></div>)}
            </div>
            <div className="divider" />
            {['google', 'bing'].map((e) => {
              const m = d?.engines?.[e] || {}
              const t = Object.values(m).reduce((a, b) => a + b, 0)
              return (
                <div key={e} style={{ marginBottom: 12 }}>
                  <div className="row between" style={{ marginBottom: 7 }}>
                    <span className="eng" style={{ color: 'var(--ink)', fontSize: 13 }}>{e === 'google' ? <GoogleIcon /> : <BingIcon />}{e === 'google' ? 'Google' : 'Bing'}</span>
                    <span className="num muted">{m.indexed || 0} / {t}</span>
                  </div>
                  <div className="progress"><i style={{ width: `${t ? ((m.indexed || 0) / t) * 100 : 0}%`, background: 'var(--ok)' }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><h3>Recent activity</h3><p>Live · refreshes every 10 seconds</p></div>
            <Link to="/app/logs"><Button size="sm" variant="ghost" arrow>All logs</Button></Link>
          </div>
          {d && d.recent.length === 0 && <Empty icon="activity" title="No activity yet" text="Submit your first URL and every step will appear here." />}
          <div className="feed">
            {!d && [1, 2, 3, 4].map((i) => <div key={i} className="feed-item"><span className="skeleton" style={{ width: 20, height: 20 }} /><span className="skeleton" style={{ height: 30 }} /><span /></div>)}
            {d?.recent.map((r) => (
              <div className="feed-item" key={r.id}>
                <FeedIcon result={r.result} action={r.action} />
                <div className="msg"><Url value={r.url} /><p><span style={{ textTransform: 'capitalize' }}>{r.engine ? `${r.engine} · ` : ''}</span>{r.message}</p></div>
                <time>{timeAgo(r.created_at)}</time>
              </div>
            ))}
          </div>
        </div>

        <div className="stack" style={{ alignContent: 'start' }}>
          <div className="panel">
            <div className="panel-head">
              <div><h3>Queue</h3><p>{d?.next_job ? `Next job ${timeAgo(d.next_job)}` : 'Nothing scheduled'}</p></div>
              <Button size="sm" icon="play" loading={running} onClick={runQueue}>Run now</Button>
            </div>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {[['Queued', jobs.queued || 0], ['Running', jobs.running || 0], ['Failed', jobs.failed || 0]].map(([l, v]) => (
                <div className="kpi" key={l} style={{ padding: '14px 18px' }}><div className="k-label">{l}</div><div className="k-val" style={{ fontSize: 22 }}>{v}</div></div>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><h3>Google quota</h3><p>Publish requests used today</p></div></div>
            <div className="panel-body stack" style={{ gap: 14 }}>
              {(d?.quota || []).length === 0 && <span className="muted small">Add a site to see its quota.</span>}
              {(d?.quota || []).map((q) => (
                <div key={q.domain}>
                  <div className="row between small" style={{ marginBottom: 7 }}><span>{q.domain}</span><span className="num muted">{q.used} / {q.limit}</span></div>
                  <div className="progress"><i style={{ width: `${Math.min(100, (q.used / Math.max(1, q.limit)) * 100)}%`, background: q.used / q.limit > 0.8 ? 'var(--accent)' : 'var(--ink)' }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
