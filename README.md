# TransitOps Management Suite 🚛💨

TransitOps is a premium, enterprise-grade Fleet Operations & Transport Management platform designed to solve dispatch bottlenecks, eliminate vehicle downtime leakages, and automate license compliance audits. The suite integrates real-time status transitions, safety score profiles, operational expense logging, and instant reports with client-side PDF exports.

---

## 👥 The Team

* **Ridham Patel** — *Team Lead & Full Stack Developer*
* **Yasar Khan** — *Full Stack Developer*

---

## 🌟 Visual Tour

| Login Screen | Dashboard Home |
|:---:|:---:|
| ![Login Screen](./public/img/login.png) | ![Dashboard](./public/img/dashboard.png) |

| Vehicle Registry | Drivers & Safety Profiles |
|:---:|:---:|
| ![Vehicle Registry](./public/img/fleet.png) | ![Drivers](./public/img/drivers.png) |

| Maintenance Logs | Analytics & Cost Reports |
|:---:|:---:|
| ![Maintenance](./public/img/main.png) | ![Analytics](./public/img/an.png) |

| System Settings & RBAC |
|:---:|
| ![Settings](./public/img/settings.png) |

---

## 🏗️ System Architecture & Data Flow

TransitOps is built on Next.js 14 (App Router) using a serverless database backend and edge-safe middleware.

```mermaid
graph TD
    User([User / Operator]) -->|Interacts| UI[Next.js React Client]
    UI -->|Session Validation| Mid[Edge Middleware]
    Mid -->|JWT Decode| Supa[Supabase Auth]
    
    UI -->|API Requests| API[Next.js API Routes]
    API -->|Prisma Client| DB[(Neon PostgreSQL)]
    API -->|License Alerts| Mail[Nodemailer SMTP Sandbox]
    
    UI -->|Upload Attachments| Upload[Local Upload API]
    Upload -->|Writes File| Public[public/uploads Folder]
    
    UI -->|Client Exports| JS[jsPDF & jspdf-autotable]
```

### Database Entity Relationships (ERD)

Our data structure enforces full referential integrity across vehicles, driver safety logs, operational metrics, and documents:

```mermaid
erDiagram
    VEHICLE {
        string id PK
        string registrationNo UK
        string name
        enum type
        float maxLoadCapacity
        float odometer
        float acquisitionCost
        enum status
        string region
    }
    DRIVER {
        string id PK
        string name
        string licenseNumber UK
        enum licenseCategory
        date licenseExpiry
        string contactNumber
        int safetyScore
        enum status
    }
    TRIP {
        string id PK
        string tripCode UK
        string source
        string destination
        float cargoWeight
        float plannedDistance
        float finalOdometer
        float fuelConsumed
        enum status
        string cancelReason
    }
    MAINTENANCE_LOG {
        string id PK
        string serviceType
        float cost
        date date
        enum status
    }
    FUEL_LOG {
        string id PK
        date date
        float liters
        float cost
    }
    EXPENSE {
        string id PK
        float toll
        float other
        date date
    }
    VEHICLE_DOCUMENT {
        string id PK
        string type
        string fileUrl
        date expiryDate
        date uploadedAt
    }
    SETTINGS {
        string id PK
        string depotName
        string currency
        string distanceUnit
        float ratePerKm
        string adminEmail
    }

    VEHICLE ||--o{ TRIP : "is assigned to"
    DRIVER ||--o{ TRIP : "operates"
    VEHICLE ||--o{ MAINTENANCE_LOG : "undergoes"
    VEHICLE ||--o{ FUEL_LOG : "consumes fuel"
    TRIP ||--o{ FUEL_LOG : "logs fuel during"
    VEHICLE ||--o{ EXPENSE : "incurs"
    TRIP ||--o{ EXPENSE : "logs expenses during"
    VEHICLE ||--o{ VEHICLE_DOCUMENT : "owns"
```

