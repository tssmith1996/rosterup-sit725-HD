# RosterUp Branch and Merge Guide

This guide defines how Sprint work moves from an individual contributor into
the protected `main` branch.

## Branch roles

| Branch | Purpose | Normal merge target |
|---|---|---|
| `main` | Protected, reviewed project baseline | None |
| `sprint1-integration` | Combines reviewed Sprint 1 features for full testing | `main` |
| Feature branch | Contains one member's focused Trello work | `sprint1-integration` |

`main` must not be used as a shared scratch branch. The integration branch may
temporarily contain incomplete Sprint work, but every addition must still be
reviewed through a pull request.

## Feature merge process

### 1. Update the branch base

```bash
git switch sprint1-integration
git pull --ff-only
git switch -c feature/<trello-card>-<short-description>
```

### 2. Implement and verify

- Change only files required by the claimed card.
- Add or update tests where practical.
- Run `npm test`.
- Manually verify the changed flow.
- Review `git diff` and `git status` before committing.

### 3. Push and open a pull request

```bash
git push -u origin feature/<trello-card>-<short-description>
```

Open the pull request with:

- Base: `sprint1-integration`
- Compare: the contributor's feature branch

Complete every section of the pull-request template.

### 4. Review

The reviewer checks:

- The pull request contains only the intended member's work.
- The implementation matches the referenced SRS requirement.
- Required validation, authorisation, and error handling are present.
- Tests pass and the changed user flow works.
- No secrets, generated dependencies, or unrelated files are committed.
- The change does not break existing integration behaviour.

If changes are required, the author pushes fixes to the same feature branch.
The pull request updates automatically.

### 5. Merge into integration

Merge only when:

- The branch is up to date or conflicts are resolved.
- Required review comments are resolved.
- The feature works independently.
- The pull request clearly records the author's contribution.

Prefer a merge commit when preserving the contributor's meaningful commit
history helps demonstrate group contributions. Do not merge a draft pull
request.

## Integration merge into main

The Sprint integration branch may be proposed for `main` only after the group
has completed the Sprint acceptance checks.

### Required checks

- The application installs from the declared dependencies.
- The server starts without route, dependency, or database errors.
- Automated tests pass.
- Registration and sign-in work.
- Workplace creation and employee joining work.
- Employee approval works.
- Shift posting, browsing, and claiming work.
- Manager claim approval works.
- Status and history updates are retained.
- Core screens work at desktop and mobile widths.
- No secrets or local configuration files are present.
- README and setup instructions match the implemented application.

The pull request into `main` requires at least one approval and all review
conversations must be resolved. Force pushing and deleting `main` are blocked.

## Resolving conflicts

1. Do not delete another member's code merely to make a conflict disappear.
2. Identify which requirement each side implements.
3. Ask the affected authors when the correct combined behaviour is unclear.
4. Resolve and test the conflict on the feature branch or integration branch.
5. Record any important decision in the pull request.

## If a merge breaks integration

Do not hide or force-push away the history. Open a focused fix or revert pull
request, explain the failure, and link the original pull request and Trello
card. This keeps the project history understandable and recoverable.
