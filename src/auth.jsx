import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, token } from './api.js'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [meta, setMeta] = useState({ simulate: false, max_bulk: 1000 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api.get('/meta').then(setMeta).catch(() => {})
    if (!token.get()) { setReady(true); return }
    api.get('/auth/me').then((d) => setUser(d.user)).catch(() => token.set(null)).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    const out = () => { token.set(null); setUser(null) }
    window.addEventListener('paxfue:logout', out)
    return () => window.removeEventListener('paxfue:logout', out)
  }, [])

  const login = useCallback(async (email, password) => {
    const d = await api.post('/auth/login', { email, password })
    token.set(d.token); setUser(d.user)
  }, [])
  const register = useCallback(async (name, email, password) => {
    const d = await api.post('/auth/register', { name, email, password })
    token.set(d.token); setUser(d.user)
  }, [])
  const loginWithGoogle = useCallback(async (accessToken) => {
    const d = await api.post('/auth/google', { access_token: accessToken })
    token.set(d.token); setUser(d.user)
    return d
  }, [])
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch { /* already gone */ }
    token.set(null); setUser(null)
  }, [])

  return <AuthCtx.Provider value={{ user, setUser, meta, ready, login, register, loginWithGoogle, logout }}>{children}</AuthCtx.Provider>
}
