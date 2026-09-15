# RosterUp

SIT725 group project — shift-cover coordination platform.

## Running with Docker

This section gives complete, step-by-step instructions to build and run this application from scratch. No steps beyond having Docker installed are required.

### Prerequisites
- Docker Desktop installed and running (includes Docker Compose)
- This repository cloned to your machine
- Ports 3000 and 27017 free

### Setup & Run

1. Open a terminal in the project root.
2. Create the environment file (required — the app won't start without it):

`cp .env.example .env`

3. Build and start the app:

```docker compose up -d --build```

   Wait for `Server is running on http://localhost:3000` in the terminal. To run in the background instead: `docker compose up --build -d`.
4. Confirm both containers are up:

```docker ps```


### Access the App
Open: `http://localhost:3000`

### Verify the Student Endpoint

`curl http://localhost:3000/api/student`

Expected response:
```json
{
  "statusCode": 200,
  "data": {
    "name": "Tim Smith",
    "studentId": "223512028"
  },
  "message": "Success"
}
```

### Stop

```docker compose down```

(add `-v` to also wipe the database volume)

### Troubleshooting
- **"env file .env not found":** run `cp .env.example .env` first.
- **Containers stop when terminal closes:** use `docker compose up --build -d`.
- **Port already in use:** free port 3000/27017, or change the host-side port in `docker-compose.yml`.
- **App exits shortly after starting:** `docker compose down` then `docker compose up --build -d`.
