# backend/main.py
import os
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth
from pydantic import BaseModel
from typing import Optional
import requests
from datetime import datetime, timezone
from fastapi import Body, Path
from google.cloud.firestore_v1 import DocumentSnapshot
from datetime import datetime as _dt
import random

load_dotenv(dotenv_path=".env")

FIREBASE_SA_PATH = os.getenv("FIREBASE_SA_PATH", "./firebase_service_account.json")
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"
CUSTIO_API_KEY = os.getenv("CUSTIO_API_KEY", "mock")
CUSTIO_API_URL = os.getenv("CUSTIO_API_URL", "https://api.customer.io/v1/send-mock")

# init firebase admin
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_SA_PATH)
    firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI(title="Undergrad Admin API")

# allow frontend localhost (Next dev) and others
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # narrow this in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_token(auth_header: Optional[str]):
    if DEV_MODE:
        return {"uid": "dev-admin", "email": "dev@example.com"}
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        token = auth_header.split(" ").pop()
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/api/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

@app.get("/api/students")
async def list_students(q: Optional[str] = None, status: Optional[str] = None):
    coll = db.collection("students")
    docs = coll.limit(100).get()
    results = []
    now = datetime.utcnow()  # for quick filter calculations
    for d in docs:
        data = d.to_dict()
        data["id"] = d.id

        # Fetch latest interaction timestamp
        interactions = list(
            db.collection("students").document(d.id)
            .collection("interactions")
            .order_by("ts", direction=firestore.Query.DESCENDING)
            .limit(1)
            .stream()
        )
        if interactions:
            data["last_active"] = interactions[0].to_dict().get("ts")
        else:
            data["last_active"] = None

        # Fetch latest communication timestamp
        comms = list(
            db.collection("students").document(d.id)
            .collection("communications")
            .order_by("ts", direction=firestore.Query.DESCENDING)
            .limit(1)
            .stream()
        )
        last_comm_ts = comms[0].to_dict().get("ts") if comms else None
        data["last_comm_ts"] = last_comm_ts

        # Quick filter flags
        data["not_contacted_7days"] = (
            last_comm_ts is None or (now - last_comm_ts.replace(tzinfo=None)).days > 7
        )
        data["high_intent"] = data.get("application_status") in ["Applying", "Submitted"]
        data["needs_essay_help"] = data.get("needs_essay_help", False)

        results.append(data)
    return {"students": results}

def _ts_to_iso(val):
    """Convert Firestore timestamp-like values to ISO string for JSON safely."""
    if val is None:
        return None
    # If it's a datetime already
    try:
        # Firestore server timestamps often come back as datetime
        if isinstance(val, _dt):
            return val.isoformat()
        # If value has to_datetime method (other Firestore types)
        if hasattr(val, "to_datetime"):
            return val.to_datetime().isoformat()
    except Exception:
        pass
    # Fallback: return as-is (shouldn't usually happen)
    return val

@app.get("/api/students/{sid}")
async def get_student(sid: str):
    # fetch main student doc
    doc_snap = db.collection("students").document(sid).get()
    if not doc_snap.exists:
        raise HTTPException(status_code=404, detail="Student not found")
    student = doc_snap.to_dict()
    student["id"] = sid

    # --- interactions ---
    interactions = []
    for x in db.collection("students").document(sid).collection("interactions")\
            .order_by("ts", direction=firestore.Query.DESCENDING).limit(50).stream():
        d = x.to_dict()
        d["id"] = x.id
        # normalize ts
        if "ts" in d:
            d["ts"] = _ts_to_iso(d["ts"])
        interactions.append(d)

    # --- communications ---
    communications = []
    for x in db.collection("students").document(sid).collection("communications")\
            .order_by("ts", direction=firestore.Query.DESCENDING).limit(50).stream():
        d = x.to_dict()
        d["id"] = x.id
        if "ts" in d:
            d["ts"] = _ts_to_iso(d["ts"])
        communications.append(d)

    # --- notes ---
    notes = []
    for x in db.collection("students").document(sid).collection("notes")\
            .order_by("ts", direction=firestore.Query.DESCENDING).limit(50).stream():
        d = x.to_dict()
        d["id"] = x.id
        if "ts" in d:
            d["ts"] = _ts_to_iso(d["ts"])
        notes.append(d)

    # --- tasks ---
    tasks = []
    for x in db.collection("students").document(sid).collection("tasks")\
            .order_by("created_at", direction=firestore.Query.DESCENDING).limit(50).stream():
        d = x.to_dict()
        d["id"] = x.id
        if "created_at" in d:
            d["created_at"] = _ts_to_iso(d["created_at"])
        tasks.append(d)

    # Return full payload expected by frontend
    return {
        "student": student,
        "interactions": interactions,
        "communications": communications,
        "notes": notes,
        "tasks": tasks,
    }
