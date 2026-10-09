# Quiz Rewards – Full Platform

Complete quiz rewards platform with:

- User frontend (register, login, activate, take quizzes, earn points)
- **Admin panel** (PIN-only login, no username/password)
- **Web installer** (logo, site name, PIN, URL verification)
- Questions & answers stored entirely in **Google Sheets**
- PayPal $1 activation **or** manual access codes

## Points Formula

```
points = base_points + round(CR% / 10) + round(AR% / 100)
```

Example: base=5, CR=80, AR=100 → 5 + 8 + 1 = **14 points**

---

## Files

| File | Purpose |
|------|---------|
| `index.html` + `app.jsx` | Main user website |
| `admin.html` + `admin.jsx` | Admin panel (PIN login) |
| `install.html` + `install.jsx` | One-time installer |
| `styles.css` | Shared dark theme |
| `code.gs` | Full backend API |
| `bootstrap.gs` | Optional sheet seeder |
| `README.md` | This file |

---

## Setup (step by step)

### 1. Create Google Sheet + Apps Script
1. Create a new Google Sheet.
2. **Extensions → Apps Script**.
3. Paste `code.gs` into the main file.
4. (Optional) Paste `bootstrap.gs` and run `bootstrapSheets()` once to create sheets + sample data.
   - If you skip this, the installer will create the sheets automatically.

### 2. Deploy Web App
1. **Deploy → New deployment → Web app**
2. Execute as: **Me**
3. Who has access: **Anyone**
4. Copy the Web App URL.

### 3. Configure frontend
In **all three** files set the same URL:

- `app.jsx` → `const API_URL = "YOUR_URL"`
- `admin.jsx` → `const API_URL = "YOUR_URL"`
- `install.jsx` → `const API_URL = "YOUR_URL"`

Also set your PayPal Client ID in `index.html`.

### 4. Run the installer
1. Host the files (or open locally).
2. Open **`install.html`**
3. Step 1 – Site name, tagline, logo URL
4. Step 2 – Choose your **Admin PIN** (min 4 characters, PIN only – no username)
5. Step 3 – Paste/confirm the Web App URL
6. Click **Install Now**

### 5. Use the platform
- **Main site:** `index.html`
- **Admin panel:** `admin.html` → login with your PIN only

---

## Admin Panel Features

| Section | What you can do |
|---------|-----------------|
| Dashboard | Users, codes, quizzes, payments overview |
| Users | List all users + points / CR / AR |
| Access Codes | Create (auto or custom), revoke |
| Quizzes | Create/edit quizzes, add/edit/delete questions |
| Payments | View PayPal payments + activation log |
| Settings | Logo, site name, tagline, base points, change PIN |

---

## Adding Questions (two ways)

### A. From Admin panel (recommended)
Admin → Quizzes → **+ Add Question** → fill form → Save.

### B. Directly in Google Sheets
Open the **Questions** sheet and add a row:

| question_id | quiz_id | question_text | option_1 | option_2 | option_3 | option_4 | correct_index | sort_order | status |
|-------------|---------|---------------|----------|----------|----------|----------|---------------|------------|--------|
| Q001-06 | Q001 | Your question? | A | B | C | D | 2 | 6 | active |

`correct_index` is **0-based** (0 = option_1, 1 = option_2, …).

No redeploy needed – changes are live immediately.

---

## Creating Access Codes

**Admin panel → Access Codes → Create Code**

- Leave code blank to auto-generate `QUIZ-XXXX-XXXX`
- Or type a custom code
- Set expiry days and notes

Users redeem the code on the activation screen after registering.

---

## Security Notes

- User passwords: SHA-256 hashed
- Admin PIN: SHA-256 hashed, session token (8h expiry)
- Access codes: single-use + optional expiry
- Correct answers never sent to the browser
- Only `account_status = active` users can take quizzes

---

## Re-install / Reset

To run the installer again, open the **Admin_Settings** sheet and set:

```
installed = false
```

Then open `install.html` again.
