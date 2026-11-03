import Lenis from 'lenis'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { BingIcon, GoogleIcon, Icon } from '../icons.jsx'
import { Button, Counter, Logo, useReveal } from '../ui.jsx'

const STEPS = [
  ['Add URLs', 'Paste a single URL or thousands at once, or drop a .txt, .csv or sitemap.xml file. Duplicates are removed automatically.', 'POST /api/urls'],
  ['Verify', 'Every URL is validated, matched to a site you proved you own (file, meta tag or DNS) and checked to be live before any quota is spent.', 'ownership · reachability'],
  ['Request indexing', 'We call the Google Indexing API and Bing Webmaster or IndexNow directly, with your own credentials.', 'URL_UPDATED · SubmitUrl'],
  ['Queue', 'Bulk lists flow through a background queue that respects each engine’s daily quota and never double-submits.', '200 / day per property'],
  ['Fetch status', 'Google URL Inspection and Bing URL info report back: indexed, crawled, pending or not indexed.', 'urlInspection.index'],
  ['Live report', 'Each URL moves through the report in real time, from “Pending” to “Indexed successfully” or “Fix required”, with the reason.', 'per engine · per URL'],
  ['Auto-retry', 'Temporary failures back off exponentially. Pages that still aren’t indexed after the checks are resubmitted for you.', '15m → 30m → 60m'],
  ['Logs & export', 'Every request and response is kept as history, and you can export any slice of it to CSV in one click.', 'CSV · UTF-8'],
]

const FAQ = [
  ['Which search engines does Paxfue support?', 'Google, through the official Indexing API and Search Console URL Inspection API, and Bing, through the Bing Webmaster API or IndexNow (which also reaches Yandex, Seznam and Naver).'],
  ['Do I need to own the website?', 'Yes. You verify ownership with a file, a meta tag or a DNS TXT record, and the Google service account must be an Owner of the Search Console property. That keeps you inside each engine’s rules.'],
  ['How fast will my pages be indexed?', 'Requests leave within seconds. Engines typically crawl submitted URLs within minutes to a few days. Paxfue keeps checking and shows the status reported by the engine itself.'],
  ['What happens when indexing fails?', 'Rate limits and server errors are retried automatically with exponential backoff. If a page is still not indexed after the status checks, it is resubmitted, up to the limit you set. Permanent problems like noindex, 404 or robots.txt blocks are flagged with the exact reason.'],
  ['Can I export my data?', 'Yes. Export the URL report or the complete per-URL history as CSV, filtered by site, engine, status or date.'],
]

const LIVE_PATHS = ['/holidays/maldives-honeymoon', '/tours/kerala-backwaters', '/flights/delhi-to-dubai', '/visa/schengen-guide', '/packages/bali-7-nights', '/blog/best-time-to-visit-goa', '/hotels/udaipur-lake-view', '/tours/ladakh-bike-trip', '/cruise/singapore-weekend', '/deals/thailand-summer']
const ST = { queued: ['Queued', 'var(--faint)'], submitted: ['Submitted', '#7aa2ff'], crawled: ['Crawled', '#7aa2ff'], pending: ['Pending', 'var(--warn)'], indexed: ['Indexed', 'var(--ok)'], error: ['Fix required', 'var(--err)'] }

function Words({ text, start = 0 }) {
  return text.split(' ').map((w, i) => <span key={i}><span className="w" style={{ '--i': start + i }}>{w}</span>{' '}</span>)
}

