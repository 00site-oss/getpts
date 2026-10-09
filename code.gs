/**
 * Quiz Rewards – Full Backend (Google Apps Script)
 * Deploy as Web App: Execute as Me, Who has access: Anyone
 */

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function sheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function rows(name) {
  const s = sheet(name);
  if (!s) return [];
  const data = s.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map((row, idx) => {
    const obj = { _row: idx + 2 };
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRow(name, key, value) {
  return rows(name).find(r => String(r[key]) === String(value));
}

function uuid() {
  return Utilities.getUuid();
}

function now() {
  return new Date().toISOString();
}

function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

function hash(str) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str));
  return digest.map(b => ("0" + (b & 0xff).toString(16)).slice(-2)).join("");
}

function getConfig() {
  const cfg = {};
  rows("Admin_Settings").forEach(r => {
    cfg[r.setting_key] = r.setting_value;
  });
  return {
    base_points: Number(cfg.base_points) || 5,
    pass_threshold: Number(cfg.pass_threshold) || 80,
    ar_bonus_per_quiz: Number(cfg.ar_bonus_per_quiz) || 1,
    ar_penalty: Number(cfg.ar_penalty) || -1,
    cr_default: Number(cfg.cr_default) || 100,
    ar_default: Number(cfg.ar_default) || 100,
    ar_cap: Number(cfg.ar_cap) || 100,
    paypal_fee: Number(cfg.paypal_fee) || 1,
    manual_code_fee: Number(cfg.manual_code_fee) || 1,
    code_expiry_days: Number(cfg.code_expiry_days) || 30,
    code_format: cfg.code_format || "QUIZ-XXXX-XXXX",
    cr_bonus_divisor: Number(cfg.cr_bonus_divisor) || 10,
    ar_bonus_divisor: Number(cfg.ar_bonus_divisor) || 100,
    site_name: cfg.site_name || "Quiz Rewards",
    site_logo_url: cfg.site_logo_url || "",
    site_tagline: cfg.site_tagline || "Earn points. Level up.",
    installed: String(cfg.installed || "false") === "true",
    admin_pin_hash: cfg.admin_pin_hash || "",
    admin_session_token: cfg.admin_session_token || "",
    admin_session_expires: cfg.admin_session_expires || "",
    webapp_url: cfg.webapp_url || ""
  };
}

function setSetting(key, value) {
  const row = findRow("Admin_Settings", "setting_key", key);
  if (row) {
    sheet("Admin_Settings").getRange(row._row, 2).setValue(String(value));
  } else {
    sheet("Admin_Settings").appendRow([key, String(value), ""]);
  }
}

function calculatePoints(base, CR, AR) {
  const cfg = getConfig();
  const crBonus = Math.round(Number(CR) / (cfg.cr_bonus_divisor || 10));
  const arBonus = Math.round(Number(AR) / (cfg.ar_bonus_divisor || 100));
  return Number(base) + crBonus + arBonus;
}

function getQuestionsForQuiz(quiz_id, includeCorrect) {
  const all = rows("Questions")
    .filter(q => String(q.quiz_id) === String(quiz_id) && String(q.status || "active").toLowerCase() === "active")
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

  return all.map(q => {
    const obj = {
      question_id: q.question_id,
      text: q.question_text,
      options: [
        String(q.option_1 || ""),
        String(q.option_2 || ""),
        String(q.option_3 || ""),
        String(q.option_4 || "")
      ].filter(o => o !== "")
    };
    if (includeCorrect) obj.correct = Number(q.correct_index);
    return obj;
  });
}

/** Quizzes the user has already completed (pass or fail) — cancelled does NOT count */
function getCompletedQuizIds(user_id) {
  const attempts = rows("Quiz_Attempts").filter(a =>
    String(a.user_id) === String(user_id) &&
    (String(a.result) === "pass" || String(a.result) === "fail")
  );
  const ids = {};
  attempts.forEach(a => { ids[String(a.quiz_id)] = true; });
  return ids;
}

function requireAdmin(token) {
  const cfg = getConfig();
  if (!cfg.installed) return { error: "App not installed" };
  if (!token || token !== cfg.admin_session_token) return { error: "Unauthorized" };
  if (cfg.admin_session_expires) {
    if (new Date(cfg.admin_session_expires) < new Date()) {
      return { error: "Session expired. Please login again." };
    }
  }
  return null;
}

