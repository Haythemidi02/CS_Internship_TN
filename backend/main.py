from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import json
import os
import sqlite3
import shutil
import re
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

# Tunisia governorates
TUNISIA_GOVERNORATES = [
    "Ariana", "Beja", "Ben Arous", "Bizerte", "Gabes", "Gafsa", "Jendouba",
    "Kairouan", "Kasserine", "Kebili", "Kef", "Mahdia", "Manouba", "Medenine",
    "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse",
    "Tunis", "Zaghouan"
]

# Major cities (Tunisia + international)
MAJOR_CITIES = [
    # Tunisia
    "Tunis", "Sfax", "Sousse", "Kairouan", "Mahdia", "Monastir", "Nabeul",
    "Bizerte", "Gabes", "Ariana", "Ben Arous", "Manouba", "Medenine", "Gafsa",
    "Jendouba", "Zaghouan", "Kasserine", "Sidi Bouzid", "Kef", "Siliana",
    # International
    "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg",
    "Munich", "Berlin", "Hamburg", "Frankfurt", "Cologne", "Dusseldorf",
    "Amsterdam", "Rotterdam", "Brussels", "London", "Manchester",
    "Rome", "Milan", "Madrid", "Barcelona", "Lisbon",
    "New York", "Los Angeles", "San Francisco", "Chicago", "Boston",
    "Toronto", "Vancouver", "Montreal", "Ottawa",
    "Dubai", "Abu Dhabi", "Riyadh", "Jeddah", "Doha"
]

# Common countries
COUNTRIES = [
    "Tunisie", "Tunisia", "France", "Germany", "Netherlands", "Belgium",
    "UK", "United Kingdom", "USA", "United States", "Canada", "Italy",
    "Spain", "Portugal", "UAE", "United Arab Emirates", "Saudi Arabia",
    "Qatar", "Switzerland", "Austria", "Sweden", "Norway", "Denmark"
]

# Skills keywords for CV matching
TECH_SKILLS = [
    "python", "java", "c++", "c#", "javascript", "typescript", "php", "ruby",
    "go", "rust", "swift", "kotlin", "scala", "perl", "r", "matlab",
    "react", "angular", "vue", "node", "django", "flask", "spring",
    "express", "nextjs", "nuxt", "svelte",
    "sql", "mysql", "postgresql", "mongodb", "redis", "oracle", "sqlite",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
    "git", "github", "gitlab", "jira", "confluence",
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
    "data science", "data analysis", "data engineering", "big data",
    "nlp", "computer vision", "artificial intelligence", "ai", "ml",
    "web development", "frontend", "backend", "fullstack", "full-stack",
    "mobile development", "ios", "android", "react native", "flutter",
    "cybersecurity", "security", "penetration testing", "network",
    "cloud", "devops", "agile", "scrum", "uml", "rest", "api",
    "graphql", "microservices", "linux", "unix", "windows server",
    "html", "css", "sass", "less", "bootstrap", "tailwind",
    "jquery", "ajax", "json", "xml", "yaml", "toml",
    "oop", "object-oriented", "design patterns", "refactoring",
    "testing", "unit testing", "integration testing", "tdd", "bdd",
    "blockchain", "solidity", "web3", "ethereum",
    "computer science", "software engineering", "information systems",
    "embedded systems", "iot", "robotics", "electronics",
    "project management", "technical writing", "communication"
]

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
    # User profile for CV-based matching
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skills TEXT,
            interests TEXT,
            preferred_locations TEXT,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

