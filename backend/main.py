from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
import pandas as pd
import re, os, shutil
from typing import Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

import models, auth
from database import engine, get_db, Base

# ── Create all tables ──────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Rate limiter ───────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ENSI Summer Internship API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:4173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths & constants ──────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
EXCEL_FILE_PATH = os.path.join(BASE_DIR, "..", "summer_internship.xlsx")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_UPLOAD_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

TUNISIA_GOVERNORATES = [
    "Ariana","Beja","Ben Arous","Bizerte","Gabes","Gafsa","Jendouba",
    "Kairouan","Kasserine","Kebili","Kef","Mahdia","Manouba","Medenine",
    "Monastir","Nabeul","Sfax","Sidi Bouzid","Siliana","Sousse","Tunis","Zaghouan",
]
MAJOR_CITIES = [
    "Tunis","Sfax","Sousse","Kairouan","Mahdia","Monastir","Nabeul","Bizerte",
    "Gabes","Ariana","Ben Arous","Manouba","Medenine","Gafsa","Jendouba",
    "Zaghouan","Kasserine","Sidi Bouzid","Kef","Siliana",
    "Paris","Lyon","Marseille","Toulouse","Nice","Nantes","Strasbourg",
    "Munich","Berlin","Hamburg","Frankfurt","Amsterdam","Brussels","London",
    "Rome","Milan","Madrid","Barcelona","Lisbon",
    "New York","San Francisco","Chicago","Boston","Toronto","Dubai",
]
COUNTRIES = [
    "Tunisie","Tunisia","France","Germany","Netherlands","Belgium",
    "UK","United Kingdom","USA","United States","Canada","Italy",
    "Spain","Portugal","UAE","United Arab Emirates","Saudi Arabia",
    "Qatar","Switzerland","Sweden","Norway","Denmark",
]
TECH_SKILLS = [
    "python","java","c++","c#","javascript","typescript","php","ruby","go","rust",
    "react","angular","vue","node","django","flask","spring","express","nextjs",
    "sql","mysql","postgresql","mongodb","redis","oracle","sqlite",
    "aws","azure","gcp","docker","kubernetes","terraform","jenkins",
    "git","machine learning","deep learning","tensorflow","pytorch","keras",
    "data science","nlp","computer vision","ai","ml","web development",
    "frontend","backend","fullstack","mobile development","ios","android",
    "react native","flutter","cybersecurity","security","cloud","devops",
    "agile","scrum","rest","api","graphql","microservices","linux",
    "html","css","sass","bootstrap","tailwind","testing","tdd",
    "blockchain","embedded systems","iot","project management",
]

# ── Excel cache (load once at startup) ────────────────────────────────────────
_INTERNSHIPS_CACHE: list = []

# ── Helpers ────────────────────────────────────────────────────────────────────
def _parse_location(address: str) -> dict:
    if not address:
        return {"country": "", "city": "", "governorate": "", "street": ""}
    al = address.lower()
    result = {"country": "", "city": "", "governorate": "", "street": ""}
    for c in COUNTRIES:
        if c.lower() in al:
            result["country"] = c; break
    for city in MAJOR_CITIES:
        if city.lower() in al:
            result["city"] = city; break
    if result["country"] in ("Tunisie", "Tunisia") or "tunis" in al:
        for g in TUNISIA_GOVERNORATES:
            if g.lower() in al:
                result["governorate"] = g; break
    return result

def _extract_company_type(name: str, subject: str) -> str:
    t = f"{name} {subject}".lower()
    if any(x in t for x in ["university","laboratoire","cnrs","research"]): return "Research Lab"
    if any(x in t for x in ["bank","banque","finance","insurance"]): return "Finance/Banking"
    if any(x in t for x in ["consulting","audit","conseil"]): return "Consulting"
    if any(x in t for x in ["software","tech","solution","it "]): return "Tech Company"
    if any(x in t for x in ["telecom","orange","ooredoo"]): return "Telecom"
    if any(x in t for x in ["hospital","health","pharma"]): return "Healthcare"
    return "Enterprise"

