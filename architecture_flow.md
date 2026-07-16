# 📊 Event Management System - Architecture Flow Diagrams

This document contains detailed visual flow diagrams illustrating the structural architecture, state machines, and real-time event updates of the QR-Based Event Attendance & Entry Verification System.

---

## 1. High-Level Component & Data Flow

This diagram illustrates how client applications interact with the backend APIs, the database, and third-party SMTP servers.

```mermaid
graph TB
    %% Definitions
    subgraph Clients ["Client Applications (Vite + React + Tailwind)"]
        UserApp["👤 Public Registrant App<br>(Registration & OTP Form)"]
        ScanApp["📷 Scanner App<br>(Camera scan feed, JWT auth)"]
        DashApp["🖥️ Admin Dashboard<br>(Live charts & Check-in log)"]
    end

    subgraph API ["Backend Application Services (Node.js + Express)"]
        Router["🛣️ Express Routing Gateway"]
        RateLimit["🛡️ Rate Limit Middleware<br>(IP-based throttling)"]
        AuthM["🔒 JWT Auth Middleware"]
        RegCtrl["📝 Registration Controller"]
        ScanCtrl["⚡ Scanner Controller"]
        SocketSrv["🔌 Socket.IO Server Instance"]
    end

    subgraph External ["External Integrations"]
        BrevoAPI["🌐 Brevo HTTPS API<br>(Transactional Mail Service)"]
        DB[(💾 MongoDB Database)]
    end

    %% Data Flows
    UserApp -->|1. Submit email/name| Router
    Router -->|2. Apply Rate-Limits| RateLimit
    RateLimit -->|3. Verify OTP / Save details| RegCtrl
    RegCtrl -->|4. Save pending OTP| DB
    RegCtrl -.->|5. Trigger Async OTP/QR Mail via HTTPS| BrevoAPI
    BrevoAPI -.->|6. Delivery| UserApp

    ScanApp -->|7. Organizer Auth Login| Router
    Router -->|8. Apply Auth Rate-Limits| RateLimit
    RateLimit -->|9. Verify Credentials & Issue JWT| ScanCtrl
    
    ScanApp -->|10. Send QR Code UUID + JWT| AuthM
    AuthM -->|11. Verify Scanner Token| Router
    Router -->|12. Route verification - No rate limit| ScanCtrl
    ScanCtrl -->|13. Atomic status update| DB
    ScanCtrl -->|14. Emit scan status| SocketSrv
    SocketSrv -.->|15. Real-time broadcast| DashApp

    %% Styles
    classDef clientStyle fill:#1e1b4b,stroke:#00f0ff,stroke-width:2px,color:#e2e8f0;
    classDef apiStyle fill:#0f172a,stroke:#ff007f,stroke-width:2px,color:#e2e8f0;
    classDef extStyle fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#e2e8f0;

    class UserApp,ScanApp,DashApp clientStyle;
    class Router,RateLimit,AuthM,RegCtrl,ScanCtrl,SocketSrv apiStyle;
    class BrevoAPI,DB extStyle;
```

---

## 2. Ticket State Transition Flow

This state machine details how a registrant’s ticket moves from submission through email validation to successful entry verification.

```mermaid
stateDiagram-v2
    [*] --> PENDING_VERIFICATION : User registers name & email
    
    state PENDING_VERIFICATION {
        [*] --> OTP_Generated : 6-digit OTP computed
        OTP_Generated --> OTP_Sent : OTP emailed to user
        OTP_Sent --> Code_Input_Failed : Invalid OTP / Expired code (re-send)
        OTP_Sent --> Code_Input_Success : OTP verified
    }
    
    Code_Input_Failed --> PENDING_VERIFICATION : Re-register / Resend OTP
    Code_Input_Success --> VALID : Ticket status set to VALID, QR UUID v4 generated

    state VALID {
        [*] --> Idle : Ticket sent via email
        Idle --> Scanned_Winner : Atomic query sets scanned = true
        Idle --> Cancelled : Organizer cancels ticket
    }

    Cancelled --> [*]
    
    state SCANNED_STATE {
        Scanned_Winner --> Entry_Granted : Scanner logs entrance
        Entry_Granted --> Duplicate_Alert : Ticket scanned again (Gate warning triggered)
    }

    Duplicate_Alert --> Entry_Granted : Block entry (Status remains PRESENT)
```

---

## 3. Real-Time Gate Scan Loop

Shows the precise sequence of verification steps executed when an attendee arrives at the entry gate.

