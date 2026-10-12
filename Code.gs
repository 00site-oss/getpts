/**
 * QUIZ POINTS SYSTEM - Google Apps Script
 * Rules:
 * - User registers with 0 points (NO free points)
 * - User must pay $1 (PayPal etc.) OR receive a manual Unlock# from admin
 * - Activating Unlock# grants the enrollment points (default 100) and/or bonus
 * - Each question costs points (admin sets amount, default 10)
 * - Only 2 tries allowed
 * - Correct on 1st try = full points
 * - Correct on 2nd try = half points
 * - Wrong on both = 0 pts
 */

// ==================== CONFIG ====================
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId(); // works when bound
const ADMIN_PASSWORD = 'admin123'; // CHANGE THIS!
const PAYPAL_EMAIL = 'your-paypal@email.com'; // CHANGE THIS – shown to users for payment

// ==================== SHEET NAMES ====================
const SHEETS = {
  USERS: 'Users',
  QUESTIONS: 'Questions',
  UNLOCK_CODES: 'UnlockCodes',
  ATTEMPTS: 'Attempts',
  SETTINGS: 'Settings',
  LOG: 'ActivityLog'
};

// ==================== ON OPEN / SETUP ====================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Quiz Admin')
    .addItem('Setup / Create All Sheets', 'setupAllSheets')
    .addItem('Open Admin Panel', 'openAdminPanel')
    .addItem('Open User App', 'openUserApp')
    .addToUi();
}

