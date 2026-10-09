/**
 * OPTIONAL helper – run bootstrapSheets() once from the Apps Script editor
 * if you prefer to create sheets before using the web installer.
 * The web installer (install.html) also creates sheets automatically.
 */
function bootstrapSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const schemas = {
    "Users": [
      "user_id", "email", "password_hash", "username", "created_at",
      "payment_method", "payment_verified", "account_status",
      "activation_code_used", "paypal_txn_id", "activated_at",
      "last_login", "notes"
    ],
    "Access_Codes": [
      "code_id", "code", "assigned_to_user_id", "assigned_email",
      "payment_method", "amount_received", "currency", "status",
      "created_by", "created_at", "expires_at", "used_at",
      "used_by_user_id", "notes"
    ],
    "Quizzes": [
      "quiz_id", "title", "description", "base_points", "ar_bonus_pct",
      "pass_threshold", "status", "created_at"
    ],
    "Questions": [
      "question_id", "quiz_id", "question_text",
      "option_1", "option_2", "option_3", "option_4",
      "correct_index", "sort_order", "status"
    ],
    "User_Stats": [
      "user_id", "CR_pct", "AR_pct", "total_points",
      "quizzes_attempted", "quizzes_passed", "quizzes_cancelled", "updated_at"
    ],
    "Quiz_Attempts": [
      "attempt_id", "user_id", "quiz_id", "started_at", "finished_at",
      "score_pct", "result", "ar_change", "points_earned", "status"
    ],
    "Points_Ledger": [
      "txn_id", "user_id", "attempt_id", "type", "base_points",
      "ar_multiplier", "final_points", "created_at", "admin_note"
    ],
    "Payments": [
      "payment_id", "user_id", "amount", "currency", "paypal_txn_id",
      "payer_email", "status", "created_at", "verified_by_admin"
    ],
    "Activation_Log": [
      "log_id", "user_id", "method", "reference", "result",
      "ip_address", "created_at"
    ],
    "Admin_Settings": [
      "setting_key", "setting_value", "description"
    ],
    "Rewards": [
      "reward_id", "title", "description", "points_cost", "details", "status", "created_at"
    ],
    "Redemptions": [
      "redemption_id", "user_id", "reward_id", "reward_title", "points_spent", "status", "details", "created_at", "admin_note"
    ]
  };

  Object.keys(schemas).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
    } else {
      sh.clear();
    }
    const headers = schemas[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  });

  const settings = [
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
    ["ar_bonus_divisor", "100", "AR% divided by this = bonus pts"],
    ["installed", "false", "Whether the web installer has been run"],
    ["site_name", "Quiz Rewards", "Public site name"],
    ["site_logo_url", "", "Logo image URL"],
    ["site_tagline", "Earn points. Level up.", "Public tagline"],
    ["admin_pin_hash", "", "Hashed admin PIN"],
    ["admin_session_token", "", "Current admin session token"],
    ["admin_session_expires", "", "Admin session expiry"],
    ["webapp_url", "", "Deployed Web App URL"]
  ];
  const settingsSheet = ss.getSheetByName("Admin_Settings");
  settingsSheet.getRange(2, 1, settings.length, 3).setValues(settings);

  const ts = new Date().toISOString();
  const quizzes = [
    ["Q001", "HTML Basics", "Test your knowledge of HTML fundamentals.", 5, 1, 80, "active", ts],
    ["Q002", "React Basics", "Core concepts of the React library.", 5, 1, 80, "active", ts]
  ];
  ss.getSheetByName("Quizzes").getRange(2, 1, quizzes.length, 8).setValues(quizzes);

  const questions = [
    ["Q001-01", "Q001", "What does HTML stand for?",
     "Hyper Trainer Markup Language", "HyperText Markup Language",
     "HyperText Machine Language", "Home Tool Markup Language", 1, 1, "active"],
    ["Q001-02", "Q001", "Which tag creates a hyperlink?",
     "<link>", "<a>", "<href>", "<url>", 1, 2, "active"],
    ["Q001-03", "Q001", "CSS stands for…",
     "Computer Style Sheets", "Creative Style System",
     "Cascading Style Sheets", "Color Style Sheets", 2, 3, "active"],
    ["Q001-04", "Q001", "Which is a JavaScript primitive?",
     "object", "array", "string", "function", 2, 4, "active"],
    ["Q001-05", "Q001", "HTTP status 404 means…",
     "Server Error", "Not Found", "Unauthorized", "OK", 1, 5, "active"],
    ["Q002-01", "Q002", "React is a…",
     "Backend framework", "JS library for UI", "Database", "CSS preprocessor", 1, 1, "active"],
    ["Q002-02", "Q002", "Which hook manages state in React?",
     "useEffect", "useState", "useRef", "useMemo", 1, 2, "active"],
    ["Q002-03", "Q002", "JSX compiles to…",
     "HTML", "React.createElement calls", "CSS", "JSON", 1, 3, "active"],
    ["Q002-04", "Q002", "Which prop is required in lists?",
     "id", "ref", "key", "index", 2, 4, "active"],
    ["Q002-05", "Q002", "React fragments are written as…",
     "<div>", "<Fragment>", "<>…</>", "<Wrap>", 2, 5, "active"]
  ];
  ss.getSheetByName("Questions").getRange(2, 1, questions.length, 10).setValues(questions);

  
  // Sample rewards
  const rewards = [
    ["R001", "$5 Gift Card", "Redeem for a $5 digital gift card", 100, "You will receive a gift card code by email within 24 hours.", "active", ts],
    ["R002", "Bonus Quiz Unlock", "Unlock an exclusive bonus quiz", 50, "Contact admin with your username to unlock.", "active", ts]
  ];
  const rewSheet = ss.getSheetByName("Rewards");
  if (rewSheet) rewSheet.getRange(2, 1, rewards.length, 7).setValues(rewards);

  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);

  SpreadsheetApp.getUi().alert(
    "Bootstrap complete!\n\n" +
    "• 10 sheets created\n" +
    "• Sample quizzes & questions seeded\n" +
    "• installed = false (run install.html next)\n\n" +
    "Next steps:\n" +
    "1. Deploy as Web App (Me / Anyone)\n" +
    "2. Put the URL into app.jsx, admin.jsx, install.jsx\n" +
    "3. Open install.html to finish setup"
  );
}
