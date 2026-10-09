const { useState, useEffect } = React;

// ────────────────────────────────────────────────
// SET YOUR WEB APP URL HERE (same as in app.jsx / admin.jsx)
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

function InstallApp() {
  const [loading, setLoading] = useState(true);
  const [already, setAlready] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    site_name: "Quiz Rewards",
    site_tagline: "Earn points. Level up.",
    site_logo_url: "",
    admin_pin: "",
    admin_pin2: "",
    webapp_url: API_URL
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("checkInstall")
      .then(d => {
        setAlready(d.installed);
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot reach API. Check API_URL in install.jsx");
        setLoading(false);
      });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const next = () => {
    setError("");
    if (step === 1) {
      if (!form.site_name.trim()) return setError("Site name is required");
      setStep(2);
    } else if (step === 2) {
      if (!form.admin_pin || form.admin_pin.length < 4) return setError("PIN must be at least 4 characters");
      if (form.admin_pin !== form.admin_pin2) return setError("PINs do not match");
      setStep(3);
    }
  };

  const install = async () => {
    setError("");
    if (!form.webapp_url.includes("script.google.com")) {
      return setError("Enter a valid Google Apps Script Web App URL");
    }
    setBusy(true);
    try {
      await api("runInstall", {
        site_name: form.site_name.trim(),
        site_tagline: form.site_tagline.trim(),
        site_logo_url: form.site_logo_url.trim(),
        admin_pin: form.admin_pin,
        webapp_url: form.webapp_url.trim()
      });
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="auth-card center">
          <div className="spinner"></div>
          <p>Checking installation status…</p>
        </div>
      </div>
    );
  }

  if (already || success) {
    return (
      <div className="auth-wrap">
        <div className="auth-card center">
          <div className="success-icon">✓</div>
          <h1>{already ? "Already Installed" : "Installation Complete!"}</h1>
          <p className="subtitle">
            {already
              ? "This app is already set up. Go to the main site or admin panel."
              : "Your Quiz Rewards platform is ready."}
          </p>
          <div className="btn-row">
            <a className="btn" href="index.html">Go to Main Site</a>
            <a className="btn btn-outline" href="admin.html">Open Admin</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card install-card">
        <div className="install-header">
          <h1>Install Quiz Rewards</h1>
          <p className="subtitle">One-time setup · Step {step} of 3</p>
          <div className="progress">
            <div className={"dot " + (step >= 1 ? "on" : "")}></div>
            <div className={"dot " + (step >= 2 ? "on" : "")}></div>
            <div className={"dot " + (step >= 3 ? "on" : "")}></div>
          </div>
        </div>

        {step === 1 && (
          <div className="install-step">
            <h3>Site Branding</h3>
            <label>Site Name</label>
            <input value={form.site_name} onChange={e => set("site_name", e.target.value)} placeholder="Quiz Rewards" />
            <label>Tagline</label>
            <input value={form.site_tagline} onChange={e => set("site_tagline", e.target.value)} placeholder="Earn points. Level up." />
            <label>Logo URL (optional)</label>
            <input value={form.site_logo_url} onChange={e => set("site_logo_url", e.target.value)} placeholder="https://example.com/logo.png" />
            {form.site_logo_url && (
              <div className="logo-preview">
                <img src={form.site_logo_url} alt="Logo preview" onError={e => e.target.style.display="none"} />
              </div>
            )}
            <button onClick={next}>Continue →</button>
          </div>
        )}

        {step === 2 && (
          <div className="install-step">
            <h3>Admin PIN</h3>
            <p className="hint">Admin login uses a PIN only — no username or password.</p>
            <label>Admin PIN (min 4 characters)</label>
            <input type="password" value={form.admin_pin} onChange={e => set("admin_pin", e.target.value)} placeholder="••••" maxLength={32} />
            <label>Confirm PIN</label>
            <input type="password" value={form.admin_pin2} onChange={e => set("admin_pin2", e.target.value)} placeholder="••••" maxLength={32} />
            <div className="btn-row">
              <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="install-step">
            <h3>Verify Web App URL</h3>
            <p className="hint">Paste the Google Apps Script Web App URL you deployed. This must match the URL in app.jsx and admin.jsx.</p>
            <label>Web App URL</label>
            <input value={form.webapp_url} onChange={e => set("webapp_url", e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
            <div className="btn-row">
              <button className="btn-outline" onClick={() => setStep(2)}>← Back</button>
              <button onClick={install} disabled={busy}>
                {busy ? "Installing…" : "Install Now"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<InstallApp />);