/**
 * Creates all required sheets with headers if they don't exist.
 * Call this once (or from the custom menu).
 */
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ----- Users -----
  let sheet = ss.getSheetByName(SHEETS.USERS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.USERS);
    sheet.appendRow([
      'UserID', 'Name', 'Email', 'Points', 'Enrolled', 'UnlockCodeUsed',
      'CreatedAt', 'LastActive', 'Status'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  // ----- Questions -----
  sheet = ss.getSheetByName(SHEETS.QUESTIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.QUESTIONS);
    sheet.appendRow([
      'QuestionID', 'QuestionText', 'CorrectAnswer', 'Points', 'Active', 'CreatedAt', 'CreatedBy'
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Sample questions
    sheet.appendRow(['Q1', 'What is 2 + 2?', '4', 10, 'YES', new Date(), 'Admin']);
    sheet.appendRow(['Q2', 'Capital of France?', 'Paris', 10, 'YES', new Date(), 'Admin']);
  }
  
  // ----- Unlock Codes -----
  // Type: ENROLL = grants starting points after payment | BONUS = extra after enrolled
  sheet = ss.getSheetByName(SHEETS.UNLOCK_CODES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.UNLOCK_CODES);
    sheet.appendRow([
      'Code', 'Type', 'BonusPoints', 'FeePercent', 'MaxUses', 'UsedCount', 'Active', 'CreatedAt', 'Notes'
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    // Example enrollment unlock (admin gives this after user pays $1)
    sheet.appendRow(['5E42C', 'ENROLL', 100, 0, 1, 0, 'YES', new Date(), 'Enrollment unlock – grants 100 pts after $1 payment']);
    // Example bonus unlock
    sheet.appendRow(['BONUS15', 'BONUS', 15, 33.33, 5, 0, 'YES', new Date(), 'Bonus +15 pts then 33.33% fee']);
  }
  
  // ----- Attempts -----
  sheet = ss.getSheetByName(SHEETS.ATTEMPTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.ATTEMPTS);
    sheet.appendRow([
      'AttemptID', 'UserID', 'QuestionID', 'Try1Answer', 'Try1Correct', 'Try2Answer', 'Try2Correct',
      'PointsAwarded', 'TriesUsed', 'Timestamp'
    ]);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  // ----- Settings -----
  sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.SETTINGS);
    sheet.appendRow(['Key', 'Value', 'Description']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    sheet.appendRow(['ENROLL_FEE_USD', '1', 'Enrollment fee in USD (user pays via PayPal)']);
    sheet.appendRow(['ENROLL_POINTS', '100', 'Points granted when ENROLL unlock code is activated']);
    sheet.appendRow(['DEFAULT_QUESTION_POINTS', '10', 'Default points per question']);
    sheet.appendRow(['MAX_TRIES', '2', 'Maximum attempts per question']);
    sheet.appendRow(['PAYPAL_EMAIL', PAYPAL_EMAIL, 'PayPal email shown to users for payment']);
  }
  
  // ----- Activity Log -----
  sheet = ss.getSheetByName(SHEETS.LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEETS.LOG);
    sheet.appendRow(['Timestamp', 'UserID', 'Action', 'Details', 'PointsChange']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  SpreadsheetApp.getUi().alert('✅ All required sheets have been created / verified successfully!');
}

// ==================== WEB APP ENTRY ====================
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'user';
  
  if (page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('Quiz Admin Panel')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Quiz Points System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function openAdminPanel() {
  const url = ScriptApp.getService().getUrl() + '?page=admin';
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(`<p>Open Admin Panel: <a href="${url}" target="_blank">${url}</a></p>`),
    'Admin Panel URL'
  );
}

function openUserApp() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutput(`<p>Open User App: <a href="${url}" target="_blank">${url}</a></p>`),
    'User App URL'
  );
}

// ==================== HELPERS ====================
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getSettings() {
  const sheet = getSheet(SHEETS.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    settings[data[i][0]] = data[i][1];
  }
  return settings;
}

function logActivity(userId, action, details, pointsChange) {
  const sheet = getSheet(SHEETS.LOG);
  sheet.appendRow([new Date(), userId || '', action, details || '', pointsChange || 0]);
}

function generateId(prefix) {
  return prefix + Utilities.getUuid().substring(0, 8).toUpperCase();
}

// ==================== USER FUNCTIONS ====================

/**
 * Register a new user.
 * Starts with 0 points and status PENDING.
 * User must pay $1 (PayPal) then activate an Unlock# given by admin
 * (or admin manually grants points).
 */
function enrollUser(name, email) {
  if (!name || !name.trim()) throw new Error('Name is required');
  
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  // Check duplicate email
  if (email) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]).toLowerCase() === email.toLowerCase()) {
        throw new Error('Email already registered');
      }
    }
  }
  
  const userId = generateId('U');
  
  // 0 points, not enrolled yet, status PENDING_PAYMENT
  sheet.appendRow([
    userId,
    name.trim(),
    email || '',
    0,                 // Points = 0 (must pay + unlock)
    'NO',              // Enrolled = NO until unlock activated
    '',                // UnlockCodeUsed
    new Date(),
    new Date(),
    'PENDING'          // Must pay $1 then activate Unlock#
  ]);
  
  logActivity(userId, 'REGISTER', `User registered (pending payment): ${name}`, 0);
  
  const settings = getSettings();
  const paypal = settings.PAYPAL_EMAIL || PAYPAL_EMAIL;
  const fee = settings.ENROLL_FEE_USD || '1';
  
  return {
    success: true,
    userId: userId,
    name: name.trim(),
    points: 0,
    status: 'PENDING',
    message: `Registered! You have 0 points. Pay $${fee} via PayPal to ${paypal}, then enter the Unlock# that admin gives you.`
  };
}

/**
 * Get user by ID or by name (simple lookup)
 */
function getUser(userIdOrName) {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userIdOrName || 
        String(data[i][1]).toLowerCase() === String(userIdOrName).toLowerCase()) {
      return {
        userId: data[i][0],
        name: data[i][1],
        email: data[i][2],
        points: Number(data[i][3]),
        enrolled: data[i][4],
        unlockCodeUsed: data[i][5],
        status: data[i][8] || 'PENDING'
      };
    }
  }
  return null;
}

/**
 * Activate an Unlock Code.
 * Types:
 *   ENROLL – grants enrollment points (after user paid $1). Sets status ACTIVE.
 *   BONUS  – extra points + optional fee % (user must already be ACTIVE).
 * Admin can also give codes manually after verifying PayPal payment.
 */