function Orbit() {
  const ell = 'M 60,430 A 690,250 0 1,1 1440,430 A 690,250 0 1,1 60,430'
  const cities = [[160, 290], [520, 188], [1010, 192], [1360, 318], [1300, 560], [300, 600]]
  return (
    <svg className="orbit" viewBox="0 0 1500 720" aria-hidden="true">
      <path className="track" d={ell} />
      <ellipse className="track" cx="750" cy="430" rx="560" ry="190" style={{ opacity: .6 }} />
      <path className="arc arc-2" d="M 190,430 A 560,190 0 0,1 1310,430" />
      <path className="arc" d="M 60,430 A 690,250 0 0,1 1440,430" />
      {cities.map(([x, y], i) => (
        <g key={i}>
          <circle className="city-pulse" cx={x} cy={y} r="5" style={{ animationDelay: `${i * 0.5}s` }} />
          <circle className="city" cx={x} cy={y} r="4" />
        </g>
      ))}
      <g className="jet">
        <path transform="scale(1.7)" d="M-10,-1.2 L5,-1.2 Q10,0 5,1.2 L-10,1.2 Z M-2,-1 L-7,-9 L-4,-9 L3,-1 Z M-2,1 L-7,9 L-4,9 L3,1 Z M-9,-1 L-12,-5 L-10,-5 L-6,-1 Z M-9,1 L-12,5 L-10,5 L-6,1 Z" />
        <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" path={ell} />
      </g>
    </svg>
  )
}