// ────────────────────────────────────────────────
// doGet / doPost
// ────────────────────────────────────────────────
function doGet(e) {
  return ok({ status: "Quiz Rewards API is live", time: now(), installed: getConfig().installed });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case "getSiteInfo":     return getSiteInfo();
      case "getTicker":       return getTicker();
      case "register":        return register(body);
      case "login":           return login(body);
      case "confirmPaypal":   return confirmPaypal(body);
      case "redeemCode":      return redeemCode(body);
      case "getDashboard":    return getDashboard(body);
      case "submitQuiz":      return submitQuiz(body);
      case "cancelQuiz":      return cancelQuiz(body);

      // Rewards (user)
      case "listRewards":     return listRewards(body);
      case "redeemReward":    return redeemReward(body);
      case "myRedemptions":   return myRedemptions(body);

      // Install
      case "checkInstall":    return checkInstall();
      case "runInstall":      return runInstall(body);

      // Admin auth
      case "adminLogin":      return adminLogin(body);
      case "adminLogout":     return adminLogout(body);
      case "adminCheck":      return adminCheck(body);

      // Admin actions
      case "adminStats":      return adminStats(body);
      case "adminListUsers":  return adminListUsers(body);
      case "adminListCodes":  return adminListCodes(body);
      case "adminCreateCode": return adminCreateCode(body);
      case "adminRevokeCode": return adminRevokeCode(body);
      case "adminListQuizzes":return adminListQuizzes(body);
      case "adminSaveQuiz":   return adminSaveQuiz(body);
      case "adminListQuestions": return adminListQuestions(body);
      case "adminSaveQuestion":  return adminSaveQuestion(body);
      case "adminDeleteQuestion":return adminDeleteQuestion(body);
      case "adminUpdateSettings":return adminUpdateSettings(body);
      case "adminChangePin":  return adminChangePin(body);
      case "adminListPayments": return adminListPayments(body);
      case "adminListActivations": return adminListActivations(body);
      case "adminListRewards": return adminListRewards(body);
      case "adminSaveReward":  return adminSaveReward(body);
      case "adminListRedemptions": return adminListRedemptions(body);
      case "adminUpdateRedemption": return adminUpdateRedemption(body);

      default:
        return err("Unknown action: " + action);
    }
  } catch (ex) {
    return err(ex.message || "Server error");
  }
}

// ────────────────────────────────────────────────
// Site info
// ────────────────────────────────────────────────
function getSiteInfo() {
  const cfg = getConfig();
  return ok({
    installed: cfg.installed,
    site_name: cfg.site_name,
    site_logo_url: cfg.site_logo_url,
    site_tagline: cfg.site_tagline
  });
}

