# ENSI Summer Internship Portal

A full-stack web application for searching, filtering, saving, and tracking summer internship opportunities. The backend reads internship data from `summer_internship.xlsx`, enriches it with parsed location and company metadata, and exposes a FastAPI API consumed by a React dashboard.

## Features

- Dashboard with internship, application, and favorite counts
- Internship search by company, subject, specialty, location, and keywords
- Advanced filters for country, city, governorate, specialty, priority, and company type
- CV skill extraction and skill-based internship matching
- Favorites management
- Application tracking with CV and motivation letter uploads
- Bulk email preparation for selected companies

## Tech Stack

Backend:
- Python
- FastAPI
- Uvicorn
- Pandas
- SQLite

Frontend:
- React
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- Lucide React icons

## Project Structure

```text
CS_Internship_TN/
|-- backend/
|   |-- main.py
|   |-- applications.db
|   `-- uploads/
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |-- package.json
|   `-- vite.config.js
|-- summer_internship.xlsx
|-- data_check.txt
`-- README.md
```

## Prerequisites

- Python 3.10 or newer
- Node.js and npm

## Backend Setup

From the project root:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn pandas openpyxl python-multipart pydantic
```

Optional packages for CV text extraction:

```bash
pip install PyPDF2 python-docx
```

Start the API:

```bash
python main.py
```

The backend runs at:

```text
http://localhost:8000
```

Interactive API documentation is available at:

```text
http://localhost:8000/docs
```

## Frontend Setup

Open a second terminal from the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

The frontend currently calls the backend directly at `http://localhost:8000`, so keep the backend running while using the app.

## Data And Storage

- `summer_internship.xlsx` is the source dataset for internship listings.
- `backend/applications.db` stores applications, favorites, and the user profile.
- `backend/uploads/` stores uploaded CV and motivation letter files.

The Excel file is expected to include these columns:

- `ID`
- `Nom de l'entreprise`
- `Adresse`
- `Telephone`
- `Fax`
- `Email entreprise`
- `Specialite(s)`
- `Score`
- `Priority`
- `Tailored angle`
- `Subject`

## API Endpoints

- `GET /api/internships` - list, search, filter, sort, and enrich internships
- `GET /api/search-suggestions` - return search suggestions
- `GET /api/profile` - get saved user profile
- `POST /api/profile` - save user skills and preferences
- `POST /api/extract-skills` - extract skills from an uploaded CV
- `GET /api/favorites` - list favorites
- `POST /api/favorites` - add or replace a favorite
- `DELETE /api/favorites/{internship_id}` - remove a favorite
- `GET /api/applications` - list applications
- `POST /api/applications` - submit an application
- `PUT /api/applications/{app_id}` - update application status or notes
- `DELETE /api/applications/{app_id}` - delete an application
- `POST /api/send-bulk-email` - simulate bulk email preparation

## Development Commands

Frontend linting:

```bash
cd frontend
npm run lint
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Notes

- CORS is currently open in the FastAPI app for local development.
- Bulk email sending is simulated by the API; it does not send real emails.
- Uploaded documents and the SQLite database are local development artifacts and should not be committed if they contain personal data.