class NoteIn(BaseModel):
    author: str
    text: str

@app.post("/api/students/{sid}/notes")
async def add_note(sid: str, note: NoteIn, authorization: Optional[str] = Header(None)):
    user = verify_token(authorization)
    note_doc = {"author": note.author, "text": note.text, "ts": firestore.SERVER_TIMESTAMP}
    col = db.collection("students").document(sid).collection("notes")
    ref = col.add(note_doc)
    return {"ok": True, "id": ref[1].id}

class NoteUpdateIn(BaseModel):
    author: Optional[str] = None
    text: Optional[str] = None

@app.patch("/api/students/{sid}/notes/{nid}")
async def update_note(
    sid: str,
    nid: str,
    note_updates: NoteUpdateIn,
    authorization: Optional[str] = Header(None),
):
    """
    Update an existing note in students/{sid}/notes/{nid}.
    Partial updates supported (author and/or text).
    """
    user = verify_token(authorization)
    note_ref = db.collection("students").document(sid).collection("notes").document(nid)
    note_doc = note_ref.get()
    if not note_doc.exists:
        raise HTTPException(status_code=404, detail="Note not found")
    updates = {}
    if note_updates.author is not None:
        updates["author"] = note_updates.author
    if note_updates.text is not None:
        updates["text"] = note_updates.text
        # update timestamp so edits are visible; optional
        updates["ts"] = firestore.SERVER_TIMESTAMP
    if updates:
        note_ref.update(updates)
    updated = note_ref.get().to_dict()
    updated["id"] = nid
    return {"ok": True, "note": updated}

@app.delete("/api/students/{sid}/notes/{nid}")
async def delete_note(sid: str, nid: str, authorization: Optional[str] = Header(None)):
    """
    Delete a note from students/{sid}/notes/{nid}.
    """
    user = verify_token(authorization)
    note_ref = db.collection("students").document(sid).collection("notes").document(nid)
    note_doc = note_ref.get()
    if not note_doc.exists:
        raise HTTPException(status_code=404, detail="Note not found")
    note_ref.delete()
    return {"ok": True, "id": nid}

class CommIn(BaseModel):
    channel: str
    body: str
    logged_by: str

@app.post("/api/students/{sid}/communications")
async def add_communication(sid: str, comm: CommIn, authorization: Optional[str] = Header(None)):
    user = verify_token(authorization)
    doc = {"channel": comm.channel, "body": comm.body, "logged_by": comm.logged_by, "ts": firestore.SERVER_TIMESTAMP}
    col = db.collection("students").document(sid).collection("communications")
    ref = col.add(doc)
    return {"ok": True, "id": ref[1].id}

@app.post("/api/students/{sid}/trigger-email")
async def trigger_email(sid: str, subject: str = Body(...), body: str = Body(...), authorization: Optional[str] = Header(None)):
    user = verify_token(authorization)
    # Mock email sending - in production, integrate with Customer.io or similar
    # For now, we'll just log the communication
    comm_doc = {
        "channel": "email",
        "body": f"Subject: {subject}\n\n{body}",
        "logged_by": user.get("email", "dev@example.com"),
        "ts": firestore.SERVER_TIMESTAMP
    }
    db.collection("students").document(sid).collection("communications").add(comm_doc)
    
    # Return success with mock response
    return {
        "ok": True, 
        "message": "Email queued successfully (mock)",
        "subject": subject,
        "recipient": sid
    }