def parse_location(address):
    """Parse address into structured components"""
    if not address:
        return {"full": "", "country": "", "city": "", "governorate": "", "street": ""}

    address_lower = address.lower()
    address_str = str(address)

    result = {
        "full": address_str,
        "country": "",
        "city": "",
        "governorate": "",
        "street": ""
    }

    # Detect country
    for country in COUNTRIES:
        if country.lower() in address_lower:
            result["country"] = country
            break

    # If no explicit country but has Tunisia indicators
    if not result["country"]:
        if "tunisie" in address_lower or "tunisia" in address_lower:
            result["country"] = "Tunisie"
        elif "france" in address_lower:
            result["country"] = "France"
        elif "deutschland" in address_lower or "germany" in address_lower:
            result["country"] = "Germany"
        elif "nederland" in address_lower or "netherlands" in address_lower:
            result["country"] = "Netherlands"

    # Detect city
    for city in MAJOR_CITIES:
        if city.lower() in address_lower:
            result["city"] = city
            break

    # If no city found, try to extract from common patterns
    if not result["city"]:
        # Pattern: "City, Country" or "City Country"
        match = re.search(r'^([A-Za-z]+(?:[\s-][A-Za-z]+)?)[\s,]', address_str)
        if match:
            potential_city = match.group(1).strip()
            if len(potential_city) > 2:
                result["city"] = potential_city

    # Detect Tunisia governorate
    if result["country"] == "Tunisie" or "tunis" in address_lower or "tunisie" in address_lower:
        for gov in TUNISIA_GOVERNORATES:
            if gov.lower() in address_lower:
                result["governorate"] = gov
                break

        # Map some cities to governorates
        city_to_gov = {
            "Tunis": "Tunis", "Ariana": "Ariana", "Ben Arous": "Ben Arous",
            "Manouba": "Manouba", "Sfax": "Sfax", "Sousse": "Sousse",
            "Nabeul": "Nabeul", "Monastir": "Monastir", "Mahdia": "Mahdia",
            "Gabes": "Gabes", "Medenine": "Medenine", "Bizerte": "Bizerte"
        }
        if result["city"] in city_to_gov:
            result["governorate"] = city_to_gov[result["city"]]

    # Extract street/area (everything before city or postal code)
    if result["city"]:
        parts = address_str.split(result["city"])
        if parts[0]:
            result["street"] = parts[0].strip().rstrip(",")
    else:
        # Try to find postal code pattern
        match = re.search(r'^([A-Z0-9+\s]+?)(?=\d{4}|\d{5})', address_str)
        if match:
            result["street"] = match.group(1).strip().rstrip(",")

    return result

def extract_company_type(company_name, subject):
    """Extract company type from name or subject"""
    text = f"{company_name} {subject}".lower()

    if any(x in text for x in ["university", "university of", "laboratoire", "labo", "cnrs", "research"]):
        return "Research Lab"
    elif any(x in text for x in ["bank", "banque", "finance", "insurance", "assurance"]):
        return "Finance/Banking"
    elif any(x in text for x in ["consulting", "audit", "conseil"]):
        return "Consulting"
    elif any(x in text for x in ["software", "tech", "solution", "it ", "si ", "system"]):
        return "Tech Company"
    elif any(x in text for x in ["automotive", "bmw", "mercedes", "toyota", "car"]):
        return "Automotive"
    elif any(x in text for x in ["hospital", "health", "medical", "pharma"]):
        return "Healthcare"
    elif any(x in text for x in ["telecom", "telecommunications", "orange", "ooredoo"]):
        return "Telecom"
    elif any(x in text for x in ["government", "ministry", "state", "public"]):
        return "Government"
    else:
        return "Enterprise"

def calculate_cv_match_score(user_skills, internship_data):
    """Calculate match score between user skills and internship requirements"""
    if not user_skills:
        return None

    user_skills_lower = list(dict.fromkeys(s.lower().strip() for s in user_skills if s.strip()))
    if not user_skills_lower:
        return None

    # Extract keywords from internship
    text = f"{internship_data.get('company_name', '')} {internship_data.get('subject', '')} {internship_data.get('specialties', '')} {internship_data.get('tailored_angle', '')}".lower()

    matched = set()
    for skill in user_skills_lower:
        if re.search(rf"\b{re.escape(skill)}\b", text):
            matched.add(skill)
            continue
        # Also check partial matches for compound skills
        for word in skill.split():
            if len(word) > 3 and re.search(rf"\b{re.escape(word)}\b", text):
                matched.add(skill)
                break

    if matched:
        score = min(100, int(len(matched) / len(user_skills_lower) * 100))
        return {"score": score, "matched_skills": sorted(matched)[:5]}
    return None

