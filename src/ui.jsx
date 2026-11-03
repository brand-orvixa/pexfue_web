import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BingIcon, GoogleIcon, Icon } from './icons.jsx'

/* ---------- Brand logo ----------
   Official logo from /public/logo.png. If the file is missing, a vector
   stand-in in the brand colours is shown. */
const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`

export function Mark({ size = 22 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="29" cy="35" r="21" fill="#1f6fe0" />
      <path d="M9 30c4-6 10-9 17-8 3 4 0 8 4 11s8 2 9 7c-2 5-7 9-13 10C16 49 9 41 9 30z" fill="#fff" opacity=".9" />
      <path d="M4 46c16 9 40 4 56-20" stroke="#ff5b1f" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M44 12l14-5-4 14-3-4-6 5-3-3 5-6z" fill="#171b5e" />
    </svg>
  )
}

export function Logo({ height = 34, plate = false, className = '' }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className={`logo ${plate ? 'plate' : ''} ${className}`} style={{ height }}>
      {failed ? (
        <span className="logo-fallback" style={{ fontSize: height * 0.5 }}>
          <Mark size={height * 0.82} />
          <span><b>PAXFUE</b><small>TRAVEL HOLIDAY</small></span>
        </span>
      ) : (
        <img src={LOGO_SRC} alt="Paxfue Travel Holiday" onError={() => setFailed(true)} />
      )}
    </span>
  )
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l.slice(-2), { id, message, type }])
    setTimeout(() => setItems((l) => l.map((t) => (t.id === id ? { ...t, out: true } : t))), 3800)
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4150)
  }, [])
  const icon = { ok: 'checkCircle', err: 'alert', info: 'info' }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type} ${t.out ? 'out' : ''}`}><Icon name={icon[t.type]} /><div>{t.message}</div></div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- Button ---------- */
