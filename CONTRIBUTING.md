# Contributing to RosterUp

RosterUp is a group project. The goal of this workflow is to make every
member's contribution visible while preventing duplicate work and broken code
from reaching `main`.

## Before starting

1. Read the relevant SRS requirement or use case.
2. Claim the corresponding Trello card.
3. Tell the group which card you claimed.
4. Check that another member is not already changing the same files.
5. Pull the latest integration branch before creating your branch.

Do not add a feature solely because it appears useful. New scope must first be
agreed by the group and reflected in the SRS or Sprint plan.

## Branches

Create feature branches from `sprint1-integration`, not from another
member's feature branch.

Use a clear branch name:

```text
feature/<trello-card>-<short-description>
fix/<trello-card>-<short-description>
docs/<short-description>
```

Examples:

```text
feature/31-create-workplace
feature/47-open-shifts-ui
fix/43-shift-model-validation
```

## Commits

- Commit using your own GitHub identity.
- Keep each commit focused on one meaningful change.
- Use a short, action-based subject such as `Implement open-shifts endpoint`.
- Do not commit `node_modules`, `.env`, passwords, database credentials,
  editor settings, or unrelated files.
- Do not rewrite another member's published branch without their agreement.

## Testing

Before opening a pull request:

1. Install declared dependencies with `npm install`.
2. Run `npm test`.
3. Start the application when the current integration branch supports it.
4. Manually test the changed user flow.
5. Check the browser console and server output for errors.
6. Confirm that no unrelated files changed.

If the full application cannot run because of an unfinished dependency, test
your module independently and explain the dependency in the pull request.

## Pull requests

Feature pull requests must normally target `sprint1-integration`.

Every pull request must include:

- A concise summary of the completed behaviour.
- The Trello card and SRS requirement IDs.
- Testing performed and its result.
- Screenshots for visible interface changes.
- Any dependency on another unfinished branch or card.
- A statement confirming that no secrets were committed.

Do not include another member's unrelated work in your pull request. If the
GitHub comparison shows unexpected commits, stop and correct the branch base
before requesting review.

## Reviews

- At least one approval is required before merging into `main`.
- Resolve all review conversations before merging.
- Authors should fix problems on their own branches.
- Review comments should explain the problem and expected behaviour without
  attacking the contributor.
- Reviewers must run or inspect the code rather than approving from the title
  alone.

The detailed process is documented in
[docs/MERGE_GUIDE.md](docs/MERGE_GUIDE.md).
