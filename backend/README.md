# Dependency Security Checker - Backend

This is the backend API component of the Dependency Security Checker application. It provides APIs for checking dependency vulnerabilities and maintenance status.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the backend server:
```bash
npm start
```

The server will run on http://localhost:5000 by default.

## Development

To run in development mode with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Check Dependencies
- **URL**: `/api/check-dependencies`
- **Method**: POST
- **Body**:
  ```json
  {
    "fileContent": "Content of package.json or requirements.txt as string",
    "fileType": "npm or pip"
  }
  ```
- **Response**: Array of dependencies with vulnerability and maintenance information

### Health Check
- **URL**: `/api/health`
- **Method**: GET
- **Response**: 
  ```json
  {
    "status": "healthy"
  }
  ``` 