export function Button({ variant = '', size = '', icon, arrow, loading, children, className = '', ...rest }) {
  const cls = ['btn', variant && `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ')
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" /> : icon && <Icon name={icon} />}
      {children}
      {arrow && <Icon name="arrowRight" className="arrow" />}
    </button>
  )
}

/* ---------- Status ---------- */
export const STATUS = {
  indexed: { label: 'Indexed', long: 'Indexed successfully', c: 'var(--ok)' },
  crawled: { label: 'Crawled', long: 'Crawled, not indexed yet', c: 'var(--blue)', live: true },
  pending: { label: 'Pending', long: 'Pending', c: 'var(--warn)', live: true },
  submitted: { label: 'Submitted', long: 'Submitted', c: 'var(--blue)', live: true },
  queued: { label: 'Queued', long: 'Queued', c: 'var(--faint)', live: true },
  not_indexed: { label: 'Not indexed', long: 'Not indexed', c: 'var(--err)' },
  error: { label: 'Fix required', long: 'Error · fix required', c: 'var(--err)' },
}

export function Status({ status, long }) {
  const m = STATUS[status] || { label: status || '—', long: status || '—' }
  return (
    <span className={`status ${m.live ? 'live' : ''}`} style={{ '--c': m.c }}>
      <i />{long ? m.long : m.label}
    </span>
  )
}

export function EngineTags({ engines }) {
  const list = (engines || '').split(',').filter(Boolean)
  return (
    <span className="row" style={{ gap: 10 }}>
      {list.includes('google') && <span className="eng"><GoogleIcon />Google</span>}
      {list.includes('bing') && <span className="eng"><BingIcon />Bing</span>}
    </span>
  )
}

/** Shows a URL with the host dimmed and the path emphasised. */
export function Url({ value, title = true }) {
  const m = /^(https?:\/\/[^/]+)(.*)$/.exec(value || '')
  return (
    <span className="url" title={title ? value : undefined}>
      {m ? <><span className="host">{m[1].replace(/^https?:\/\//, '')}</span>{m[2] || '/'}</> : value}
    </span>
  )
}

/* ---------- Tabs with sliding indicator ---------- */
export function Tabs({ value, onChange, items }) {
  const ref = useRef(null)
  const [ind, setInd] = useState(null)
  useLayoutEffect(() => {
    const el = ref.current?.querySelector('button.on')
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth })
  }, [value, items])
  return (
    <div className="tabs" ref={ref} role="tablist">
      {ind && <span className="ind" style={ind} />}
      {items.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={value === t.value ? 'on' : ''} onClick={() => onChange(t.value)}>
          {t.icon}{t.label}{t.count != null && <span className="n">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Overlays ---------- */
function useEscape(onClose, lock = true) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    if (lock) document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); if (lock) document.body.style.overflow = '' }
  }, [onClose, lock])
}

export function Drawer({ title, subtitle, onClose, children }) {
  useEscape(onClose)
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, wordBreak: 'break-all' }}>{title}</div>
            {subtitle && <div className="muted small" style={{ marginTop: 4 }}>{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" className="btn-icon" icon="x" onClick={onClose} aria-label="Close" />
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>,
    document.body,
  )
}

export function Modal({ title, subtitle, onClose, children, width }) {
  useEscape(onClose)
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} style={width ? { width: `min(${width}px, calc(100% - 24px))` } : undefined}>
        <div className="panel-head" style={{ borderBottom: '1px solid var(--line)' }}>
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <Button variant="ghost" size="sm" className="btn-icon" icon="x" onClick={onClose} aria-label="Close" />
        </div>
        <div className="panel-body stack">{children}</div>
      </div>
    </>,
    document.body,
  )
}

/** Dropdown anchored to a trigger. `children` is a render function receiving close(). */
export function Popover({ trigger, children, align = 'right', top = 'calc(100% + 6px)', bottom, width }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const out = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', out)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); window.removeEventListener('keydown', esc) }
  }, [open])
  const pos = { [align]: 0, ...(bottom ? { bottom } : { top }), ...(width ? { width } : {}) }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && <div className="popover" style={{ ...pos, transformOrigin: `${bottom ? 'bottom' : 'top'} ${align}` }}>{children(() => setOpen(false))}</div>}
    </div>
  )
}

/* ---------- Misc ---------- */
export function Empty({ icon = 'link', title, text, action }) {
  return (
    <div className="empty">
      <div className="ill"><Icon name={icon} /></div>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  )
}

export function Pager({ page, pages, total, onPage }) {
  if (!total) return null
  return (
    <div className="panel-foot">
      <span><span className="num">{total.toLocaleString()}</span> results · page {page} of {Math.max(1, pages)}</span>
      <span className="row">
        <Button size="sm" icon="chevronLeft" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<Icon name="chevronRight" /></Button>
      </span>
    </div>
  )
}

export function SkeletonRows({ rows = 6, cols = 5 }) {
  return Array.from({ length: rows }, (_, i) => (
    <tr key={i}>{Array.from({ length: cols }, (_, j) => <td key={j}><div className="skeleton" style={{ height: 12, width: j === 0 ? '75%' : '55%' }} /></td>)}</tr>
  ))
}

/** Number that eases to its value whenever it changes. */
export function Counter({ value = 0, duration = 1000 }) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 4)))
      setShown(v)
      if (p < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <>{shown.toLocaleString()}</>
}

export function Sparkline({ data = [], color = 'var(--ink)', className = 'spark' }) {
  const W = 84, H = 30
  const max = Math.max(1, ...data)
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * W, H - 3 - (v / max) * (H - 6)])
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')
  const id = `sp${useId().replace(/:/g, '')}`
  return (
    <svg className={className} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".18" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {data.length > 1 && <path d={`${d}L${W},${H}L0,${H}Z`} fill={`url(#${id})`} />}
      {data.length > 1 && <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  )
}

/** Adds .in to every .rv element when it scrolls into view. */
export function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.rv:not(.in)')
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target) } })
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** One global listener drives the cursor spotlight on every .spot element. */
export function installSpotlight() {
  document.addEventListener('pointermove', (e) => {
    const el = e.target instanceof Element && e.target.closest('.spot')
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, { passive: true })
}

const THEME_KEY = 'paxfue_theme'
export function readTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'light' } catch { return 'light' }
}
export function applyTheme(t) {
  if (t === 'dark') document.documentElement.dataset.theme = 'dark'
  else delete document.documentElement.dataset.theme
  try { localStorage.setItem(THEME_KEY, t) } catch { /* ignore */ }
}

export function timeAgo(s) {
  if (!s) return '—'
  const t = new Date(s.replace(' ', 'T') + 'Z').getTime()
  const d = (Date.now() - t) / 1000
  if (d < -45) return `in ${dur(-d)}`
  if (d < 45) return 'just now'
  return `${dur(d)} ago`
}
const dur = (d) => (d < 3600 ? `${Math.max(1, Math.round(d / 60))}m` : d < 86400 ? `${Math.round(d / 3600)}h` : `${Math.round(d / 86400)}d`)
export const fmtDate = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')

export function CopyBox({ text }) {
  const toast = useToast()
  return (
    <div className="codebox"><span>{text}</span>
      <Button size="sm" variant="ghost" className="btn-icon" icon="copy" aria-label="Copy"
        onClick={() => navigator.clipboard?.writeText(text).then(() => toast('Copied to clipboard', 'ok'))} />
    </div>
  )
}
