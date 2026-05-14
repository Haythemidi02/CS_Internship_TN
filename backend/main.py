from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import json
import os
import sqlite3
import shutil
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="ENSI Summer Internship API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(__file__)
EXCEL_FILE_PATH = os.path.join(BASE_DIR, "..", "summer_internship.xlsx")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "applications.db")

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            internship_id TEXT NOT NULL,
            company_name TEXT NOT NULL,
            status TEXT DEFAULT 'Sent',
            date_applied TEXT NOT NULL,
            cv_filename TEXT,
            motivation_filename TEXT,
            notes TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            internship_id TEXT NOT NULL UNIQUE,
            company_name TEXT NOT NULL,
            email TEXT,
            specialties TEXT,
            date_added TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

@app.get("/api/internships")
def get_internships(
    search: str = "",
    location: str = "",
    priority: str = "",
    specialty: str = "",
    sort_by: str = "score",
    sort_order: str = "desc"
):
    try:
        df = pd.read_excel(EXCEL_FILE_PATH)
        df = df.fillna("")

        column_mapping = {
            "ID": "id",
            "Nom de l'entreprise": "company_name",
            "Adresse": "address",
            "Telephone": "phone",
            "Fax": "fax",
            "Email entreprise": "email",
            "Specialite(s)": "specialties",
            "Score": "score",
            "Priority": "priority",
            "Tailored angle": "tailored_angle",
            "Subject": "subject"
        }

        df = df.rename(columns=column_mapping)
        records = df.to_dict(orient="records")

        # Apply filters
        if search:
            search_lower = search.lower()
            records = [r for r in records if search_lower in str(r.get('company_name', '')).lower() or search_lower in str(r.get('subject', '')).lower() or search_lower in str(r.get('specialties', '')).lower()]

        if location:
            records = [r for r in records if location.lower() in str(r.get('address', '')).lower()]

        if priority:
            records = [r for r in records if str(r.get('priority', '')).lower() == priority.lower()]

        if specialty:
            records = [r for r in records if specialty.lower() in str(r.get('specialties', '')).lower()]

        # Sort
        if sort_by == "score":
            records.sort(key=lambda x: float(x.get('score', 0) or 0), reverse=(sort_order == "desc"))
        elif sort_by == "name":
            records.sort(key=lambda x: str(x.get('company_name', '')).lower(), reverse=(sort_order == "desc"))
        elif sort_by == "date":
            records.sort(key=lambda x: str(x.get('date', '')), reverse=(sort_order == "desc"))

        # Get unique filters for frontend
        import re
        all_records = df.to_dict(orient="records")
        locations = sorted(set(str(r.get('address', '')) for r in all_records if r.get('address')))
        specialties = set()
        for r in all_records:
            if r.get('specialties'):
                for s in re.split(r'[,/&-]', str(r['specialties'])):
                    s = s.strip()
                    if len(s) > 2:
                        specialties.add(s)
        specialties = sorted(specialties)
        priorities = sorted(set(str(r.get('priority', '')) for r in all_records if r.get('priority')))

        return {
            "status": "success",
            "data": records,
            "filters": {
                "locations": [l for l in locations if l],
                "specialties": specialties,
                "priorities": [p for p in priorities if p]
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/favorites")
def get_favorites():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM favorites ORDER BY date_added DESC")
        rows = cursor.fetchall()
        conn.close()

        favorites = [dict(row) for row in rows]
        return {"status": "success", "data": favorites}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/favorites")
async def add_favorite(
    internship_id: str = Form(...),
    company_name: str = Form(...),
    email: str = Form(""),
    specialties: str = Form("")
):
    try:
        date_added = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO favorites (internship_id, company_name, email, specialties, date_added) VALUES (?, ?, ?, ?, ?)",
            (internship_id, company_name, email, specialties, date_added)
        )
        conn.commit()
        conn.close()

        return {"status": "success", "message": "Added to favorites"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/favorites/{internship_id}")
def remove_favorite(internship_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM favorites WHERE internship_id = ?", (internship_id,))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/send-bulk-email")
async def send_bulk_email(
    recipients: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    cv: UploadFile = File(None),
    motivation: UploadFile = File(None)
):
    try:
        import json
        recipient_list = json.loads(recipients)

        results = []
        for recipient in recipient_list:
            results.append({
                "email": recipient.get("email"),
                "company": recipient.get("company_name"),
                "status": "simulated_success"
            })

        return {
            "status": "success",
            "message": f"Emails prepared for {len(recipient_list)} recipients",
            "results": results
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.put("/api/applications/{app_id}")
async def update_application(
    app_id: int,
    status: str = Form(None),
    notes: str = Form(None)
):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        if status:
            cursor.execute("UPDATE applications SET status = ? WHERE id = ?", (status, app_id))
        if notes:
            cursor.execute("UPDATE applications SET notes = ? WHERE id = ?", (notes, app_id))

        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/applications")
async def apply_for_internship(
    internship_id: str = Form(...),
    company_name: str = Form(...),
    cv: UploadFile = File(None),
    motivation: UploadFile = File(None)
):
    try:
        cv_filename = None
        motivation_filename = None

        if cv:
            cv_filename = f"{internship_id}_cv_{cv.filename}"
            with open(os.path.join(UPLOAD_DIR, cv_filename), "wb") as buffer:
                shutil.copyfileobj(cv.file, buffer)

        if motivation:
            motivation_filename = f"{internship_id}_mot_{motivation.filename}"
            with open(os.path.join(UPLOAD_DIR, motivation_filename), "wb") as buffer:
                shutil.copyfileobj(motivation.file, buffer)

        date_applied = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO applications (internship_id, company_name, date_applied, cv_filename, motivation_filename) VALUES (?, ?, ?, ?, ?)",
            (internship_id, company_name, date_applied, cv_filename, motivation_filename)
        )
        conn.commit()
        application_id = cursor.lastrowid
        conn.close()

        return {"status": "success", "message": "Application submitted successfully", "id": application_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/applications")
def get_applications():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM applications ORDER BY date_applied DESC")
        rows = cursor.fetchall()
        conn.close()

        applications = [dict(row) for row in rows]
        return {"status": "success", "data": applications}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/api/applications/{app_id}")
def delete_application(app_id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM applications WHERE id = ?", (app_id,))
        conn.commit()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)