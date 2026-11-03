import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { Button, Logo } from '../ui.jsx'

const LINKS = [['product', 'Product'], ['features', 'Features'], ['how', 'How it works'], ['faq', 'FAQ']]

/**
 * The floating website header, shared by the landing page and the auth pages.
 * `onJump(event, id)` scrolls within the landing page; elsewhere the links go to /#id.
 */
export default function SiteHeader({ onJump }) {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [hl, setHl] = useState({ left: 0, width: 0 })

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const hover = (e) => setHl({ left: e.currentTarget.offsetLeft, width: e.currentTarget.offsetWidth })

  return (
    <header className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="bar">
        <Link to="/" aria-label="Paxfue Travel"><Logo height={40} /></Link>
        <nav className="links">
          <span className="hl" style={hl} />
          {LINKS.map(([id, label]) => onJump
            ? <a key={id} href={`#${id}`} onMouseEnter={hover} onClick={(e) => onJump(e, id)}>{label}</a>
            : <Link key={id} to={`/#${id}`} onMouseEnter={hover}>{label}</Link>)}
        </nav>
        <div className="right">
          {user ? (
            <Link to="/app"><Button variant="primary" className="btn-pill" arrow>Open dashboard</Button></Link>
          ) : (
            <>
              <Link to="/login" className="signin"><Button variant="ghost" className="btn-pill">Sign in</Button></Link>
              <Link to="/register"><Button variant="primary" className="btn-pill" arrow>Start free</Button></Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
