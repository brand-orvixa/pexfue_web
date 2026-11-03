import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Icon } from '../icons.jsx'
import { Button, Logo, Mark, Popover, Url, applyTheme, readTheme, timeAgo, useToast } from '../ui.jsx'

/* Shared workspace state: sites, selected site, live counters. */
const WsCtx = createContext(null)
export const useWorkspace = () => useContext(WsCtx)

const NAV = [
  { to: '/app', end: true, icon: 'dashboard', label: 'Overview', key: 'o' },
  { to: '/app/submit', icon: 'send', label: 'Submit URLs', key: 'n' },
  { to: '/app/reports', icon: 'list', label: 'Live report', key: 'r' },
  { to: '/app/queue', icon: 'layers', label: 'Queue', key: 'q', count: true },
  { to: '/app/sites', icon: 'globe', label: 'Sites & ownership', key: 's' },
  { to: '/app/logs', icon: 'history', label: 'Logs & export', key: 'l' },
]
const ADMIN = [
  { to: '/app/admin', end: true, icon: 'server', label: 'System', key: 'a' },
  { to: '/app/admin/users', icon: 'users', label: 'Users', key: 'u' },
]
const TITLES = { '/app': 'Overview', '/app/settings': 'Settings', ...Object.fromEntries([...NAV, ...ADMIN].map((n) => [n.to, n.label])) }

