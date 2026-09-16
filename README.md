# Attendance Management System (Open Source MERN Stack)

A college attendance management system with:
- QR-code based student check-in (via web camera, no app install needed), with rotating tokens and GPS geofencing
- Manual attendance marking by faculty
- **Theory vs Practical hours tracked separately** per course, for accurate defaulter detection
- Automated **email notifications** to students & parents when attendance drops below threshold
- **Holiday calendar** — sessions can't be scheduled on holidays, and they're excluded from attendance %
- **Academic Year Rollover** — promote students to the next year/semester while preserving full attendance history
- Excel/PDF export of defaulter reports
- Role-based access: Admin, Faculty, Student

Built entirely with open-source, self-hostable tools: **MongoDB, Express.js, React, Node.js** (MERN).

---

## 1. Project Structure

```
attendance-system/
├── backend/            # Node.js + Express + MongoDB API
│   ├── src/
│   │   ├── config/       # DB connection
│   │   ├── models/       # Mongoose schemas
│   │   ├── controllers/  # Route handlers
│   │   ├── routes/       # Express routers
│   │   ├── middleware/   # Auth, error handling
│   │   ├── services/     # Defaulter calculation, mail sending
│   │   ├── cron/         # Scheduled defaulter-check + notification job
│   │   ├── utils/        # JWT helper, DB seed script
│   │   ├── app.js        # Express app setup
│   │   └── server.js     # Entry point
│   ├── package.json
│   └── .env.example
└── frontend/           # React (Vite) + Tailwind CSS
    ├── src/
    │   ├── api/           # Axios client
    │   ├── context/       # Auth context
    │   ├── components/    # Shared UI, layout, route guard
    │   ├── pages/
    │   │   ├── admin/     # Dashboard, Academic Setup, Students, Faculty, Holidays, Defaulters, Rollover
    │   │   ├── faculty/   # Sessions, Session detail (QR + manual marking), Defaulters
    │   │   └── student/   # My Attendance, Scan QR
    │   └── App.jsx        # Routing
    ├── package.json
    └── .env.example
```

---

## 2. Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (Community Edition) running locally, or a connection string to any MongoDB instance
  - Install locally: https://www.mongodb.com/docs/manual/installation/
  - Or run via Docker: `docker run -d -p 27017:27017 --name mongo mongo:7`
- (Optional) An SMTP account for sending emails — e.g. a Gmail account with an **App Password**, or any SMTP provider (Mailtrap for testing, SendGrid free tier, self-hosted Postfix, etc.)

---

## 3. Backend Setup

```bash
cd attendance-system/backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — your MongoDB connection string (default works for local MongoDB)
- `JWT_SECRET` — change to a long random string
- `SMTP_*` — fill in to enable email notifications (leave blank to skip emails; the app will log a warning and continue working otherwise)
- `DEFAULTER_THRESHOLD_PERCENT` — default minimum attendance % (e.g. 75)
- `QR_TOKEN_VALID_SECONDS` — QR token lifetime (default 20 seconds)
- `QR_ROTATION_INTERVAL_SECONDS` — faculty-screen refresh interval (default 15 seconds)
- `QR_TOKEN_GRACE_SECONDS` — previous-token grace period (default 5 seconds)
- `GEOFENCE_DEFAULT_RADIUS_METERS` — fallback classroom radius (default 75m)
- `GEOFENCE_MAX_ACCURACY_METERS` — maximum accepted browser GPS uncertainty (default 100m)
- `CLIENT_URL` — your frontend URL (for CORS), default `http://localhost:5173`

**Seed demo data** (creates a department, academic year, class, 2 courses, 1 admin, 1 faculty, 5 students):
```bash
npm run seed
```
This prints login credentials for all demo users at the end.

**Run the server:**
```bash
npm run dev     # with auto-restart (nodemon)
# or
npm start       # plain node
```
The API runs on `http://localhost:5000` by default. Health check: `GET /api/health`.

A cron job automatically runs daily at 18:00 server time to recompute attendance %, detect defaulters, and email notifications. You can also trigger it manually via `POST /api/reports/run-notifications` (admin only) — the frontend "Defaulters" page has a button for this too.

---

## 4. Frontend Setup

```bash
cd attendance-system/frontend
npm install
cp .env.example .env
```

Edit `.env` if your backend isn't on `http://localhost:5000`:
```
VITE_API_URL=http://localhost:5000/api
```

**Run the dev server:**
```bash
npm run dev
```
Open `http://localhost:5173`.

**Build for production:**
```bash
npm run build
```
This outputs static files to `frontend/dist/`, which can be served by any static file host (Nginx, Netlify, etc.)

---

## 5. Demo Login Credentials (after running `npm run seed`)