function activateUnlockCode(userId, code) {
  const user = getUser(userId);
  if (!user) throw new Error('User not found');
  
  const sheet = getSheet(SHEETS.UNLOCK_CODES);
  const data = sheet.getDataRange().getValues();
  
  // Columns: 0=Code, 1=Type, 2=BonusPoints, 3=FeePercent, 4=MaxUses, 5=UsedCount, 6=Active, 7=CreatedAt, 8=Notes
  let codeRow = -1;
  let codeType = 'BONUS';
  let bonus = 0;
  let feePercent = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === String(code).toUpperCase()) {
      if (data[i][6] !== 'YES') throw new Error('This unlock code is inactive');
      if (Number(data[i][5]) >= Number(data[i][4])) throw new Error('Unlock code has reached max uses');
      
      codeRow = i + 1;
      codeType = String(data[i][1] || 'BONUS').toUpperCase();
      bonus = Number(data[i][2]) || 0;
      feePercent = Number(data[i][3]) || 0;
      break;
    }
  }
  
  if (codeRow === -1) throw new Error('Invalid unlock code');
  
  const currentPts = user.points;
  let newPoints = currentPts;
  let percentDeduction = 0;
  let message = '';
  
  if (codeType === 'ENROLL') {
    // Enrollment unlock – user paid $1, now grant starting points
    if (user.enrolled === 'YES' || user.status === 'ACTIVE') {
      throw new Error('You are already enrolled. Use a BONUS unlock code instead.');
    }
    
    newPoints = currentPts + bonus; // usually 100
    // Optional fee on enrollment (normally 0)
    if (feePercent > 0) {
      percentDeduction = Math.round(newPoints * (feePercent / 100) * 100) / 100;
      newPoints = Math.max(0, newPoints - percentDeduction);
    }
    
    // Update user → mark enrolled + ACTIVE
    const usersSheet = getSheet(SHEETS.USERS);
    const usersData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][0] === userId) {
        usersSheet.getRange(i + 1, 4).setValue(newPoints);          // Points
        usersSheet.getRange(i + 1, 5).setValue('YES');              // Enrolled
        usersSheet.getRange(i + 1, 6).setValue(code.toUpperCase()); // UnlockCodeUsed
        usersSheet.getRange(i + 1, 8).setValue(new Date());         // LastActive
        usersSheet.getRange(i + 1, 9).setValue('ACTIVE');           // Status
        break;
      }
    }
    
    message = `Enrollment unlocked! +${bonus} pts. You are now ACTIVE. Balance: ${newPoints} pts`;
    logActivity(userId, 'ENROLL_UNLOCK', `Activated ENROLL code ${code}. +${bonus} pts`, newPoints - currentPts);
    
  } else {
    // BONUS unlock – extra points after already enrolled
    if (user.status !== 'ACTIVE' && user.enrolled !== 'YES') {
      throw new Error('You must complete enrollment (pay $1 + activate ENROLL unlock) first.');
    }
    
    newPoints = currentPts + bonus;
    if (feePercent > 0) {
      percentDeduction = Math.round(newPoints * (feePercent / 100) * 100) / 100;
      newPoints = Math.max(0, newPoints - percentDeduction);
    }
    
    // Update points only (keep existing unlock record or append)
    const usersSheet = getSheet(SHEETS.USERS);
    const usersData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][0] === userId) {
        usersSheet.getRange(i + 1, 4).setValue(newPoints);
        // Append code to UnlockCodeUsed if already has one
        const prev = usersData[i][5] ? usersData[i][5] + ', ' : '';
        usersSheet.getRange(i + 1, 6).setValue(prev + code.toUpperCase());
        usersSheet.getRange(i + 1, 8).setValue(new Date());
        break;
      }
    }
    
    message = `Bonus unlocked! +${bonus} pts` +
      (feePercent > 0 ? `, then -${feePercent}% fee (-${percentDeduction})` : '') +
      `. New balance: ${newPoints} pts`;
    logActivity(userId, 'BONUS_UNLOCK', `Activated BONUS code ${code}. +${bonus}, fee ${feePercent}%`, newPoints - currentPts);
  }
  
  // Increment used count (column 6 = UsedCount, index 5)
  sheet.getRange(codeRow, 6).setValue(Number(data[codeRow - 1][5]) + 1);
  
  return {
    success: true,
    type: codeType,
    bonus: bonus,
    feePercent: feePercent,
    pointsDeducted: percentDeduction,
    newPoints: newPoints,
    message: message
  };
}

