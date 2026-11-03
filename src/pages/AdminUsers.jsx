import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Icon } from '../icons.jsx'
import { Button, Empty, Pager, Popover, SkeletonRows, fmtDate, timeAgo, useToast } from '../ui.jsx'

export default function AdminUsers() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [d, setD] = useState(null)

  const load = useCallback(() => api.get(`/admin/users?page=${page}&q=${encodeURIComponent(term)}`).then(setD).catch((e) => toast(e.message, 'err')), [page, term, toast])
  useEffect(() => { load() }, [load])
  useEffect(() => { const t = setTimeout(() => { setTerm(q); setPage(1) }, 300); return () => clearTimeout(t) }, [q])

  const update = async (u, body, msg) => {
    try { await api.put(`/admin/users/${u.id}`, body); toast(msg, 'ok'); load() } catch (e) { toast(e.message, 'err') }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div><div className="eyebrow-sm">Administration</div><h1>Users</h1><p>Everyone with an account, their usage, role and access.</p></div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div className="input-icon"><Icon name="search" /><input className="input" style={{ width: 260 }} placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <span className="small muted">{d ? `${d.total.toLocaleString()} account${d.total === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th className="hide-sm">Sites</th><th className="hide-sm">URLs</th><th className="hide-sm">Indexed</th><th className="hide-sm">Last active</th><th className="hide-sm">Joined</th><th /></tr></thead>
            <tbody>
              {!d && <SkeletonRows cols={9} />}
              {d?.items.map((u) => {
                const self = String(u.id) === String(me.id)
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
                        <span className="avatar" style={{ width: 30, height: 30 }}>{u.name.charAt(0).toUpperCase()}</span>
                        <div style={{ minWidth: 0 }}><b style={{ fontWeight: 550, display: 'block' }}>{u.name}{self && <span className="muted"> · you</span>}</b><span className="small muted">{u.email}</span></div>
                      </div>
                    </td>
                    <td>{u.role === 'admin' ? <span className="chip accent"><Icon name="crown" />Admin</span> : <span className="chip">User</span>}</td>
                    <td><span className="status" style={{ '--c': u.status === 'active' ? 'var(--ok)' : 'var(--err)' }}><i />{u.status === 'active' ? 'Active' : 'Suspended'}</span></td>
                    <td className="hide-sm num">{u.sites}</td>
                    <td className="hide-sm num">{u.urls.toLocaleString()}</td>
                    <td className="hide-sm num">{u.urls ? `${Math.round((u.indexed / u.urls) * 100)}%` : '—'}</td>
                    <td className="hide-sm num muted">{u.last_login_at ? timeAgo(u.last_login_at) : 'never'}</td>
                    <td className="hide-sm num muted" style={{ whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                    <td>
                      {!self && (
                        <Popover width={210} trigger={({ toggle }) => <Button size="sm" variant="ghost" className="btn-icon" icon="more" onClick={toggle} aria-label="User actions" />}>
                          {(close) => (
                            <>
                              <button className="item" onClick={() => { close(); update(u, { role: u.role === 'admin' ? 'user' : 'admin' }, u.role === 'admin' ? 'Admin role removed' : 'Promoted to admin') }}>
                                <Icon name="crown" />{u.role === 'admin' ? 'Remove admin role' : 'Make admin'}</button>
                              <hr />
                              <button className="item" style={{ color: u.status === 'active' ? 'var(--err)' : 'var(--ok)' }}
                                onClick={() => { close(); if (u.status === 'active' && !confirm(`Suspend ${u.email}? They will be signed out immediately.`)) return; update(u, { status: u.status === 'active' ? 'suspended' : 'active' }, u.status === 'active' ? 'User suspended' : 'User reactivated') }}>
                                <Icon name={u.status === 'active' ? 'userX' : 'checkCircle'} />{u.status === 'active' ? 'Suspend account' : 'Reactivate account'}</button>
                            </>
                          )}
                        </Popover>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {d && d.items.length === 0 && <Empty icon="users" title="No users found" />}
        {d && <Pager page={d.page} pages={d.pages} total={d.total} onPage={setPage} />}
      </div>
    </div>
  )
}