class StudentIn(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    grade: int
    country: str
    application_status: str

@app.post("/api/students")
async def create_student(student: StudentIn, authorization: Optional[str] = Header(None)):
    user = verify_token(authorization)
    doc_ref = db.collection("students").document()  # Auto-ID
    doc_ref.set(student.dict())
    return {"ok": True, "student": {**student.dict(), "id": doc_ref.id}}

@app.patch("/api/students/{sid}")
async def update_student(sid: str, updates: dict = Body(...), authorization: Optional[str] = Header(None)):
    user = verify_token(authorization)
    doc_ref = db.collection("students").document(sid)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Student not found")
    doc_ref.update(updates)
    updated_student = doc_ref.get().to_dict()
    updated_student["id"] = sid
    return {"ok": True, "student": updated_student}

@app.get("/api/stats")
async def get_stats():
    coll = db.collection("students")
    docs = coll.get()
    total = len(docs)
    stages = {"Exploring": 0, "Shortlisting": 0, "Applying": 0, "Submitted": 0}
    not_contacted_7days = 0
    needs_essay_help = 0
    now = datetime.datetime.utcnow()

    for d in docs:
        data = d.to_dict()
        stages[data.get("application_status", "Exploring")] += 1

        comms = list(db.collection("students").document(d.id)
                     .collection("communications")
                     .order_by("ts", direction=firestore.Query.DESCENDING)
                     .limit(1)
                     .stream())
        last_comm_ts = comms[0].to_dict().get("ts") if comms else None
        if last_comm_ts is None or (now - last_comm_ts.replace(tzinfo=None)).days > 7:
            not_contacted_7days += 1
        if data.get("needs_essay_help", False):
            needs_essay_help += 1

    return {
        "total": total,
        "stages": stages,
        "not_contacted_7days": not_contacted_7days,
        "needs_essay_help": needs_essay_help
    }

class TaskUpdateIn(BaseModel):
    title: Optional[str] = None
    due_at: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None

@app.patch("/api/students/{sid}/tasks/{tid}")
async def update_task(
    sid: str,
    tid: str,
    task_updates: TaskUpdateIn,
    authorization: Optional[str] = Header(None),
):
    """
    Update an existing task. Partial updates supported.
    """
    user = verify_token(authorization)
    task_ref = db.collection("students").document(sid).collection("tasks").document(tid)
    task_doc = task_ref.get()
    if not task_doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")
    
    updates = {}
    if task_updates.title is not None:
        updates["title"] = task_updates.title
    if task_updates.due_at is not None:
        updates["due_at"] = task_updates.due_at
    if task_updates.notes is not None:
        updates["notes"] = task_updates.notes
    if task_updates.assigned_to is not None:
        updates["assigned_to"] = task_updates.assigned_to
    if task_updates.status is not None:
        updates["status"] = task_updates.status
    
    if updates:
        updates["updated_at"] = firestore.SERVER_TIMESTAMP
        task_ref.update(updates)
    
    updated = task_ref.get().to_dict()
    updated["id"] = tid
    if "updated_at" in updated:
        updated["updated_at"] = _ts_to_iso(updated["updated_at"])
    return {"ok": True, "task": updated}

@app.delete("/api/students/{sid}/tasks/{tid}")
async def delete_task(
    sid: str,
    tid: str,
    authorization: Optional[str] = Header(None),
):
    """
    Delete a task.
    """
    user = verify_token(authorization)
    task_ref = db.collection("students").document(sid).collection("tasks").document(tid)
    task_doc = task_ref.get()
    if not task_doc.exists:
        raise HTTPException(status_code=404, detail="Task not found")
    task_ref.delete()
    return {"ok": True, "id": tid}

class TaskIn(BaseModel):
    title: str
    due_at: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    priority: Optional[str] = "medium"  # low, medium, high

@app.post("/api/students/{sid}/tasks")
async def add_task(sid: str, task: TaskIn, authorization: Optional[str] = Header(None)):
    user = verify_token(authorization)
    doc = {
        "title": task.title,
        "due_at": task.due_at or None,
        "notes": task.notes or "",
        "assigned_to": task.assigned_to or user.get("email", "unknown"),
        "created_by": user.get("email", "unknown"),
        "created_at": firestore.SERVER_TIMESTAMP,
        "status": "open",
        "priority": task.priority or "medium"
    }
    ref = db.collection("students").document(sid).collection("tasks").add(doc)
    return {"ok": True, "id": ref[1].id}

def generate_ai_summary(student_data: dict, interactions: list, communications: list, notes: list, tasks: list) -> dict:
    """
    Generate a contextual AI summary based on student's profile and activity.
    This is a mock implementation - in production, this would use an LLM API.
    """
    name = student_data.get("name", "Student")
    status = student_data.get("application_status", "Exploring")
    grade = student_data.get("grade", 12)
    country = student_data.get("country", "Unknown")
    
    # Analyze activity levels
    num_interactions = len(interactions)
    num_communications = len(communications)
    num_notes = len(notes)
    num_tasks = len(tasks)
    
    # Count recent activity (last 7 days)
    from datetime import datetime, timedelta, timezone as tz
    now = datetime.now(tz.utc)  # Changed to timezone-aware
    recent_cutoff = now - timedelta(days=7)
    
    recent_interactions = 0
    for i in interactions:
        if i.get("ts"):
            ts = i["ts"]
            # Handle both string and datetime objects
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                except:
                    continue
            # Make naive datetimes timezone-aware
            if isinstance(ts, datetime):
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=tz.utc)
                if ts > recent_cutoff:
                    recent_interactions += 1
    
    # Engagement level
    total_activity = num_interactions + num_communications
    if total_activity > 10:
        engagement = "highly engaged"
    elif total_activity > 5:
        engagement = "moderately engaged"
    else:
        engagement = "needs more engagement"
    
    # Status-based insights
    status_insights = {
        "Exploring": [
            "still in early exploration phase",
            "beginning their college search journey",
            "researching various university options"
        ],
        "Shortlisting": [
            "actively narrowing down college choices",
            "comparing universities and programs",
            "finalizing their target school list"
        ],
        "Applying": [
            "in active application phase",
            "working on application materials",
            "preparing essays and documentation"
        ],
        "Submitted": [
            "has submitted applications",
            "awaiting admission decisions",
            "in the final stages of the process"
        ]
    }
    
    # Build summary components
    status_insight = random.choice(status_insights.get(status, ["progressing through the process"]))
    
    # Activity analysis
    if recent_interactions > 3:
        activity_note = f"Shows strong recent activity with {recent_interactions} interactions in the past week."
    elif recent_interactions > 0:
        activity_note = f"Has logged in {recent_interactions} time(s) recently."
    else:
        activity_note = "No recent platform activity detected."
    
    # Task analysis
    open_tasks = sum(1 for t in tasks if t.get("status") == "open")
    if open_tasks > 0:
        task_note = f"Has {open_tasks} pending task(s) requiring attention."
    else:
        task_note = "No outstanding tasks."
    
    # Communication analysis
    if num_communications > 5:
        comm_note = "Regular communication history suggests good engagement."
    elif num_communications > 0:
        comm_note = "Limited communication history - consider more touchpoints."
    else:
        comm_note = "No communication logged yet - initial outreach recommended."
    
    # AI questions analysis
    ai_questions = [i for i in interactions if i.get("type") == "ai_question"]
    if len(ai_questions) > 3:
        question_note = "Actively seeking guidance through AI assistant."
    elif len(ai_questions) > 0:
        question_note = "Has used AI assistant for questions."
    else:
        question_note = "Has not yet engaged with AI assistant."
    
    # Build recommendation
    recommendations = []
    if status == "Exploring" and num_communications < 2:
        recommendations.append("Schedule initial consultation to discuss university options")
    if status == "Shortlisting" and open_tasks > 0:
        recommendations.append("Follow up on pending tasks to maintain momentum")
    if status == "Applying" and recent_interactions == 0:
        recommendations.append("Check in on application progress and offer essay support")
    if num_communications == 0:
        recommendations.append("Initiate first contact to establish relationship")
    if open_tasks > 2:
        recommendations.append("Review and prioritize multiple pending tasks")
    
    # Priority score (1-5)
    priority = 3  # default
    if status in ["Applying", "Submitted"] and recent_interactions == 0:
        priority = 5  # high
    elif open_tasks > 2 or num_communications == 0:
        priority = 4
    elif status == "Exploring" and total_activity < 3:
        priority = 2
    
    # Build final summary
    summary_text = (
        f"{name} is a Grade {grade} student from {country} who is {status_insight}. "
        f"They are currently {engagement} on the platform. {activity_note} "
        f"{comm_note} {question_note} {task_note}"
    )
    
    return {
        "summary": summary_text,
        "priority_score": priority,
        "engagement_level": engagement,
        "recommendations": recommendations[:2],  # Top 2 recommendations
        "key_metrics": {
            "total_interactions": num_interactions,
            "recent_activity": recent_interactions,
            "communications": num_communications,
            "open_tasks": open_tasks,
            "ai_questions_asked": len(ai_questions)
        },
        "generated_at": datetime.now(tz.utc).isoformat()
    }

