Generate exactly one commit message for the staged changes, following Conventional Commits.

Format the first line as `type(scope): description` (scope is optional). Use a valid
Conventional Commit type such as feat, fix, docs, style, refactor, perf, test, build, ci,
chore, or revert. Keep the description lowercase after the colon, imperative, and concise.
Do not end the subject with a period.

If useful, add one blank line followed by a concise body summarizing the changes. Keep every
body line at or below 100 characters. Do not add multiple commit subjects, markdown fences,
or commentary outside the commit message.

Return only the commit message. Ensure the subject and body describe the staged changes,
not unrelated working-tree changes.
