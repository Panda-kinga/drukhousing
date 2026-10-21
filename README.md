# DrukHousing

A simple rental application website for Bhutan, built in the style of the supplied Campus Eats project. Open this folder in VS Code. The website uses EJS, plain CSS, CommonJS `require`, ordinary functions, and MVC.

The design uses warm cream, maroon, and muted gold, with a Bhutanese house image. There are no maps, payments, or messaging. No Firebase is used.

## Start here — Windows / VS Code

1. Extract the ZIP. Open the inner **drukhousing** folder in VS Code (the folder containing `package.json`).
2. Install Node.js 22 or newer, PostgreSQL with pgAdmin, and MongoDB Community Server with MongoDB Compass. Compass is a viewer; it does not replace the MongoDB server.
3. In pgAdmin, create an empty database called **drukhousing**. Open its Query Tool, open `database/schema.sql`, and execute it once.
4. Open the VS Code terminal in this folder and run:

   ```powershell
   npm install
   ```

5. The ZIP includes `.env` with placeholders. Edit it using your own details. If `.env` is missing, run:

   ```powershell
   Copy-Item .env.example .env
   ```

6. Fill in `DB_PASS`, your Gmail address and Gmail app password, and a new `SESSION_SECRET`. Generate a secret with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

7. Make sure PostgreSQL and the MongoDB Windows service are running. Then run:

   ```powershell
   npm run dev
   ```

8. Open **http://localhost:3000**. Do not use VS Code Live Server; this project needs Node.js.
9. Sign up as a landlord, open the verification email, and log in. Create a listing. In another browser profile or private window, sign up and verify a tenant account, then apply.

To create a super admin after the database is ready, run `npm run create-admin` and answer the terminal prompts. Super admins are not created through the signup page.

There are no pre-created users, passwords or fake rental listings. The homepage shows an intentional empty state until a landlord publishes a home. You can use your own Bhutanese house photos. The included `public/images/bhutan-home.png` is AI-created decorative imagery, not a real rental offer.

## Environment values

| Name | What to put there |
| --- | --- |
| `PORT` | `3000` |
| `BASE_URL` | `http://localhost:3000` — no trailing slash; use the public URL in production |
| `DB_HOST` | `localhost` |
| `DB_PORT` | Usually `5432` |
| `DB_NAME` | `drukhousing` |
| `DB_USER` | Usually `postgres` |
| `DB_PASS` | Your PostgreSQL password, not your pgAdmin master password |
| `DB_SSL` | `false` locally; set to `true` for Neon PostgreSQL |
| `MONGO_URI` | `mongodb://127.0.0.1:27017` |
| `MONGO_DB_NAME` | MongoDB database used for tenant feedback |
| `SESSION_SECRET` | Your long random secret |
| `GMAIL_USER` | Your Gmail address |
| `GMAIL_APP_PASSWORD` | A Gmail app password; not your normal Google password |
| `MAIL_FROM_NAME` | The visible sender name, such as `Campus Eats` |

If a value contains `#` or spaces, surround it with double quotes. Never paste credentials into source code or commit `.env`.

## How the code works

**Route → middleware → controller → model → database → EJS page.**

- `app.js` connects the services once, sets up Express and sessions, and starts the server.
- `routes/index.js` lists the page and API URLs.
- `middleware/auth.js` checks login and the user's stored role. It refreshes the user from PostgreSQL so a SQL promotion takes effect.
- Controllers validate input, call models, and choose an EJS view. They contain no SQL or MongoDB queries.
- Each model owns writes to its table/collection. Read queries may join related tables. `ListingPhoto.js` and `ApplicationDocument.js` keep the child-table queries separate.
- Application.js passes the same transaction connection to ApplicationDocument.js. If either save fails, both database saves roll back.
- `middleware/upload.js` sets file limits, checks file extensions/MIME types and file signatures, and removes uploads if a request fails.
- `middleware/csrf.js` protects forms with a session token. `validation.js` and `errors.js` keep repeated checks and errors simple.
- EJS escapes user-entered text. Shared header/footer files keep the layout consistent.

## Step-by-step build and testing guide

The complete implementation is already included. Follow these checkpoints in your requested order to learn and test each part. For running the final app, complete all installations in the quick start first. Temporary connection-test scripts below can run separately while you work through the early steps.

### 1. Project setup and PostgreSQL connection

