const { useState, useEffect, useCallback } = React;

const API_URL = "https://script.google.com/macros/s/AKfycbyvS-au_Ur5ahls3-lyqmAedydUFbquae0wlkXSL4f3hlCYQYDJoioFvyY4iPfEaMHaVQ/exec";

async function api(action, payload = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
      signal: ctrl.signal,
      redirect: "follow",
      mode: "cors",
    });
    const text = await res.text();
    if (!text || text.trim().startsWith("<")) {
      throw new Error("API returned HTML instead of JSON. Redeploy code.gs as Web App (Anyone) and update API_URL.");
    }
    let data;
    try { data = JSON.parse(text); }
    catch (_) { throw new Error("Invalid server response. Redeploy code.gs Web App."); }
    if (!data.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Server timeout. Check Web App deployment / API_URL.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* ───────────── Icons (inline SVG) ───────────── */
const Icon = {
  earn: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  ),
  shop: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
    </svg>
  ),
  leaders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7"/>
      <path d="M4 22h16M12 4v18M8 9v5a4 4 0 008 0V9"/>
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  help: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
    </svg>
  ),
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
  gem: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 9l10 13L22 9 12 2zm0 3.5L18.5 9 12 17.5 5.5 9 12 5.5z"/>
    </svg>
  )
};

/* ───────────── Top Nav (desktop) + Mobile header ───────────── */
function TopNav({ site, user, tab, setTab, onLogout, onAuthClick }) {
  const points = user && user.account_status === "active" ? (user.total_points != null ? user.total_points : 0) : null;

  return (
    <>
      {/* Desktop / tablet top nav */}
      <nav className="topnav desktop-nav">
        <a className="topnav-logo" href="#" onClick={e => { e.preventDefault(); if (setTab) setTab("quizzes"); }}>
          {site.site_logo_url
            ? <img src={site.site_logo_url} alt="" />
            : <div className="logo-mark">Q</div>}
          <span>{site.site_name || "Quiz Rewards"}</span>
        </a>

        {user && user.account_status === "active" && (
          <div className="topnav-links">
            <button className={tab === "quizzes" ? "active" : ""} onClick={() => setTab("quizzes")}>
              {Icon.earn}<span>Earn</span>
            </button>
            <button className={tab === "rewards" ? "active" : ""} onClick={() => setTab("rewards")}>
              {Icon.shop}<span>Shop</span>
            </button>
            <button className={tab === "leaders" ? "active" : ""} onClick={() => setTab("leaders")}>
              {Icon.leaders}<span>Leaders</span>
            </button>
            <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
              {Icon.profile}<span>Profile</span>
            </button>
            <button className={tab === "help" ? "active" : ""} onClick={() => setTab("help")}>
              {Icon.help}<span>Help</span>
            </button>
          </div>
        )}

        <div className="topnav-right">
          {points !== null && (
            <div className="topnav-balance">
              {Icon.gem}
              <span>{points}</span>
            </div>
          )}
          {user ? (
            <>
              <span className="topnav-user">{user.username}</span>
              <button className="nav-icon-btn" title="Logout" onClick={onLogout}>{Icon.logout}</button>
            </>
          ) : (
            <button className="btn-sm" onClick={onAuthClick}>Signup / Login</button>
          )}
        </div>
      </nav>

      {/* Mobile header: logo center, balance below */}
      <header className="mobile-header">
        <a className="mobile-logo" href="#" onClick={e => { e.preventDefault(); if (setTab) setTab("quizzes"); }}>
          {site.site_logo_url
            ? <img src={site.site_logo_url} alt="" />
            : <div className="logo-mark">Q</div>}
          <span>{site.site_name || "Quiz Rewards"}</span>
        </a>
        {points !== null && (
          <div className="mobile-balance">
            {Icon.gem}
            <span>{points} pts</span>
          </div>
        )}
        {!user && (
          <button className="btn-sm" onClick={onAuthClick}>Login</button>
        )}
      </header>
    </>
  );
}

