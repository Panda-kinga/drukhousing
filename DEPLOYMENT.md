# DrukHousing deployment

This guide prepares the app for Render, Neon PostgreSQL and MongoDB Atlas. It does not deploy anything automatically.

## 1. Prepare the databases

1. Create a Neon PostgreSQL project and database.
2. Open the Neon SQL editor.
3. Run `database/schema.sql` in a new database.
4. Run each migration in order: `001_roles.sql`, `002_user_status.sql`, and `003_locations.sql`.
5. Keep the Neon connection details ready for Render.

For MongoDB:

1. Create a MongoDB Atlas cluster.
2. Create a database user with a strong password.
3. Add the required Render network access rule in Atlas. Allow the address range recommended by your security policy.
4. Copy the Atlas connection string and URL-encode special characters in the password.
5. The feedback database is created when the app first writes to it.

## 2. Environment variables on Render

Add these variables in the Render service settings. Use your own values; never commit them to GitHub.

| Variable | Purpose |
| --- | --- |
| `PORT` | Render supplies the port; `3000` is suitable locally. |
| `BASE_URL` | The public site URL, added after the first deploy. |
| `DB_HOST` | Neon PostgreSQL host. |
| `DB_PORT` | Usually `5432`. |
| `DB_NAME` | Neon database name. |
| `DB_USER` | Neon database user. |
| `DB_PASS` | Neon database password. |
| `DB_SSL` | Set to `true` for Neon. |
| `MONGO_URI` | MongoDB Atlas connection string. |
| `MONGO_DB_NAME` | Feedback database name, for example `drukhousing_feedback`. |
| `SESSION_SECRET` | Long random secret used to protect login sessions. |
| `GMAIL_USER` | Gmail address used to send mail. |
| `GMAIL_APP_PASSWORD` | Gmail app password, not the normal Gmail password. |
| `MAIL_FROM_NAME` | Visible sender name, such as `Campus Eats`. |

## 3. Deploy from GitHub

1. Push the project to GitHub without `.env`, `.env.test`, passwords or connection strings.
2. In Render, create a new Web Service from the GitHub repository.
3. Choose the Docker runtime. Render will use the included `Dockerfile`.
4. Add all environment variables above except `BASE_URL` if the public URL is not known yet.
5. Deploy and wait for the service to become healthy.
6. Add `BASE_URL` using the exact Render public URL, with no trailing slash.
7. Redeploy after saving `BASE_URL`.

## 4. Post-deploy checklist

- Sign up and confirm the verification link opens the live site.
- Log in as a tenant and as a landlord.
- Create a listing and send an inquiry.
- Accept an inquiry and submit feedback.
- Read the Render logs for startup, database or email errors.
- Create the first super admin from a secure terminal with `npm run create-admin` using the production database connection only when ready.
