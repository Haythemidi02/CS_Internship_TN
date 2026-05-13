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
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            internship_id TEXT NOT NULL,
            company_name TEXT NOT NULL,
            status TEXT DEFAULT 'Sent',
            date_applied TEXT NOT NULL,
            cv_filename TEXT,
            motivation_filename TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.get("/api/internships")
def get_internships():
    try:
        df = pd.read_excel(EXCEL_FILE_PATH)
        df = df.fillna("")
        
        column_mapping = {
            "ID": "id",
            "Nom de l'entreprise": "company_name",
            "Adresse": "address",
            "Téléphone": "phone", 
            "Fax": "fax",
            "Email entreprise": "email",
            "Spécialité(s)": "specialties",
            "Score": "score",
            "Priority": "priority",
            "Tailored angle": "tailored_angle",
            "Subject": "subject"
        }
        
        df = df.rename(columns=column_mapping)
        records = df.to_dict(orient="records")
        return {"status": "success", "data": records}
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