/**
 * Get all active questions (without answers)
 */
function getQuestions() {
  const sheet = getSheet(SHEETS.QUESTIONS);
  const data = sheet.getDataRange().getValues();
  const questions = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'YES') {
      questions.push({
        questionId: data[i][0],
        questionText: data[i][1],
        points: Number(data[i][3]) || 10
      });
    }
  }
  return questions;
}

/**
 * Get user's attempt status for a question
 */
function getAttemptStatus(userId, questionId) {
  const sheet = getSheet(SHEETS.ATTEMPTS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === userId && data[i][2] === questionId) {
      return {
        attemptId: data[i][0],
        try1Answer: data[i][3],
        try1Correct: data[i][4],
        try2Answer: data[i][5],
        try2Correct: data[i][6],
        pointsAwarded: Number(data[i][7]),
        triesUsed: Number(data[i][8])
      };
    }
  }
  return null;
}

/**
 * Submit an answer for a question.
 * Rules:
 * - Max 2 tries
 * - 1st try correct → full points
 * - 2nd try correct → half points
 * - Both wrong → 0
 */
function submitAnswer(userId, questionId, answer) {
  const user = getUser(userId);
  if (!user) throw new Error('User not found');
  if (user.status !== 'ACTIVE') throw new Error('User is not active');
  
  // Find question
  const qSheet = getSheet(SHEETS.QUESTIONS);
  const qData = qSheet.getDataRange().getValues();
  let correctAnswer = null;
  let qPoints = 10;
  
  for (let i = 1; i < qData.length; i++) {
    if (qData[i][0] === questionId && qData[i][4] === 'YES') {
      correctAnswer = String(qData[i][2]).trim().toLowerCase();
      qPoints = Number(qData[i][3]) || 10;
      break;
    }
  }
  if (correctAnswer === null) throw new Error('Question not found or inactive');
  
  // Check existing attempt
  let attempt = getAttemptStatus(userId, questionId);
  const settings = getSettings();
  const maxTries = Number(settings.MAX_TRIES) || 2;
  
  if (attempt && attempt.triesUsed >= maxTries) {
    throw new Error('Maximum tries (2) already used for this question');
  }
  
  const isCorrect = String(answer).trim().toLowerCase() === correctAnswer;
  const aSheet = getSheet(SHEETS.ATTEMPTS);
  
  if (!attempt) {
    // First try
    const attemptId = generateId('A');
    const pointsAwarded = isCorrect ? qPoints : 0;
    const triesUsed = 1;
    
    aSheet.appendRow([
      attemptId, userId, questionId,
      answer, isCorrect ? 'YES' : 'NO',
      '', '', // try2 empty
      pointsAwarded, triesUsed, new Date()
    ]);
    
    if (isCorrect) {
      updateUserPoints(userId, pointsAwarded);
      logActivity(userId, 'ANSWER_CORRECT', `Q:${questionId} 1st try`, pointsAwarded);
    } else {
      logActivity(userId, 'ANSWER_WRONG', `Q:${questionId} 1st try`, 0);
    }
    
    return {
      success: true,
      correct: isCorrect,
      tryNumber: 1,
      pointsAwarded: pointsAwarded,
      triesLeft: maxTries - 1,
      message: isCorrect 
        ? `Correct on first try! +${pointsAwarded} points` 
        : `Incorrect. You have 1 try left.`
    };
  } else {
    // Second try
    const pointsAwarded = isCorrect ? Math.floor(qPoints / 2) : 0; // half points
    const triesUsed = 2;
    
    // Find the row and update
    const aData = aSheet.getDataRange().getValues();
    for (let i = 1; i < aData.length; i++) {
      if (aData[i][0] === attempt.attemptId) {
        aSheet.getRange(i + 1, 6).setValue(answer);               // Try2Answer
        aSheet.getRange(i + 1, 7).setValue(isCorrect ? 'YES' : 'NO');
        aSheet.getRange(i + 1, 8).setValue(pointsAwarded);
        aSheet.getRange(i + 1, 9).setValue(triesUsed);
        aSheet.getRange(i + 1, 10).setValue(new Date());
        break;
      }
    }
    
    if (isCorrect) {
      updateUserPoints(userId, pointsAwarded);
      logActivity(userId, 'ANSWER_CORRECT', `Q:${questionId} 2nd try (half)`, pointsAwarded);
    } else {
      logActivity(userId, 'ANSWER_WRONG', `Q:${questionId} 2nd try`, 0);
    }
    
    return {
      success: true,
      correct: isCorrect,
      tryNumber: 2,
      pointsAwarded: pointsAwarded,
      triesLeft: 0,
      message: isCorrect 
        ? `Correct on second try! +${pointsAwarded} points (half)` 
        : `Incorrect. No more tries. 0 points awarded.`
    };
  }
}