// ────────────────────────────────────────────────
// Public ticker – recent quiz completions from Quiz_Attempts
// ────────────────────────────────────────────────
function getTicker() {
  const attempts = rows("Quiz_Attempts")
    .filter(a => {
      const r = String(a.result || "").toLowerCase();
      return (r === "pass" || r === "fail") && Number(a.points_earned) > 0;
    })
    .sort((a, b) => {
      const ta = new Date(a.finished_at || a.started_at || 0).getTime();
      const tb = new Date(b.finished_at || b.started_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, 30);

  const items = attempts.map(a => {
    const u = findRow("Users", "user_id", a.user_id);
    const username = u ? (u.username || "User") : "User";
    // Mask middle of username slightly for privacy style: show as-is for small names
    return {
      username: String(username),
      points_earned: Number(a.points_earned) || 0,
      result: a.result,
      quiz_id: a.quiz_id
    };
  });

  return ok({ items });
}


// ────────────────────────────────────────────────
// Install
// ────────────────────────────────────────────────
function checkInstall() {
  return ok({ installed: getConfig().installed });
}

function runInstall(body) {
  const cfg = getConfig();
  if (cfg.installed) return err("Already installed. Reset Admin_Settings if you need to reinstall.");

  const { site_name, site_logo_url, site_tagline, admin_pin, webapp_url } = body;

  if (!admin_pin || String(admin_pin).length < 4) {
    return err("Admin PIN must be at least 4 characters");
  }
  if (!webapp_url || !webapp_url.includes("script.google.com")) {
    return err("Please enter a valid Google Apps Script Web App URL");
  }

  ensureSheets();

  setSetting("installed", "true");
  setSetting("site_name", site_name || "Quiz Rewards");
  setSetting("site_logo_url", site_logo_url || "");
  setSetting("site_tagline", site_tagline || "Earn points. Level up.");
  setSetting("admin_pin_hash", hash(admin_pin));
  setSetting("webapp_url", webapp_url);
  setSetting("admin_session_token", "");
  setSetting("admin_session_expires", "");

  const defaults = [
    ["base_points", "5", "Base points per quiz"],
    ["pass_threshold", "80", "Minimum % to pass"],
    ["ar_bonus_per_quiz", "1", "AR% gained per accepted quiz"],
    ["ar_penalty", "-1", "AR% lost on cancel/fail"],
    ["cr_default", "100", "Starting CR%"],
    ["ar_default", "100", "Starting AR%"],
    ["ar_cap", "100", "Max AR%"],
    ["paypal_fee", "1", "PayPal USD fee"],
    ["manual_code_fee", "1", "Manual activation fee"],
    ["code_expiry_days", "30", "Days until code expires"],
    ["code_format", "QUIZ-XXXX-XXXX", "Template for access codes"],
    ["cr_bonus_divisor", "10", "CR% divided by this = bonus pts"],
    ["ar_bonus_divisor", "100", "AR% divided by this = bonus pts"]
  ];
  defaults.forEach(d => {
    if (!findRow("Admin_Settings", "setting_key", d[0])) {
      sheet("Admin_Settings").appendRow(d);
    }
  });

  return ok({ message: "Installation complete!" });
}

function ensureSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schemas = {
    "Users": ["user_id","email","password_hash","username","created_at","payment_method","payment_verified","account_status","activation_code_used","paypal_txn_id","activated_at","last_login","notes"],
    "Access_Codes": ["code_id","code","assigned_to_user_id","assigned_email","payment_method","amount_received","currency","status","created_by","created_at","expires_at","used_at","used_by_user_id","notes"],
    "Quizzes": ["quiz_id","title","description","base_points","ar_bonus_pct","pass_threshold","status","created_at"],
    "Questions": ["question_id","quiz_id","question_text","option_1","option_2","option_3","option_4","correct_index","sort_order","status"],
    "User_Stats": ["user_id","CR_pct","AR_pct","total_points","quizzes_attempted","quizzes_passed","quizzes_cancelled","updated_at"],
    "Quiz_Attempts": ["attempt_id","user_id","quiz_id","started_at","finished_at","score_pct","result","ar_change","points_earned","status"],
    "Points_Ledger": ["txn_id","user_id","attempt_id","type","base_points","ar_multiplier","final_points","created_at","admin_note"],
    "Payments": ["payment_id","user_id","amount","currency","paypal_txn_id","payer_email","status","created_at","verified_by_admin"],
    "Activation_Log": ["log_id","user_id","method","reference","result","ip_address","created_at"],
    "Admin_Settings": ["setting_key","setting_value","description"],
    "Rewards": ["reward_id","title","description","points_cost","details","status","created_at"],
    "Redemptions": ["redemption_id","user_id","reward_id","reward_title","points_spent","status","details","created_at","admin_note"]
  };

  Object.keys(schemas).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      const headers = schemas[name];
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sh.setFrozenRows(1);
    }
  });
}

// ────────────────────────────────────────────────
// Admin Auth
// ────────────────────────────────────────────────
function adminLogin(body) {
  const { pin } = body;
  if (!pin) return err("PIN required");
  const cfg = getConfig();
  if (!cfg.installed) return err("App not installed");
  if (!cfg.admin_pin_hash) return err("Admin PIN not set");
  if (hash(pin) !== cfg.admin_pin_hash) return err("Incorrect PIN");

  const token = uuid();
  const expires = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  setSetting("admin_session_token", token);
  setSetting("admin_session_expires", expires);
  return ok({ token, expires });
}

function adminLogout(body) {
  setSetting("admin_session_token", "");
  setSetting("admin_session_expires", "");
  return ok({ message: "Logged out" });
}

function adminCheck(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  return ok({ valid: true });
}

