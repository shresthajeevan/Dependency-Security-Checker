# Dependency Security Checker

A web application that checks dependencies for vulnerabilities and maintenance status. The application scans package.json (for npm) and requirements.txt (for Python) files to identify potential security vulnerabilities, outdated packages, and unmaintained dependencies.

## Project Structure

This project is divided into two main components:

1. **Frontend** - React-based web interface (runs on port 3000)
2. **Backend** - Node.js API server (runs on port 5000)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the backend server:
```bash
npm start
```

The backend server will run on http://localhost:5000.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend server:
```bash
npm start
```

The frontend will be available at http://localhost:3000.

## Features

- Upload package.json or requirements.txt files
- Scan dependencies for security vulnerabilities using OSV.dev API
- Check for outdated packages
- Analyze maintenance status using GitHub repository activity
- Filter results by vulnerability, outdated status, or maintenance
- Download security reports in JSON format

## Technologies Used

- **Frontend**: React, TailwindCSS, Chart.js
- **Backend**: Node.js, Express
- **APIs**: OSV.dev, GitHub API, npm registry, PyPI 