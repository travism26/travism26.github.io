/* global React, ReactDOM */

const { useState, useEffect, useMemo, useRef } = React;
const D = window.PORTFOLIO_DATA;

// ───────────────────────────────────────────────────────────────
// Tiny inline icons (Lucide-stroke style, no external dep)
// ───────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
       stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const IconLeaf = (p) => <Icon {...p} d={<>
  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 3c1 4 .5 8.5-2.7 11.7A8.5 8.5 0 0 1 11 20z" />
  <path d="M2 21c0-3 1.85-5.36 5.08-6" />
</>} />;
const IconGitHub = (p) => <Icon {...p} d={
  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
} />;
const IconArrow = (p) => <Icon {...p} d={<><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>} />;
const IconExt = (p) => <Icon {...p} d={<><path d="M15 3h6v6"/><path d="M10 14L21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>} />;
const IconMail = (p) => <Icon {...p} d={<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></>} />;
const IconLock = (p) => <Icon {...p} d={<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>} />;
const IconSpark = (p) => <Icon {...p} d={<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>} />;
const IconSend = (p) => <Icon {...p} d={<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>} />;

// ───────────────────────────────────────────────────────────────
// Nav
// ───────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="nav">
      <div className="shell nav-inner">
        <a href="#top" className="brand">
          <span className="brand-mark"><IconLeaf size={18} /></span>
          <span className="brand-text">travism26<span className="dim">.dev</span></span>
        </a>
        <div className="nav-links">
          <a href="#work">work</a>
          <a href="#projects">projects</a>
          <a href="#skills">skills</a>
          <a href="#experience">experience</a>
          <a href="#about">about</a>
          <a href="#contact" className="nav-cta">$ contact</a>
        </div>
      </div>
    </nav>
  );
}

// ───────────────────────────────────────────────────────────────
// Hero — left side has identity, right side an AI demo terminal
// ───────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="hero shell" id="top">
      <div className="hero-left">
        <div className="hero-pill">
          <span className="dot" />
          {D.identity.available ? "Available for new work" : "Heads-down on a project"}
        </div>
        <h1>
          Building <span className="accent">AI systems</span><br/>
          that ship<span className="cursor" />
        </h1>
        <p className="hero-lede">{D.identity.blurb}</p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#work">
            See my work <IconArrow size={14} />
          </a>
          <a className="btn btn-ghost" href={D.links.github} target="_blank" rel="noopener noreferrer">
            <IconGitHub size={14} /> github.com/travism26
          </a>
        </div>
        <div className="hero-numbers">
          {D.numbers.map((n, i) => (
            <div className="num" key={i}>
              <div className="v">{n.value}</div>
              <div className="l">{n.label}</div>
            </div>
          ))}
        </div>
      </div>

      <Terminal />
    </section>
  );
}