@app.get("/api/internships")
def get_internships(
    search: str = "",
    country: str = "",
    city: str = "",
    governorate: str = "",
    priority: str = "",
    specialty: str = "",
    company_type: str = "",
    sort_by: str = "score",
    sort_order: str = "desc",
    user_skills: str = ""  # Comma-separated skills from user's CV
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
        all_records = df.to_dict(orient="records")

        # Parse locations and add structured data
        for record in all_records:
            loc = parse_location(record.get('address', ''))
            record['location_parsed'] = loc
            record['country'] = loc['country']
            record['city'] = loc['city']
            record['governorate'] = loc['governorate']
            record['street'] = loc['street']
            record['company_type'] = extract_company_type(
                record.get('company_name', ''),
                record.get('subject', '')
            )

        records = all_records.copy()

        # Apply filters
        if search:
            search_lower = search.lower()
            search_terms = search_lower.split()
            records = [r for r in records if any(
                term in str(r.get('company_name', '')).lower() or
                term in str(r.get('subject', '')).lower() or
                term in str(r.get('specialties', '')).lower() or
                term in str(r.get('address', '')).lower() or
                term in str(r.get('tailored_angle', '')).lower() or
                term in str(r.get('city', '')).lower() or
                term in str(r.get('country', '')).lower() or
                term in str(r.get('governorate', '')).lower()
                for term in search_terms
            )]

        if country:
            records = [r for r in records if country.lower() in str(r.get('country', '')).lower()]

        if city:
            records = [r for r in records if city.lower() in str(r.get('city', '')).lower()]

        if governorate:
            records = [r for r in records if governorate.lower() in str(r.get('governorate', '')).lower()]

        if priority:
            records = [r for r in records if priority.lower() in str(r.get('priority', '')).lower()]

        if specialty:
            records = [r for r in records if specialty.lower() in str(r.get('specialties', '')).lower()]

        if company_type:
            records = [r for r in records if company_type.lower() in str(r.get('company_type', '')).lower()]

        # CV-based skill matching
        cv_match_info = None
        if user_skills:
            user_skills_list = [s.strip() for s in user_skills.split(',') if s.strip()]
            for record in records:
                match = calculate_cv_match_score(user_skills_list, record)
                if match:
                    record['cv_match'] = match
            cv_match_info = {"skills": user_skills_list}

        # Sort
        if sort_by == "score":
            records.sort(key=lambda x: float(x.get('score', 0) or 0), reverse=(sort_order == "desc"))
        elif sort_by == "name":
            records.sort(key=lambda x: str(x.get('company_name', '')).lower(), reverse=(sort_order == "desc"))
        elif sort_by == "cv_match" and user_skills:
            # Sort by CV match score
            records.sort(key=lambda x: x.get('cv_match', {}).get('score', 0), reverse=True)
        elif sort_by == "city":
            records.sort(key=lambda x: str(x.get('city', '')).lower(), reverse=(sort_order == "desc"))

        # Generate advanced filters
        countries = sorted(set(str(r.get('country', '')) for r in all_records if r.get('country')))
        cities = sorted(set(str(r.get('city', '')) for r in all_records if r.get('city')))
        governorates = sorted(set(str(r.get('governorate', '')) for r in all_records if r.get('governorate')))

        specialties = set()
        for r in all_records:
            if r.get('specialties'):
                for s in re.split(r'[,/&-]', str(r['specialties'])):
                    s = s.strip()
                    if len(s) > 2:
                        specialties.add(s)
        specialties = sorted(specialties)

        priorities = sorted(set(str(r.get('priority', '')) for r in all_records if r.get('priority')))

        company_types = sorted(set(str(r.get('company_type', '')) for r in all_records if r.get('company_type')))

        return {
            "status": "success",
            "data": records,
            "filters": {
                "countries": [c for c in countries if c],
                "cities": [c for c in cities if c],
                "governorates": [g for g in governorates if g],
                "specialties": specialties,
                "priorities": [p for p in priorities if p],
                "company_types": [ct for ct in company_types if ct]
            },
            "user_profile": cv_match_info
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/profile")
async def save_user_profile(
    skills: str = Form(""),
    interests: str = Form(""),
    preferred_locations: str = Form("")
):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        updated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Get or create profile
        cursor.execute("SELECT id FROM user_profile LIMIT 1")
        row = cursor.fetchone()

        if row:
            cursor.execute("""
                UPDATE user_profile
                SET skills = ?, interests = ?, preferred_locations = ?, updated_at = ?
                WHERE id = ?
            """, (skills, interests, preferred_locations, updated_at, row[0]))
        else:
            cursor.execute("""
                INSERT INTO user_profile (skills, interests, preferred_locations, updated_at)
                VALUES (?, ?, ?, ?)
            """, (skills, interests, preferred_locations, updated_at))

        conn.commit()
        conn.close()

        return {"status": "success", "message": "Profile saved"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/profile")
def get_user_profile():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_profile LIMIT 1")
        row = cursor.fetchone()
        conn.close()

        if row:
            return {"status": "success", "data": dict(row)}
        return {"status": "success", "data": None}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/extract-skills")
async def extract_skills_from_cv(
    cv: UploadFile = File(...)
):
    try:
        # Save uploaded file temporarily
        temp_path = os.path.join(UPLOAD_DIR, f"temp_cv_{datetime.now().timestamp()}")
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(cv.file, buffer)

        # Read and extract text (basic extraction)
        extracted_text = ""

        # Check file extension
        filename = cv.filename.lower()

        if filename.endswith('.pdf'):
            # For PDF - use a simple approach
            try:
                import PyPDF2
                with open(temp_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages[:3]:  # First 3 pages
                        extracted_text += page.extract_text() or ""
            except ImportError:
                pass
        elif filename.endswith(('.doc', '.docx')):
            # For Word - use python-docx
            try:
                import docx
                doc = docx.Document(temp_path)
                for para in doc.paragraphs:
                    extracted_text += para.text + "\n"
            except ImportError:
                pass
        else:
            # Try as plain text
            with open(temp_path, 'r', encoding='utf-8', errors='ignore') as f:
                extracted_text = f.read()

        # Clean up temp file
        os.remove(temp_path)

        # Extract skills from text
        found_skills = []
        text_lower = extracted_text.lower()

        for skill in TECH_SKILLS:
            if skill in text_lower:
                # Capitalize for display
                found_skills.append(skill.title())

        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in found_skills:
            if skill.lower() not in seen:
                seen.add(skill.lower())
                unique_skills.append(skill)

        return {
            "status": "success",
            "data": {
                "skills": unique_skills[:20],  # Return top 20
                "full_text_preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/search-suggestions")
def get_search_suggestions(q: str = ""):
    """Get search suggestions based on query"""
    try:
        df = pd.read_excel(EXCEL_FILE_PATH)
        df = df.fillna("")

        suggestions = {
            "companies": [],
            "cities": [],
            "skills": [],
            "specialties": []
        }

        q_lower = q.lower()

        if q_lower:
            # Search companies
            companies = df["Nom de l'entreprise"].dropna().unique()
            suggestions["companies"] = [c for c in companies if q_lower in str(c).lower()][:5]

            # Search cities from addresses
            for addr in df["Adresse"].dropna().unique():
                loc = parse_location(addr)
                if loc['city'] and q_lower in loc['city'].lower():
                    if loc['city'] not in suggestions["cities"]:
                        suggestions["cities"].append(loc['city'])
            suggestions["cities"] = suggestions["cities"][:5]

            # Search skills
            for skill in TECH_SKILLS:
                if q_lower in skill.lower():
                    suggestions["skills"].append(skill.title())
            suggestions["skills"] = suggestions["skills"][:5]

        return {"status": "success", "data": suggestions}
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
