# seed_interactions.py
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv(dotenv_path=".env")

FIREBASE_SA_PATH = os.getenv("FIREBASE_SA_PATH", "./firebase_service_account.json")

# Initialize Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_SA_PATH)
    firebase_admin.initialize_app(cred)
db = firestore.client()

# Mock data pools
AI_QUESTIONS = [
    "How do I write a strong personal statement for US universities?",
    "What are the SAT requirements for Ivy League schools?",
    "Can you help me understand early decision vs early action?",
    "What extracurriculars should I highlight in my application?",
    "How important are AP courses for college admissions?",
    "What makes a good college essay topic?",
    "How do I request letters of recommendation?",
    "What should I know about financial aid applications?",
    "Can you explain the Common App?",
    "What are safety, target, and reach schools?",
    "How do I prepare for college interviews?",
    "What's the difference between need-blind and need-aware admissions?"
]

DOCUMENTS = [
    "High School Transcript",
    "SAT Score Report",
    "ACT Score Report",
    "Personal Statement Draft",
    "Common App Essay",
    "Supplemental Essay - Why Major",
    "Letter of Recommendation - Teacher 1",
    "Letter of Recommendation - Teacher 2",
    "Extracurricular Activities List",
    "Resume/CV",
    "Financial Aid Documents",
    "TOEFL Score Report"
]

def generate_timestamp(days_ago_min, days_ago_max):
    """Generate a random timestamp within the past X days"""
    days_ago = random.randint(days_ago_min, days_ago_max)
    hours_ago = random.randint(0, 23)
    minutes_ago = random.randint(0, 59)
    return datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)

def clear_existing_interactions(student_id):
    """Delete all existing interactions for a student"""
    interactions_col = db.collection("students").document(student_id).collection("interactions")
    docs = interactions_col.stream()
    deleted_count = 0
    for doc in docs:
        doc.reference.delete()
        deleted_count += 1
    return deleted_count

def seed_interactions_for_student(student_id):
    """Add 3-6 varied interactions for a student"""
    interactions_col = db.collection("students").document(student_id).collection("interactions")
    
    # Determine how many of each type
    num_logins = random.randint(1, 2)
    num_questions = random.randint(1, 3)
    num_documents = random.randint(1, 2)
    
    interactions = []
    
    # Generate login activities
    for i in range(num_logins):
        interactions.append({
            "type": "login",
            "details": "Logged in",
            "ts": generate_timestamp(1, 30)
        })
    
    # Generate AI questions
    questions_used = random.sample(AI_QUESTIONS, min(num_questions, len(AI_QUESTIONS)))
    for question in questions_used:
        interactions.append({
            "type": "ai_question",
            "details": f"Asked: {question}",
            "ts": generate_timestamp(1, 25)
        })
    
    # Generate document submissions
    docs_used = random.sample(DOCUMENTS, min(num_documents, len(DOCUMENTS)))
    for doc in docs_used:
        interactions.append({
            "type": "document_submitted",
            "details": f"Submitted: {doc}",
            "ts": generate_timestamp(1, 20)
        })
    
    # Sort by timestamp descending
    interactions.sort(key=lambda x: x["ts"], reverse=True)
    
    # Add to Firestore
    for interaction in interactions:
        interactions_col.add(interaction)
    
    return len(interactions)

def main():
    print("⚠️  This will DELETE all existing interactions and create new mock data.")
    response = input("Continue? (yes/no): ").strip().lower()
    
    if response != "yes":
        print("Cancelled.")
        return
    
    # Get all students
    students = db.collection("students").limit(100).get()
    
    total_deleted = 0
    total_added = 0
    
    for student in students:
        student_id = student.id
        print(f"\nProcessing student: {student_id}")
        
        # Clear existing interactions
        deleted = clear_existing_interactions(student_id)
        if deleted > 0:
            print(f"  → Deleted {deleted} existing interactions")
            total_deleted += deleted
        
        # Add new mock interactions
        count = seed_interactions_for_student(student_id)
        total_added += count
        print(f"  → Added {count} new interactions")
    
    print(f"\n✅ Done!")
    print(f"   Deleted: {total_deleted} interactions")
    print(f"   Added: {total_added} new interactions")

if __name__ == "__main__":
    main()