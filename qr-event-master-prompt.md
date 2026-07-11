# Master Prompt — QR-Based Event Attendance & Entry Verification System

## Project Context

Build a full-stack QR-based event attendance and entry verification system for small-to-mid events (up to 300 attendees). The system handles user registration, QR code generation and email delivery, gate-side scanning with duplicate prevention, a real-time dashboard, and Excel export. It is production-ready but not over-engineered.

---

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Auth:** JWT (for scanner devices and admin)
- **QR Generation:** `qrcode` npm package
- **Email:** Nodemailer (SMTP or SendGrid)
- **Real-time:** Socket.IO
- **Excel Export:** `exceljs`
- **Environment:** `.env` for all secrets

---

## Folder Structure

```
event-management-system/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── RegisterPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── ScannerPage.jsx
│       │   └── DashboardPage.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   └── ProtectedRoute.jsx
│       ├── services/
│       │   ├── api.js
│       │   └── socket.js
│       ├── context/
│       │   └── AuthContext.jsx
│       └── App.jsx
│
└── backend/
    ├── config/
    │   └── db.js
    ├── models/
    │   ├── Event.js
    │   └── Registration.js
    ├── controllers/
    │   ├── eventController.js
    │   ├── registrationController.js
    │   └── scannerController.js
    ├── routes/
    │   ├── eventRoutes.js
    │   ├── registrationRoutes.js
    │   └── scannerRoutes.js
    ├── services/
    │   ├── qrService.js
    │   └── mailService.js
    ├── middleware/
    │   └── authMiddleware.js
    ├── utils/
    │   └── socketHandler.js
    └── server.js
```

> Note: ScanLog collection is intentionally removed. All scan data lives in the Attendance collection — no redundant writes.

---

## Database Schema

### Event Collection
```json
{
  "_id": "ObjectId",
  "eventId": "EVT001",
  "eventName": "New Year Bash",
  "eventDate": "2026-12-31",
  "location": "Bangalore",
  "organizerId": "ORG001",
  "capacity": 300,
  "status": "ACTIVE",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```
> `capacity` field is required. Registration must be blocked when `registeredCount >= capacity`.

### User Collection
```json
{
  "_id": "ObjectId",
  "userId": "USR001",
  "name": "Alok Singh",
  "email": "alok@gmail.com",
  "contact": "9876543210",
  "eventId": "EVT001",
  "qrCodeId": "uuid-v4-random-string",
  "registeredAt": "Date"
}
```
> `qrCodeId` must be a UUID v4 (not sequential). Add a unique index on `{ email, eventId }` to prevent duplicate registrations.

### Attendance Collection
```json
{
  "_id": "ObjectId",
  "userId": "USR001",
  "eventId": "EVT001",
  "qrCodeId": "uuid-v4-random-string",
  "scanned": false,
  "scanTime": null,
  "gateId": "GATE-1",
  "scannerId": "SCN001",
  "status": "PRESENT"
}
```
> Add compound index on `{ qrCodeId, scanned }` — this is the exact query shape for atomic duplicate prevention.

---

## API Design

### Register User
**POST** `/api/users/register`

**Request:**
```json
{
  "name": "Alok Singh",
  "email": "alok@gmail.com",
  "contact": "9876543210",
  "eventId": "EVT001"
}
```

