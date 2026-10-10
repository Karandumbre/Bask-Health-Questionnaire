# KaranBaskHealth

Bask Intake Builder is a full-stack take-home project for a fictional weight-loss care service, designed for both administrators and patients.

## Code quality

- Run `npm run format` to format all supported files with Prettier.
- Run `npm run format:check` to check formatting without changing files.
- Husky runs ESLint before each commit and rejects commit messages that do not follow [Conventional Commits](https://www.conventionalcommits.org/).

Commit messages must use `type(scope): description` (scope is optional). Common types include `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore`, and `revert`.

Examples:

```text
feat(forms): add conditional question rules
fix: prevent stale draft saves
```
