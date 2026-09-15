# RosterUp

RosterUp is our SIT725 group project for making shift swaps easier. Instead of
asking “Can anyone take my shift?” in the group chat and watching the message
get buried, employees can post an open shift and someone else can claim it.
Managers can approve the change, and everyone knows who is working without
scrolling through a hundred messages.

## Project status

RosterUp is currently in Sprint 1, which means the plan is real, the team is
building, and a few buttons may still be imaginary. It is not ready for a real
workplace just yet.

`main` is our protected and reviewed version of the project.
`sprint1-integration` is where the completed Sprint 1 pieces come together for
testing. Everyone works on a separate feature branch and opens a pull request
before their work joins the rest of the application. The scaffold is still
under construction, so the full app may not run until the remaining routes and
screens are connected.

Before starting development, have a quick look at
[CONTRIBUTING.md](CONTRIBUTING.md). Before opening or merging a pull request,
check [docs/MERGE_GUIDE.md](docs/MERGE_GUIDE.md). Future you and the rest of the
team will appreciate it.

## Core workflow

```text
Register or sign in
        |
        v
Create or join a workplace
        |
        v
Manager approves employee access
        |
        v
Employee posts a shift for cover
        |
        v
Coworker submits a claim
        |
        v
Manager approves or rejects the claim
        |
        v
Shift status and history are updated
```

## Users

### Manager

- Register and sign in as a manager.
- Create a workplace and receive an invite code.
- Approve or reject employee join requests.
- Review pending shift claims.
- Approve or reject shift-cover requests.
- View employees, shifts, and shift history.

### Employee

- Register and sign in as an employee.
- Join a workplace using its invite code.
- View upcoming and open shifts.
- Post a shift for cover.
- Claim an open shift.
- View claim outcomes and shift history.
- Withdraw an unclaimed posted shift.

## Approved scope

The Software Requirements Specification (SRS) is the source of truth for
project scope. Sprint work must map to an approved functional requirement or
use case.

The first version covers:

- Authentication and role-based access.
- Workplace creation and employee onboarding.
- Employee approval by a manager.
- Shift posting and open-shift browsing.
- Shift claims and manager approval.
- Shift status and history.
- Basic profile and workplace management.

The first version does not attempt to provide payroll, timesheets, leave
management, award interpretation, or unrelated chat functionality.

## Architecture

```text
Responsive web interface
          |
          v
Node.js and Express application
          |
          v
MongoDB database through Mongoose
```

The server is organised into routes, controllers, services, and Mongoose
models. Authentication, users, workplaces, shifts, and approvals should remain
separate modules so team members can work without unnecessary overlap.

## Technology

- Node.js 18 or newer
- Express
- MongoDB
- Mongoose
- HTML, CSS, and client-side JavaScript

## Local development

Clone the repository and switch to the active Sprint 1 integration branch:

```bash
git clone https://github.com/sahancz/rosterup-sit725.git
cd rosterup-sit725
git switch sprint1-integration
npm install
```

Create your feature branch from the latest integration branch:

```bash
git pull --ff-only
git switch -c feature/<trello-card>-<short-description>
```

Run the available tests before opening a pull request:

```bash
npm test
```

Database environment variables and the final start command will be documented
when the database configuration card is completed. Never commit `.env` files,
passwords, connection strings, or other secrets.

## Development workflow

1. Claim a Trello card before beginning work.
2. Confirm that the card maps to the approved SRS.
3. Create a branch from `sprint1-integration`.
4. Make focused commits under your own GitHub account.
5. Test your change locally.
6. Open a pull request into `sprint1-integration`.
7. Address review comments and conflicts.
8. Merge only after approval.
9. Merge the integration branch into `main` only when the complete Sprint 1
   application has been reviewed and verified.

Direct pushes, force pushes, and deletion of `main` are blocked.

## Project documentation

- [Contribution guide](CONTRIBUTING.md)
- [Branch and merge guide](docs/MERGE_GUIDE.md)
- [Pull-request template](.github/pull_request_template.md)
- [GitHub contributors](https://github.com/sahancz/rosterup-sit725/graphs/contributors)

## Licence

This student project is currently distributed under the ISC licence declared
in `package.json`.