def _cv_match(user_skills: list, record: dict) -> Optional[dict]:
    if not user_skills: return None
    text = " ".join([
        record.get("company_name",""), record.get("subject",""),
        record.get("specialties",""), record.get("tailored_angle",""),
    ]).lower()
    matched = {s for s in user_skills if re.search(rf"\b{re.escape(s.lower())}\b", text)}
    if matched:
        return {"score": min(100, int(len(matched)/len(user_skills)*100)), "matched_skills": sorted(matched)[:5]}
    return None

def _validate_file(f: UploadFile):
    if f.content_type not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(400, "Only PDF and Word documents are allowed.")

def _load_excel():
    global _INTERNSHIPS_CACHE
    try:
        df = pd.read_excel(EXCEL_FILE_PATH)
        df = df.fillna("")
        df = df.rename(columns={
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
            "Subject": "subject",
        })
        records = df.to_dict(orient="records")
        for r in records:
            loc = _parse_location(r.get("address", ""))
            r.update(loc)
            r["company_type"] = _extract_company_type(r.get("company_name", ""), r.get("subject", ""))
        _INTERNSHIPS_CACHE = records
    except Exception as e:
        print(f"[WARN] Could not load Excel: {e}")
        _INTERNSHIPS_CACHE = []

_load_excel()


# ── Pydantic schemas ───────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

# ═══════════════════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/register", response_model=TokenResponse)
@limiter.limit("10/minute")
async def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(400, "Email already registered.")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    user = models.User(
        email=body.email,
        full_name=body.full_name.strip(),
        hashed_password=auth.get_password_hash(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "full_name": user.full_name}}

@app.post("/api/auth/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password.")
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": user.id, "email": user.email, "full_name": user.full_name}}

@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "full_name": current_user.full_name}

# ═══════════════════════════════════════════════════════════════════════════════
#  INTERNSHIPS (public read, cached)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/internships")
@limiter.limit("60/minute")
def get_internships(
    request: Request,
    search: str = "", country: str = "", city: str = "",
    governorate: str = "", priority: str = "", specialty: str = "",
    company_type: str = "", sort_by: str = "score", sort_order: str = "desc",
    user_skills: str = "",
):
    records = list(_INTERNSHIPS_CACHE)

    if search:
        sl = search.lower()
        records = [r for r in records if any(
            sl in str(r.get(f, "")).lower()
            for f in ["company_name","subject","specialties","address","tailored_angle","city","country"]
        )]
    if country:
        records = [r for r in records if country.lower() in str(r.get("country","")).lower()]
    if city:
        records = [r for r in records if city.lower() in str(r.get("city","")).lower()]
    if governorate:
        records = [r for r in records if governorate.lower() in str(r.get("governorate","")).lower()]
    if priority:
        records = [r for r in records if priority.lower() in str(r.get("priority","")).lower()]
    if specialty:
        records = [r for r in records if specialty.lower() in str(r.get("specialties","")).lower()]
    if company_type:
        records = [r for r in records if company_type.lower() in str(r.get("company_type","")).lower()]

    if user_skills:
        skills_list = [s.strip() for s in user_skills.split(",") if s.strip()]
        for r in records:
            m = _cv_match(skills_list, r)
            if m: r["cv_match"] = m

    if sort_by == "score":
        records.sort(key=lambda x: float(x.get("score",0) or 0), reverse=(sort_order=="desc"))
    elif sort_by == "name":
        records.sort(key=lambda x: str(x.get("company_name","")).lower(), reverse=(sort_order=="desc"))
    elif sort_by == "cv_match" and user_skills:
        records.sort(key=lambda x: x.get("cv_match",{}).get("score",0), reverse=True)

    all_r = _INTERNSHIPS_CACHE
    countries = sorted({str(r.get("country","")) for r in all_r if r.get("country")})
    cities    = sorted({str(r.get("city",""))    for r in all_r if r.get("city")})
    govs      = sorted({str(r.get("governorate","")) for r in all_r if r.get("governorate")})
    specs = set()
    for r in all_r:
        if r.get("specialties"):
            for s in re.split(r"[,/&-]", str(r["specialties"])):
                s = s.strip()
                if len(s) > 2: specs.add(s)
    priorities   = sorted({str(r.get("priority","")) for r in all_r if r.get("priority")})
    company_types= sorted({str(r.get("company_type","")) for r in all_r if r.get("company_type")})

    return {
        "status": "success",
        "data": records,
        "filters": {
            "countries": countries, "cities": cities, "governorates": govs,
            "specialties": sorted(specs), "priorities": priorities, "company_types": company_types,
        },
    }

