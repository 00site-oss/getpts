const { useState, useEffect, useCallback } = React;

// ────────────────────────────────────────────────
// SET YOUR WEB APP URL HERE (same as in app.jsx / install.jsx)
// ────────────────────────────────────────────────
const API_URL = "https://script.google.com/macros/s/AKfycbyvS-au_Ur5ahls3-lyqmAedydUFbquae0wlkXSL4f3hlCYQYDJoioFvyY4iPfEaMHaVQ/exec";

async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}

function getToken() {
  return localStorage.getItem("qr_admin_token") || "";
}

function setToken(t) {
  if (t) localStorage.setItem("qr_admin_token", t);
  else localStorage.removeItem("qr_admin_token");
}

/* ───────────── PIN Login ───────────── */
function AdminLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api("adminLogin", { pin });
      setToken(data.token);
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Admin Login</h1>
        <p className="subtitle">Enter your admin PIN</p>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            maxLength={32}
            autoFocus
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading || !pin}>
            {loading ? "Checking…" : "Login"}
          </button>
        </form>
        <a className="link-center" href="index.html">← Back to site</a>
      </div>
    </div>
  );
}

/* ───────────── Dashboard Tab ───────────── */
function StatsTab({ token }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("adminStats", { token })
      .then(setStats)
      .catch(e => setError(e.message));
  }, [token]);

  if (error) return <p className="error">{error}</p>;
  if (!stats) return <p>Loading stats…</p>;

  const cards = [
    { label: "Total Users", value: stats.total_users },
    { label: "Active Users", value: stats.active_users },
    { label: "Pending Users", value: stats.pending_users },
    { label: "Unused Codes", value: stats.unused_codes },
    { label: "Active Quizzes", value: stats.active_quizzes },
    { label: "Questions", value: stats.total_questions },
    { label: "Payments", value: stats.total_payments },
    { label: "Quiz Passes", value: stats.total_passes },
  ];

  return (
    <div>
      <h2>Dashboard</h2>
      <div className="stats admin-stats">
        {cards.map(c => (
          <div className="stat" key={c.label}>
            <span className="label">{c.label}</span>
            <span className="value">{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Users Tab ───────────── */
function UsersTab({ token }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("adminListUsers", { token })
      .then(d => setUsers(d.users))
      .catch(e => setError(e.message));
  }, [token]);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2>Users ({users.length})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Status</th>
              <th>Points</th>
              <th>CR%</th>
              <th>AR%</th>
              <th>Passed</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td><span className={"badge " + u.account_status}>{u.account_status}</span></td>
                <td>{u.total_points}</td>
                <td>{u.CR_pct}</td>
                <td>{u.AR_pct}</td>
                <td>{u.quizzes_passed}</td>
                <td>{u.payment_method || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────── Codes Tab ───────────── */
function CodesTab({ token }) {
  const [codes, setCodes] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ code: "", payment_method: "manual", amount_received: "1", notes: "", expires_days: "30" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api("adminListCodes", { token })
      .then(d => setCodes(d.codes))
      .catch(e => setError(e.message));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const d = await api("adminCreateCode", { token, ...form });
      setMsg("Created code: " + d.code);
      setForm({ code: "", payment_method: "manual", amount_received: "1", notes: "", expires_days: "30" });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (code_id) => {
    if (!confirm("Revoke this code?")) return;
    try {
      await api("adminRevokeCode", { token, code_id });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h2>Access Codes</h2>
      <div className="admin-form">
        <h3>Create Code</h3>
        <div className="form-grid">
          <div>
            <label>Custom Code (blank = auto)</label>
            <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="QUIZ-XXXX-XXXX" />
          </div>
          <div>
            <label>Payment Method</label>
            <input value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} />
          </div>
          <div>
            <label>Amount</label>
            <input value={form.amount_received} onChange={e => setForm(f => ({ ...f, amount_received: e.target.value }))} />
          </div>
          <div>
            <label>Expires (days)</label>
            <input value={form.expires_days} onChange={e => setForm(f => ({ ...f, expires_days: e.target.value }))} />
          </div>
          <div className="full">
            <label>Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create Code"}</button>
        {msg && <p className="success">{msg}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Status</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Expires</th>
              <th>Used By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {codes.map(c => (
              <tr key={c.code_id}>
                <td><code>{c.code}</code></td>
                <td><span className={"badge " + c.status}>{c.status}</span></td>
                <td>{c.payment_method}</td>
                <td>{c.amount_received} {c.currency}</td>
                <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                <td>{c.used_by_user_id ? String(c.used_by_user_id).slice(0, 8) + "…" : "—"}</td>
                <td>
                  {String(c.status).toLowerCase() === "unused" && (
                    <button className="btn-sm danger" onClick={() => revoke(c.code_id)}>Revoke</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────── Quizzes & Questions Tab ───────────── */
function QuizzesTab({ token }) {
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [quizForm, setQuizForm] = useState({ quiz_id: "", title: "", description: "", base_points: "5", pass_threshold: "80", status: "active" });
  const [qForm, setQForm] = useState({
    question_id: "", quiz_id: "", question_text: "",
    option_1: "", option_2: "", option_3: "", option_4: "",
    correct_index: "0", sort_order: "1", status: "active"
  });
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [showQForm, setShowQForm] = useState(false);

  const loadQuizzes = useCallback(() => {
    api("adminListQuizzes", { token }).then(d => setQuizzes(d.quizzes)).catch(e => setError(e.message));
  }, [token]);

  const loadQuestions = useCallback((quiz_id) => {
    api("adminListQuestions", { token, quiz_id: quiz_id || undefined })
      .then(d => setQuestions(d.questions))
      .catch(e => setError(e.message));
  }, [token]);

  useEffect(() => { loadQuizzes(); loadQuestions(); }, [loadQuizzes, loadQuestions]);

  const saveQuiz = async () => {
    setError(""); setMsg("");
    try {
      await api("adminSaveQuiz", { token, ...quizForm });
      setMsg("Quiz saved");
      setShowQuizForm(false);
      loadQuizzes();
    } catch (e) { setError(e.message); }
  };

  const saveQuestion = async () => {
    setError(""); setMsg("");
    try {
      await api("adminSaveQuestion", { token, ...qForm });
      setMsg("Question saved");
      setShowQForm(false);
      setQForm({
        question_id: "", quiz_id: selectedQuiz || "", question_text: "",
        option_1: "", option_2: "", option_3: "", option_4: "",
        correct_index: "0", sort_order: "1", status: "active"
      });
      loadQuestions(selectedQuiz);
      loadQuizzes();
    } catch (e) { setError(e.message); }
  };

  const deleteQuestion = async (id) => {
    if (!confirm("Delete this question?")) return;
    try {
      await api("adminDeleteQuestion", { token, question_id: id });
      loadQuestions(selectedQuiz);
      loadQuizzes();
    } catch (e) { setError(e.message); }
  };

  const editQuestion = (q) => {
    setQForm({
      question_id: q.question_id,
      quiz_id: q.quiz_id,
      question_text: q.question_text,
      option_1: q.option_1 || "",
      option_2: q.option_2 || "",
      option_3: q.option_3 || "",
      option_4: q.option_4 || "",
      correct_index: String(q.correct_index),
      sort_order: String(q.sort_order),
      status: q.status || "active"
    });
    setShowQForm(true);
  };

  const filtered = selectedQuiz
    ? questions.filter(q => String(q.quiz_id) === selectedQuiz)
    : questions;

  return (
    <div>
      <h2>Quizzes & Questions</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="admin-toolbar">
        <button onClick={() => { setShowQuizForm(!showQuizForm); setShowQForm(false); }}>
          {showQuizForm ? "Cancel" : "+ New / Edit Quiz"}
        </button>
        <button className="btn-outline" onClick={() => { setShowQForm(!showQForm); setShowQuizForm(false); setQForm(f => ({ ...f, quiz_id: selectedQuiz || f.quiz_id })); }}>
          {showQForm ? "Cancel" : "+ Add Question"}
        </button>
        <select value={selectedQuiz} onChange={e => { setSelectedQuiz(e.target.value); loadQuestions(e.target.value); }}>
          <option value="">All quizzes</option>
          {quizzes.map(q => <option key={q.quiz_id} value={q.quiz_id}>{q.quiz_id} – {q.title}</option>)}
        </select>
      </div>

      {showQuizForm && (
        <div className="admin-form">
          <h3>Quiz</h3>
          <div className="form-grid">
            <div><label>Quiz ID</label><input value={quizForm.quiz_id} onChange={e => setQuizForm(f => ({ ...f, quiz_id: e.target.value }))} placeholder="Q003" /></div>
            <div><label>Title</label><input value={quizForm.title} onChange={e => setQuizForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="full"><label>Description</label><input value={quizForm.description} onChange={e => setQuizForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><label>Base Points</label><input value={quizForm.base_points} onChange={e => setQuizForm(f => ({ ...f, base_points: e.target.value }))} /></div>
            <div><label>Pass %</label><input value={quizForm.pass_threshold} onChange={e => setQuizForm(f => ({ ...f, pass_threshold: e.target.value }))} /></div>
            <div>
              <label>Status</label>
              <select value={quizForm.status} onChange={e => setQuizForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>
          <button onClick={saveQuiz}>Save Quiz</button>
        </div>
      )}

      {showQForm && (
        <div className="admin-form">
          <h3>{qForm.question_id ? "Edit" : "New"} Question</h3>
          <div className="form-grid">
            <div>
              <label>Quiz ID</label>
              <select value={qForm.quiz_id} onChange={e => setQForm(f => ({ ...f, quiz_id: e.target.value }))}>
                <option value="">Select…</option>
                {quizzes.map(q => <option key={q.quiz_id} value={q.quiz_id}>{q.quiz_id}</option>)}
              </select>
            </div>
            <div><label>Sort Order</label><input value={qForm.sort_order} onChange={e => setQForm(f => ({ ...f, sort_order: e.target.value }))} /></div>
            <div className="full"><label>Question Text</label><input value={qForm.question_text} onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))} /></div>
            <div><label>Option 1</label><input value={qForm.option_1} onChange={e => setQForm(f => ({ ...f, option_1: e.target.value }))} /></div>
            <div><label>Option 2</label><input value={qForm.option_2} onChange={e => setQForm(f => ({ ...f, option_2: e.target.value }))} /></div>
            <div><label>Option 3</label><input value={qForm.option_3} onChange={e => setQForm(f => ({ ...f, option_3: e.target.value }))} /></div>
            <div><label>Option 4</label><input value={qForm.option_4} onChange={e => setQForm(f => ({ ...f, option_4: e.target.value }))} /></div>
            <div>
              <label>Correct Index (0–3)</label>
              <select value={qForm.correct_index} onChange={e => setQForm(f => ({ ...f, correct_index: e.target.value }))}>
                <option value="0">0 – Option 1</option>
                <option value="1">1 – Option 2</option>
                <option value="2">2 – Option 3</option>
                <option value="3">3 – Option 4</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={qForm.status} onChange={e => setQForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>
          <button onClick={saveQuestion}>Save Question</button>
        </div>
      )}

      <h3>Quizzes</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Title</th><th>Points</th><th>Pass %</th><th>Questions</th><th>Status</th></tr>
          </thead>
          <tbody>
            {quizzes.map(q => (
              <tr key={q.quiz_id}>
                <td><code>{q.quiz_id}</code></td>
                <td>{q.title}</td>
                <td>{q.base_points}</td>
                <td>{q.pass_threshold}%</td>
                <td>{q.question_count}</td>
                <td><span className={"badge " + q.status}>{q.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Questions {selectedQuiz && `(${selectedQuiz})`}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Quiz</th><th>Question</th><th>Correct</th><th>Order</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(q => (
              <tr key={q.question_id}>
                <td><code>{q.question_id}</code></td>
                <td>{q.quiz_id}</td>
                <td className="q-cell">{q.question_text}</td>
                <td>{Number(q.correct_index) + 1}</td>
                <td>{q.sort_order}</td>
                <td><span className={"badge " + (q.status || "active")}>{q.status || "active"}</span></td>
                <td>
                  <button className="btn-sm" onClick={() => editQuestion(q)}>Edit</button>
                  <button className="btn-sm danger" onClick={() => deleteQuestion(q.question_id)}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────── Settings Tab ───────────── */
function SettingsTab({ token, onLogout }) {
  const [form, setForm] = useState({ site_name: "", site_logo_url: "", site_tagline: "", base_points: "5", pass_threshold: "80", code_expiry_days: "30" });
  const [pinForm, setPinForm] = useState({ current_pin: "", new_pin: "", new_pin2: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("getSiteInfo").then(d => {
      setForm(f => ({
        ...f,
        site_name: d.site_name || "",
        site_logo_url: d.site_logo_url || "",
        site_tagline: d.site_tagline || ""
      }));
    }).catch(() => {});
  }, []);

  const saveSettings = async () => {
    setError(""); setMsg("");
    try {
      await api("adminUpdateSettings", { token, ...form });
      setMsg("Settings saved");
    } catch (e) { setError(e.message); }
  };

  const changePin = async () => {
    setError(""); setMsg("");
    if (pinForm.new_pin !== pinForm.new_pin2) return setError("New PINs do not match");
    if (pinForm.new_pin.length < 4) return setError("PIN must be at least 4 characters");
    try {
      await api("adminChangePin", { token, current_pin: pinForm.current_pin, new_pin: pinForm.new_pin });
      setMsg("PIN changed. Logging out…");
      setTimeout(() => { setToken(""); onLogout(); }, 1500);
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h2>Settings</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="admin-form">
        <h3>Site Branding</h3>
        <div className="form-grid">
          <div><label>Site Name</label><input value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} /></div>
          <div><label>Tagline</label><input value={form.site_tagline} onChange={e => setForm(f => ({ ...f, site_tagline: e.target.value }))} /></div>
          <div className="full"><label>Logo URL</label><input value={form.site_logo_url} onChange={e => setForm(f => ({ ...f, site_logo_url: e.target.value }))} /></div>
          <div><label>Base Points</label><input value={form.base_points} onChange={e => setForm(f => ({ ...f, base_points: e.target.value }))} /></div>
          <div><label>Pass Threshold %</label><input value={form.pass_threshold} onChange={e => setForm(f => ({ ...f, pass_threshold: e.target.value }))} /></div>
          <div><label>Code Expiry Days</label><input value={form.code_expiry_days} onChange={e => setForm(f => ({ ...f, code_expiry_days: e.target.value }))} /></div>
        </div>
        {form.site_logo_url && (
          <div className="logo-preview"><img src={form.site_logo_url} alt="Logo" /></div>
        )}
        <button onClick={saveSettings}>Save Settings</button>
      </div>

      <div className="admin-form">
        <h3>Change Admin PIN</h3>
        <div className="form-grid">
          <div><label>Current PIN</label><input type="password" value={pinForm.current_pin} onChange={e => setPinForm(f => ({ ...f, current_pin: e.target.value }))} /></div>
          <div><label>New PIN</label><input type="password" value={pinForm.new_pin} onChange={e => setPinForm(f => ({ ...f, new_pin: e.target.value }))} /></div>
          <div><label>Confirm New PIN</label><input type="password" value={pinForm.new_pin2} onChange={e => setPinForm(f => ({ ...f, new_pin2: e.target.value }))} /></div>
        </div>
        <button className="danger" onClick={changePin}>Change PIN</button>
      </div>
    </div>
  );
}

/* ───────────── Payments Tab ───────────── */
function PaymentsTab({ token }) {
  const [payments, setPayments] = useState([]);
  const [activations, setActivations] = useState([]);

  useEffect(() => {
    api("adminListPayments", { token }).then(d => setPayments(d.payments)).catch(() => {});
    api("adminListActivations", { token }).then(d => setActivations(d.activations)).catch(() => {});
  }, [token]);

  return (
    <div>
      <h2>Payments & Activations</h2>
      <h3>Payments</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Amount</th><th>PayPal Txn</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.payment_id}>
                <td><code>{String(p.payment_id).slice(0, 8)}</code></td>
                <td>{String(p.user_id).slice(0, 8)}…</td>
                <td>{p.amount} {p.currency}</td>
                <td>{p.paypal_txn_id}</td>
                <td><span className="badge active">{p.status}</span></td>
                <td>{p.created_at ? new Date(p.created_at).toLocaleString() : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Activation Log</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>Method</th><th>Reference</th><th>Result</th><th>Date</th></tr>
          </thead>
          <tbody>
            {activations.map(a => (
              <tr key={a.log_id}>
                <td>{String(a.user_id).slice(0, 8)}…</td>
                <td>{a.method}</td>
                <td>{a.reference}</td>
                <td>{a.result}</td>
                <td>{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ───────────── Rewards Tab ───────────── */
function RewardsTab({ token }) {
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ reward_id: "", title: "", description: "", points_cost: "50", details: "", status: "active" });
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    api("adminListRewards", { token }).then(d => setRewards(d.rewards || [])).catch(e => setError(e.message));
    api("adminListRedemptions", { token }).then(d => setRedemptions(d.redemptions || [])).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setError(""); setMsg("");
    try {
      await api("adminSaveReward", { token, ...form });
      setMsg("Reward saved");
      setShowForm(false);
      setForm({ reward_id: "", title: "", description: "", points_cost: "50", details: "", status: "active" });
      load();
    } catch (e) { setError(e.message); }
  };

  const edit = (r) => {
    setForm({
      reward_id: r.reward_id,
      title: r.title || "",
      description: r.description || "",
      points_cost: String(r.points_cost || 50),
      details: r.details || "",
      status: r.status || "active"
    });
    setShowForm(true);
  };

  const updateRedemption = async (id, status) => {
    try {
      await api("adminUpdateRedemption", { token, redemption_id: id, status });
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h2>Rewards</h2>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="admin-toolbar">
        <button onClick={() => { setShowForm(!showForm); if (showForm) setForm({ reward_id: "", title: "", description: "", points_cost: "50", details: "", status: "active" }); }}>
          {showForm ? "Cancel" : "+ New / Edit Reward"}
        </button>
      </div>

      {showForm && (
        <div className="admin-form">
          <h3>{form.reward_id ? "Edit" : "New"} Reward</h3>
          <div className="form-grid">
            <div><label>Title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. $5 Gift Card" /></div>
            <div><label>Points Cost</label><input value={form.points_cost} onChange={e => setForm(f => ({ ...f, points_cost: e.target.value }))} /></div>
            <div className="full"><label>Description (short)</label><input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Shown on card" /></div>
            <div className="full"><label>Reward Details (shown after redeem)</label><input value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} placeholder="e.g. Code will be emailed within 24h" /></div>
            <div>
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>
          <button onClick={save}>Save Reward</button>
        </div>
      )}

      <h3>Reward Catalog</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Title</th><th>Points</th><th>Description</th><th>Details</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rewards.map(r => (
              <tr key={r.reward_id}>
                <td>{r.title}</td>
                <td>{r.points_cost}</td>
                <td className="q-cell">{r.description}</td>
                <td className="q-cell">{r.details}</td>
                <td><span className={"badge " + (r.status || "active")}>{r.status || "active"}</span></td>
                <td><button className="btn-sm" onClick={() => edit(r)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Redemption Requests</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>User</th><th>Reward</th><th>Points</th><th>Status</th><th>Details</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {redemptions.map(r => (
              <tr key={r.redemption_id}>
                <td>{String(r.user_id).slice(0, 8)}…</td>
                <td>{r.reward_title}</td>
                <td>{r.points_spent}</td>
                <td><span className={"badge " + r.status}>{r.status}</span></td>
                <td className="q-cell">{r.details}</td>
                <td>{r.created_at ? new Date(r.created_at).toLocaleString() : ""}</td>
                <td>
                  {String(r.status).toLowerCase() === "pending" && (
                    <>
                      <button className="btn-sm" onClick={() => updateRedemption(r.redemption_id, "fulfilled")}>Fulfill</button>
                      <button className="btn-sm danger" onClick={() => updateRedemption(r.redemption_id, "rejected")}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ───────────── Admin Shell ───────────── */
function AdminApp() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("stats");

  useEffect(() => {
    const t = getToken();
    if (!t) { setChecking(false); return; }
    api("adminCheck", { token: t })
      .then(() => setAuthed(true))
      .catch(() => setToken(""))
      .finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    try { await api("adminLogout", { token: getToken() }); } catch (_) {}
    setToken("");
    setAuthed(false);
  };

  if (checking) {
    return <div className="auth-wrap"><div className="auth-card center"><div className="spinner"></div><p>Checking session…</p></div></div>;
  }

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  const tabs = [
    { id: "stats", label: "Dashboard" },
    { id: "users", label: "Users" },
    { id: "codes", label: "Access Codes" },
    { id: "quizzes", label: "Quizzes" },
    { id: "rewards", label: "Rewards" },
    { id: "payments", label: "Payments" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>Quiz Rewards</strong>
          <span>Admin Panel</span>
        </div>
        <nav>
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <a href="index.html">← Main Site</a>
          <button className="link" onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="admin-main">
        {tab === "stats" && <StatsTab token={getToken()} />}
        {tab === "users" && <UsersTab token={getToken()} />}
        {tab === "codes" && <CodesTab token={getToken()} />}
        {tab === "quizzes" && <QuizzesTab token={getToken()} />}
        {tab === "rewards" && <RewardsTab token={getToken()} />}
        {tab === "payments" && <PaymentsTab token={getToken()} />}
        {tab === "settings" && <SettingsTab token={getToken()} onLogout={() => setAuthed(false)} />}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AdminApp />);
