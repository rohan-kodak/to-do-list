# To-Do App

This is a task management application prepared for Rohan Sodnawar's internship project. It lets a user create an account, sign in, and manage personal tasks in one place.

## What the app can do

- Create an account and sign in with a username, email, and password
- Add a task with an optional description and due date
- Edit a task, mark it as complete, or delete it
- Search tasks and filter the list by status
- View total, pending, and completed task counts
- Choose an olive-green or light-gray theme and turn motion effects on or off
- Save task data in MongoDB, separately for each account

## Technologies used

- React and Vite for the user interface
- Node.js and Express for the API
- MongoDB and Mongoose for storing accounts and tasks
- Node.js `scrypt` for password hashing

## What you need

- Node.js LTS
- MongoDB running on your computer, or a MongoDB Atlas connection string

The app does not need an external dataset. Users enter their own tasks.

## Run on Windows

1. Install Node.js LTS and make sure MongoDB is running.
2. Open the project folder and double-click `setup-windows.bat`. Wait for setup to finish.
3. Double-click `run-windows.bat` to start the app.
4. Open `http://127.0.0.1:5180` in your browser.

If using MongoDB Atlas, open `server/.env` and set `MONGODB_URI` to your own connection string before starting the app. Keep this file private. Do not upload it to GitHub.

## Run from a terminal

From the project folder, install the dependencies:

```bash
npm install
npm run install:all
```

Make sure MongoDB is running, then start the development servers:

```bash
npm run dev
```

The Vite development page is at `http://127.0.0.1:5174`. On Windows, `run-windows.bat` starts the production preview at `http://127.0.0.1:5180`.

## API routes

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Get the signed-in account |
| `GET` | `/api/todos` | List the account's tasks |
| `POST` | `/api/todos` | Add a task |
| `PATCH` | `/api/todos/:id` | Edit or complete a task |
| `DELETE` | `/api/todos/:id` | Delete a task |

The API runs at `http://localhost:5000`. Its health check is `http://localhost:5000/api/health`.

## Run the server checks

From the `server` folder, run:

```bash
npm test
```

These checks cover password hashing and session-token validation. They do not replace testing the app with a running MongoDB database.

## Project files

- `client/` — React user interface
- `server/` — Express API, MongoDB models, and server checks
- `report/` — internship project report
- `presentation/` — project presentation

## Before sharing this repository

- Do not upload `server/.env`, database credentials, or passwords. The `.gitignore` file excludes `.env` files.
- Start the app and check adding, editing, completing, deleting, searching, and filtering tasks.
- Confirm that task data is saved after a page refresh.
- Add your own project screenshots and complete the student and institute details in the report and presentation.

## Project author

Rohan Sodnawar

Review this README and update it if your final project or the features you demonstrated differ from the description above.