---

## ⚡ Key Features & Problems Solved

### 1. The Dispatch Bottleneck & Overload Prevention
* **Problem**: Dispatching overloaded vehicles leads to mechanical failures, fines, and scheduling conflicts.
* **Solution**: Before dispatching any trip, our API validates the cargo weight against the assigned vehicle's registered payload capacity. If it exceeds, dispatch is prevented.
* **Double-booking Block**: Once a vehicle or driver is assigned to an active trip (`DISPATCHED`), they are automatically locked and excluded from dispatch lists until the trip completes.

### 2. Driver Safety & Compliance Audits
* **Problem**: Routing vehicles with drivers who have expired or suspended licenses causes severe compliance liabilities.
* **Solution**: TransitOps highlights expired licenses in red with an `EXPIRED` status badge. The dispatch module blocks drivers with expired licenses or `SUSPENDED` status from being assigned to any new trip.
* **License Alerts**: A Mailtrap SMTP integration checks the driver list and logs expiring/expired licenses within the next 30 days, delivering a compiled report straight to the administrator.

### 3. Service Logs & Auto-Status Transitions
* **Problem**: Dispatching vehicles that are currently undergoing repairs in the shop.
* **Solution**: When a maintenance log is logged as `ACTIVE`, the vehicle's status is atomically set to `IN_SHOP`, removing it from the dispatch scheduler. Setting the maintenance log to `COMPLETED` automatically restores the vehicle to `AVAILABLE` (unless its state is `RETIRED`).

### 4. Expense Audits & Fuel Tracking
* **Problem**: Fuel leakages and unaccounted maintenance logs skew operational budgets.
* **Solution**: The dashboard monitors fuel liters, odometer readings, and toll expenditures. It computes live operational cost sums (`Fuel Costs` + `Maintenance Costs`) dynamically across views.

---

## 🔐 Role-Based Access Control (RBAC)

Access is strictly enforced at both the API handler and Sidebar Navigation levels based on roles.

| Role | Dashboard | Fleet | Drivers | Trips | Fuel & Expenses | Analytics | Settings |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fleet Manager** | view | **edit** | **edit** | — | — | **edit** | view |
| **Dispatcher** | view | view | — | **edit** | — | — | view |
| **Safety Officer** | view | — | **edit** | view | — | — | view |
| **Financial Analyst** | view | view | — | — | **edit** | **edit** | view |

*Note: Maintenance access follows the same permission scope as Fleet.*

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 14 (App Router), React, TailwindCSS, next-themes (Light/Dark mode)
* **Backend**: Next.js API Routes, Prisma ORM
* **Database**: Neon Serverless PostgreSQL
* **Authentication**: Supabase Auth (Edge-safe JWT parsing)
* **Emails**: Nodemailer SMTP Sandboxing
* **Export Engines**: jsPDF + jspdf-autotable (PDF), Native Client CSV Builder
* **Icons & UI Elements**: Lucide React, Lordicon Animated Icons

---

## 🚀 Installation & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/Ridham2808/Odoo_TransitOps.git
cd Odoo_TransitOps
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database Connections
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Supabase Configurations
NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-url.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# SMTP Configuration (e.g. Mailtrap sandbox)
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-mailtrap-username"
SMTP_PASS="your-mailtrap-password"
```

### 4. Database Seeding
Setup the PostgreSQL database tables and seed mock operational data:
```bash
npx prisma db push
node prisma/seed.js
```

### 5. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to view the application.

---

### 🔑 Test User Credentials
You can log in to test any of the 4 roles using these seeded profiles:

* **Fleet Manager**: `fleet@transitops.local` / `Fleet@2026`
* **Dispatcher**: `dispatch@transitops.local` / `Dispatch@2026`
* **Safety Officer**: `safety@transitops.local` / `Safety@2026`
* **Financial Analyst**: `finance@transitops.local` / `Finance@2026`