// ────────────────────────────────────────────────
// Admin: Stats / Users / Codes / Quizzes / Questions
// ────────────────────────────────────────────────
function adminStats(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);

  const users = rows("Users");
  const codes = rows("Access_Codes");
  const quizzes = rows("Quizzes");
  const questions = rows("Questions");
  const payments = rows("Payments");
  const attempts = rows("Quiz_Attempts");
  const rewards = rows("Rewards");
  const redemptions = rows("Redemptions");

  return ok({
    total_users: users.length,
    active_users: users.filter(u => u.account_status === "active").length,
    pending_users: users.filter(u => u.account_status === "pending").length,
    total_codes: codes.length,
    unused_codes: codes.filter(c => String(c.status).toLowerCase() === "unused").length,
    total_quizzes: quizzes.length,
    active_quizzes: quizzes.filter(q => String(q.status).toLowerCase() === "active").length,
    total_questions: questions.length,
    total_payments: payments.length,
    total_attempts: attempts.length,
    total_passes: attempts.filter(a => a.result === "pass").length,
    total_rewards: rewards.length,
    total_redemptions: redemptions.length,
    pending_redemptions: redemptions.filter(r => String(r.status).toLowerCase() === "pending").length
  });
}

function adminListUsers(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const users = rows("Users").map(u => {
    const s = findRow("User_Stats", "user_id", u.user_id);
    return {
      user_id: u.user_id, email: u.email, username: u.username,
      account_status: u.account_status, payment_method: u.payment_method,
      created_at: u.created_at, activated_at: u.activated_at, last_login: u.last_login,
      total_points: s ? Number(s.total_points) : 0,
      CR_pct: s ? Number(s.CR_pct) : 100,
      AR_pct: s ? Number(s.AR_pct) : 100,
      quizzes_passed: s ? Number(s.quizzes_passed) : 0
    };
  });
  return ok({ users });
}

function adminListCodes(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  return ok({ codes: rows("Access_Codes") });
}

function adminCreateCode(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);

  const { code, payment_method, amount_received, currency, notes, expires_days } = body;
  let finalCode = (code || "").trim().toUpperCase();

  if (!finalCode) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let a = "", b = "";
    for (let i = 0; i < 4; i++) {
      a += chars[Math.floor(Math.random() * chars.length)];
      b += chars[Math.floor(Math.random() * chars.length)];
    }
    finalCode = "QUIZ-" + a + "-" + b;
  }

  if (findRow("Access_Codes", "code", finalCode)) return err("Code already exists");

  const days = Number(expires_days) || getConfig().code_expiry_days || 30;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  sheet("Access_Codes").appendRow([
    uuid(), finalCode, "", "", payment_method || "manual",
    amount_received || 1, currency || "USD", "unused", "admin",
    now(), expires, "", "", notes || ""
  ]);

  return ok({ code: finalCode, expires });
}

function adminRevokeCode(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const row = findRow("Access_Codes", "code_id", body.code_id);
  if (!row) return err("Code not found");
  sheet("Access_Codes").getRange(row._row, 8).setValue("revoked");
  return ok({ message: "Code revoked" });
}

function adminListQuizzes(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const quizzes = rows("Quizzes").map(q => {
    const qCount = rows("Questions").filter(qq => String(qq.quiz_id) === String(q.quiz_id)).length;
    return { ...q, question_count: qCount };
  });
  return ok({ quizzes });
}

function adminSaveQuiz(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const { quiz_id, title, description, base_points, pass_threshold, status } = body;
  if (!quiz_id || !title) return err("quiz_id and title required");

  const existing = findRow("Quizzes", "quiz_id", quiz_id);
  if (existing) {
    const sh = sheet("Quizzes");
    sh.getRange(existing._row, 2).setValue(title);
    sh.getRange(existing._row, 3).setValue(description || "");
    sh.getRange(existing._row, 4).setValue(Number(base_points) || 5);
    sh.getRange(existing._row, 6).setValue(Number(pass_threshold) || 80);
    sh.getRange(existing._row, 7).setValue(status || "active");
  } else {
    sheet("Quizzes").appendRow([
      quiz_id, title, description || "", Number(base_points) || 5,
      1, Number(pass_threshold) || 80, status || "active", now()
    ]);
  }
  return ok({ message: "Quiz saved" });
}

function adminListQuestions(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  let list = rows("Questions");
  if (body.quiz_id) list = list.filter(q => String(q.quiz_id) === String(body.quiz_id));
  list.sort((a, b) => {
    if (a.quiz_id !== b.quiz_id) return String(a.quiz_id).localeCompare(String(b.quiz_id));
    return Number(a.sort_order || 0) - Number(b.sort_order || 0);
  });
  return ok({ questions: list });
}