Inspect `package.json`, `.env.example`, `.gitignore`, `app.js`, and `config/db.js`. `npm run dev` uses nodemon and `server.js`; `npm start` runs `server.js` directly. `app.js` exports the testable Express app.

For a temporary connection-only route, create **db-test.js** in the project root:

```js
require('dotenv').config();
const express = require('express');
const db = require('./config/db');
const app = express();
app.get('/db-test', async (req, res) => {
  const connection = await db.connect();
  connection.done();
  res.json({ connected: true });
});
app.listen(3001);
```

Run `node db-test.js`. Visit `http://localhost:3001/db-test`.

**Expected:** `{"connected":true}`. If connection fails, check the PostgreSQL service, DB_NAME, DB_USER and DB_PASS. The database must already exist, but its tables are not needed for this connection test. Stop this server with Ctrl+C and delete `db-test.js`. The final app has no `/db-test` route.

### 2. PostgreSQL tables and migrations

Create an empty database named `drukhousing`, open its pgAdmin Query Tool, and run `database/schema.sql` once. Then run every SQL file in `migrations/` in number order. The current migration adds `users.is_active` and the `admin_actions` table. For tests, create a separate `drukhousing_test` database, run the same schema and migrations there, and never point tests at the development database.

In pgAdmin, select **drukhousing → Query Tool**. Open and run `database/schema.sql`. Do not run it in the `postgres` maintenance database. Run it once on an empty database; it intentionally does not delete existing data.

**Expected:** five tables under `Schemas → public → Tables`:

| Table | Main purpose |
| --- | --- |
| users | Accounts, role, verification and reset token hashes |
| listings | Housing details and landlord ownership |
| listing_photos | Photo filenames for each listing |
| applications | One application per tenant per listing |
| application_documents | Private uploaded document filenames |

Run:

```sql
SELECT id, name, email, role FROM users;
SELECT * FROM listings;
```

**Expected:** empty tables before signup/listing creation. CHECK constraints restrict roles, housing types, statuses, positive prices and lease duration. Foreign keys enforce relationships. Two triggers also check the role when assigning a landlord or tenant. The deadline must be later than the listing's creation time; submission/decision checks use the current database clock separately.

### 3. Signup, email verification, login, logout and sessions

Files: `User.js`, `authController.js`, the auth routes, and signup/login views.

For Gmail, enable Google 2-Step Verification and create an app password named **DrukHousing**. Put it in `GMAIL_APP_PASSWORD` without display spaces. Put the matching address in `GMAIL_USER`. Restart nodemon after changing `.env` (type `rs` in its terminal or stop/start it).

**Test:** sign up as Tenant. Try logging in before verification. Open the email's link, then log in again. Repeat with a Landlord account using another email address.

**Expected:** login before verification fails with `Incorrect email or password`. After verification, login succeeds. PostgreSQL stores `tenant` or `landlord` exactly. There is no Superadmin option. Editing the submitted role to `superadmin` gets HTTP 400.

```sql
SELECT id, name, email, role, is_verified FROM users;
```

Passwords are bcrypt hashes. Emailed tokens are random; only SHA-256 token hashes are stored. Verification tokens are separate from reset tokens. The verification link is one-use.

**Logout test:** click Log out and revisit `/tenant/dashboard`. **Expected:** redirect to `/login`.

If SMTP configuration fails during signup, the account remains unverified and the page explains the failure. For local development recovery, correct `.env`, restart, and remove ONLY that unused, unverified test account in pgAdmin before signing up again:

```sql
DELETE FROM users
WHERE email = 'your-test-email@example.com' AND is_verified = false;
```

Do not delete a verified account. This recovery is for a failed initial test signup, not a bypass of email verification.

### 4. Forgot and reset password

Click **Forgot password?**, enter a registered email, then submit an unknown email too.

**Expected:** both show exactly: “If an account exists with that email, a password reset link will be sent.” A real registered account receives a link. The link expires in one hour and cannot be reused after changing the password.

**Test expiry on your test account:** request a new reset link, then run:

```sql
UPDATE users
SET reset_token_expires = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') - INTERVAL '1 minute'
WHERE email = 'your-test-email@example.com';
```

**Expected:** opening that link says it is invalid or expired. Request a fresh link to reset normally.

### 5. Role middleware, navigation and superadmin

`requireAuth`, `requireTenant`, `requireLandlord`, and `requireSuperAdmin` are in `middleware/auth.js`.