@app.get("/api/search-suggestions")
@limiter.limit("30/minute")
def search_suggestions(request: Request, q: str = ""):
    out = {"companies": [], "cities": [], "skills": []}
    if q:
        ql = q.lower()
        out["companies"] = [r["company_name"] for r in _INTERNSHIPS_CACHE if ql in str(r.get("company_name","")).lower()][:5]
        out["cities"]    = list({r["city"] for r in _INTERNSHIPS_CACHE if r.get("city") and ql in r["city"].lower()})[:5]
        out["skills"]    = [s.title() for s in TECH_SKILLS if ql in s][:5]
    return {"status": "success", "data": out}

# ═══════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/profile")
def get_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
    return {"status": "success", "data": {"skills": p.skills if p else "", "interests": p.interests if p else ""}}

@app.post("/api/profile")
async def save_profile(
    skills: str = Form(""),
    interests: str = Form(""),
    preferred_locations: str = Form(""),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(models.UserProfile).filter(models.UserProfile.user_id == current_user.id).first()
    if p:
        p.skills = skills; p.interests = interests; p.preferred_locations = preferred_locations
    else:
        p = models.UserProfile(user_id=current_user.id, skills=skills, interests=interests, preferred_locations=preferred_locations)
        db.add(p)
    db.commit()
    return {"status": "success"}

# ═══════════════════════════════════════════════════════════════════════════════
#  CV SKILL EXTRACTION
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/extract-skills")
@limiter.limit("10/minute")
async def extract_skills(request: Request, cv: UploadFile = File(...), current_user: models.User = Depends(auth.get_current_user)):
    _validate_file(cv)
    content = await cv.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(400, "File too large (max 5 MB).")

    temp_path = os.path.join(UPLOAD_DIR, f"tmp_{current_user.id}_{datetime.now().timestamp()}")
    with open(temp_path, "wb") as f:
        f.write(content)

    text = ""
    fn = (cv.filename or "").lower()
    try:
        if fn.endswith(".pdf"):
            try:
                import PyPDF2
                with open(temp_path, "rb") as f:
                    for page in PyPDF2.PdfReader(f).pages[:3]:
                        text += page.extract_text() or ""
            except ImportError: pass
        elif fn.endswith((".doc", ".docx")):
            try:
                import docx
                for para in docx.Document(temp_path).paragraphs:
                    text += para.text + "\n"
            except ImportError: pass
        else:
            with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
    finally:
        os.remove(temp_path)

    tl = text.lower()
    found = list(dict.fromkeys(s.title() for s in TECH_SKILLS if s in tl))
    return {"status": "success", "data": {"skills": found[:20]}}

# ═══════════════════════════════════════════════════════════════════════════════
#  FAVORITES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/favorites")
def get_favorites(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    favs = db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).order_by(models.Favorite.date_added.desc()).all()
    return {"status": "success", "data": [
        {"id": f.id, "internship_id": f.internship_id, "company_name": f.company_name,
         "email": f.email, "specialties": f.specialties, "date_added": str(f.date_added)}
        for f in favs
    ]}

@app.post("/api/favorites")
async def add_favorite(
    internship_id: str = Form(...), company_name: str = Form(...),
    email: str = Form(""), specialties: str = Form(""),
    current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db),
):
    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.internship_id == internship_id,
    ).first()
    if not existing:
        db.add(models.Favorite(user_id=current_user.id, internship_id=internship_id,
                               company_name=company_name, email=email, specialties=specialties))
        db.commit()
    return {"status": "success"}