function adminSaveQuestion(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const { question_id, quiz_id, question_text, option_1, option_2, option_3, option_4, correct_index, sort_order, status } = body;
  if (!quiz_id || !question_text) return err("quiz_id and question_text required");
  const id = question_id || (quiz_id + "-" + String(Date.now()).slice(-6));
  const existing = findRow("Questions", "question_id", id);
  if (existing) {
    const sh = sheet("Questions");
    sh.getRange(existing._row, 2).setValue(quiz_id);
    sh.getRange(existing._row, 3).setValue(question_text);
    sh.getRange(existing._row, 4).setValue(option_1 || "");
    sh.getRange(existing._row, 5).setValue(option_2 || "");
    sh.getRange(existing._row, 6).setValue(option_3 || "");
    sh.getRange(existing._row, 7).setValue(option_4 || "");
    sh.getRange(existing._row, 8).setValue(Number(correct_index) || 0);
    sh.getRange(existing._row, 9).setValue(Number(sort_order) || 0);
    sh.getRange(existing._row, 10).setValue(status || "active");
  } else {
    sheet("Questions").appendRow([
      id, quiz_id, question_text, option_1 || "", option_2 || "",
      option_3 || "", option_4 || "", Number(correct_index) || 0,
      Number(sort_order) || 0, status || "active"
    ]);
  }
  return ok({ message: "Question saved", question_id: id });
}

function adminDeleteQuestion(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const row = findRow("Questions", "question_id", body.question_id);
  if (!row) return err("Question not found");
  sheet("Questions").deleteRow(row._row);
  return ok({ message: "Question deleted" });
}

function adminUpdateSettings(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const allowed = ["site_name","site_logo_url","site_tagline","base_points","pass_threshold","ar_bonus_per_quiz","ar_penalty","code_expiry_days","code_format"];
  allowed.forEach(key => {
    if (body[key] !== undefined && body[key] !== null) setSetting(key, body[key]);
  });
  return ok({ message: "Settings updated" });
}

function adminChangePin(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const { current_pin, new_pin } = body;
  if (!new_pin || String(new_pin).length < 4) return err("New PIN must be at least 4 characters");
  const cfg = getConfig();
  if (hash(current_pin) !== cfg.admin_pin_hash) return err("Current PIN is incorrect");
  setSetting("admin_pin_hash", hash(new_pin));
  setSetting("admin_session_token", "");
  setSetting("admin_session_expires", "");
  return ok({ message: "PIN changed. Please login again." });
}

function adminListPayments(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  return ok({ payments: rows("Payments") });
}

function adminListActivations(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  return ok({ activations: rows("Activation_Log") });
}

// ────────────────────────────────────────────────
// Admin: Rewards
// ────────────────────────────────────────────────
function adminListRewards(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  return ok({ rewards: rows("Rewards") });
}

function adminSaveReward(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);

  const { reward_id, title, description, points_cost, details, status } = body;
  if (!title) return err("Title required");
  if (!points_cost || Number(points_cost) < 1) return err("Points cost must be at least 1");

  const id = reward_id || uuid();
  const existing = findRow("Rewards", "reward_id", id);

  if (existing) {
    const sh = sheet("Rewards");
    sh.getRange(existing._row, 2).setValue(title);
    sh.getRange(existing._row, 3).setValue(description || "");
    sh.getRange(existing._row, 4).setValue(Number(points_cost));
    sh.getRange(existing._row, 5).setValue(details || "");
    sh.getRange(existing._row, 6).setValue(status || "active");
  } else {
    sheet("Rewards").appendRow([
      id, title, description || "", Number(points_cost),
      details || "", status || "active", now()
    ]);
  }
  return ok({ message: "Reward saved", reward_id: id });
}

function adminListRedemptions(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  return ok({ redemptions: rows("Redemptions") });
}

function adminUpdateRedemption(body) {
  const check = requireAdmin(body.token);
  if (check) return err(check.error);
  const row = findRow("Redemptions", "redemption_id", body.redemption_id);
  if (!row) return err("Redemption not found");
  if (body.status) sheet("Redemptions").getRange(row._row, 6).setValue(body.status);
  if (body.admin_note !== undefined) sheet("Redemptions").getRange(row._row, 9).setValue(body.admin_note || "");
  return ok({ message: "Redemption updated" });
}