/* ───────────── Mobile bottom nav ───────────── */
function BottomNav({ tab, setTab, user }) {
  if (!user || user.account_status !== "active") return null;
  return (
    <nav className="bottom-nav">
      <button className={tab === "quizzes" ? "active" : ""} onClick={() => setTab("quizzes")}>
        {Icon.earn}<span>Earn</span>
      </button>
      <button className={tab === "rewards" ? "active" : ""} onClick={() => setTab("rewards")}>
        {Icon.shop}<span>Shop</span>
      </button>
      <button className={tab === "leaders" ? "active" : ""} onClick={() => setTab("leaders")}>
        {Icon.leaders}<span>Leaders</span>
      </button>
      <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}>
        {Icon.profile}<span>Profile</span>
      </button>
      <button className={tab === "help" ? "active" : ""} onClick={() => setTab("help")}>
        {Icon.help}<span>Help</span>
      </button>
    </nav>
  );
}

/* ───────────── Real Ticker from Quiz_Attempts ───────────── */
function Ticker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api("getTicker")
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  if (!items.length) return null;

  // Duplicate for seamless scroll
  const doubled = [...items, ...items];

  return (
    <div className="ticker-wrap">
      <div className="ticker" style={{ animationDuration: Math.max(20, items.length * 3) + "s" }}>
        {doubled.map((it, i) => (
          <span className="ticker-item" key={i}>
            <strong>{it.username}</strong>
            {" earned "}
            <strong className="pts">{it.points_earned}</strong>
            {" pts"}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Landing ───────────── */
function Landing({ site, onAuthClick }) {
  return (
    <div className="page-content">
      <Ticker />
      <section className="hero">
        <h1>
          Earn points with <span className="accent">quizzes</span>, redeem for <span className="accent">rewards</span>
        </h1>
        <p>Join users completing quizzes and cashing out points for real rewards.</p>
        <button className="btn hero-cta" onClick={onAuthClick}>
          Get Started — $1 to activate
        </button>
      </section>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Complete <span className="accent">Quizzes</span></h3>
          <div className="icons">📝 ✅</div>
        </div>
        <div className="feature-card">
          <h3>Earn <span className="accent">Points</span></h3>
          <div className="icons">⭐ 📈</div>
        </div>
        <div className="feature-card">
          <h3>Redeem <span className="accent">Rewards</span></h3>
          <div className="icons">🎁 💳</div>
        </div>
      </div>

      <p className="section-label">— Cash out into —</p>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Gift <span className="accent">Cards</span></h3>
          <div className="icons">🎁 💳</div>
        </div>
        <div className="feature-card">
          <h3>PayPal <span className="accent">Money</span></h3>
          <div className="icons">💰 📧</div>
        </div>
        <div className="feature-card">
          <h3>Custom <span className="accent">Rewards</span></h3>
          <div className="icons">🏆 ✨</div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-box">
          <span className="label">Pass <span className="accent">Threshold</span></span>
          <span className="value">80%</span>
        </div>
        <div className="stat-box">
          <span className="label">Activation <span className="accent">Fee</span></span>
          <span className="value">$1</span>
        </div>
        <div className="stat-box">
          <span className="label">Base <span className="accent">Points</span></span>
          <span className="value">5+</span>
        </div>
        <div className="stat-box">
          <span className="label">Formula</span>
          <span className="value">Base+CR+AR</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Auth ───────────── */
function AuthScreen({ onAuth, site, onBack }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "register") {
        const data = await api("register", { email, password, username });
        onAuth(data.user);
      } else {
        const data = await api("login", { email, password });
        onAuth(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          {site.site_logo_url
            ? <img src={site.site_logo_url} alt="" className="brand-logo" />
            : <div className="brand-icon">Q</div>}
          <div>
            <div className="brand-name">{site.site_name || "Quiz Rewards"}</div>
            {site.site_tagline && <div className="brand-tag">{site.site_tagline}</div>}
          </div>
        </div>
        <div className="tabs">
          <button className={tab === "login" ? "active" : ""} onClick={() => setTab("login")}>Login</button>
          <button className={tab === "register" ? "active" : ""} onClick={() => setTab("register")}>Register</button>
        </div>
        <form onSubmit={handleSubmit}>
          {tab === "register" && (
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          )}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Please wait…" : tab === "login" ? "Login" : "Create Account"}
          </button>
        </form>
        {onBack && <button className="link" onClick={onBack}>← Back to home</button>}
        <p className="footer-links"><a href="admin.html">Admin</a></p>
      </div>
    </div>
  );
}

/* ───────────── Activation ───────────── */
function ActivationScreen({ user, onActivated, site }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!window.paypal) return;
    const container = document.getElementById("paypal-button-container");
    if (!container) return;
    container.innerHTML = "";
    window.paypal.Buttons({
      style: { layout: "vertical", color: "blue", shape: "rect", label: "paypal" },
      createOrder: (data, actions) => actions.order.create({
        purchase_units: [{ amount: { value: "1.00", currency_code: "USD" }, description: "Account Activation" }]
      }),
      onApprove: async (data, actions) => {
        const order = await actions.order.capture();
        setLoading(true); setErr(""); setMsg("");
        try {
          const res = await api("confirmPaypal", {
            user_id: user.user_id,
            paypal_txn_id: order.id,
            payer_email: order.payer?.email_address || ""
          });
          setMsg("Payment successful! Account activated.");
          onActivated(res.user);
        } catch (e) { setErr(e.message); }
        finally { setLoading(false); }
      },
      onError: (err) => setErr("PayPal error: " + (err.message || "Unknown"))
    }).render("#paypal-button-container");
  }, [user, onActivated]);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true); setErr(""); setMsg("");
    try {
      const res = await api("redeemCode", { user_id: user.user_id, code: code.trim() });
      setMsg("Code accepted! Account activated.");
      onActivated(res.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          {site.site_logo_url
            ? <img src={site.site_logo_url} alt="" className="brand-logo" />
            : <div className="brand-icon">Q</div>}
          <div><div className="brand-name">{site.site_name || "Quiz Rewards"}</div></div>
        </div>
        <h2 className="section-title">Activate Account</h2>
        <p className="subtitle">Pay $1 via PayPal or enter an access code to start earning.</p>
        <div className="activation-section">
          <h3>Option A — PayPal ($1 USD)</h3>
          <div id="paypal-button-container"></div>
        </div>
        <div className="divider">OR</div>
        <div className="activation-section">
          <h3>Option B — Access Code</h3>
          <input type="text" placeholder="QUIZ-XXXX-XXXX" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())} />
          <button onClick={redeem} disabled={loading || !code.trim()}>
            {loading ? "Validating…" : "Redeem Code"}
          </button>
        </div>
        {msg && <p className="success">{msg}</p>}
        {err && <p className="error">{err}</p>}
        <button className="link" onClick={() => { localStorage.removeItem("qr_user"); window.location.reload(); }}>Logout</button>
      </div>
    </div>
  );
}

/* ───────────── Quiz Player ───────────── */
function QuizPlayer({ quiz, user, onFinish, onCancel }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pick = (qIdx, optIdx) => setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));

  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      const res = await api("submitQuiz", { user_id: user.user_id, quiz_id: quiz.quiz_id, answers });
      onFinish(res);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const cancel = async () => {
    if (!confirm("Cancel this quiz? You will lose 1% Acceptance Rating.")) return;
    setSubmitting(true);
    try {
      const res = await api("cancelQuiz", { user_id: user.user_id, quiz_id: quiz.quiz_id });
      onCancel(res);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const allAnswered = quiz.questions.every((_, i) => answers[i] !== undefined);

  return (
    <div className="quiz-wrap">
      <div className="quiz-header">
        <h2>{quiz.title}</h2>
        <p>{quiz.description}</p>
        <p className="meta">Base points: {quiz.base_points} · Pass ≥ {quiz.pass_threshold}%</p>
      </div>
      {quiz.questions.map((q, qi) => (
        <div className="question" key={qi}>
          <p className="q-text">{qi + 1}. {q.text}</p>
          <div className="options">
            {q.options.map((opt, oi) => (
              <button key={oi} className={"opt " + (answers[qi] === oi ? "picked" : "")}
                onClick={() => pick(qi, oi)}>{opt}</button>
            ))}
          </div>
        </div>
      ))}
      {error && <p className="error">{error}</p>}
      <div className="quiz-actions">
        <button className="danger" onClick={cancel} disabled={submitting}>Cancel</button>
        <button onClick={submit} disabled={!allAnswered || submitting}>
          {submitting ? "Submitting…" : "Submit Answers"}
        </button>
      </div>
    </div>
  );
}

/* ───────────── Rewards ───────────── */
function RewardsSection({ user, rewards, onRedeemed }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [myRedemptions, setMyRedemptions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(() => {
    api("myRedemptions", { user_id: user.user_id })
      .then(d => setMyRedemptions(d.redemptions || []))
      .catch(() => {});
  }, [user.user_id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const redeem = async (reward) => {
    if (!confirm(`Redeem "${reward.title}" for ${reward.points_cost} points?`)) return;
    setBusy(reward.reward_id);
    setError("");
    setSuccess(null);
    try {
      const res = await api("redeemReward", { user_id: user.user_id, reward_id: reward.reward_id });
      setSuccess(res);
      loadHistory();
      if (onRedeemed) onRedeemed(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2>Shop — Redeem Rewards</h2>
        <button className="btn-sm btn-outline" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? "Hide History" : "My Redemptions"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {success && (
        <div className="redeem-success">
          <h3>✓ {success.message || "Redeemed!"}</h3>
          <p><strong>{success.reward_title}</strong></p>
          <p>Points spent: <strong>{success.points_spent}</strong> · Remaining: <strong>{success.points_remaining}</strong></p>
          {success.details && (
            <div className="reward-details-box">
              <strong>Reward details</strong>
              <p>{success.details}</p>
            </div>
          )}
          <p className="meta">Status: {success.status}</p>
          <button className="link" onClick={() => setSuccess(null)}>Dismiss</button>
        </div>
      )}
      {showHistory && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Reward</th><th>Points</th><th>Status</th><th>Details</th><th>Date</th></tr>
            </thead>
            <tbody>
              {myRedemptions.length === 0 && <tr><td colSpan="5">No redemptions yet.</td></tr>}
              {myRedemptions.map(r => (
                <tr key={r.redemption_id}>
                  <td>{r.reward_title}</td>
                  <td>{r.points_spent}</td>
                  <td><span className={"badge " + r.status}>{r.status}</span></td>
                  <td className="q-cell">{r.details || r.admin_note || "—"}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="content-grid">
        {(rewards || []).length === 0 && <p className="subtitle">No rewards available yet.</p>}
        {(rewards || []).map(r => (
          <div className="content-card" key={r.reward_id}>
            <h3>{r.title}</h3>
            <p>{r.description}</p>
            {r.details && <p className="meta">{r.details}</p>}
            <div className="points-cost">{r.points_cost} points</div>
            <button
              onClick={() => redeem(r)}
              disabled={busy === r.reward_id || user.total_points < r.points_cost}
            >
              {busy === r.reward_id
                ? "Redeeming…"
                : user.total_points < r.points_cost
                  ? `Need ${r.points_cost - user.total_points} more`
                  : "Redeem"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Leaders (from ticker / attempts) ───────────── */
function LeadersSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("getTicker")
      .then(d => setItems(d.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate by username
  const totals = {};
  items.forEach(it => {
    if (!totals[it.username]) totals[it.username] = 0;
    totals[it.username] += it.points_earned;
  });
  const ranked = Object.entries(totals)
    .map(([username, pts]) => ({ username, pts }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 20);

  return (
    <div>
      <h2 style={{ marginBottom: "1rem" }}>Leaders</h2>
      {loading && <p>Loading…</p>}
      {!loading && ranked.length === 0 && <p className="subtitle">No completions yet. Be the first!</p>}
      <div className="content-grid">
        {ranked.map((r, i) => (
          <div className="content-card" key={r.username}>
            <h3>#{i + 1} {r.username}</h3>
            <div className="points-cost">{r.pts} pts earned</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Profile ───────────── */
function ProfileSection({ user, onLogout }) {
  const nextBonus = Math.round(user.CR_pct / 10) + Math.round(user.AR_pct / 100);
  return (
    <div>
      <h2 style={{ marginBottom: "1.25rem" }}>Profile</h2>
      <div className="user-stats">
        <div className="stat-box">
          <span className="label">Total <span className="accent">Points</span></span>
          <span className="value">{user.total_points}</span>
        </div>
        <div className="stat-box">
          <span className="label">CR<span className="accent">%</span></span>
          <span className="value">{user.CR_pct}%</span>
        </div>
        <div className="stat-box">
          <span className="label">AR<span className="accent">%</span></span>
          <span className="value">{user.AR_pct}%</span>
        </div>
        <div className="stat-box">
          <span className="label">Passed</span>
          <span className="value">{user.quizzes_passed}</span>
        </div>
        <div className="stat-box">
          <span className="label">Next <span className="accent">Bonus</span></span>
          <span className="value">+{nextBonus}</span>
        </div>
      </div>
      <div className="content-card" style={{ maxWidth: 400 }}>
        <h3>{user.username}</h3>
        <p>{user.email}</p>
        <p className="meta">Status: {user.account_status} · Method: {user.payment_method || "—"}</p>
        <p className="meta">points = base + round(CR%/10) + round(AR%/100)</p>
        <button className="btn-outline" style={{ marginTop: "1rem", width: "auto" }} onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}

/* ───────────── Help ───────────── */
function HelpSection() {
  return (
    <div>
      <h2 style={{ marginBottom: "1rem" }}>Help</h2>
      <div className="content-card" style={{ maxWidth: 560 }}>
        <h3>How it works</h3>
        <p>1. Register and activate with $1 PayPal or an access code.</p>
        <p>2. Complete quizzes (pass at 80%+) to earn points.</p>
        <p>3. Redeem points in Shop for rewards.</p>
        <p className="meta" style={{ marginTop: "1rem" }}>
          Points formula: base_points + round(CR% / 10) + round(AR% / 100)
        </p>
        <p className="meta">
          AR% +1 on pass, −1 on fail or cancel. Quizzes disappear after you complete them (pass or fail).
        </p>
      </div>
    </div>
  );
}

/* ───────────── Dashboard ───────────── */
function Dashboard({ user, onLogout, site, setUserPoints }) {
  const [data, setData] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("quizzes");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const t0 = Date.now();
    try {
      const res = await api("getDashboard", { user_id: user.user_id }, 15000);
      console.log("getDashboard OK in " + (Date.now() - t0) + "ms", res);
      setData(res);
      if (setUserPoints && res.user) setUserPoints(res.user.total_points);
    } catch (e) {
      setError(e.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user.user_id, setUserPoints]);

  useEffect(() => { load(); }, [load]);

  // Stats from localStorage user first — dashboard visible immediately
  const u = data && data.user ? { ...user, ...data.user } : user;
  const quizzes = (data && data.quizzes) || [];
  const rewards = (data && data.rewards) || [];
  const showContent = true; // never hide dashboard shell

  if (activeQuiz) {
    return (
      <div className="dash-page">
        <TopNav site={site} user={u} tab={tab} setTab={setTab} onLogout={onLogout} />
        <QuizPlayer
          quiz={activeQuiz}
          user={u}
          onFinish={(res) => { setActiveQuiz(null); setResult(res); load(); }}
          onCancel={(res) => { setActiveQuiz(null); setResult({ cancelled: true, ...res }); load(); }}
        />
        <BottomNav tab={tab} setTab={setTab} user={u} />
      </div>
    );
  }

  return (
    <div className="dash-page">
      <TopNav site={site} user={u} tab={tab} setTab={setTab} onLogout={onLogout} />
      <Ticker />

      <div className="dash-wrap page-content">
        {error && (
          <div className="result-banner fail" style={{ marginBottom: "1rem" }}>
            <p style={{ margin: 0 }}>{error}</p>
            <button className="btn-sm" style={{ marginTop: "0.5rem", width: "auto" }} onClick={load}>Retry</button>
          </div>
        )}

        {/* Stats always visible from user object — never blank */}
        {showContent && (
          <>
            <div className="user-stats">
              <div className="stat-box">
                <span className="label">Total <span className="accent">Points</span></span>
                <span className="value">{u.total_points != null ? u.total_points : 0}</span>
              </div>
              <div className="stat-box">
                <span className="label">CR<span className="accent">%</span></span>
                <span className="value">{u.CR_pct != null ? u.CR_pct : 100}%</span>
              </div>
              <div className="stat-box">
                <span className="label">AR<span className="accent">%</span></span>
                <span className="value">{u.AR_pct != null ? u.AR_pct : 100}%</span>
              </div>
              <div className="stat-box">
                <span className="label">Passed</span>
                <span className="value">{u.quizzes_passed != null ? u.quizzes_passed : 0}</span>
              </div>
              <div className="stat-box">
                <span className="label">Next <span className="accent">Bonus</span></span>
                <span className="value">+{Math.round((u.CR_pct != null ? u.CR_pct : 100) / 10) + Math.round((u.AR_pct != null ? u.AR_pct : 100) / 100)}</span>
              </div>
            </div>
            {loading && !data && (
              <div className="center-msg" style={{ padding: "1rem" }}><div className="spinner"></div><p>Loading quizzes… {elapsed}s (times out at 15s)</p></div>
            )}

            {result && (
              <div className={"result-banner " + (result.cancelled ? "cancelled" : result.passed ? "pass" : "fail")}>
                {result.cancelled ? (
                  <p>Quiz cancelled. AR% −1. Quiz still available.</p>
                ) : (
                  <>
                    <p>Score: <strong>{result.score_pct}%</strong> — {result.passed ? "PASSED" : "FAILED"}</p>
                    <p>Points earned: <strong>{result.points_earned}</strong>
                      {result.ar_change !== 0 && ` · AR ${result.ar_change > 0 ? "+" : ""}${result.ar_change}%`}
                    </p>
                    <p className="meta">This quiz is no longer available for you.</p>
                  </>
                )}
                <button className="link" onClick={() => setResult(null)}>Dismiss</button>
              </div>
            )}

            {tab === "quizzes" && (
              <>
                <h2 className="section-h">Earn — Available Quizzes</h2>
                <div className="content-grid">
                  {quizzes.map(q => (
                    <div className="content-card" key={q.quiz_id}>
                      <h3>{q.title}</h3>
                      <p>{q.description}</p>
                      <p className="meta">Base {q.base_points} pts · Pass ≥ {q.pass_threshold}% · {(q.questions || []).length} Qs</p>
                      <button onClick={() => { setResult(null); setActiveQuiz(q); }}>Start Quiz</button>
                    </div>
                  ))}
                  {quizzes.length === 0 && !loading && (
                    <p className="subtitle">No quizzes left — you've completed them all!</p>
                  )}
                </div>
              </>
            )}

            {tab === "rewards" && (
              <RewardsSection user={u} rewards={rewards} onRedeemed={() => load()} />
            )}
            {tab === "leaders" && <LeadersSection />}
            {tab === "profile" && <ProfileSection user={u} onLogout={onLogout} />}
            {tab === "help" && <HelpSection />}
          </>
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} user={u} />
    </div>
  );
}

/* ───────────── Root ───────────── */
function App() {
  // Restore user immediately from localStorage — never block on API
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("qr_user");
      return saved ? JSON.parse(saved) : null;
    } catch (_) { return null; }
  });
  const [site, setSite] = useState({ site_name: "Quiz Rewards", site_logo_url: "", site_tagline: "", installed: true });
  const [notInstalled, setNotInstalled] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [apiError, setApiError] = useState("");

  // Load site info in background — UI is already visible
  useEffect(() => {
    let cancelled = false;
    api("getSiteInfo", {}, 8000)
      .then(d => {
        if (cancelled) return;
        setSite(d);
        setApiError("");
        if (d.installed === false) setNotInstalled(true);
      })
      .catch(e => {
        if (cancelled) return;
        // Don't block UI; only show banner if we have no cached user
        setApiError(e.message || "Cannot reach API");
      });
    return () => { cancelled = true; };
  }, []);

  const handleAuth = (u) => {
    localStorage.setItem("qr_user", JSON.stringify(u));
    setUser(u);
    setShowAuth(false);
  };
  const handleActivated = (u) => {
    localStorage.setItem("qr_user", JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem("qr_user");
    setUser(null);
    setShowAuth(false);
  };
  // Stable identity + no-op when unchanged, otherwise Dashboard's load() re-fires forever
  const setUserPoints = useCallback((pts) => {
    setUser(prev => {
      if (!prev) return prev;
      if (prev.total_points === pts) return prev;
      const next = { ...prev, total_points: pts };
      try { localStorage.setItem("qr_user", JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  if (notInstalled) {
    return (
      <div className="auth-wrap">
        <div className="auth-card center">
          <h1>Not Installed</h1>
          <p className="subtitle">Run the installer to set up this site.</p>
          <a className="btn" href="install.html">Run Installer</a>
        </div>
      </div>
    );
  }

  // Non-blocking API warning banner
  const apiBanner = apiError && !user ? (
    <div style={{ background: "#1e293b", borderBottom: "1px solid #ef4444", padding: "0.6rem 1rem", textAlign: "center", fontSize: "0.85rem", color: "#fca5a5" }}>
      API issue: {apiError} — check API_URL in app.jsx and redeploy code.gs
    </div>
  ) : null;

  if (user && user.account_status === "active") {
    return <Dashboard user={user} onLogout={logout} site={site} setUserPoints={setUserPoints} />;
  }

  if (user && user.account_status !== "active") {
    return (
      <>
        <TopNav site={site} user={user} onLogout={logout} />
        <ActivationScreen user={user} onActivated={handleActivated} site={site} />
      </>
    );
  }

  if (showAuth) {
    return (
      <>
        {apiBanner}
        <TopNav site={site} user={null} onAuthClick={() => setShowAuth(true)} />
        <AuthScreen onAuth={handleAuth} site={site} onBack={() => setShowAuth(false)} />
      </>
    );
  }

  return (
    <>
      {apiBanner}
      <TopNav site={site} user={null} onAuthClick={() => setShowAuth(true)} />
      <Landing site={site} onAuthClick={() => setShowAuth(true)} />
    </>
  );
}

/* Shows a visible error (instead of a blank/endless-loading page) if any component crashes */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("QR crash:", err, info); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 24, color: "#e2e8f0", background: "#0a0e1a", minHeight: "100vh", fontFamily: "sans-serif" }}>
        <h2>Something crashed</h2>
        <pre style={{ whiteSpace: "pre-wrap", color: "#fca5a5", margin: "12px 0" }}>{String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}</pre>
        <button style={{ width: "auto" }} onClick={() => { try { localStorage.removeItem("qr_user"); } catch (_) {} location.reload(); }}>
          Clear login &amp; reload
        </button>
      </div>
    );
  }
}

window.__QR_MOUNTED = true;
ReactDOM.createRoot(document.getElementById("root")).render(<ErrorBoundary><App /></ErrorBoundary>);
