import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import AppLayout from './components/AppLayout.jsx'
import AdminOverview from './pages/AdminOverview.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import AuthPage from './pages/AuthPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Landing from './pages/Landing.jsx'
import Logs from './pages/Logs.jsx'
import Queue from './pages/Queue.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import Sites from './pages/Sites.jsx'
import Submit from './pages/Submit.jsx'

function Protected({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--muted)' }}><span className="spinner" style={{ width: 22, height: 22 }} /></div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminOnly({ children }) {
  const { user } = useAuth()
  return user?.role === 'admin' ? children : <Navigate to="/app" replace />
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth()
  if (ready && user) return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><AuthPage mode="forgot" /></GuestOnly>} />
      <Route path="/reset-password" element={<AuthPage mode="reset" />} />
      <Route path="/app" element={<Protected><AppLayout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="submit" element={<Submit />} />
        <Route path="reports" element={<Reports />} />
        <Route path="queue" element={<Queue />} />
        <Route path="sites" element={<Sites />} />
        <Route path="logs" element={<Logs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={<AdminOnly><AdminOverview /></AdminOnly>} />
        <Route path="admin/users" element={<AdminOnly><AdminUsers /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