// ────────────────────────────────────────────────
// User: Rewards
// ────────────────────────────────────────────────
function listRewards(body) {
  const { user_id } = body;
  if (!user_id) return err("Missing user_id");
  const user = buildUser(user_id);
  if (!user) return err("User not found");
  if (user.account_status !== "active") return err("Account not activated");

  const rewards = rows("Rewards")
    .filter(r => String(r.status || "active").toLowerCase() === "active")
    .map(r => ({
      reward_id: r.reward_id,
      title: r.title,
      description: r.description,
      points_cost: Number(r.points_cost),
      details: r.details || ""
    }));

  return ok({ rewards, user_points: user.total_points });
}

function redeemReward(body) {
  const { user_id, reward_id } = body;
  if (!user_id || !reward_id) return err("Missing fields");

  const user = buildUser(user_id);
  if (!user) return err("User not found");
  if (user.account_status !== "active") return err("Account not activated");

  const reward = findRow("Rewards", "reward_id", reward_id);
  if (!reward) return err("Reward not found");
  if (String(reward.status || "active").toLowerCase() !== "active") return err("Reward is not available");

  const cost = Number(reward.points_cost);
  if (user.total_points < cost) {
    return err("Not enough points. You have " + user.total_points + ", need " + cost);
  }

  // Deduct points
  const stats = findRow("User_Stats", "user_id", user_id);
  const newTotal = Number(stats.total_points) - cost;
  sheet("User_Stats").getRange(stats._row, 4).setValue(newTotal);
  sheet("User_Stats").getRange(stats._row, 8).setValue(now());

  // Log ledger
  sheet("Points_Ledger").appendRow([
    uuid(), user_id, "", "reward_redeem", 0, 0, -cost, now(),
    "Redeemed: " + reward.title
  ]);

  // Create redemption record
  const redemption_id = uuid();
  const details = reward.details || reward.description || "";
  sheet("Redemptions").appendRow([
    redemption_id,
    user_id,
    reward_id,
    reward.title,
    cost,
    "pending",
    details,
    now(),
    ""
  ]);

  return ok({
    redemption_id,
    reward_title: reward.title,
    points_spent: cost,
    points_remaining: newTotal,
    details: details,
    status: "pending",
    message: "Reward redeemed successfully!"
  });
}

function myRedemptions(body) {
  const { user_id } = body;
  if (!user_id) return err("Missing user_id");
  const user = buildUser(user_id);
  if (!user) return err("User not found");

  const list = rows("Redemptions")
    .filter(r => String(r.user_id) === String(user_id))
    .map(r => ({
      redemption_id: r.redemption_id,
      reward_title: r.reward_title,
      points_spent: Number(r.points_spent),
      status: r.status,
      details: r.details || "",
      created_at: r.created_at,
      admin_note: r.admin_note || ""
    }))
    .reverse();

  return ok({ redemptions: list });
}

// ────────────────────────────────────────────────
// User Auth
// ────────────────────────────────────────────────
function register(body) {
  const cfg = getConfig();
  if (!cfg.installed) return err("App not installed yet");
  const { email, password, username } = body;
  if (!email || !password || !username) return err("Missing fields");
  if (findRow("Users", "email", email)) return err("Email already registered");

  const user_id = uuid();
  const ts = now();
  sheet("Users").appendRow([
    user_id, email, hash(password), username, ts,
    "", false, "pending", "", "", "", "", ""
  ]);
  sheet("User_Stats").appendRow([
    user_id, cfg.cr_default, cfg.ar_default, 0, 0, 0, 0, ts
  ]);
  return ok({ user: buildUser(user_id) });
}

function login(body) {
  const { email, password } = body;
  if (!email || !password) return err("Missing credentials");
  const row = findRow("Users", "email", email);
  if (!row || row.password_hash !== hash(password)) return err("Invalid email or password");
  sheet("Users").getRange(row._row, 12).setValue(now());
  return ok({ user: buildUser(row.user_id) });
}

