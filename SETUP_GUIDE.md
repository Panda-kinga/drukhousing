# DrukHousing setup guide

This guide is for local development and testing. Never commit `.env` or `.env.test`.

## 1. Create the databases

Create these PostgreSQL databases in pgAdmin:

- `drukhousing` for local development
- `drukhousing_test` for Jest tests

Create a MongoDB database for feedback. MongoDB creates it when the first feedback document is saved. Use a separate test name such as `drukhousing_test_feedback`.

## 2. Create the tables

In pgAdmin, select the correct database and run [database/schema.sql](./database/schema.sql). Then run these files in order:

1. [migrations/001_roles.sql](./migrations/001_roles.sql)
2. [migrations/002_user_status.sql](./migrations/002_user_status.sql)
3. [migrations/003_locations.sql](./migrations/003_locations.sql)

Run the schema and all migrations in both PostgreSQL databases. The migrations are safe to run again because they use idempotent changes. They do not delete existing listings or users.

The location migration adds nullable `dzongkhag` and `gewog` columns to `listings`. Existing listings continue to work until their location is edited or backfilled.

## 3. Configure the environment

Copy the example file in PowerShell:

```powershell
Copy-Item .env.example .env
```

Set your own values in `.env`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Local server port, normally `3000`. |
| `BASE_URL` | Site URL used in email links, with no trailing slash. |
| `DB_HOST` | PostgreSQL host. |
| `DB_PORT` | PostgreSQL port, normally `5432`. |
| `DB_NAME` | PostgreSQL database name. |
| `DB_USER` | PostgreSQL user. |
| `DB_PASS` | PostgreSQL password. |
| `DB_SSL` | Set `true` for Neon; use `false` locally. |
| `MONGO_URI` | MongoDB connection string. |
| `MONGO_DB_NAME` | MongoDB database used for feedback. |
| `SESSION_SECRET` | Long random value for sessions. |
| `GMAIL_USER` | Gmail address used to send email. |
| `GMAIL_APP_PASSWORD` | Gmail app password. |
| `MAIL_FROM_NAME` | Visible sender name, normally `DrukHousing`. |

## 4. Install and run the app

```powershell
npm install
npm run dev
```

Open `http://localhost:3000` in a browser. For a normal start without nodemon, run `npm start`.

## 5. Create a super admin

Super admins cannot be created from the signup form. Run this command and answer the prompts:

```powershell
npm run create-admin
```

Use a new email address, or remove an unused unverified duplicate account in pgAdmin before trying again. The password must contain at least 8 characters.

## 6. Run the tests

Copy the test environment file:

```powershell
Copy-Item .env.test.example .env.test
npx jest
npx jest --coverage
```

Tests use `drukhousing_test` and the MongoDB database named by `MONGO_DB_NAME` in `.env.test`. Test data is removed by each suite. Keep the test database separate from `drukhousing`.

## 7. Location dropdowns

[data/bhutanLocations.js](./data/bhutanLocations.js) contains the 20 Dzongkhags and their confirmed Gewogs. The public form loads the data from `GET /api/locations`. Selecting a Dzongkhag enables only its Gewogs. The server validates both values again, so changing the browser form cannot submit an invalid pairing.

Listings store the home name, street or landmark in `location`, and store the selected Dzongkhag and Gewog in their own columns. Search accepts Dzongkhag, Gewog, and home-name filters.

## 8. Deployment files

For Render, Neon, and MongoDB Atlas instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md). The included [Dockerfile](./Dockerfile) uses Node 20 Alpine and starts [server.js](./server.js) on port 3000.