function CommandPalette({ onClose, items }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [urls, setUrls] = useState([])
  const list = useRef(null)

  useEffect(() => {
    if (q.trim().length < 2) { setUrls([]); return }
    const t = setTimeout(() => api.get(`/urls?per_page=5&q=${encodeURIComponent(q.trim())}`).then((d) => setUrls(d.items)).catch(() => {}), 180)
    return () => clearTimeout(t)
  }, [q])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = items.filter((x) => !s || x.label.toLowerCase().includes(s) || x.group.toLowerCase().includes(s))
    return [...base, ...urls.map((u) => ({ group: 'URLs', label: u.url, icon: 'link', url: true, run: () => nav(`/app/reports?q=${encodeURIComponent(u.url)}`) }))]
  }, [q, items, urls, nav])

  useEffect(() => { setI(0) }, [q])
  useEffect(() => { list.current?.querySelector('.cmdk-item.on')?.scrollIntoView({ block: 'nearest' }) }, [i])

  const run = (x) => { onClose(); x?.run() }
  const key = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(shown.length - 1, v + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)) }
    if (e.key === 'Enter') { e.preventDefault(); run(shown[i]) }
    if (e.key === 'Escape') onClose()
  }

  let last = ''
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="cmdk" role="dialog" aria-label="Command menu">
        <div className="cmdk-input"><Icon name="search" />
          <input autoFocus placeholder="Search pages, actions or URLs…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} />
          <span className="kbd">esc</span>
        </div>
        <div className="cmdk-list" ref={list}>
          {shown.length === 0 && <div className="empty" style={{ padding: 30 }}>No results for “{q}”</div>}
          {shown.map((x, idx) => {
            const head = x.group !== last ? (last = x.group) : null
            return (
              <div key={x.group + x.label}>
                {head && <div className="label">{head}</div>}
                <div className={`cmdk-item ${idx === i ? 'on' : ''}`} onMouseMove={() => setI(idx)} onClick={() => run(x)}>
                  <Icon name={x.icon} />
                  {x.url ? <Url value={x.label} /> : <span>{x.label}</span>}
                  {x.keys && <span className="row" style={{ marginLeft: 'auto', gap: 4 }}>{x.keys.map((k) => <span className="kbd" key={k}>{k}</span>)}</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div className="cmdk-foot">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span style={{ marginLeft: 'auto' }}>Paxfue Travel</span>
        </div>
      </div>
    </>
  )
}

export default function AppLayout() {
  const { user, meta, logout } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const loc = useLocation()
  const isAdmin = user?.role === 'admin'

  const [theme, setTheme] = useState(readTheme)
  const [mini, setMini] = useState(() => { try { return localStorage.getItem('paxfue_mini') === '1' } catch { return false } })
  const [open, setOpen] = useState(false)
  const [cmdk, setCmdk] = useState(false)
  const [sites, setSites] = useState([])
  const [siteId, setSiteIdState] = useState(() => { try { return localStorage.getItem('paxfue_site') || '' } catch { return '' } })
  const [pulse, setPulse] = useState(null)
  const [seen, setSeen] = useState(() => { try { return Number(localStorage.getItem('paxfue_seen') || 0) } catch { return 0 } })
  const [bar, setBar] = useState(0)

  // The theme only applies inside the app; the marketing pages stay light.
  useLayoutEffect(() => { applyTheme(theme); return () => { delete document.documentElement.dataset.theme } }, [theme])
  useEffect(() => { try { localStorage.setItem('paxfue_mini', mini ? '1' : '0') } catch { /* ignore */ } }, [mini])

  const setSiteId = (id) => { setSiteIdState(id); try { localStorage.setItem('paxfue_site', id) } catch { /* ignore */ } }
  const loadSites = useCallback(() => api.get('/sites').then((d) => setSites(d.sites)).catch(() => {}), [])
  const loadPulse = useCallback(() => api.get('/dashboard?days=7').then(setPulse).catch(() => {}), [])
  useEffect(() => { loadSites() }, [loadSites])
  useEffect(() => { loadPulse(); const t = setInterval(loadPulse, 20000); return () => clearInterval(t) }, [loadPulse])

  useEffect(() => { setOpen(false); setBar((b) => b + 1); window.scrollTo({ top: 0 }) }, [loc.pathname])

  const site = sites.find((s) => String(s.id) === String(siteId))
  const unread = (pulse?.recent || []).filter((r) => Number(r.id) > seen).length
  const quota = pulse?.quota?.length ? pulse.quota.reduce((a, q) => ({ used: a.used + q.used, limit: a.limit + q.limit }), { used: 0, limit: 0 }) : null
  const queueCount = pulse?.queue || 0

  const commands = useMemo(() => {
    const go = (to) => () => nav(to)
    return [
      ...NAV.map((n) => ({ group: 'Navigate', label: n.label, icon: n.icon, keys: ['G', n.key.toUpperCase()], run: go(n.to) })),
      ...(isAdmin ? ADMIN.map((n) => ({ group: 'Admin', label: n.label, icon: n.icon, keys: ['G', n.key.toUpperCase()], run: go(n.to) })) : []),
      { group: 'Navigate', label: 'Settings', icon: 'settings', run: go('/app/settings') },
      { group: 'Actions', label: 'Submit new URLs', icon: 'plus', keys: ['N'], run: go('/app/submit') },
      { group: 'Actions', label: 'Add a website', icon: 'globe', run: () => nav('/app/sites?add=1') },
      { group: 'Actions', label: 'Process due queue jobs now', icon: 'play', run: () => api.post('/queue/run', { limit: 25 }).then((r) => { toast(`Processed ${r.processed} job(s)`, 'ok'); loadPulse() }) },
      { group: 'Actions', label: 'Export URL report (CSV)', icon: 'download', run: () => api.download('/export/urls', 'urls.csv') },
      { group: 'Actions', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, icon: theme === 'dark' ? 'sun' : 'moon', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { group: 'Actions', label: 'Sign out', icon: 'logout', run: () => logout().then(() => nav('/')) },
    ]
  }, [nav, isAdmin, theme, toast, loadPulse, logout])

  // ⌘K, "/" and "g x" shortcuts.
  useEffect(() => {
    let g = 0
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdk((v) => !v); return }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') { e.preventDefault(); setCmdk(true); return }
      if (e.key === 'g') { g = Date.now(); return }
      if (Date.now() - g < 900) {
        const hit = [...NAV, ...(isAdmin ? ADMIN : [])].find((n) => n.key === e.key)
        if (hit) { nav(hit.to); g = 0 }
        return
      }
      if (e.key === 'n') nav('/app/submit')
      if (e.key === '[') setMini((m) => !m)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, isAdmin])

  const title = TITLES[loc.pathname] || 'Overview'
  const ws = { sites, site, siteId, setSiteId, reloadSites: loadSites, pulse, reloadPulse: loadPulse }

  return (
    <WsCtx.Provider value={ws}>
      <div className={`app ${mini ? 'mini' : ''}`}>
        {bar > 1 && <div className="route-bar" key={bar} />}
        <aside className={`side ${open ? 'open' : ''}`}>
          <div className="side-top">
            <NavLink to="/app" aria-label="Paxfue Travel home"><Logo height={36} /></NavLink>
            <span className="mark"><Mark size={22} /></span>
            <Button variant="ghost" size="sm" className="btn-icon collapse-btn" icon="panel" onClick={() => setMini(!mini)} title="Collapse sidebar  [" aria-label="Collapse sidebar" />
          </div>

          <Popover width={232} align="left" trigger={({ toggle }) => (
            <button className="switcher" onClick={toggle}>
              <span className="av">{site ? site.domain.charAt(0).toUpperCase() : <Icon name="globe" width={13} height={13} />}</span>
              <span className="meta"><b>{site ? site.domain : 'All sites'}</b><span>{sites.length} site{sites.length === 1 ? '' : 's'} · {sites.filter((s) => s.verified).length} verified</span></span>
              <Icon name="updown" />
            </button>
          )}>
            {(close) => (
              <>
                <div className="label">Workspace</div>
                <button className={`item ${!siteId ? 'on' : ''}`} onClick={() => { setSiteId(''); close() }}><Icon name="globe" />All sites{!siteId && <Icon name="check" style={{ marginLeft: 'auto' }} />}</button>
                {sites.map((s) => (
                  <button key={s.id} className={`item ${String(s.id) === String(siteId) ? 'on' : ''}`} onClick={() => { setSiteId(String(s.id)); close() }}>
                    <span className="status" style={{ '--c': s.verified ? 'var(--ok)' : 'var(--warn)' }}><i /></span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.domain}</span>
                    {String(s.id) === String(siteId) && <Icon name="check" style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}
                <hr />
                <button className="item" onClick={() => { close(); nav('/app/sites?add=1') }}><Icon name="plus" />Add a website</button>
              </>
            )}
          </Popover>

          <nav className="nav">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} title={mini ? n.label : undefined}>
                <Icon name={n.icon} /><span>{n.label}</span>
                {n.count && queueCount > 0 && <span className="count">{queueCount}</span>}
              </NavLink>
            ))}
          </nav>
          {isAdmin && (
            <>
              <div className="nav-group">Administration</div>
              <nav className="nav">
                {ADMIN.map((n) => <NavLink key={n.to} to={n.to} end={n.end} title={mini ? n.label : undefined}><Icon name={n.icon} /><span>{n.label}</span></NavLink>)}
              </nav>
            </>
          )}

          <div className="side-spacer" />
          {quota && (
            <div className="quota">
              <div className="row between"><b style={{ fontWeight: 550 }}>Google quota today</b><span className="num">{quota.used}/{quota.limit}</span></div>
              <div className="bar"><i className={quota.used / quota.limit > 0.8 ? 'hot' : ''} style={{ width: `${Math.min(100, (quota.used / Math.max(1, quota.limit)) * 100)}%` }} /></div>
              <span className="muted">Resets at midnight · queue waits automatically</span>
            </div>
          )}

          <Popover align="left" bottom="calc(100% + 6px)" width={228} trigger={({ toggle }) => (
            <button className="me" onClick={toggle}>
              <span className="avatar">{(user?.name || '?').charAt(0).toUpperCase()}</span>
              <span className="meta"><b>{user?.name}</b><span>{user?.email}</span></span>
              <Icon name="updown" width={14} height={14} style={{ color: 'var(--muted)' }} />
            </button>
          )}>
            {(close) => (
              <>
                <div className="label">{isAdmin ? 'Administrator' : 'Member'}</div>
                <button className="item" onClick={() => { close(); nav('/app/settings') }}><Icon name="settings" />Settings</button>
                <button className="item" onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark') }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} />{theme === 'dark' ? 'Light' : 'Dark'} theme</button>
                <button className="item" onClick={() => { close(); setCmdk(true) }}><Icon name="command" />Command menu<span className="kbd" style={{ marginLeft: 'auto' }}>⌘K</span></button>
                <button className="item" onClick={() => { close(); nav('/') }}><Icon name="external" />Website</button>
                <hr />
                <button className="item" onClick={() => logout().then(() => nav('/'))}><Icon name="logout" />Sign out</button>
              </>
            )}
          </Popover>
        </aside>
        <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

        <div className="main">
          <header className="topbar">
            <Button variant="ghost" size="sm" className="btn-icon menu-btn" icon="menu" onClick={() => setOpen(true)} aria-label="Open menu" />
            <div className="crumbs">
              <span className="ws">{site ? site.domain : 'All sites'}</span><span className="sep ws">/</span><b>{title}</b>
            </div>
            <button className="search-btn" onClick={() => setCmdk(true)}>
              <Icon name="search" /><span className="label">Search or jump to…</span><span className="kbd">⌘K</span>
            </button>
            <div className="actions">
              {meta.simulate && <span className="chip warn hide-sm">Sandbox</span>}
              <Popover width={360} trigger={({ toggle }) => (
                <Button variant="ghost" size="sm" className={`btn-icon ${unread ? 'dotted' : ''}`} icon="bell" aria-label="Notifications"
                  onClick={() => { toggle(); const top = Number(pulse?.recent?.[0]?.id || 0); setSeen(top); try { localStorage.setItem('paxfue_seen', String(top)) } catch { /* ignore */ } }} />
              )}>
                {(close) => (
                  <>
                    <div className="row between" style={{ padding: '6px 9px 8px' }}><b style={{ fontSize: 13 }}>Activity</b><span className="muted small">{queueCount} in queue</span></div>
                    <div style={{ maxHeight: 340, overflowY: 'auto', margin: '0 -5px' }}>
                      {(pulse?.recent || []).length === 0 && <div className="empty" style={{ padding: 28 }}>Nothing yet</div>}
                      {(pulse?.recent || []).map((r) => (
                        <button key={r.id} className="item" style={{ alignItems: 'flex-start', borderRadius: 0, padding: '9px 14px' }} onClick={() => { close(); nav(`/app/reports?q=${encodeURIComponent(r.url)}`) }}>
                          <span className="status" style={{ '--c': r.result === 'success' ? 'var(--ok)' : r.result === 'error' ? 'var(--err)' : 'var(--faint)', marginTop: 5 }}><i /></span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <Url value={r.url} title={false} />
                            <span className="muted" style={{ display: 'block', fontSize: 12, whiteSpace: 'normal' }}>{r.message}</span>
                          </span>
                          <span className="num muted" style={{ fontSize: 11 }}>{timeAgo(r.created_at)}</span>
                        </button>
                      ))}
                    </div>
                    <hr />
                    <button className="item" onClick={() => { close(); nav('/app/logs') }}><Icon name="history" />View all logs</button>
                  </>
                )}
              </Popover>
              <Button variant="ghost" size="sm" className="btn-icon hide-sm" icon={theme === 'dark' ? 'sun' : 'moon'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme" />
              <Button variant="primary" size="sm" icon="plus" onClick={() => nav('/app/submit')} className="hide-sm">New submission</Button>
            </div>
          </header>
          <main className="content">
            {meta.simulate && (
              <div className="notice"><Icon name="info" />
                <span>Sandbox mode: search-engine calls are simulated. Set <code>indexer.simulate = false</code> in <code>backend/.env</code> to index for real.</span>
              </div>
            )}
            <div className="page" key={loc.pathname}><Outlet /></div>
          </main>
        </div>
        {cmdk && <CommandPalette items={commands} onClose={() => setCmdk(false)} />}
      </div>
    </WsCtx.Provider>
  )
}