function buildUser(user_id) {
  const u = findRow("Users", "user_id", user_id);
  const s = findRow("User_Stats", "user_id", user_id);
  if (!u) return null;
  return {
    user_id: u.user_id, email: u.email, username: u.username,
    account_status: u.account_status, payment_method: u.payment_method,
    payment_verified: u.payment_verified, activated_at: u.activated_at,
    CR_pct: s ? Number(s.CR_pct) : 100,
    AR_pct: s ? Number(s.AR_pct) : 100,
    total_points: s ? Number(s.total_points) : 0,
    quizzes_attempted: s ? Number(s.quizzes_attempted) : 0,
    quizzes_passed: s ? Number(s.quizzes_passed) : 0,
    quizzes_cancelled: s ? Number(s.quizzes_cancelled) : 0
  };
}

// ────────────────────────────────────────────────
// Activation
// ────────────────────────────────────────────────
function confirmPaypal(body) {
  const { user_id, paypal_txn_id, payer_email } = body;
  if (!user_id || !paypal_txn_id) return err("Missing payment data");
  const u = findRow("Users", "user_id", user_id);
  if (!u) return err("User not found");
  if (u.account_status === "active") return err("Account already active");

  const ts = now();
  const users = sheet("Users");
  users.getRange(u._row, 6).setValue("paypal");
  users.getRange(u._row, 7).setValue(true);
  users.getRange(u._row, 8).setValue("active");
  users.getRange(u._row, 10).setValue(paypal_txn_id);
  users.getRange(u._row, 11).setValue(ts);

  sheet("Payments").appendRow([
    uuid(), user_id, 1, "USD", paypal_txn_id, payer_email || "", "completed", ts, false
  ]);
  logActivation(user_id, "paypal", paypal_txn_id, "success");
  return ok({ user: buildUser(user_id) });
}

function redeemCode(body) {
  const { user_id, code } = body;
  if (!user_id || !code) return err("Missing user_id or code");
  const u = findRow("Users", "user_id", user_id);
  if (!u) return err("User not found");
  if (u.account_status === "active") return err("Account already active");

  const codeRow = findRow("Access_Codes", "code", code.trim().toUpperCase());
  if (!codeRow) return err("Invalid access code");
  if (String(codeRow.status).toLowerCase() !== "unused") return err("This code has already been used");
  if (codeRow.expires_at && new Date(codeRow.expires_at) < new Date()) return err("This code has expired");

  const ts = now();
  const codes = sheet("Access_Codes");
  codes.getRange(codeRow._row, 8).setValue("used");
  codes.getRange(codeRow._row, 12).setValue(ts);
  codes.getRange(codeRow._row, 13).setValue(user_id);

  const users = sheet("Users");
  users.getRange(u._row, 6).setValue(codeRow.payment_method || "manual");
  users.getRange(u._row, 7).setValue(true);
  users.getRange(u._row, 8).setValue("active");
  users.getRange(u._row, 9).setValue(code);
  users.getRange(u._row, 11).setValue(ts);

  logActivation(user_id, "access_code", code, "success");
  return ok({ user: buildUser(user_id) });
}

function logActivation(user_id, method, reference, result) {
  sheet("Activation_Log").appendRow([uuid(), user_id, method, reference, result, "", now()]);
}

// ────────────────────────────────────────────────
// Dashboard – hides completed quizzes (pass or fail)
// ────────────────────────────────────────────────
function getDashboard(body) {
  const { user_id } = body;
  if (!user_id) return err("Missing user_id");

  const user = buildUser(user_id);
  if (!user) return err("User not found");
  if (user.account_status !== "active") return err("Account not activated");

  const completed = getCompletedQuizIds(user_id);

  const quizRows = rows("Quizzes").filter(q =>
    String(q.status).toLowerCase() === "active" && !completed[String(q.quiz_id)]
  );

  const quizzes = quizRows.map(q => {
    const questions = getQuestionsForQuiz(q.quiz_id, false);
    if (questions.length === 0) return null;
    return {
      quiz_id: q.quiz_id,
      title: q.title,
      description: q.description,
      base_points: Number(q.base_points) || 5,
      pass_threshold: Number(q.pass_threshold) || 80,
      questions
    };
  }).filter(Boolean);

  // Also return available rewards summary
  const rewards = rows("Rewards")
    .filter(r => String(r.status || "active").toLowerCase() === "active")
    .map(r => ({
      reward_id: r.reward_id,
      title: r.title,
      description: r.description,
      points_cost: Number(r.points_cost),
      details: r.details || ""
    }));

  return ok({ user, quizzes, rewards });
}

