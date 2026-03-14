# Cove - Setup Guide

## Prerequisites
Make sure you have these installed:
- [Node.js 18+](https://nodejs.org)
- [Git](https://git-scm.com)

---
## Step 1 — Clone the Repo

```bash
git clone https://github.com/sheisstarwithoutmoon/cove.git
cd cove
```
---

## Step 2 — Get Your API Keys
You need 3 free accounts:
### Groq (LLM)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up → API Keys → Create API Key
3. Copy it → looks like `gsk_xxxxxxxxxx`

### Tavily (Search)
1. Go to [tavily.com](https://tavily.com)
2. Sign up → Dashboard → API Keys
3. Copy it → looks like `tvly-xxxxxxxxxx`

### Firebase (Auth + Database)
1. Go to [firebase.google.com](https://firebase.google.com) → Add Project → name it `cove`
2. **Enable Google Auth:**
   - Left sidebar → Authentication → Get Started
   - Sign-in providers → Google → Enable → Save
3. **Enable Firestore:**
   - Left sidebar → Firestore Database → Create Database
   - Start in test mode → Choose a region → Done
4. **Get Frontend Config:**
   - Project Settings (gear icon) → Your apps → Add app → Web (`</>`)
   - Register app → copy the `firebaseConfig` object
5. **Get Service Account Key:**
   - Project Settings → Service Accounts → Generate new private key
   - Downloads a JSON file → rename it to `serviceAccountKey.json`

---

## Step 3 — Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
GROQ_API_KEY=your_groq_key_here
TAVILY_API_KEY=your_tavily_key_here
PORT=8000
```

Place `serviceAccountKey.json` inside the `backend/` folder:

Start the backend:

```bash
npm run dev
```
---

## Step 4 — Frontend Setup

Open a **new terminal**:

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend/` folder:

```env
REACT_APP_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

## Folder Structure

```
cove/
├── backend/
│   ├── agents/
│   │   ├── orchestrator.js
│   │   ├── searchAgent.js
│   │   ├── summarizerAgent.js
│   │   ├── verifierAgent.js
│   │   └── reportAgent.js
│   ├── middleware/
│   │   └── auth.js
│   ├── firebase.js
│   ├── index.js
│   ├── package.json
│   ├── .env                   ← you create this
│   └── serviceAccountKey.json ← you download this
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── AgentProgress.jsx
    │   │   └── ReportView.jsx
    │   ├── App.jsx
    │   ├── index.js
    │   └── firebase.js
    ├── package.json
    └── .env                   ← you create this
```