**Logic (in order):**
1. Check `{ email, eventId }` uniqueness → 409 if duplicate
2. Check `User.countDocuments({ eventId }) >= event.capacity` → 400 if full
3. Create user with UUID v4 as `qrCodeId`
4. Generate QR code image from payload
5. Send QR via email (non-blocking — don't await, just fire)
6. Return `{ success: true, qrCodeId }`

**Response:**
```json
{ "success": true, "qrCodeId": "uuid-v4-string" }
```

---

### Re-fetch QR (fallback for email failures)
**GET** `/api/users/qr/:email/:eventId`

- Look up user by email + eventId
- Regenerate QR image from stored `qrCodeId`
- Return QR as base64 image or trigger re-send email
- No auth required (it's a public ticket retrieval — QR itself is the secret)

---

### Verify QR (Gate Scanner)
**POST** `/api/attendance/verify`

**Request:**
```json
{
  "qrCodeId": "uuid-v4-string",
  "gateId": "GATE-1",
  "scannerId": "SCN001"
}
```

**Logic:**
```js
const result = await Attendance.findOneAndUpdate(
  { qrCodeId, scanned: false },       // atomic condition
  { scanned: true, scanTime: new Date(), gateId, scannerId, status: "PRESENT" },
  { new: true }
);

if (!result) {
  // Check if already scanned
  const existing = await Attendance.findOne({ qrCodeId });
  if (existing?.scanned) return { status: "ALREADY_SCANNED", scanTime: existing.scanTime };
  return { status: "INVALID_QR" };
}

io.emit("attendanceUpdate", { userId: result.userId, name: user.name, scanTime: result.scanTime });
return { status: "SUCCESS", message: "Entry Granted" };
```

**Response:**
```json
{ "status": "SUCCESS", "message": "Entry Granted" }
{ "status": "ALREADY_SCANNED", "scanTime": "2026-12-31T19:30:00Z" }
{ "status": "INVALID_QR" }
```

---

### Get Attendance List
**GET** `/api/attendance/event/:eventId`

Returns all scanned attendees with name and entry time. Requires scanner/admin JWT.

**Response:**
```json
[
  { "name": "Alok Singh", "entryTime": "7:30 PM", "gateId": "GATE-1" }
]
```

---

### Export Excel
**GET** `/api/export/excel/:eventId`

Returns `attendance.xlsx` with columns: Name, Email, Contact, Entry Time, Gate, Status.

---

## QR Payload

```json
{
  "eventId": "EVT001",
  "userId": "USR001",
  "qrCodeId": "uuid-v4-string"
}
```

> Do NOT put a JWT inside the QR. Use the opaque `qrCodeId` (UUID v4) and verify it with a DB lookup. JWT inside QR creates an irrevocable token — if the secret leaks, all 300 QRs are compromised and you cannot invalidate them without a full re-issue.

---

## Concurrency Handling

The `findOneAndUpdate` with `{ scanned: false }` as the filter is atomic at the MongoDB document level. Only one scanner wins the update race. This is sufficient for 300 people with a few gates.

```js
// CORRECT — atomic, no race condition
await Attendance.findOneAndUpdate(
  { qrCodeId, scanned: false },
  { scanned: true, scanTime: new Date() }
);
```

Ensure the compound index exists:
```js
AttendanceSchema.index({ qrCodeId: 1, scanned: 1 });
```

---

## Real-Time Dashboard

**Backend (Socket.IO):**
```js
// After successful scan in attendanceController
io.emit("attendanceUpdate", {
  name: user.name,
  entryTime: new Date(),
  gateId,
  totalCount: await Attendance.countDocuments({ eventId, scanned: true })
});
```

**Frontend (React):**
```js
useEffect(() => {
  socket.on("attendanceUpdate", (data) => {
    setAttendance(prev => [data, ...prev]);
    setCount(data.totalCount);
  });
}, []);
```

---

## Registration Cap Check

```js
// In userController.js — before creating user
const event = await Event.findOne({ eventId });
const currentCount = await User.countDocuments({ eventId });

if (currentCount >= event.capacity) {
  return res.status(400).json({ success: false, message: "Event is full" });
}
```

---

## Duplicate Registration Check

```js
// Unique index in User model
UserSchema.index({ email: 1, eventId: 1 }, { unique: true });

// In controller
const existing = await User.findOne({ email, eventId });
if (existing) return res.status(409).json({ message: "Already registered" });
```

---

## Email Delivery (Non-blocking)

```js
// Fire and forget — don't block registration response on email
mailService.sendQREmail(user.email, user.name, qrImageBase64).catch(err => {
  console.error("Email failed for", user.email, err.message);
  // Optionally: push to a retry queue or log for manual resend
});

return res.json({ success: true, qrCodeId: user.qrCodeId });
```

If email fails, user can retrieve QR via the `/api/users/qr/:email/:eventId` endpoint.

---

## Scanner Authorization (Simple)

For 300 people, a single shared scanner JWT is enough. No full RBAC needed.

```js
// middleware/scannerAuth.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    jwt.verify(token, process.env.SCANNER_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized scanner" });
  }
};
```

Apply to `/api/attendance/verify` and `/api/attendance/event/:eventId`.

---

## Security Checklist

| Item | Implementation |
|------|----------------|
| QR IDs are non-guessable | UUID v4 (not sequential like QR123456) |
| QR payload has no embedded JWT | Opaque token, DB lookup on verify |
| Scanner devices are authenticated | Shared scanner JWT via middleware |
| Duplicate registration blocked | Unique index on `{ email, eventId }` |
| Event over-registration blocked | Capacity check before insert |
| Email failure handled | Non-blocking send + QR re-fetch endpoint |
| Atomic scan (no double entry) | `findOneAndUpdate` with `{ scanned: false }` |
| Compound index for performance | `{ qrCodeId: 1, scanned: 1 }` |

---

## What to NOT Build (for 300 people)

- ❌ Redis cache
- ❌ Kafka / message queues
- ❌ MongoDB sharding
- ❌ Microservices / API gateway
- ❌ ScanLog as a separate collection
- ❌ Full RBAC with ADMIN / ORGANIZER / SCANNER roles
- ❌ S3 for QR image storage (generate on demand or store as base64 in email)

These are valid at 100,000+ scale. Adding them now is complexity with no benefit.

---

## Environment Variables

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/event-db
JWT_SECRET=your_jwt_secret
SCANNER_SECRET=your_scanner_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_app_password
CLIENT_URL=http://localhost:3000
```

---

## Summary of Changes from Original Design

| Original | Updated |
|----------|---------|
| Sequential QR IDs (QR123456) | UUID v4 — non-guessable |
| JWT inside QR payload | Opaque qrCodeId, DB lookup |
| ScanLog collection | Removed — Attendance is the single source of truth |
| No capacity check | Added — blocks registration when event is full |
| No duplicate email check | Added — unique index + controller check |
| Email blocks response | Non-blocking fire-and-forget |
| No QR re-fetch | Added `/api/users/qr/:email/:eventId` |
| Full RBAC roles | Simplified to single scanner JWT |
