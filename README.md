# 🎟️ QR-Based Event Attendance & Entry Verification System

A modern, full-stack event registration and attendance verification system built for small-to-mid events (up to 300 attendees). The system provides secure user registration with OTP validation, instant digital ticket delivery containing a non-guessable QR code, gate-side camera scanning with atomic duplicate entry prevention, a real-time tracking dashboard, and administrative tools.

---

## 🚀 Key Features

*   **Attendee Registration & Login:** Direct event entry workflow with built-in duplicate detection and event capacity enforcement.
*   **OTP Email Verification:** Verifies the registrant's email via a 6-digit OTP before generating and sending the ticket.
*   **Dynamic QR Tickets:** Automatically generates a high-resolution QR ticket containing a non-guessable UUID v4 token, delivered instantly as an embedded inline image in the email.
*   **Opaque QR Protocol:** No security credentials (JWTs or secrets) are embedded inside the QR payload, preventing forge-and-leak attacks.
*   **Atomic Duplicate Prevention:** Uses MongoDB's atomic `findOneAndUpdate` queries to prevent double-entry fraud at the gates.
*   **Real-time Organizer Dashboard:** Instantly tracks entry rates and scanner statistics using WebSockets (Socket.IO).
*   **Organizer Portal:** Dedicated Organizer Login for coordinators to access ticket verification and gate scanner tools.
*   **Manual Gate Check-in:** Administrative fallback option to search and check in guests using their email in case of broken phone screens.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18, Vite, Tailwind CSS, Axios, React Router, Socket.io-client, React-QR-Reader (or HTML5-QR-Code)
*   **Backend:** Node.js, Express.js, Socket.IO, Nodemailer, UUID, BcryptJS, JWT
*   **Database:** MongoDB, Mongoose

---

## 📂 Folder Structure

```text
event-management-system/
├── start-all.js                 # Launcher script to run both client and server
├── package.json                 # Workspace dependencies & runner scripts
├── README.md                    # Project documentation (this file)
│
├── backend/                     # Node.js API Service
│   ├── server.js                # Server entry & Middleware orchestration
│   ├── config/                  # Database connections
│   ├── models/                  # Database schemas (User, Registration)
│   ├── controllers/             # Express route handler logic
│   ├── routes/                  # Express route declarations
│   ├── middleware/              # JWT & auth middleware
│   ├── services/                # QR Code generator and Nodemailer SMTP engine
│   └── utils/                   # Socket.IO handlers
│
└── frontend/                    # Client Dashboard & Registration App
    ├── index.html
    ├── src/
    │   ├── main.jsx             # React startup script
    │   ├── App.jsx              # Client routing and component wiring
    │   ├── pages/               # Register, Login, Scanner, and Dashboard pages
    │   ├── components/          # Reuseable Navbar and Protected Routes
    │   ├── services/            # Axios API config
    │   └── context/             # Auth provider holding scanner tokens
```

---

## ⚙️ Environment Configuration

Create a `.env` file inside the `backend/` directory:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/event-db
JWT_SECRET=your_super_secret_jwt_key
SCANNER_SECRET=your_scanner_auth_secret_key
EVENT_NAME="Grand Event 2026"
EVENT_CAPACITY=300
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
CLIENT_URL=http://localhost:5173
```

---

## 🔌 API Documentation

### 1. Registration Routes (`/api/registrations`)
*   `POST /api/registrations`: Starts registration, triggers an OTP verification email.
*   `POST /api/registrations/verify-otp`: Confirms OTP, marks registration status as `VALID`, generates ticket, and emails the QR code.
*   `POST /api/registrations/qr/resend`: Re-sends the QR code ticket to a registered and verified email.

### 2. Scanner & Admin Routes (`/api/scanner`)
*   `POST /api/scanner/verify`: (Protected - Scanner JWT) Scans and atomic-updates attendee scan status. Broadcasts real-time count.
*   `POST /api/scanner/manual`: (Protected - Admin/Scanner JWT) Manually checks in attendees via email.
*   `GET /api/scanner/dashboard`: (Protected - Scanner JWT) Returns registration stats, scan ratios, and list of recent check-ins.

### 3. Authentication Routes (`/api/auth`)
*   `POST /api/auth/login`: Authenticates scanner/admin accounts and issues JWT access token.
*   `POST /api/auth/register`: (Admin only/Setup) Seeds a new scanner account.

---

## 🏃 Run the Application

### Prerequisites
*   Node.js installed (v18+)
*   MongoDB running locally or a MongoDB Atlas URI

### Step 1: Install Dependencies
From the root directory, run the helper command to install dependencies for root, backend, and frontend:
```bash
npm run install-all
```

### Step 2: Start the System
To run the Node.js backend server and Vite frontend client concurrently:
```bash
npm start
```
*   **Frontend Client:** Runs on `http://localhost:5173`
*   **Backend API Server:** Runs on `http://localhost:5001`