| Designation / Role | Department | Email | Password |
|---|---|---|---|
| **Principal (Admin)** | All | `admin@college.edu` | `Admin@123` |
| **HOD (Admin)** | Computer Engg (CSE) | `hod.cse@college.edu` | `Hod@1234` |
| **HOD (Admin)** | Information Tech (IT) | `hod.it@college.edu` | `Hod@1234` |
| **HOD (Admin)** | AI & Data Science (AI-DS) | `hod.aids@college.edu` | `Hod@1234` |
| **Teacher (Faculty)** | Computer Engg (CSE) | `priya.sharma@college.edu` | `Faculty@123` |
| **Teacher (Faculty)** | Computer Engg (CSE) | `amit.deshmukh@college.edu` | `Faculty@123` |
| **Teacher (Faculty)** | Information Tech (IT) | `sneha.joshi@college.edu` | `Faculty@123` |
| **Teacher (Faculty)** | Information Tech (IT) | `vikram.patel@college.edu` | `Faculty@123` |
| **Teacher (Faculty)** | AI & Data Science (AI-DS) | `neha.gupta@college.edu` | `Faculty@123` |
| **Student 1 (On-Duty / Visit)** | TE-CSE | `student1@college.edu` | `Student@123` |
| **Student 2 (On-Duty / Visit)** | TE-CSE | `student2@college.edu` | `Student@123` |
| **Student 5 (Hackathon Finalist)**| TE-CSE | `student5@college.edu` | `Student@123` |
| **Student 7 (Defaulter Demo)**| TE-CSE | `student7@college.edu` | `Student@123` |
| **Other Students (1 to 20)**| Various Batches | `studentX@college.edu` | `Student@123` |

---

## 6. Typical Workflow

1. **Admin** logs in → Academic Setup: create Academic Year → Department → Class Batch → Courses (mark each as `theory` or `practical` with weekly hours)
2. **Admin** adds Students and Faculty
3. **Faculty** logs in → "My Sessions" → schedules a session for a course/class/date/time
4. **Faculty** opens the session while in the classroom → sets the venue with "Use My Current Location" → clicks "Generate QR Code". The displayed QR rotates automatically every 15 seconds and each token is valid for 20 seconds by default.
5. **Students** log in on their own phone/laptop → "Scan QR" → the camera and browser GPS are used together. The server checks the rotating token, batch membership, duplicate attendance, and classroom distance before creating a QR attendance record.
   - Faculty can also mark attendance manually per student (present/absent/late) from the same session page
6. **Admin/Faculty** view "Defaulters" — students below the attendance threshold, split by theory/practical per course
7. The **cron job** automatically emails students + parents when they cross below threshold (max once/week per course to avoid spam)
8. **Admin** manages the **Holiday Calendar** — sessions cannot be scheduled on holidays, so they never count against total held hours
9. At year-end, **Admin** uses "Year Rollover" to promote students to the next class/academic year — attendance history remains intact and viewable under the old year; graduating batches can be marked "passed out" instead of promoted

---

## 7. Notes on Notifications

- **Email** (via Nodemailer) is the primary free/open-source notification channel. Configure `SMTP_*` env vars.
  - Easiest for testing: Gmail with an [App Password](https://support.google.com/accounts/answer/185833), or a free [Mailtrap](https://mailtrap.io) sandbox inbox.
- **SMS** is not included — genuinely free/open-source SMS gateways don't really exist (telecom routing costs money). If needed later, integrate a paid provider (Twilio, MSG91, etc.) as a separate step.
- **WhatsApp** notifications can be added later using the open-source [Baileys](https://github.com/WhiskeySockets/Baileys) library (unofficial WhatsApp Web API) — not included in this initial build to keep things stable and ToS-safe by default.

---

## 8. Deployment (Production)

Recommended for self-hosting on a VPS:
1. Run MongoDB as a service (or use Docker: `docker run -d -p 27017:27017 -v mongo_data:/data/db mongo:7`)
2. Run the backend with **PM2**: `pm2 start src/server.js --name attendance-api`
3. Build the frontend (`npm run build`) and serve `frontend/dist/` via **Nginx**, reverse-proxying `/api` to the backend
4. Add SSL via **Certbot** (Let's Encrypt) if using a public domain
5. Set `NODE_ENV=production` and a strong `JWT_SECRET` in the backend `.env`
6. Take regular MongoDB backups (`mongodump`) since attendance is historical record data

A Docker Compose file for local orchestration is included at the repo root (`docker-compose.yml`) as a starting point — adjust as needed for your production environment.

---

## 9. Tech Stack Summary

| Layer | Tool | License |
|---|---|---|
| Frontend | React (Vite), Tailwind CSS, React Router, Axios, Recharts-ready, html5-qrcode | MIT/Apache-2.0 |
| Backend | Node.js, Express.js, Mongoose | MIT |
| Database | MongoDB Community Edition | SSPL (free to self-host) |
| Auth | JWT + bcrypt | MIT |
| Scheduling | node-cron | MIT |
| Email | Nodemailer | MIT |
| Export | ExcelJS, PDFKit | MIT |