| Stored role | Login destination | Main links |
| --- | --- | --- |
| tenant | `/tenant/dashboard` | Dashboard, My applications, My feedback |
| landlord | `/landlord/dashboard` | My listings, Customer feedback |
| superadmin | `/superadmin/dashboard` | Superadmin |

Create and verify a separate account first. Promote that account in pgAdmin:

```sql
UPDATE users SET role = 'superadmin'
WHERE email = 'your-admin-email@example.com' AND is_verified = true;
```

There is deliberately no seeded password or automatic superadmin creation. The SQL promotion is the requested manual seed.

**Test:** log in with the promoted account. As a tenant, open `/landlord/dashboard`.

**Expected:** superadmin sees all users/listings; the tenant gets HTTP 403. A visitor who is not logged in is redirected to `/login`.

### 6. Landlord listing creation and photos

As landlord, choose **List a home**. Enter title, location, monthly rent in Ngultrum, type, whole-number lease years, and a future application deadline. Add 1–6 photos.

**Allowed photos:** JPG/JPEG, PNG, WebP; maximum 5 MB per file. Filenames are generated by the server. Files go to `uploads/`. Photos are served through `/photos/:id`, which checks that their listing is active.

**Expected:** the listing detail page appears with your photos. The dashboard shows your listing with zero applications. Another landlord does not see it in their dashboard.

**Invalid-input tests:** zero/negative rent, no photos, a past deadline, or a text file renamed `.png` must fail. The server checks the deadline even if the browser form is edited. Failed saves remove newly uploaded files.

### 7. Public browsing and search

Visit `/` without logging in. Search for part of a title or location, such as `Paro`. Choose House, Room or Apartment.

**Expected:** only active listings with a future deadline appear. A non-matching search shows a helpful empty state. The `Clear` link restores all open homes. A closed but active listing may still be opened directly so its applicant can view its details; its Apply button is disabled by the page state and POST submissions are rejected by the server.

### 8. Tenant applications and documents

Log in as a tenant, open a listing and click **Apply for this home**. Add full name, phone, optional notes and optional supporting documents.

**Allowed documents:** up to 3 PDF, JPG/JPEG, PNG or WebP files, maximum 5 MB each.

**Expected:** `/tenant/applications` shows **Pending**. PostgreSQL has one `applications` row and one `application_documents` row for each uploaded file. The tenant ID comes from the session. The application and document records use `db.tx` together.

**Tests:** submit again to the same listing; try downloading the document from another landlord's login; try the URL without logging in.

**Expected:** duplicate gets HTTP 409; the wrong landlord gets 404; logged-out visitors go to login. `/uploads/<filename>` is never a public download URL. The actual document route is `/documents/:id` and requires authorization.

### 9. Landlord review after deadline

Use **View applications** on your own dashboard listing. Before the deadline, applicants are visible but the Accept/Reject controls are not. A forged early POST is also rejected.

For a quick manual test, create a listing with its deadline two minutes ahead, apply before the deadline, wait for it to pass, and refresh the landlord page.

**Expected:** Accept and Reject appear for pending applications. Choosing one updates the tenant's status. A different landlord cannot access this review page or make decisions.

For a local test without waiting, change BOTH timestamps for your chosen test listing (replace `123` with its ID):

```sql
UPDATE listings
SET created_at = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') - INTERVAL '2 days',
    deadline = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Thimphu') - INTERVAL '1 minute'
WHERE id = 123;
```

Both fields change here because the schema requires deadline > created_at. Do not do this to real applications.

Decisions are final in this simple scope: only pending applications can be accepted or rejected. The specification does not limit acceptance to one tenant, so there is no automatic one-tenant-only rule.

### 10. MongoDB installation and connection

Install **MongoDB Community Server** locally using its Windows installer. Choose to run it as a Windows service. Install/open **MongoDB Compass**, then connect with `mongodb://127.0.0.1:27017`.

`config/mongo.js` creates one MongoClient, connects once, and reuses it. `app.js` calls `connectMongo()` on startup before listening. It does not make a client per request.

For a temporary test, create **mongo-test.js** in the project root:

```js
require('dotenv').config();
const express = require('express');
const { connectMongo, getMongo } = require('./config/mongo');
const app = express();
app.get('/mongo-test', async (req, res) => {
  await getMongo().command({ ping: 1 });
  res.json({ connected: true });
});
connectMongo().then(() => app.listen(3001));
```

Run `node mongo-test.js` and visit `http://localhost:3001/mongo-test`.

