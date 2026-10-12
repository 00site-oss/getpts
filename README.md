# Quiz Points System – Google Apps Script

Matches the rules from the provided image:

| Rule | Implementation |
|------|----------------|
| No free points on register | User starts with **0 pts**, status PENDING |
| Must pay $1 (PayPal) | Then admin gives Unlock# **or** clicks Confirm Pay |
| Unlock# (ENROLL type) | Grants 100 pts and sets status ACTIVE |
| Unlock# (BONUS type) | Extra pts + optional fee % |
| Each question cost 10 pts | Admin can set custom amount per question |
| Only 2 tries allowed | Enforced in `submitAnswer()` |
| Correct 1st try → full pts | Full points awarded |
| Correct 2nd try → half pts | `Math.floor(points / 2)` |
| Wrong both → 0 pts | Zero points |

## Files

- **Code.gs** – Backend + automatic sheet creation
- **Index.html** – User-facing app (enroll, unlock, answer questions)
- **Admin.html** – Admin panel (add questions + answers + points, codes, users)

## Setup (one-time)

1. Create a new Google Spreadsheet.
2. Go to **Extensions → Apps Script**.
3. Delete any default code.
4. Create three files:
   - `Code.gs` → paste the content of `Code.gs`
   - `Index.html` → paste the content of `Index.html`
   - `Admin.html` → paste the content of `Admin.html`
5. Save the project.
6. In the spreadsheet, refresh the page. A new menu **Quiz Admin** appears.
7. Click **Quiz Admin → Setup / Create All Sheets**.  
   This creates: `Users`, `Questions`, `UnlockCodes`, `Attempts`, `Settings`, `ActivityLog`.
8. Deploy as Web App:
   - Click **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (or Anyone with Google account)
   - Deploy and copy the URL.

## URLs

- **User app**: `https://script.google.com/.../exec`
- **Admin panel**: `https://script.google.com/.../exec?page=admin`

## Default Admin Password

`admin123`  

Change it in `Code.gs`:

```js
const ADMIN_PASSWORD = 'your-strong-password';
const PAYPAL_EMAIL = 'your-paypal@email.com';
```

## Sheets created automatically

| Sheet | Purpose |
|-------|---------|
| Users | Registered users & points |
| Questions | Questions + correct answers + point amounts |
| UnlockCodes | Codes, bonus pts, fee %, max uses |
| Attempts | Per-user per-question try history |
| Settings | Configurable values (enroll pts, max tries…) |
| ActivityLog | Audit trail |

## Admin can

- Add a question with **answer** and **point amount**
- Enable / disable questions
- Create unlock codes (bonus + fee %)
- View all users and adjust their points
- View activity log
