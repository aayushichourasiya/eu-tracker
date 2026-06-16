# EU Switch Tracker

A cloud-synced progress tracker for your 4-month Java Backend Engineer → EU company preparation plan.

## Features
- ✅ Syncs across ALL devices (phone, laptop, tablet)
- ✅ Firebase Firestore backend (free)
- ✅ Daily log for all 16 weeks
- ✅ Topic checklist (150+ subtopics)
- ✅ Application tracker (8 target companies)
- ✅ English improvement plan + STAR stories
- ✅ Study journal

## Deploy in 3 steps

### 1. Install dependencies
```bash
npm install
```

### 2. Run locally to test
```bash
npm run dev
```
Open http://localhost:5173

### 3. Deploy to Vercel
Push to GitHub, then connect repo on vercel.com → Deploy.

## Firebase Setup
Your Firebase config is already wired into `src/firebase.js`.

**Important:** Go to Firebase Console → Firestore → Rules and set:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
This keeps it open (fine for personal use, no sensitive data).