**Expected:** `{"connected":true}`. Stop it with Ctrl+C and delete `mongo-test.js`. The final app has no `/mongo-test` route. Run the final app again with `npm run dev`.

The final app creates feedback indexes on startup. Refresh Compass to see database **drukhousing_feedback**, collection **feedback**.

### 11. Feedback model and tenant/landlord pages

MongoDB stores only feedback:

```js
{
  listingId: 1,
  landlordId: 2,
  tenantId: 3,
  tenantName: 'Tashi',
  rating: 5,
  comment: 'A comfortable home.',
  createdAt: new Date()
}
```

**Trade-off:** these IDs are ordinary numbers, so the application must validate them against PostgreSQL because foreign keys cannot be enforced across the two databases.

`Feedback.js` exports `createFeedback`, `getFeedbackForListing`, `getFeedbackForLandlord`, `getFeedbackForTenant`, and `ensureIndexes`. Every read is scoped. A unique compound index on listingId + tenantId prevents duplicate feedback even if two submissions arrive together.

**Test:** accept a tenant application, log in as that tenant, and open **My feedback**. Choose the accepted home, a rating from 1–5, and an optional comment.

**Expected:** feedback is saved to MongoDB and appears below the tenant form. The listing disappears from that form's choices. Its landlord sees the title, tenant name, rating and comment under **Customer feedback**, newest first.

**Negative tests:** pending/rejected applicants cannot submit; repeat submissions fail; 0, 6 and fractional ratings fail. Another landlord never sees this feedback, including by adding landlordId to the form or query string. IDs for the current tenant/landlord come from the session; the feedback's landlordId is looked up from the listing.

Inactive listing feedback stays stored but is hidden from tenant/landlord pages. This preserves records without exposing removed listings.

### 12. Dashboards and CSS

Open the tenant and landlord dashboards. Narrow the browser window to phone width.

**Expected:** cream background, maroon buttons, readable typography, simple cards, and responsive forms. Navigation changes by role. Tenant statuses use both text and colour. The landlord sees only their listings and application counts. No external font or image service is needed at runtime.

**Superadmin test:** deactivate a test listing. Check its old detail URL, photo URL, application document URL and API URL.

**Expected:** 404 for removed content. It also disappears from search, tenant applications, landlord listings and both feedback pages. Superadmin alone keeps the management record marked Deactivated. There is no restore feature in this scope.

### 13. Small REST API

Use a browser or Postman:

```text
GET http://localhost:3000/api/listings
GET http://localhost:3000/api/listings?q=Paro&type=house
GET http://localhost:3000/api/listings/1
```

**Expected:** JSON from the same Listing model used by the website. The collection returns active/open homes. A valid single active listing returns its details and photo IDs, even after applications close. Invalid IDs return 400; missing/deactivated IDs return 404. Document paths and applicant personal details are not exposed by these endpoints. A photo ID can be viewed at `/photos/<id>`.

### 14. Final checks and GitHub push

Run automated checks:

```powershell
npm test
```

`npm test` runs the Jest and Supertest integration tests against the test databases. The test suite includes public API, inquiry, property ownership, super admin, feedback and signup coverage. Run `npx jest --coverage --runInBand` to create the HTML coverage report in `coverage/lcov-report/`.

**Expected:** all checks pass. The tests use PGlite (an in-memory PostgreSQL engine) for SQL and substitutes for MongoDB/email. PGlite is a development/test dependency only; the running website uses pg-promise and your real PostgreSQL database. The deliberately failed document-save test prints `Request failed: Error`; that is expected and verifies rollback/cleanup.

Before pushing:

- Complete a real tenant → application → landlord acceptance → feedback flow locally.
- Test real Gmail verification and reset emails.
- Confirm both database services are running and inspect their records in pgAdmin/Compass.
- Remove any temporary connection-test scripts/routes.
- Keep `.env.example`; do not commit `.env`, node_modules or uploads.
- Never copy the sample Campus Eats credentials into this project.

In the DrukHousing folder:

```powershell
git init
git check-ignore .env uploads/check.txt node_modules/check.txt
git add .
git status
git diff --cached --name-only
```

**Expected:** the ignored paths are reported by `git check-ignore` and are absent from staged files. Review before continuing. Then:

```powershell
git commit -m "Build DrukHousing rental application platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/DrukHousing.git
git push -u origin main
```