@app.delete("/api/favorites/{internship_id}")
def remove_favorite(internship_id: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.internship_id == internship_id,
    ).delete()
    db.commit()
    return {"status": "success"}

# ═══════════════════════════════════════════════════════════════════════════════
#  APPLICATIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/applications")
def get_applications(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    apps = db.query(models.Application).filter(models.Application.user_id == current_user.id).order_by(models.Application.date_applied.desc()).all()
    return {"status": "success", "data": [
        {"id": a.id, "internship_id": a.internship_id, "company_name": a.company_name,
         "status": a.status, "date_applied": str(a.date_applied),
         "cv_filename": a.cv_filename, "motivation_filename": a.motivation_filename, "notes": a.notes}
        for a in apps
    ]}

@app.post("/api/applications")
@limiter.limit("20/minute")
async def apply(
    request: Request,
    internship_id: str = Form(...), company_name: str = Form(...),
    cv: UploadFile = File(None), motivation: UploadFile = File(None),
    current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db),
):
    cv_filename = None
    mot_filename = None

    if cv:
        _validate_file(cv)
        content = await cv.read()
        if len(content) > MAX_FILE_SIZE: raise HTTPException(400, "CV too large.")
        cv_filename = f"{current_user.id}_{internship_id}_cv_{cv.filename}"
        with open(os.path.join(UPLOAD_DIR, cv_filename), "wb") as f: f.write(content)

    if motivation:
        _validate_file(motivation)
        content = await motivation.read()
        if len(content) > MAX_FILE_SIZE: raise HTTPException(400, "Motivation letter too large.")
        mot_filename = f"{current_user.id}_{internship_id}_mot_{motivation.filename}"
        with open(os.path.join(UPLOAD_DIR, mot_filename), "wb") as f: f.write(content)

    app_obj = models.Application(
        user_id=current_user.id, internship_id=internship_id,
        company_name=company_name, cv_filename=cv_filename, motivation_filename=mot_filename,
    )
    db.add(app_obj)
    db.commit()
    db.refresh(app_obj)
    return {"status": "success", "id": app_obj.id}

@app.put("/api/applications/{app_id}")
async def update_application(
    app_id: int, status: str = Form(None), notes: str = Form(None),
    current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db),
):
    a = db.query(models.Application).filter(
        models.Application.id == app_id, models.Application.user_id == current_user.id
    ).first()
    if not a: raise HTTPException(404, "Application not found.")
    if status: a.status = status
    if notes is not None: a.notes = notes
    db.commit()
    return {"status": "success"}

@app.delete("/api/applications/{app_id}")
def delete_application(app_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    a = db.query(models.Application).filter(
        models.Application.id == app_id, models.Application.user_id == current_user.id
    ).first()
    if not a: raise HTTPException(404, "Not found.")
    db.delete(a)
    db.commit()
    return {"status": "success"}

# ═══════════════════════════════════════════════════════════════════════════════
#  BULK EMAIL (mailto helper — no real sending)
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/send-bulk-email")
async def bulk_email(request: Request, current_user: models.User = Depends(auth.get_current_user)):
    body = await request.json()
    recipients = body.get("recipients", [])
    return {
        "status": "success",
        "message": f"Prepared {len(recipients)} emails (use mailto links to send via your email client).",
        "results": [{"email": r.get("email"), "company": r.get("company_name"), "status": "prepared"} for r in recipients],
    }

# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "internships_loaded": len(_INTERNSHIPS_CACHE)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