function submitQuiz(body) {
  const { user_id, quiz_id, answers } = body;
  if (!user_id || !quiz_id || !answers) return err("Missing fields");

  const user = buildUser(user_id);
  if (!user) return err("User not found");
  if (user.account_status !== "active") return err("Account not activated");

  // Prevent re-taking completed quizzes
  const completed = getCompletedQuizIds(user_id);
  if (completed[String(quiz_id)]) return err("You have already completed this quiz");

  const quizRow = findRow("Quizzes", "quiz_id", quiz_id);
  if (!quizRow) return err("Quiz not found");

  const questions = getQuestionsForQuiz(quiz_id, true);
  if (questions.length === 0) return err("Quiz has no questions");

  const basePoints = Number(quizRow.base_points) || 5;
  const passThreshold = Number(quizRow.pass_threshold) || 80;

  let correct = 0;
  questions.forEach((q, i) => {
    if (Number(answers[i]) === q.correct) correct++;
  });
  const score_pct = Math.round((correct / questions.length) * 100);
  const passed = score_pct >= passThreshold;

  const cfg = getConfig();
  const stats = findRow("User_Stats", "user_id", user_id);
  let AR = Number(stats.AR_pct);
  let CR = Number(stats.CR_pct);
  let totalPoints = Number(stats.total_points);
  let attempted = Number(stats.quizzes_attempted);
  let passedCnt = Number(stats.quizzes_passed);

  let ar_change = 0;
  if (passed) {
    ar_change = cfg.ar_bonus_per_quiz;
    AR = Math.min(cfg.ar_cap, AR + ar_change);
    passedCnt += 1;
  } else {
    ar_change = cfg.ar_penalty;
    AR = Math.max(0, AR + ar_change);
  }

  const points_earned = passed ? calculatePoints(basePoints, CR, AR) : 0;
  if (passed) totalPoints += points_earned;
  attempted += 1;
  const ts = now();

  const statsSheet = sheet("User_Stats");
  statsSheet.getRange(stats._row, 3).setValue(AR);
  statsSheet.getRange(stats._row, 4).setValue(totalPoints);
  statsSheet.getRange(stats._row, 5).setValue(attempted);
  statsSheet.getRange(stats._row, 6).setValue(passedCnt);
  statsSheet.getRange(stats._row, 8).setValue(ts);

  const attempt_id = uuid();
  sheet("Quiz_Attempts").appendRow([
    attempt_id, user_id, quiz_id, ts, ts, score_pct,
    passed ? "pass" : "fail", ar_change, points_earned, "completed"
  ]);

  if (points_earned > 0) {
    sheet("Points_Ledger").appendRow([
      uuid(), user_id, attempt_id, "quiz_pass", basePoints,
      Math.round(AR / (cfg.ar_bonus_divisor || 100)), points_earned, ts, ""
    ]);
  }

  return ok({ score_pct, passed, points_earned, ar_change, new_AR: AR, new_total_points: totalPoints });
}

function cancelQuiz(body) {
  const { user_id, quiz_id } = body;
  if (!user_id || !quiz_id) return err("Missing fields");

  const user = buildUser(user_id);
  if (!user) return err("User not found");
  if (user.account_status !== "active") return err("Account not activated");

  const cfg = getConfig();
  const stats = findRow("User_Stats", "user_id", user_id);
  let AR = Number(stats.AR_pct);
  let cancelled = Number(stats.quizzes_cancelled);
  let attempted = Number(stats.quizzes_attempted);

  const ar_change = cfg.ar_penalty;
  AR = Math.max(0, AR + ar_change);
  cancelled += 1;
  attempted += 1;
  const ts = now();

  const statsSheet = sheet("User_Stats");
  statsSheet.getRange(stats._row, 3).setValue(AR);
  statsSheet.getRange(stats._row, 5).setValue(attempted);
  statsSheet.getRange(stats._row, 7).setValue(cancelled);
  statsSheet.getRange(stats._row, 8).setValue(ts);

  sheet("Quiz_Attempts").appendRow([
    uuid(), user_id, quiz_id, ts, ts, 0, "cancelled", ar_change, 0, "cancelled"
  ]);

  return ok({ cancelled: true, ar_change, new_AR: AR });
}