function updateUserPoints(userId, delta) {
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      const newPts = Math.max(0, Number(data[i][3]) + delta);
      sheet.getRange(i + 1, 4).setValue(newPts);
      sheet.getRange(i + 1, 8).setValue(new Date());
      return newPts;
    }
  }
  return null;
}

/**
 * Get full user dashboard data
 */
function getUserDashboard(userId) {
  const user = getUser(userId);
  if (!user) throw new Error('User not found');
  
  const questions = getQuestions();
  const attempts = [];
  const aSheet = getSheet(SHEETS.ATTEMPTS);
  const aData = aSheet.getDataRange().getValues();
  
  for (let i = 1; i < aData.length; i++) {
    if (aData[i][1] === userId) {
      attempts.push({
        questionId: aData[i][2],
        try1Correct: aData[i][4],
        try2Correct: aData[i][6],
        pointsAwarded: Number(aData[i][7]),
        triesUsed: Number(aData[i][8])
      });
    }
  }
  
  return {
    user: user,
    questions: questions,
    attempts: attempts
  };
}

// ==================== ADMIN FUNCTIONS ====================

function adminLogin(password) {
  return password === ADMIN_PASSWORD;
}

/**
 * Admin: Add a new question with answer and points amount
 */
function adminAddQuestion(questionText, correctAnswer, points, adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  if (!questionText || !correctAnswer) throw new Error('Question and answer are required');
  
  const pts = Number(points) || 10;
  const qId = generateId('Q');
  const sheet = getSheet(SHEETS.QUESTIONS);
  
  sheet.appendRow([
    qId,
    questionText.trim(),
    correctAnswer.trim(),
    pts,
    'YES',
    new Date(),
    'Admin'
  ]);
  
  logActivity('ADMIN', 'ADD_QUESTION', `Added ${qId}: ${questionText.substring(0, 40)}... (${pts}pts)`, 0);
  
  return { success: true, questionId: qId, message: 'Question added successfully' };
}

/**
 * Admin: Get all questions (with answers)
 */
function adminGetQuestions(adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  
  const sheet = getSheet(SHEETS.QUESTIONS);
  const data = sheet.getDataRange().getValues();
  const list = [];
  
  for (let i = 1; i < data.length; i++) {
    list.push({
      questionId: data[i][0],
      questionText: data[i][1],
      correctAnswer: data[i][2],
      points: Number(data[i][3]),
      active: data[i][4],
      createdAt: data[i][5]
    });
  }
  return list;
}

/**
 * Admin: Toggle question active status
 */
function adminToggleQuestion(questionId, adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  
  const sheet = getSheet(SHEETS.QUESTIONS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === questionId) {
      const newStatus = data[i][4] === 'YES' ? 'NO' : 'YES';
      sheet.getRange(i + 1, 5).setValue(newStatus);
      return { success: true, active: newStatus };
    }
  }
  throw new Error('Question not found');
}

/**
 * Admin: Create unlock code
 * type = 'ENROLL' (grants starting pts after payment) or 'BONUS'
 */
function adminCreateUnlockCode(code, type, bonusPoints, feePercent, maxUses, notes, adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  if (!code) throw new Error('Code is required');
  
  const codeType = (type || 'ENROLL').toUpperCase();
  if (codeType !== 'ENROLL' && codeType !== 'BONUS') {
    throw new Error('Type must be ENROLL or BONUS');
  }
  
  const sheet = getSheet(SHEETS.UNLOCK_CODES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toUpperCase() === code.toUpperCase()) {
      throw new Error('Code already exists');
    }
  }
  
  // Default: ENROLL → 100 pts, BONUS → 15 pts
  const pts = Number(bonusPoints) || (codeType === 'ENROLL' ? 100 : 15);
  const fee = Number(feePercent) || 0;
  
  sheet.appendRow([
    code.toUpperCase(),
    codeType,
    pts,
    fee,
    Number(maxUses) || 1,
    0,
    'YES',
    new Date(),
    notes || ''
  ]);
  
  return { success: true, message: `${codeType} unlock code created (+${pts} pts)` };
}

