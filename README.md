# CS Internship Finder

A full-stack web application for discovering and managing internship opportunities.

## Project Overview

CS Internship Finder is a platform that connects students with internship opportunities. The application provides features for browsing internships, submitting applications, and managing your internship portfolio.

## Project Structure

```
CS_Internship_TN/
├── backend/
│   ├── main.py
│   └── uploads/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── FindInternships.jsx
│   │   │   └── MyApplications.jsx
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── README.md
└── README.md
```

## Tech Stack

### Backend
- **Python** - Backend server
- Framework and dependencies managed in `main.py`

### Frontend
- **React** - UI library
- **Vite** - Build tool and development server
- **ESLint** - Code linting

## Getting Started

### Prerequisites
- Python 3.x
- Node.js and npm

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies (ensure you have a virtual environment):
   ```bash
   # Create a virtual environment (optional but recommended)
   python -m venv venv
   
   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install required packages and start the server:
   ```bash
   python main.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The frontend will typically be available at `http://localhost:5173` (Vite default)

## Features

- **Find Internships**: Browse and search available internship opportunities
- **My Applications**: Track and manage your internship applications
- **File Uploads**: Submit documents and portfolios

## Development

### Running Both Backend and Frontend

To run the full application:

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

### Linting

To check code quality in the frontend:
```bash
cd frontend
npm run lint
```

## API Integration

The frontend communicates with the backend API. Ensure the backend server is running before starting the frontend development server.

## Contributing

1. Create a feature branch for your changes
2. Make your commits with clear messages
3. Run linting checks before submitting code
4. Submit a pull request with a description of your changes

## File Upload

The `uploads/` directory in the backend stores uploaded files. Ensure proper permissions are set for this directory.

## License

This project is part of the CS Internship program.

## Support

For questions or issues, please reach out to the project maintainers.
