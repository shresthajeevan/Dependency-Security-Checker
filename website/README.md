# Dependency Security Checker

A web application that checks your project dependencies for security vulnerabilities, maintenance status, and outdated packages.

## Features

- Upload `package.json` (Node.js) or `requirements.txt` (Python) files
- Check security vulnerabilities using the OSV.dev API
- Check package maintenance status using GitHub API
- Display results in a user-friendly report with filtering options
- Export/download the report as JSON

## Technologies Used

- Frontend: HTML, TailwindCSS, React (without build tools)
- Backend: Node.js, Express
- APIs: OSV.dev, GitHub API, npm Registry, PyPI

## Installation

1. Clone the repository:
```
git clone <repository-url>
cd dependency-security-checker
```

2. Install dependencies:
```
npm install
```

3. Start the server:
```
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Development

To run in development mode with auto-reloading:
```
npm run dev
```

## API Endpoints

### POST /api/check-dependencies

Checks dependencies for vulnerabilities and maintenance status.

Request body:
```json
{
  "fileContent": "content of package.json or requirements.txt",
  "fileType": "npm" or "pip"
}
```

Response:
```json
[
  {
    "name": "package-name",
    "version": "1.0.0",
    "latestVersion": "1.2.0",
    "isOutdated": true,
    "vulnerabilities": [
      {
        "id": "vulnerability-id",
        "summary": "vulnerability description"
      }
    ],
    "maintenance": {
      "repoUrl": "https://github.com/owner/repo",
      "lastCommit": "2023-05-15",
      "status": "active"
    }
  }
]
```

## Limitations

- GitHub API has rate limits, which might affect checking many packages
- Some packages might not have GitHub repositories or might have repositories on other platforms

## License

MIT 