function LiveWindow() {
  const ref = useRef(null)
  const seq = useRef(0)
  const [rows, setRows] = useState(() => LIVE_PATHS.slice(0, 6).map((p, i) => ({ id: i, p, s: ['indexed', 'indexed', 'crawled', 'pending', 'indexed', 'error'][i] })))
  const [k, setK] = useState({ total: 12480, indexed: 10942, pending: 1306, fix: 232 })

  // Tilt flattens as the window scrolls into view.
  useEffect(() => {
    let raf = 0
    const on = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const vh = window.innerHeight
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.85)))
        el.style.setProperty('--tilt', `${(1 - p) * 24}deg`)
        el.style.setProperty('--sc', `${0.93 + p * 0.07}`)
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf) }
  }, [])

  // Simulated live feed.
  useEffect(() => {
    const t = setInterval(() => {
      seq.current += 1
      const n = seq.current
      setRows((list) => {
        const next = list.map((r) => {
          if (r.s === 'queued') return { ...r, s: 'submitted' }
          if (r.s === 'submitted') return { ...r, s: Math.random() < 0.6 ? 'indexed' : 'crawled' }
          if (r.s === 'crawled' && Math.random() < 0.5) return { ...r, s: 'indexed' }
          return r
        })
        return [{ id: 100 + n, p: LIVE_PATHS[(n + 5) % LIVE_PATHS.length], s: 'queued' }, ...next].slice(0, 6)
      })
      setK((v) => ({ total: v.total + 1, indexed: v.indexed + (n % 3 ? 1 : 0), pending: v.pending + (n % 3 ? 0 : 1), fix: v.fix }))
    }, 1700)
    return () => clearInterval(t)
  }, [])

  const bars = [[38, 12], [44, 10], [40, 16], [52, 8], [48, 14], [60, 10], [56, 18], [66, 9], [62, 14], [72, 11], [70, 16], [80, 9], [78, 13], [88, 10]]
  return (
    <div className="showcase">
      <div className="window" ref={ref}>
        <div className="win-bar">
          <div className="dots"><i /><i /><i /></div>
          <div className="addr"><Icon name="lock" />app.paxfue.travel/overview</div>
          <div style={{ width: 52 }} />
        </div>
        <div className="win-body">
          <div className="win-side">
            <div className="ws"><i>P</i><span style={{ fontSize: 12.5, fontWeight: 550 }}>paxfue.travel</span></div>
            {[['dashboard', 'Overview', 1], ['send', 'Submit URLs'], ['list', 'Live report'], ['layers', 'Queue'], ['globe', 'Sites'], ['history', 'Logs & export']].map(([ic, l, on]) => (
              <a key={l} className={on ? 'on' : ''}><Icon name={ic} />{l}</a>
            ))}
          </div>
          <div className="win-main">
            <div className="head"><h4>Overview</h4><span className="chip" style={{ background: 'transparent' }}><span className="status live" style={{ '--c': 'var(--ok)' }}><i /></span>Live</span></div>
            <div className="win-kpis">
              {[['Total URLs', k.total, 'var(--ink)'], ['Indexed', k.indexed, 'var(--ok)'], ['Pending', k.pending, 'var(--warn)'], ['Fix required', k.fix, 'var(--err)']].map(([l, v, c]) => (
                <div key={l}><span><i style={{ background: c }} />{l}</span><b>{v.toLocaleString()}</b></div>
              ))}
            </div>
            <div className="win-grid">
              <div className="win-card">
                <div className="ch">Indexing activity <span>last 14 days</span></div>
                <div className="bars">
                  {bars.map(([a, b], i) => (
                    <div key={i}>
                      <i style={{ height: `${a}%`, background: 'var(--ok)', '--i': i, opacity: .9 }} />
                      <i style={{ height: `${b}%`, background: '#ff6a33', '--i': i }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="win-card">
                <div className="ch">Live feed <span>auto</span></div>
                {rows.map((r) => (
                  <div className="live-row" key={r.id}>
                    <span className="u">paxfue.travel{r.p}</span>
                    <span className="status status-swap" key={r.s} style={{ '--c': ST[r.s][1], fontSize: 11.5 }}><i />{ST[r.s][0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VerifyViz() {
  const [n, setN] = useState(0)
  useEffect(() => { const t = setInterval(() => setN((v) => (v + 1) % 5), 1100); return () => clearInterval(t) }, [])
  return (
    <div className="v-verify">
      {['paxfue-verify-9c1e.txt', '<meta name="paxfue-…">', 'TXT paxfue-verify=9c1e'].map((m, i) => (
        <div key={m} className={n > i ? 'ok' : ''}>{m}<Icon name="check" /></div>
      ))}
    </div>
  )
}

function StatusViz() {
  const seq = [['Queued', 'var(--faint)'], ['Submitted', 'var(--blue)'], ['Crawled', 'var(--blue)'], ['Indexed', 'var(--ok)']]
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((v) => (v + 1) % seq.length), 1300); return () => clearInterval(t) }, [seq.length])
  return (
    <div className="v-status">
      <span className="big" style={{ '--c': seq[i][1] }}><i /><span key={i} className="status-swap">{seq[i][0]}</span></span>
      <div className="steps">{seq.map((_, j) => <span key={j} className={j <= i ? 'on' : ''} />)}</div>
      <span className="mono muted" style={{ fontSize: 11.5 }}>/tours/goa-beach-holiday</span>
    </div>
  )
}

function RetryViz() {
  const pts = [[20, 120], [90, 120], [180, 96], [290, 60], [400, 18]]
  return (
    <div className="v-retry">
      <svg viewBox="0 0 420 150">
        <line className="ax" x1="10" x2="410" y1="130" y2="130" />
        <path className="curve" d={`M${pts.map((p) => p.join(',')).join(' L')}`} />
        {pts.slice(1).map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="5" fill={i === 3 ? 'var(--ok)' : 'var(--surface)'} stroke={i === 3 ? 'var(--ok)' : 'var(--accent)'} strokeWidth="2" />
            <text x={x} y={y - 12} textAnchor="middle">{['503', '429', 'timeout', '200 OK'][i]}</text>
            <text x={x} y="146" textAnchor="middle">{['+15m', '+30m', '+60m', 'done'][i]}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function Csv() {
  const rows = [['12:04:11', '/tours/kerala-backwaters', 'indexed'], ['12:04:09', '/flights/delhi-to-dubai', 'submitted'], ['12:03:58', '/blog/old-offer-2019', 'noindex'], ['12:03:51', '/visa/schengen-guide', 'indexed'], ['12:03:40', '/packages/bali-7-nights', 'pending'], ['12:03:22', '/hotels/udaipur-lake-view', 'indexed'], ['12:03:10', '/tours/ladakh-bike-trip', 'crawled'], ['12:02:59', '/deals/thailand-summer', 'indexed']]
  const cls = (s) => (s === 'noindex' ? 'e' : s === 'pending' || s === 'crawled' || s === 'submitted' ? 'p' : '')
  return (
    <div className="v-csv"><div className="scroll">
      {[...rows, ...rows].map(([t, u, s], i) => <div key={i}><span>{t}</span><span>{u}</span><em className={cls(s)}>{s}</em></div>)}
    </div></div>
  )
}

function How() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const els = document.querySelectorAll('.hstep')
    const io = new IntersectionObserver((en) => en.forEach((e) => e.isIntersecting && setActive(Number(e.target.dataset.i))), { rootMargin: '-45% 0px -50% 0px' })
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
  return (
    <section className="sec" id="how">
      <div className="wrap how">
        <div className="how-sticky">
          <span className="kicker rv">How it works</span>
          <h2 className="display rv" style={{ marginTop: 18, '--d': '.05s' }}>Eight steps.<br /><span className="serif">Zero</span> Search Console tabs.</h2>
          <p className="lead rv" style={{ marginTop: 20, maxWidth: 420, '--d': '.1s' }}>The whole indexing workflow, automated from the moment you paste a URL until it shows up in the index.</p>
          <div className="counter"><b>{String(active + 1).padStart(2, '0')}</b>/ 08 · {STEPS[active][0]}</div>
          <div className="prog"><i style={{ width: `${((active + 1) / STEPS.length) * 100}%` }} /></div>
        </div>
        <ol className="how-list">
          {STEPS.map(([t, d, c], i) => (
            <li key={t} className={`hstep ${i === active ? 'active' : ''}`} data-i={i}>
              <span className="n">{String(i + 1).padStart(2, '0')}</span>
              <div><h3>{t}</h3><p>{d}</p><span className="code"><Icon name="zap" width={12} height={12} />{c}</span></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Figures() {
  const ref = useRef(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect() } }, { threshold: 0.4 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  const f = [[1000, '', 'URLs in a single bulk submission'], [2, '', 'search engines through official APIs'], [5, '×', 'automatic status checks per URL'], [100, '%', 'of history exportable to CSV']]
  return (
    <div className="figures" ref={ref}>
      {f.map(([n, suf, l]) => <div key={l}><b>{show ? <Counter value={n} duration={1800} /> : 0}{suf}</b><span>{l}</span></div>)}
    </div>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sec" id="faq">
      <div className="wrap faq-grid">
        <div>
          <span className="kicker rv">FAQ</span>
          <h2 className="display rv" style={{ marginTop: 18, '--d': '.05s' }}>Questions, <span className="serif">answered.</span></h2>
          <p className="lead rv" style={{ marginTop: 18, '--d': '.1s' }}>Want to try it first? Sandbox mode lets you explore every feature without API keys.</p>
        </div>
        <div className="rv" style={{ '--d': '.1s' }}>
          {FAQ.map(([q, a], i) => (
            <div key={q} className={`qa ${open === i ? 'open' : ''}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>{q}<span className="pm" /></button>
              <div className="ans"><div><p>{a}</p></div></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const lenis = useRef(null)
  useReveal()

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduce) {
      const l = new Lenis({ lerp: 0.085, wheelMultiplier: 1 })
      lenis.current = l
      let id = requestAnimationFrame(function loop(t) { l.raf(t); id = requestAnimationFrame(loop) })
      return () => { cancelAnimationFrame(id); l.destroy(); lenis.current = null }
    }
  }, [])

  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) lenis.current ? lenis.current.scrollTo(el, { offset: -70, immediate: true }) : el.scrollIntoView()
    }, 80)
    return () => clearTimeout(t)
  }, [])

  const jump = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    lenis.current ? lenis.current.scrollTo(el, { offset: -70, duration: 1.4 }) : el.scrollIntoView({ behavior: 'smooth' })
  }

  const cta = user ? '/app' : '/register'
  return (
    <div className="lp">
      <SiteHeader onJump={jump} />

      <section className="hero" id="product">
        <div className="hero-bg"><div className="grid" /><Orbit /></div>
        <div className="wrap">
          <a className="announce fade-up" style={{ '--d': '.05s' }} href="#how" onClick={(e) => jump(e, 'how')}>
            <b>NEW</b>Auto-retry with exponential backoff<Icon name="arrowRight" />
          </a>
          <h1>
            <Words text="Get every page" />
            <span className="underline"><span className="w serif" style={{ '--i': 3 }}>indexed,</span>
              <svg viewBox="0 0 300 30" preserveAspectRatio="none"><path d="M4 22 C 80 6, 200 4, 296 14" /></svg>
            </span>{' '}
            <Words text="not just crawled." start={4} />
          </h1>
          <p className="lead fade-up" style={{ '--d': '.7s' }}>
            Paxfue sends your URLs straight to Google and Bing, queues bulk lists, tracks each page’s real index status
            and retries until it’s in.
          </p>
          <div className="ctas fade-up" style={{ '--d': '.82s' }}>
            <Link to={cta}><Button variant="primary" size="lg" className="btn-pill" arrow>{user ? 'Open dashboard' : 'Start indexing free'}</Button></Link>
            <a href="#how" onClick={(e) => jump(e, 'how')}><Button size="lg" className="btn-pill">See how it works</Button></a>
          </div>
          <div className="meta fade-up" style={{ '--d': '.95s' }}>
            <span><Icon name="shieldCheck" />Official engine APIs</span>
            <span><Icon name="lock" />Credentials encrypted</span>
            <span><Icon name="download" />Full CSV export</span>
          </div>
        </div>
        <LiveWindow />
      </section>

      <section className="trust">
        <p className="rv">Built on the official indexing infrastructure of</p>
        <div className="marquee-mask">
          <div className="marquee">
            {[0, 1].map((k) => (
              <span key={k} style={{ display: 'contents' }}>
                <span><GoogleIcon />Google Indexing API</span>
                <span><Icon name="search" />Search Console</span>
                <span><BingIcon />Bing Webmaster</span>
                <span><Icon name="zap" />IndexNow</span>
                <span><Icon name="globe" />Yandex</span>
                <span><Icon name="globe" />Seznam</span>
                <span><Icon name="globe" />Naver</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="features">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker rv">Features</span>
            <h2 className="display rv" style={{ '--d': '.05s' }}>Everything between <span className="serif">publish</span> and <span className="serif">indexed.</span></h2>
            <p className="lead rv" style={{ '--d': '.1s' }}>One workspace for submitting, monitoring and fixing indexing across every site you run.</p>
          </div>
          <div className="bento">
            <div className="tile w4 spot rv">
              <span className="tag">01 · QUEUE</span>
              <div className="viz">
                <div className="v-queue">
                  {[['Index · Google', '92%', '184'], ['Index · Bing', '78%', '156'], ['Status checks', '64%', '128'], ['Retries', '22%', '9', true]].map(([l, w, n, hot]) => (
                    <div key={l} className={`q ${hot ? 'hot' : ''}`}><span>{l}</span><span className="track"><i style={{ '--w': w }} /></span><b>{n}</b></div>
                  ))}
                </div>
              </div>
              <h3>Paste 1,000 URLs. Walk away.</h3>
              <p>Bulk submissions run in a background queue within each engine’s quota. A single URL goes out instantly.</p>
            </div>
            <div className="tile spot rv" style={{ '--d': '.06s' }}>
              <span className="tag">02 · OWNERSHIP</span>
              <div className="viz"><VerifyViz /></div>
              <h3>Ownership first</h3>
              <p>Verify with a file, a meta tag or DNS. Nothing is submitted for sites you don’t control.</p>
            </div>
            <div className="tile spot rv">
              <span className="tag">03 · STATUS</span>
              <div className="viz"><StatusViz /></div>
              <h3>Status from the source</h3>
              <p>The index state comes straight from each engine’s inspection API.</p>
            </div>
            <div className="tile spot rv" style={{ '--d': '.06s' }}>
              <span className="tag">04 · RETRY</span>
              <div className="viz"><RetryViz /></div>
              <h3>Retries itself</h3>
              <p>Exponential backoff on failures, and automatic resubmission when a page still isn’t indexed.</p>
            </div>
            <div className="tile spot rv" style={{ '--d': '.12s' }}>
              <span className="tag">05 · QUOTA</span>
              <div className="viz">
                <div className="v-ring">
                  <svg viewBox="0 0 140 140"><circle className="bg" cx="70" cy="70" r="60" /><circle className="fg" cx="70" cy="70" r="60" /></svg>
                  <div className="lbl"><div><b>143</b><span>of 200 today</span></div></div>
                </div>
              </div>
              <h3>Quota-aware</h3>
              <p>Google’s daily limit is tracked per property, and extra URLs simply wait for tomorrow.</p>
            </div>
            <div className="tile w3 spot rv">
              <span className="tag">06 · HISTORY</span>
              <div className="viz"><Csv /></div>
              <h3>Every event, on the record</h3>
              <p>Full per-URL history of requests, responses and retries, exportable to CSV.</p>
            </div>
            <div className="tile w3 spot rv" style={{ '--d': '.06s' }}>
              <span className="tag">07 · ENGINES</span>
              <div className="viz">
                <div className="v-engines">
                  <span className="e"><GoogleIcon /></span><span className="link" />
                  <span className="hub"><Icon name="send" /></span>
                  <span className="link" /><span className="e"><BingIcon /></span>
                </div>
              </div>
              <h3>Google and Bing, one request</h3>
              <p>Choose engines per submission. Per-engine status keeps both sides clear.</p>
            </div>
          </div>
        </div>
      </section>

      <How />

      <section className="band">
        <svg className="orbit-bg" viewBox="0 0 1400 800" preserveAspectRatio="none" aria-hidden="true">
          <ellipse cx="700" cy="400" rx="680" ry="300" /><ellipse cx="700" cy="400" rx="520" ry="220" />
          <ellipse className="hot" cx="700" cy="400" rx="680" ry="300" />
        </svg>
        <div className="wrap">
          <span className="kicker rv">By the numbers</span>
          <h2 className="display rv" style={{ marginTop: 18, maxWidth: 760, '--d': '.05s' }}>Built for travel sites that publish <span className="serif">every day.</span></h2>
          <p className="lead rv" style={{ marginTop: 18, maxWidth: 560, '--d': '.1s' }}>New tours, seasonal deals, visa guides: get them in front of travellers while they’re still relevant.</p>
          <Figures />
        </div>
      </section>

      <Faq />

      <section className="final rv">
        <div className="wrap">
          <h2>Stop waiting for <span className="serif">Googlebot.</span></h2>
          <svg className="swoosh" viewBox="0 0 680 90" preserveAspectRatio="none" aria-hidden="true"><path d="M10 60 C 180 100, 460 90, 670 12" /></svg>
          <p className="lead" style={{ maxWidth: 520, margin: '8px auto 0' }}>Create an account, verify your site and send your first URL in under two minutes.</p>
          <div className="ctas">
            <Link to={cta}><Button variant="primary" size="lg" className="btn-pill" arrow>{user ? 'Open dashboard' : 'Create free account'}</Button></Link>
            {!user && <Link to="/login"><Button size="lg" className="btn-pill">Sign in</Button></Link>}
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-top">
            <div><Logo height={44} /><p>Fast, verified indexing for travel websites, on Google and Bing.</p></div>
            <div><h5>Product</h5><ul><li><a href="#features" onClick={(e) => jump(e, 'features')}>Features</a></li><li><a href="#how" onClick={(e) => jump(e, 'how')}>How it works</a></li><li><a href="#faq" onClick={(e) => jump(e, 'faq')}>FAQ</a></li></ul></div>
            <div><h5>App</h5><ul><li><Link to="/app/submit">Submit URLs</Link></li><li><Link to="/app/reports">Live report</Link></li><li><Link to="/app/logs">Logs & export</Link></li></ul></div>
            <div><h5>Account</h5><ul><li><Link to="/login">Sign in</Link></li><li><Link to="/register">Create account</Link></li></ul></div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} Paxfue Travel Holiday. All rights reserved.</span>
            <span>Google · Bing · IndexNow</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
