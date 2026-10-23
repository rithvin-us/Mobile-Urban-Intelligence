## What this changes

<!-- One or two sentences. What behaviour is different after this merges? -->

## Why

<!-- The problem, bug, or requirement behind it. Link the issue if there is one. -->

Closes #

## How it was verified

<!-- Tick what you actually ran, and paste the result for anything surprising. -->

- [ ] `ruff check apps/api --ignore E501`
- [ ] `cd apps/api && pytest`
- [ ] `pnpm --filter web type-check`
- [ ] `pnpm --filter web build`
- [ ] `pytest edge/test_detector.py`
- [ ] Verified by hand against a running stack

## Checklist

- [ ] Commit messages follow Conventional Commits
- [ ] No secrets, API keys or `.env` files are included
- [ ] Generated artefacts (figures, annotated video, build output) stay untracked
- [ ] `CHANGELOG.md` updated under `[Unreleased]` if this is user-visible
- [ ] Documentation updated if behaviour or setup changed