/**
 * Admin: Get all users
 */
function adminGetUsers(adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  const list = [];
  
  for (let i = 1; i < data.length; i++) {
    list.push({
      userId: data[i][0],
      name: data[i][1],
      email: data[i][2],
      points: Number(data[i][3]),
      enrolled: data[i][4],
      unlockCodeUsed: data[i][5],
      createdAt: data[i][6],
      status: data[i][8]
    });
  }
  return list;
}

/**
 * Admin: Adjust user points
 */
function adminAdjustPoints(userId, delta, reason, adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  
  const newPts = updateUserPoints(userId, Number(delta));
  if (newPts === null) throw new Error('User not found');
  
  logActivity('ADMIN', 'ADJUST_POINTS', `User ${userId}: ${reason || ''}`, Number(delta));
  return { success: true, newPoints: newPts };
}

/**
 * Admin: Manually confirm payment & activate user (grants enrollment points)
 * Use this after verifying PayPal payment instead of giving an Unlock#.
 */
function adminConfirmPayment(userId, adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  
  const user = getUser(userId);
  if (!user) throw new Error('User not found');
  if (user.status === 'ACTIVE' && user.enrolled === 'YES') {
    throw new Error('User is already active/enrolled');
  }
  
  const settings = getSettings();
  const enrollPts = Number(settings.ENROLL_POINTS) || 100;
  
  const sheet = getSheet(SHEETS.USERS);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      const newPts = Number(data[i][3]) + enrollPts;
      sheet.getRange(i + 1, 4).setValue(newPts);       // Points
      sheet.getRange(i + 1, 5).setValue('YES');         // Enrolled
      sheet.getRange(i + 1, 6).setValue('MANUAL');      // UnlockCodeUsed
      sheet.getRange(i + 1, 8).setValue(new Date());    // LastActive
      sheet.getRange(i + 1, 9).setValue('ACTIVE');      // Status
      
      logActivity(userId, 'ADMIN_CONFIRM_PAYMENT', `Admin confirmed payment. +${enrollPts} pts`, enrollPts);
      
      return {
        success: true,
        newPoints: newPts,
        message: `Payment confirmed. User is now ACTIVE with ${newPts} pts.`
      };
    }
  }
  throw new Error('User not found');
}

/**
 * Admin: Get unlock codes
 */
function adminGetUnlockCodes(adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  
  const sheet = getSheet(SHEETS.UNLOCK_CODES);
  const data = sheet.getDataRange().getValues();
  const list = [];
  
  // Columns: 0=Code, 1=Type, 2=BonusPoints, 3=FeePercent, 4=MaxUses, 5=UsedCount, 6=Active, 7=CreatedAt, 8=Notes
  for (let i = 1; i < data.length; i++) {
    list.push({
      code: data[i][0],
      type: data[i][1] || 'BONUS',
      bonusPoints: Number(data[i][2]),
      feePercent: Number(data[i][3]),
      maxUses: Number(data[i][4]),
      usedCount: Number(data[i][5]),
      active: data[i][6],
      notes: data[i][8]
    });
  }
  return list;
}

/**
 * Admin: Get activity log (last 50)
 */
function adminGetLog(adminPass) {
  if (!adminLogin(adminPass)) throw new Error('Unauthorized');
  
  const sheet = getSheet(SHEETS.LOG);
  const data = sheet.getDataRange().getValues();
  const list = [];
  
  const start = Math.max(1, data.length - 50);
  for (let i = start; i < data.length; i++) {
    list.push({
      timestamp: data[i][0],
      userId: data[i][1],
      action: data[i][2],
      details: data[i][3],
      pointsChange: data[i][4]
    });
  }
  return list.reverse();
}