@app.get("/api/students/{sid}/ai-summary")
async def get_ai_summary(sid: str):
    """
    Generate an AI-powered summary of the student's profile and activity.
    """
    # Fetch student data
    doc_snap = db.collection("students").document(sid).get()
    if not doc_snap.exists:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student = doc_snap.to_dict()
    
    # Fetch all activity data
    interactions = []
    for x in db.collection("students").document(sid).collection("interactions").stream():
        d = x.to_dict()
        interactions.append(d)
    
    communications = []
    for x in db.collection("students").document(sid).collection("communications").stream():
        d = x.to_dict()
        communications.append(d)
    
    notes = []
    for x in db.collection("students").document(sid).collection("notes").stream():
        d = x.to_dict()
        notes.append(d)
    
    tasks = []
    for x in db.collection("students").document(sid).collection("tasks").stream():
        d = x.to_dict()
        tasks.append(d)
    
    # Generate summary
    summary = generate_ai_summary(student, interactions, communications, notes, tasks)
    
    return {
        "ok": True,
        "student_id": sid,
        "ai_summary": summary
    }

# In your backend/main.py, update the verify_token function:
def verify_token(auth_header: Optional[str]):
    if DEV_MODE:
        # For demo purposes, accept any token
        return {"uid": "demo-user", "email": "demo@undergraduation.com"}
    
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    # In production, this would verify Firebase tokens
    # For demo, we'll accept any token
    return {"uid": "demo-user", "email": "demo@undergraduation.com"}