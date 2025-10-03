# Undergraduation CRM Dashboard

A lightweight internal CRM dashboard for managing student interactions and tracking college application progress. Built for internal teams to monitor student engagement, communication history, and application stages.

---

## Project Overview

This admin dashboard provides a centralized view of student journeys, showing how they've engaged with the platform, what communications they've received, and where they stand in the college application process. The system helps education teams provide better, more personalized support throughout the application journey.

---

## Features

### Student Management

* Student directory with search and filtering
* Individual student profiles with detailed information
* Application progress tracking (Exploring, Shortlisting, Applying, Submitted)
* Student creation and editing capabilities

### Communication & Tracking

* Communication logging (calls, emails, SMS)
* Internal notes system with full CRUD operations
* Interaction timeline tracking
* Mock email system for follow-ups

### Task Management

* Task creation and assignment
* Priority levels and due dates
* Task status tracking (open, in progress, completed)

### Analytics & Insights

* Dashboard statistics and metrics
* Quick filters for common scenarios
* AI-powered student summaries
* Real-time data visualization

---

## Tech Stack

* **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
* **Backend:** Python, FastAPI
* **Database:** Firebase Firestore
* **Authentication:** Firebase Auth
* **Email:** Customer.io (mock implementation)

---

## Requirements

* Node.js 18+
* Python 3.8+
* Firebase project with Firestore enabled

---

## Setup Instructions

### Backend Setup

```bash
cd backend
```

Create virtual environment and install dependencies:

```bash
python -m venv .venv
.\.venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

Set up environment variables in `backend/.env`:

```
FIRESTORE_EMULATOR_HOST=127.0.0.1:9099
DEV_MODE=true
FIREBASE_SA_PATH=./firebase_service_account.json
```

Start the backend server:

```bash
python main.py
```

---

### Frontend Setup

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

---

### Database Seeding

Seed the database with sample data:

```bash
cd backend
python seed_students.py
```

---

## Usage

Access the application at:
[http://localhost:3000](http://localhost:3000)

**Demo Credentials:**

* Email: `admin@undergraduation.com`
* Password: `admin123`

Explore the student directory, apply filters, and manage student interactions through individual profile pages.

---
