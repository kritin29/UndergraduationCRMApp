# backend/seed_students.py
import os
import random
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load .env
load_dotenv(".env")

# --- Set Firestore emulator host BEFORE initializing Firebase ---
emulator_host = os.getenv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:9099")
os.environ["FIRESTORE_EMULATOR_HOST"] = emulator_host

# --- Initialize Firebase Admin SDK ---
sa_path = os.getenv("FIREBASE_SA_PATH", "./firebase_service_account.json")
cred = credentials.Certificate(sa_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()
print("Firebase Admin initialized. Using Firestore emulator at:", emulator_host)

# --- Seed function ---
def seed(n=30):
    statuses = ["Exploring", "Shortlisting", "Applying", "Submitted"]
    countries = ["IN", "US", "CA", "AE", "UK"]

    for i in range(n):
        # Calculate days since last active
        days_since_active = random.randint(0, 30)
        
        doc = {
            "name": f"Student {i+1}",
            "email": f"student{i+1}@example.com",
            "phone": f"+91-90000{i+1:04d}",  # Changed to i+1
            "grade": random.choice([11, 12]),
            "country": random.choice(countries),
            "application_status": random.choice(statuses),
            "last_active": (datetime.now(timezone.utc) - timedelta(days=days_since_active)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "tags": ["high_intent"] if (i+1) % 5 == 0 else [],  # Changed to i+1
            
            # Set boolean flags during creation with better distribution
            "not_contacted_7days": days_since_active > 7,  # True if last active > 7 days ago
            "high_intent": (i+1) % 3 == 0,  # Changed to i+1 - ~33% will be high intent
            "needs_essay_help": (i+1) % 4 == 0,  # Changed to i+1 - ~25% will need essay help
        }

        # Add student document
        ref = db.collection("students").add(doc)
        sid = ref[1].id

        # Add subcollections
        db.collection("students").document(sid).collection("interactions").add({
            "type": "login",
            "ts": datetime.now(timezone.utc).isoformat(),
            "details": "Logged in (seed)"
        })
        # db.collection("students").document(sid).collection("notes").add({
        #     "author": "system",
        #     "text": "Seed note",
        #     "ts": datetime.now(timezone.utc).isoformat()
        # })

    print(f"Seeded {n} students.")

# --- Run seeding ---
if __name__ == "__main__":
    # Clear existing data first
    students = db.collection("students").stream()
    for student in students:
        db.collection("students").document(student.id).delete()
    print("Cleared existing students.")
    
    # Seed new data
    seed(30)

    # Verify the data
    all_students = list(db.collection("students").stream())
    not_contacted = sum(1 for s in all_students if s.to_dict().get('not_contacted_7days'))
    high_intent = sum(1 for s in all_students if s.to_dict().get('high_intent'))
    needs_essay = sum(1 for s in all_students if s.to_dict().get('needs_essay_help'))
    
    print(f"\nVerification:")
    print(f"Total students: {len(all_students)}")
    print(f"Not contacted 7d: {not_contacted}")
    print(f"High intent: {high_intent}")
    print(f"Needs essay help: {needs_essay}")