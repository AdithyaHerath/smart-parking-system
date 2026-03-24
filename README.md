# 🚗 NPark - Smart University Parking Management System

<div align="center">

![React](https://img.shields.io/badge/React-18+-20232a?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-Mobile_App-02569B?style=flat-square&logo=flutter&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-3.2.4-FCC72B?style=flat-square&logo=vitest&logoColor=black)
![PayPal](https://img.shields.io/badge/PayPal-Gateway-00457C?style=flat-square&logo=paypal&logoColor=white)

**A comprehensive, automated parking management platform featuring real-time slot booking, digital wallets, ANPR gate simulation, and AI assistance.**

</div>

## 🌟 Overview

**NPark** is a modern web application designed to eliminate the friction of physical parking passes at university campuses. Built with React, TypeScript, and Supabase, the system streamlines vehicle registration, enforces domain-specific parking constraints, manages digital wallet payments via PayPal, and provides role-specific dashboards for Students, Security Personnel, Cashiers, and Administrators.

### Key Highlights

- **Role-Based Access Control** - Secure, distinct workflows for Students, Security, Cashiers, and Admins.
- **Digital Wallet & Payments** - Seamless wallet top-ups using the PayPal Sandbox API.
- **Automated Workflows** - OTP email verification via Resend and automated penalty tracking (3-strike rule).
- **Real-Time Monitoring** - Live parking slot availability and simulated ANPR gate processing.
- **ParkAI Assistant** - Built-in chatbot to help users navigate parking rules and domain constraints.

---

## 📁 Project Structure

```text
npark-web/
├── src/
│   ├── assets/              # Static assets and images
│   ├── components/          # Reusable UI components (Shadcn UI)
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Role-specific dashboard views
│   │   ├── student/         # Student dashboard and booking map
│   │   ├── admin/           # Revenue and penalty reporting
│   │   └── security/        # Gate monitoring and emergency slots
│   ├── test/                # Quality Assurance (Vitest)
│   │   ├── npark-business-logic.test.ts
│   │   └── ui-components.test.tsx
│   └── utils/               # Domain logic and fee calculations
├── supabase/
│   ├── functions/           # Edge Functions (PayPal, Resend)
│   └── migrations/          # 3NF Database schema and triggers
├── .env                     # Environment variables
├── index.html               # Application entry point
├── package.json             # Dependencies and scripts
└── vite.config.ts           # Vite configuration
```

## ✨ Features

### Student Dashboard
- **Vehicle Registration** - Register up to the allowed limit of vehicles per student.
- **Real-Time Booking** - View the interactive map and book available slots instantly to prevent concurrency conflicts.
- **Digital Wallet** - Manage funds, view transaction history, and top-up using PayPal.
- **ParkAI Chatbot** - Get instant answers to common parking queries and constraint rules.

### Administration & Security
- **Gate Processing (ANPR Simulation)** - Rapid status updates changing bookings to "arrived" upon entry.
- **Penalty Enforcement** - Automated tracking of parking violations, applying a "suspended" status upon reaching 3 strikes.
- **Revenue Reporting** - Administrative dashboards for tracking financial metrics and UAT Uptime.
- **Emergency Slot Management** - EPSS slot allocation for unplanned arrivals.

### Technical Features
- **100% Test Coverage on Core Logic** - 14+ Vitest unit tests covering fee calculations, email validation, and wallet constraints.
- **3NF Database Architecture** - Zero data redundancy with strict referential integrity in PostgreSQL.
- **Automated Triggers** - Supabase database triggers for automatic profile and wallet creation upon registration.
- **Secure Authentication** - OTP-based login with domain validation.

---

## 🛠 Technology Stack

- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Mobile:** Flutter
- **Backend & Database:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Integrations:** PayPal API, Resend API
- **Testing:** Vitest, React Testing Library

---

## 📦 Installation

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)

### Quick Start

1. **Clone the repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** Create a `.env` file in the project root and add your Supabase and API keys.

4. **Run the test suite**
   ```bash
   npm run test -- --reporter=verbose
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

---

## ⚙️ Configuration

### Supabase Setup
The application relies on a strictly normalized 3NF schema. The primary tables include `profiles`, `vehicles`, `parking_slots`, `wallets`, `transactions`, `bookings`, `complaints`, and `penalties`. Ensure your Supabase project has the latest migration files applied.

### Third-Party APIs
1. **PayPal:** Obtain Sandbox Client IDs from the PayPal Developer Dashboard for the wallet top-up flow.
2. **Resend:** Generate an API key from Resend to enable the OTP registration and email notification pipeline.

---

## 📖 Usage

### Registration & Login
1. Enter your valid university student email.
2. Check your email for the Resend OTP code.
3. Enter the OTP to automatically generate your user profile and digital wallet.

### Booking a Slot
1. Navigate to the interactive map on the Student Dashboard.
2. Select an available slot and confirm the vehicle type.
3. The system will calculate the fee, verify your wallet balance, and lock the slot.

---

## 🙏 Acknowledgments

- **Supabase** for providing an incredible backend-as-a-service and Edge Functions.
- **PayPal & Resend** for seamless payment and communication integrations.
- The 10 student participants who provided valuable feedback during our User Acceptance Testing (UAT) phase.