function Terminal() {
  return (
    <div className="term" aria-label="terminal">
      <div className="term-bar">
        <div className="dots"><span/><span/><span/></div>
        <div className="title">~/travism26 · zsh</div>
      </div>
      <div className="term-body">
        <div className="term-line"><span className="tok-prompt">$</span><span className="tok-cmd">whoami</span></div>
        <div className="term-line">travis · <span className="tok-comment"># shipping AI tooling since 2024</span></div>
        <div className="term-line">&nbsp;</div>
        <div className="term-line"><span className="tok-prompt">$</span><span className="tok-cmd">cat</span> <span className="tok-str">stack.txt</span></div>
        <div className="term-line">go &nbsp;&nbsp;&nbsp;<span className="tok-comment"># agents, gateways, distributed</span></div>
        <div className="term-line">python <span className="tok-comment"># AI workflows + agents</span></div>
        <div className="term-line">java &nbsp;<span className="tok-comment"># spring boot + spring AI</span></div>
        <div className="term-line">ts &nbsp;&nbsp;&nbsp;<span className="tok-comment"># next.js + node services</span></div>
        <div className="term-line">&nbsp;</div>
        <div className="term-line"><span className="tok-prompt">$</span><span className="tok-cmd">cat</span> <span className="tok-str">about.txt</span></div>
        <div className="term-line">→ I build <span className="tok-ok">tools that ship</span></div>
        <div className="term-line">→ secure-by-default · <span className="tok-ok">pragmatic</span> · polyglot</div>
        <div className="term-line"><span className="tok-prompt">$</span><span className="tok-cmd"></span><span className="cursor-term"></span></div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Featured projects — three large hero cards with code preview
// ───────────────────────────────────────────────────────────────
function FeatureCard({ p }) {
  const codeBlock = useMemo(() => CODE_PREVIEWS[p.id], [p.id]);
  return (
    <article className="feature-card">
      <div className="fc-body">
        <div className="fc-meta">
          <span className="pill">{p.status}</span>
          <span>·</span>
          <span>{p.year}</span>
          <span>·</span>
          <span>{p.role}</span>
        </div>
        <h3 className="fc-name">
          {p.name}
          {p.private && <span className="fc-private">private</span>}
        </h3>
        <div className="fc-tagline">{p.tagline}</div>
        <p className="fc-summary">{p.summary}</p>
        <ul className="fc-bullets">
          {p.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
        <div className="fc-stack">
          {p.stack.map((t) => <span className="tech-chip" key={t}>{t}</span>)}
        </div>
        <div className="fc-actions">
          {p.private ? (
            <>
              <span className="btn btn-locked">
                <IconLock size={13} /> Private repo
              </span>
              <a className="btn btn-ghost" href={D.links.email}>
                Request a walkthrough
              </a>
            </>
          ) : (
            <>
              {p.links.play && (
                <a className="btn btn-primary" href={p.links.play} target="_blank" rel="noopener noreferrer">
                  <IconExt size={13} /> Play in browser
                </a>
              )}
              <a className={`btn ${p.links.play ? "btn-ghost" : "btn-primary"}`} href={p.links.github} target="_blank" rel="noopener noreferrer">
                <IconGitHub size={13} /> View on GitHub
              </a>
            </>
          )}
        </div>
      </div>

      <aside className="fc-side">
        <div className="fc-stats">
          {p.stats.map((s, i) => (
            <div className="fc-stat" key={i}>
              <div className="v">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
        <pre className="fc-code">{codeBlock}</pre>
      </aside>
    </article>
  );
}

// pre-rendered "code" snippets per featured project
const CODE_PREVIEWS = {
  bbw: (
    <>
      <span className="c"># persistent recon — SQLite KB accumulates</span>{"\n"}
      <span className="k">$</span> recon_persistent_workflow.py <span className="s">scopes/acme.yaml</span>{"\n"}
      <span className="arrow">→</span> 10 phases · 412 hosts · 18 priority{"\n"}
      <span className="ok">✓</span> KB merged · stale rows preserved{"\n"}{"\n"}
      <span className="c"># exploit — bounded LLM test loop</span>{"\n"}
      <span className="k">$</span> exploit_workflow.py --recon-id <span className="s">abc</span>{"\n"}
      <span className="arrow">→</span> iter 1: PIVOT (idor → authz){"\n"}
      <span className="arrow">→</span> iter 2: RETEST (verify blind SSRF){"\n"}
      <span className="ok">✓</span> 3 confirmed · OOB callbacks logged
    </>
  ),
  adw: (
    <>
      <span className="c"># research → plan → build → test → review</span>{"\n"}
      <span className="k">$</span> travis_sdlc.py <span className="s">"Add export"</span> \{"\n"}
      {"    "}--worktree --attempts <span className="s">3</span> --dream{"\n"}
      <span className="arrow">→</span> best-of-3 · isolated worktrees{"\n"}
      <span className="arrow">→</span> winner applied · losers kept{"\n"}
      <span className="ok">✓</span> memory updated{"\n"}{"\n"}
      <span className="k">$</span> run_eval.py run --all --trials <span className="s">3</span>{"\n"}
      <span className="arrow">→</span> pass@3 · pass^3 · cost
    </>
  ),
  frostmark: (
    <>
      <span className="c"># rules live in sim/ — no scene, no Input</span>{"\n"}
      <span className="k">sim</span>.<span className="f">command</span>(cmd){"\n"}
      <span className="k">sim</span>.<span className="f">step</span>()  <span className="c"># one 0.5 s tick</span>{"\n"}
      <span className="k">sim</span>.<span className="f">drain_events</span>(){"\n"}{"\n"}
      <span className="k">$</span> tools/check.sh{"\n"}
      <span className="arrow">→</span> import · unit tests · smoke run{"\n"}
      <span className="ok">✓</span> web export → GitHub Pages
    </>
  ),
  "spring-ai": (
    <>
      <span className="c">// One API. 100+ models. Cached.</span>{"\n"}
      <span className="k">@PostMapping</span>(<span className="s">"/api/chat"</span>){"\n"}
      <span className="k">public</span> <span className="f">ChatResponse</span> chat({"\n"}
      {"  "}<span className="f">@RequestBody</span> ChatRequest req{"\n"}
      ) {"{"}{"\n"}
      {"  "}<span className="k">return</span> client{"\n"}
      {"    "}.prompt(req.message()){"\n"}
      {"    "}.model(<span className="s">"anthropic/claude-3.5-sonnet"</span>){"\n"}
      {"    "}.call();{"\n"}
      {"}"}
    </>
  ),
  "sec-suite": (
    <>
      <span className="c">// Go agent → TS gateway → Kafka → SIEM</span>{"\n"}
      <span className="k">func</span> <span className="f">collect</span>() <span className="f">Metrics</span> {"{"}{"\n"}
      {"  "}<span className="k">return</span> Metrics{"{"}{"\n"}
      {"    "}CPU:&nbsp;&nbsp;&nbsp;cpu.Usage(),{"\n"}
      {"    "}Mem:&nbsp;&nbsp;&nbsp;mem.Stats(),{"\n"}
      {"    "}Net:&nbsp;&nbsp;&nbsp;net.Snapshot(),{"\n"}
      {"    "}Procs: ps.Top(<span className="s">10</span>),{"\n"}
      {"  "}{"}"}{"\n"}
      {"}"}{"\n"}
      <span className="ok">POST</span> /api/metrics → <span className="f">kafka</span>
    </>
  ),
};

function Featured() {
  return (
    <section className="section shell" id="work">
      <header className="section-head">
        <div>
          <div className="section-eyebrow">featured · {String(D.featured.length).padStart(2, "0")}</div>
          <h2 className="section-title">What I'm building</h2>
          <p className="section-sub">A few projects I'd actually want to talk about. Real code, real users, real READMEs.</p>
        </div>
      </header>
      <div className="featured-stack">
        {D.featured.map((p) => <FeatureCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// All projects grid (filterable)
// ───────────────────────────────────────────────────────────────
function Projects() {
  const allTags = useMemo(() => {
    const s = new Set();
    D.projects.forEach((p) => p.tags.forEach((t) => s.add(t)));
    return ["All", ...Array.from(s)];
  }, []);
  const [filter, setFilter] = useState("All");
  const items = D.projects.filter((p) => filter === "All" || p.tags.includes(filter));

  return (
    <section className="section shell" id="projects">
      <header className="section-head">
        <div>
          <div className="section-eyebrow">repos · {D.projects.length}+</div>
          <h2 className="section-title">More from the lab</h2>
          <p className="section-sub">Side projects, learning repos, and experiments. The full feed lives on GitHub.</p>
        </div>
        <a className="btn btn-ghost" href={D.links.github} target="_blank" rel="noopener noreferrer">
          <IconGitHub size={13} /> See all 87
        </a>
      </header>

      <div className="proj-filters">
        {allTags.map((t) => (
          <button key={t} className={`proj-filter ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="proj-grid">
        {items.map((p) => (
          <a key={p.name} className="proj-card" href={p.url} target="_blank" rel="noopener noreferrer">
            <div className="proj-card-head">
              <div className="proj-name">
                {p.name}
                {p.private && <span className="proj-private">private</span>}
              </div>
              <div className="proj-lang">
                <span className={`ldot lang-${p.lang}`} />
                {p.lang}
              </div>
            </div>
            <p className="proj-summary">{p.summary}</p>
            <div className="proj-stack">
              {p.stack.slice(0, 4).map((s) => <span key={s}>{s}</span>)}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// Skills bento
// ───────────────────────────────────────────────────────────────
function Skills() {
  const spans = ["span6", "span6", "span4", "span4", "span4", "span6", "span6"];
  return (
    <section className="section shell" id="skills">
      <header className="section-head">
        <div>
          <div className="section-eyebrow">stack</div>
          <h2 className="section-title">What I work with</h2>
          <p className="section-sub">A pragmatic, polyglot toolkit. I'll pick up whatever fits the problem — but here's where I'm sharpest.</p>
        </div>
      </header>
      <div className="skills-grid">
        {D.skills.map((g, i) => (
          <div key={g.group} className={`skill-card ${spans[i] || "span6"}`}>
            <div className="skill-title">{g.group}</div>
            <div className="skill-list">
              {g.items.map((t) => <span key={t}>{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// About + Now
// ───────────────────────────────────────────────────────────────
function About() {
  return (
    <section className="section shell" id="about">
      <header className="section-head">
        <div>
          <div className="section-eyebrow">about</div>
          <h2 className="section-title">A bit about me</h2>
        </div>
      </header>
      <div className="about-grid">
        <div className="about-copy">
          <p>{D.identity.longBlurb}</p>
          <p>The throughline of my career has been <strong>secure, scalable backends</strong> — XDR correlation engines at IBM, IAM platforms on AKS at Quantiphi, AI pipelines at Postilize, serverless workflows at Baseline. I gravitate toward the unglamorous infra: testing frameworks, CI/CD, observability, the bits that make production survive.</p>
          <p>The <strong>AI layer is what I'm sharpest on right now</strong>. I've built agentic dev frameworks that automate SDLC phases, LLM agents that integrate Figma + browser automation, and reference implementations for putting LLMs inside Spring Boot. I lead AI adoption inside engineering teams and get measurable productivity gains out of it.</p>
          <p>Outside of code: I write at my <a href={D.links.blog} target="_blank" rel="noopener noreferrer">blog</a>, run a small home garden (inspiration for GrowBuddy), and obsess over secure-coding defaults.</p>
        </div>
        <div className="now-card">
          <div className="now-head">
            <span className="dot" /> /now · what i'm working on
          </div>
          <ul className="now-list">
            {D.now.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────
// Contact CTA + footer
// ───────────────────────────────────────────────────────────────
function Contact() {
  return (
    <>
      <section className="contact shell" id="contact">
        <h2>Let's <span className="accent">build something</span>.</h2>
        <p>Best for: AI tooling, agentic workflows, production AI integration, and the unglamorous infra that makes LLM features actually work.</p>
        <div className="contact-actions">
          <a className="btn btn-primary" href={D.links.email}>
            <IconMail size={14} /> {D.links.emailLabel}
          </a>
          <a className="btn btn-ghost" href={D.links.github} target="_blank" rel="noopener noreferrer">
            <IconGitHub size={14} /> @travism26
          </a>
          <a className="btn btn-ghost" href={D.links.linkedin} target="_blank" rel="noopener noreferrer">
            <IconExt size={14} /> linkedin
          </a>
        </div>
      </section>
      <footer className="footer shell">
        <div>© 2026 Travis Martin · built in HTML, no framework needed</div>
        <div>last deploy: <span style={{color: "var(--p-accent)"}}>just now</span></div>
      </footer>
    </>
  );
}

// ───────────────────────────────────────────────────────────────
// Tweaks
// ───────────────────────────────────────────────────────────────
function PortfolioTweaks() {
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "dark",
    "accent": "green",
    "density": "default",
    "showGridBg": false
  }/*EDITMODE-END*/;

  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  // Apply theme + density to root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-density", tweaks.density);
    document.body.classList.toggle("grid-bg", !!tweaks.showGridBg);
    // accent palette swap
    const accents = {
      green:  ["#22c55e", "#4ade80", "#15803d", "rgba(34,197,94,0.12)"],
      cyan:   ["#22d3ee", "#67e8f9", "#0e7490", "rgba(34,211,238,0.12)"],
      amber:  ["#f59e0b", "#fbbf24", "#b45309", "rgba(245,158,11,0.12)"],
      violet: ["#a78bfa", "#c4b5fd", "#6d28d9", "rgba(167,139,250,0.12)"],
    };
    const [a, a2, ad, ab] = accents[tweaks.accent] || accents.green;
    document.documentElement.style.setProperty("--p-accent", a);
    document.documentElement.style.setProperty("--p-accent-2", a2);
    document.documentElement.style.setProperty("--p-accent-deep", ad);
    document.documentElement.style.setProperty("--p-accent-bg", ab);
  }, [tweaks]);

  // Pass tweaks down so hero can switch modes
  window.__currentTweaks = tweaks;
  // Trigger re-render of root when tweaks change
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("tweakschange", { detail: tweaks }));
  }, [tweaks]);

  const { TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle } = window;

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Surface">
        <TweakRadio label="Theme" value={tweaks.theme} onChange={(v) => setTweak("theme", v)}
          options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} />
        <TweakRadio label="Density" value={tweaks.density} onChange={(v) => setTweak("density", v)}
          options={[{ value: "default", label: "Default" }, { value: "cozy", label: "Cozy" }, { value: "dense", label: "Dense" }]} />
        <TweakToggle label="Grid background" value={tweaks.showGridBg} onChange={(v) => setTweak("showGridBg", v)} />
      </TweakSection>

      <TweakSection label="Accent">
        <window.TweakSelect label="Brand color" value={tweaks.accent} onChange={(v) => setTweak("accent", v)}
          options={[
            { value: "green", label: "Green (default)" },
            { value: "cyan", label: "Cyan" },
            { value: "amber", label: "Amber" },
            { value: "violet", label: "Violet" },
          ]} />
      </TweakSection>
    </TweaksPanel>
  );
}

// ───────────────────────────────────────────────────────────────
// Root
// ───────────────────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────
// Experience timeline
// ───────────────────────────────────────────────────────────────
function Experience() {
  return (
    <section className="section shell" id="experience">
      <header className="section-head">
        <div>
          <div className="section-eyebrow">experience</div>
          <h2 className="section-title">A decade plus, mostly Fredericton.</h2>
        </div>
        <p className="section-sub">Backend, security, and AI — IBM, Quantiphi, Postilize, Baseline. UNB Computer Science.</p>
      </header>
      <div className="xp-list">
        {D.experience.map((x, i) => (
          <article key={i} className="xp-card">
            <div className="xp-meta">
              <div className="xp-period">{x.period}</div>
              <div className="xp-tag">{x.tag}</div>
            </div>
            <div className="xp-body">
              <div className="xp-head">
                <h3 className="xp-role">{x.role}</h3>
                <div className="xp-co">{x.company} <span className="xp-loc">· {x.location}</span></div>
              </div>
              <ul className="xp-bullets">
                {x.bullets.map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          </article>
        ))}
        <article className="xp-card xp-edu">
          <div className="xp-meta">
            <div className="xp-period">Education</div>
            <div className="xp-tag">Foundations</div>
          </div>
          <div className="xp-body">
            <div className="xp-head">
              <h3 className="xp-role">{D.education.degree}</h3>
              <div className="xp-co">{D.education.school} <span className="xp-loc">· {D.education.location}</span></div>
            </div>
            <ul className="xp-bullets">
              {D.education.extras.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Featured />
        <Projects />
        <Skills />
        <Experience />
        <About />
        <Contact />
      </main>
      <PortfolioTweaks />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