Create an empty GitHub repository first and replace YOUR_USERNAME. If `origin` already exists, check `git remote -v` and use the correct existing remote. The project has not been pushed or deployed for you.

## Final folder structure

```text
drukhousing/
├── config/
│   ├── db.js
│   ├── mongo.js
│   └── mailer.js
├── controllers/
│   ├── homeController.js
│   ├── authController.js
│   ├── listingController.js
│   ├── applicationController.js
│   ├── tenantController.js
│   ├── landlordController.js
│   ├── feedbackController.js
│   └── superAdminController.js
├── middleware/
│   ├── auth.js
│   ├── upload.js
│   ├── validation.js
│   ├── csrf.js
│   └── errors.js
├── models/
│   ├── User.js
│   ├── Listing.js
│   ├── ListingPhoto.js
│   ├── Application.js
│   ├── ApplicationDocument.js
│   └── Feedback.js
├── routes/
│   └── index.js
├── views/
│   ├── partials/
│   │   ├── header.ejs
│   │   ├── footer.ejs
│   │   ├── application-list.ejs
│   │   └── feedback-list.ejs
│   ├── index.ejs
│   ├── signup.ejs
│   ├── login.ejs
│   ├── forgot-password.ejs
│   ├── reset-password.ejs
│   ├── message.ejs
│   ├── listing-create.ejs
│   ├── listing-detail.ejs
│   ├── application-create.ejs
│   ├── tenant-dashboard.ejs
│   ├── tenant-applications.ejs
│   ├── tenant-feedback.ejs
│   ├── landlord-dashboard.ejs
│   ├── landlord-applications.ejs
│   ├── landlord-feedback.ejs
│   └── superadmin-dashboard.ejs
├── public/
│   ├── css/styles.css
│   ├── js/main.js
│   └── images/
│       ├── mark.svg
│       └── bhutan-home.png
├── uploads/                  # empty at delivery; automatically created if missing
├── database/schema.sql
├── tests/application.test.js
├── app.js
├── .env                      # placeholders only; ignored by Git
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── VERIFICATION.md
```

## Common problems

| Problem | Simple fix |
| --- | --- |
| `npm` not recognized | Install Node.js, then close/reopen VS Code. |
| PowerShell blocks `npm.ps1` | Use `npm.cmd install` / `npm.cmd run dev`, or choose Command Prompt as the terminal. |
| ENOENT / package.json missing | Open the inner drukhousing folder and run commands there. |
| PostgreSQL password authentication failed | Check DB_USER and DB_PASS; use the database password. |
| Database does not exist | Create `drukhousing` in pgAdmin first. |
| Relation users/listings does not exist | Run schema.sql in the correct database. |
| MongoDB ECONNREFUSED | Start the MongoDB service; Compass alone is not the database. |
| App password unavailable | Check Google's app-password requirements; some managed accounts restrict this. |
| Signup email not received | Check Spam, GMAIL_USER/app password, internet and terminal errors; follow the failed-signup recovery above. |
| Login rejected | Verify the emailed link first; use the correct password. The error intentionally does not reveal account details. |
| Reset link expired | Request a new link. Use the newest email. |
| Form expired | Reload the form; sessions are cleared when the development server restarts. |
| Port 3000 busy | Stop another local server, or change `PORT` and `BASE_URL`. |
| No homes shown | Create an active listing with a future deadline. |

All displayed deadlines use **Bhutan time (Asia/Thimphu, UTC+06:00)**. Listing price means **monthly rent** and lease duration means **whole years**. Documents and notes are optional. No real account details are included in this download.

This is a local coursework application, following Campus Eats. It uses express-session's in-memory store, so logins reset on restart. Publishing it publicly would require a persistent session store, HTTPS and production configuration; that is outside this requested local VS Code deliverable.

## Official documentation

- Express error handling: https://expressjs.com/en/guide/error-handling.html
- Multer uploads: https://expressjs.com/en/resources/middleware/multer/
- MongoDB driver connection pools: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/
- MongoDB Community installation on Windows: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/
- Google app passwords: https://support.google.com/accounts/answer/185833
- pg-promise transactions: https://vitaly-t.github.io/pg-promise/Database.html#tx

## Image source

`public/images/bhutan-home.png` was created with the built-in image-generation tool for this project. Brief: a modest traditional Bhutanese residential home near Paro, white walls, painted timber windows, maroon/ochre details, green mountain valley, warm natural morning light, no people or text. It is used only as decorative website imagery. Actual listing photos come from landlords.
