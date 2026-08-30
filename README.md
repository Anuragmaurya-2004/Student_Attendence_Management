# Attendance Management System (Open Source MERN Stack)

A college attendance management system with:
- QR-code based student check-in (via web camera, no app install needed)
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

| Role | Email | Password |
|---|---|---|
| Admin | admin@college.edu | Admin@123 |
| Faculty | priya.sharma@college.edu | Faculty@123 |
| Student | student1@college.edu (…student5) | Student@123 |

---

## 6. Typical Workflow

1. **Admin** logs in → Academic Setup: create Academic Year → Department → Class Batch → Courses (mark each as `theory` or `practical` with weekly hours)
2. **Admin** adds Students and Faculty
3. **Faculty** logs in → "My Sessions" → schedules a session for a course/class/date/time
4. **Faculty** opens the session → clicks "Generate QR Code" → displays it (e.g. projector/screen) — valid for a limited time (default 10 min, configurable via `QR_TOKEN_VALID_MINUTES`)
5. **Students** log in on their own phone/laptop → "Scan QR" → camera scans the code → attendance marked instantly
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