```mermaid
flowchart TD
    A([Attendee presents QR Code]) --> B[Scanner device captures video frame]
    B --> C[Extract uuid-v4 string from QR payload]
    C --> D{Does device have scanner JWT?}
    
    D -- No --> E[Return 401 Unauthorized]
    D -- Yes --> F[Post to /api/scanner/verify]
    
    F --> G[Run MongoDB query:<br>findOneAndUpdate qrCodeId, scanned: false, status: 'VALID']
    
    G --> H{Was document updated?}
    
    H -- Yes --> I[Mark Scanned = true, set scanTime]
    I --> J[Fetch count of totalScanned]
    J --> K[Emit Socket event: attendanceUpdate]
    K --> L[Dashboard UI updates instantly]
    L --> M[Return 200 SUCCESS - Grant Entry]
    
    H -- No --> N[Find registration matching qrCodeId]
    N --> O{Why did the update fail?}
    
    O -- Ticket does not exist --> P[Return 404 INVALID_QR - Alert Gate]
    O -- status is 'CANCELLED' --> Q[Return 403 CANCELLED_TICKET - Alert Gate]
    O -- status is 'PENDING' --> R[Return 400 UNVERIFIED_TICKET - Check OTP status]
    O -- scanned is already true --> S[Return 409 ALREADY_SCANNED - Alert Double Entry]
    
    style H fill:#1e1b4b,stroke:#00f0ff,stroke-width:2px,color:#fff
    style O fill:#1e1b4b,stroke:#ff007f,stroke-width:2px,color:#fff
```

---

## 4. Manual Check-in Fallback Flow

Illustrates the fallback flow used when an attendee's screen is cracked or their device has no battery.

```mermaid
sequenceDiagram
    autonumber
    actor Att as Attendee (Gate)
    actor Gate as Gate Staff (Admin Web App)
    participant API as Express API
    participant DB as MongoDB Database
    participant Socket as Socket.IO Hub
    participant Dash as Live Admin Screen

    Att->>Gate: "My phone battery died, my name is Alok"
    Gate->>Gate: Open manual check-in form
    Gate->>API: POST /api/scanner/manual { email: "alok@gmail.com" } (with Admin JWT)
    
    Note over API: Queries database for unique registered email
    API->>DB: findOneAndUpdate({ email, scanned: false, status: 'VALID' })
    
    alt User registered and not checked in
        DB-->>API: Returns verified user record
        API->>DB: countDocuments({ scanned: true })
        DB-->>API: Latest total count
        API->>Socket: Emit 'attendanceUpdate' (updated counts)
        Socket-->>Dash: Updates live scoreboard
        API-->>Gate: 200 SUCCESS (Check-in confirmed)
        Gate-->>Att: "Welcome in, Alok!"
    else User already checked in or not registered
        DB-->>API: null
        API->>DB: findOne({ email })
        DB-->>API: Returns record (scanned: true / status: PENDING_VERIFICATION)
        API-->>Gate: 409/400 Error (Duplicate entry / Unverified account)
        Gate-->>Att: "Entry denied. Ticket already checked in."
    end
```

---

## 5. Inline HTML QR Table Generation with Run-Length Encoding (RLE)

This flowchart illustrates how raw QR matrix data is compressed into a lightweight HTML `<table>` representation using 1D Run-Length Encoding (RLE) to stay under the 102 KB Gmail clipping threshold.

```mermaid
flowchart TD
    Start([1. Generate QR Matrix from uuid-v4]) --> GetModules[2. Extract grid modules:<br>1 = Dark, 0 = Light]
    GetModules --> InitTable[3. Initialize HTML Table<br>border-collapse, line-height, margin]
    InitTable --> LoopRows[4. Loop through each row<br>including quiet zones]
    LoopRows --> ScanCols[5. Scan columns sequentially in row]
    ScanCols --> FindRun{6. Next cell has same color?}
    FindRun -- Yes --> Increment[7. Increment span counter]
    Increment --> FindRun
    FindRun -- No --> CreateCell[8. Create TD element<br>bgcolor and colspan = span]
    CreateCell --> ResetSpan[9. Reset span to 1]
    ResetSpan --> CheckEnd{10. End of row reached?}
    CheckEnd -- No --> ScanCols
    CheckEnd -- Yes --> CloseRow[11. Close TR row element]
    CloseRow --> CheckAllRows{12. All rows completed?}
    CheckAllRows -- No --> LoopRows
    CheckAllRows -- Yes --> Finish[13. Output compressed HTML Table:<br>~3-5 KB table, ~48 KB total email]
```
