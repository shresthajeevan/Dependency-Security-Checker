# Dependency Security Checker - Frontend

This is the frontend component of the Dependency Security Checker application. It provides a user interface for uploading dependency files (package.json or requirements.txt) and displays vulnerability and maintenance status information.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the frontend server:
```bash
npm start
```

The frontend will run on http://localhost:3000 by default.

## Development

To run in development mode:
```bash
npm run dev
```

## Important Notes

- Make sure the backend server is running on port 5000 before using the application
- The frontend communicates with the backend API at http://localhost:5000/api 