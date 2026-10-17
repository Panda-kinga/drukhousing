# Verification

## Completed in the build environment

- Installed the declared Node.js dependencies and generated package-lock.json.
- Parsed JavaScript source with `node --check`.
- Passed `npm test`: 19 scenario subtests and their parent test (20 total).
- Executed the real schema and model SQL against PGlite's in-memory PostgreSQL engine, including CHECK constraints, foreign keys, role triggers and transaction rollback.
- Compiled all 20 EJS page/partial templates.
- Exercised Express routes, session cookies, CSRF tokens, EJS rendering, multipart uploads and authorized downloads through Supertest.
- Tested verification/reset token behavior with captured emails rather than sending real messages.
- Tested scoped feedback reads and duplicate responses with an in-memory MongoDB substitute.
- Checked that files from failed uploads and rolled-back applications are removed.

## Still needs local verification

- Real PostgreSQL connection with your own DB credentials and pgAdmin instance.
- Real MongoDB Community Server connection, Compass visibility, and enforcement of the compound unique index by MongoDB itself.
- Real Gmail delivery using your app password, including Spam placement.
- Browser visual checks at desktop and phone widths. EJS routes rendered during automated tests, but a browser preview was unavailable in the build environment.

No real emails were sent, no real users were created, and no external site was published. The automated checks do not substitute for the local end-to-end steps in README.md.
