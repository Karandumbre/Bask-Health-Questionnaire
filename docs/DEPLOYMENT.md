# Deployment

## Hosting and environment isolation

Deploy the Next.js application on Vercel and use Supabase for PostgreSQL and Auth. Configure production deployments from `main` and preview deployments for pull requests. Repository linkage and hosted-flow checks remain pending.

Use separate Supabase projects for the hosted application, previews, and disposable database tests. Preview deployments must not connect to the production database. Keep test authentication disabled on Vercel.

## Application settings

Configure these variables separately for each Vercel environment:

| Variable                               | Purpose                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Auth project URL                                                                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase publishable key                                                           |
| `DATABASE_URL`                         | Application PostgreSQL connection; use the transaction pooler for serverless requests     |
| `DATABASE_DIRECT_URL`                  | Direct or session-pooler connection for migrations                                        |
| `APP_SESSION_PEPPER`                   | Independent high-entropy secret, at least 32 characters, for patient session cryptography |
| `APP_ENV`                              | Environment classification; set to `production` for the hosted application                |

Public intake links use the application's origin and published slug. Confirm HTTPS, database TLS settings, and provider storage-encryption guarantees as described in the [README](../README.md#security-and-deployment).

## Database migrations

Migrations live in `db/migrations/`. `npm run db:migrate` calls the shared migration engine, which uses advisory locking and checksums. Migrations do not run during the Vercel build.

1. Define schema changes in `src/lib/db/schema.ts` and generate SQL with `npm run db:generate`.
2. Inspect the migration and run it against a designated development or disposable database.
3. Configure GitHub environments named `preview` and `production`, with their own database secrets and approval rules.
4. Run the [controlled migration workflow](../.github/workflows/db-migrate.yml), select the target environment, and supply its required `APPLY` confirmation.
5. Coordinate application deployment with the schema change and check the hosted flow afterward.

The workflow reads `DATABASE_DIRECT_URL` and `DATABASE_URL` from the selected GitHub environment. Confirm the target and backup/recovery plan before applying a hosted migration.

## CI and disposable tests

The [CI workflow](../.github/workflows/ci.yml) runs lint, type checking, unit tests, and a production build. Database integration runs when `TEST_DATABASE_URL` is configured and the existing safety guard approves the disposable target. It also uses `TEST_DATABASE_DIRECT_URL`, `APP_SESSION_PEPPER`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from GitHub secrets. Use test-project settings for this suite.

The build uses placeholder configuration. Browser E2E tests run separately against an approved disposable database; they must not run against the reviewer deployment.

## Hosted checks

- Sign in with a real reviewer account and check anonymous and cross-workspace access restrictions.
- Publish an intake and complete start, save, cross-browser resume, and submission flows.
- Check the administrator response list and details, including an older published version.
- Confirm cookie security, test-auth exclusion, origin checks, and database transport settings.
- Add the deployment and published intake URLs to the README and share reviewer credentials privately.
