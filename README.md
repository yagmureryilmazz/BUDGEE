# 💸 BUDGEE — Personal Finance App

A full-stack personal finance management application with a **Next.js web app**, **React Native (Expo) mobile app**, and a **FastAPI backend**.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Web Setup](#2-web-setup)
  - [Mobile Setup](#3-mobile-mobile-setup)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)
- [Screenshots](#-screenshots)

---

## ✨ Features

### 🔐 Authentication
- Register & Login with email/password
- Email verification (verification link sent via SMTP)
- Forgot password / Reset password flow
- JWT-based authentication with token blacklist (Redis)

### 💳 Transactions
- Add income & expense transactions
- Category selection (Food, Transport, Entertainment, etc.)
- Multi-currency support: **TRY / USD / EUR** — stored as TRY equivalent
- Date picker with calendar UI
- Filter by month, search by category
- Edit & delete transactions

### 📊 Budgets
- Set monthly budgets per category
- Real-time spending progress bar
- Over-budget warnings

### 🎯 Saving Goals
- Create savings goals with a target amount and deadline
- Track progress visually
- Deposit / withdraw from goals

### 📷 OCR — Receipt Scanner
- Upload a receipt photo
- AI (OpenAI Vision) automatically extracts amount, category, and date
- One-tap to add the detected transaction

### 💱 Currency Converter
- Live exchange rates (USD, EUR, GBP, TRY, and more)
- Simple converter UI on both web and mobile

### 📈 Dashboard
- Monthly income vs. expense summary
- Spending breakdown by category (pie chart)
- AI-powered spending predictions for the rest of the month
- Personalized greeting with user's name

### 🌍 Localization
- Full **Turkish / English** language support on both web and mobile
- Language persists across sessions

### 👑 Admin Panel (Web)
- View all users
- Manage accounts and permissions

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2, Alembic |
| **Database** | PostgreSQL 16 |
| **Cache / Blacklist** | Redis 7 |
| **AI / OCR** | OpenAI API (GPT-4o Vision) |
| **Email** | SMTP (configurable) |
| **Web Frontend** | Next.js 16, React 19, Recharts, Lucide React |
| **Mobile** | React Native (Expo SDK 52), Expo Router |
| **Infrastructure** | Docker Compose (DB + Redis) |

---

## 📁 Project Structure

```
BUDGEE/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/       # auth, transactions, budgets, goals, ocr, currency, dashboard, predictions, admin
│   │   ├── core/             # config, security, auth deps
│   │   ├── db/               # SQLAlchemy session, base
│   │   ├── models/           # ORM models (User, Transaction, Budget, SavingsGoal)
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # business logic, email, OCR, currency
│   │   └── main.py           # FastAPI app entry point
│   ├── alembic/              # database migrations
│   └── alembic.ini
│
├── web/                      # Next.js web app
│   └── app/
│       ├── dashboard/
│       ├── transactions/
│       ├── budgets/
│       ├── savings-goals/
│       ├── ocr/
│       ├── currency/
│       ├── admin/
│       ├── login/
│       ├── register/
│       ├── forgot-password/
│       ├── reset-password/
│       ├── verify-email/
│       ├── layout.tsx        # root layout + navbar
│       └── page.tsx          # landing page
│
├── budgee-mobile/            # Expo React Native app
│   └── app/
│       ├── (auth)/           # login, register screens
│       └── (tabs)/           # dashboard, transactions, budgets, saving-goals, ocr, currency
│
└── infra/
    └── docker-compose.yml    # PostgreSQL + Redis
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.11+
- **Docker** & **Docker Compose**
- **Expo CLI** (`npm install -g expo-cli`)

---

### 1. Backend Setup

```bash
# Start PostgreSQL and Redis
cd infra
docker-compose up -d

# Install Python dependencies
cd ../backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt  # or: pip install -e .

# Copy and fill in environment variables
cp .env.example .env
# → Edit .env (see Environment Variables section below)

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs will be available at: `http://localhost:8000/docs`

---

### 2. Web Setup

```bash
cd web
npm install

# Copy and fill in environment variables
cp .env.local.example .env.local
# → Set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

npm run dev
```

Web app will be available at: `http://localhost:3000`

---

### 3. Mobile Setup

```bash
cd budgee-mobile
npm install

# Copy and fill in environment variables
cp .env.example .env
# → Set EXPO_PUBLIC_API_URL=http://<your-local-ip>:8000

npx expo start
```

- Press **`i`** for iOS Simulator
- Press **`a`** for Android Emulator
- Scan the QR code with **Expo Go** for physical device

> ⚠️ Use your machine's **local IP address** (not `localhost`) in `EXPO_PUBLIC_API_URL` when testing on a physical device.

---

## 🔑 Environment Variables

### Backend `.env`

```env
DATABASE_URL=postgresql://budgee:budgee@localhost:5433/budgee
REDIS_URL=redis://localhost:6379

JWT_SECRET=your-super-secret-key
JWT_ALG=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=your-app-password

FRONTEND_URL=http://localhost:3000

OPENAI_API_KEY=sk-...
```

### Web `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Mobile `.env`

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/logout` | Blacklist token |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/auth/verify-email` | Verify email with token |
| `POST` | `/auth/forgot-password` | Send reset email |
| `POST` | `/auth/reset-password` | Reset password |
| `GET` | `/transactions/` | List transactions |
| `POST` | `/transactions/` | Create transaction |
| `PUT` | `/transactions/{id}` | Update transaction |
| `DELETE` | `/transactions/{id}` | Delete transaction |
| `GET` | `/budgets/` | List budgets |
| `POST` | `/budgets/` | Create budget |
| `PUT` | `/budgets/{id}` | Update budget |
| `DELETE` | `/budgets/{id}` | Delete budget |
| `GET` | `/savings-goals/` | List saving goals |
| `POST` | `/savings-goals/` | Create goal |
| `POST` | `/savings-goals/{id}/deposit` | Deposit to goal |
| `POST` | `/savings-goals/{id}/withdraw` | Withdraw from goal |
| `GET` | `/dashboard/summary` | Monthly summary |
| `GET` | `/predictions/` | AI spending predictions |
| `POST` | `/ocr/scan` | Scan receipt image (OCR) |
| `GET` | `/currency/convert` | Convert between currencies |
| `GET` | `/admin/users` | List all users (admin only) |

Full interactive documentation: `http://localhost:8000/docs`

---

## 🖼 Screenshots

| Web Dashboard | Mobile Dashboard |
|---|---|
| Monthly income/expense summary with charts | Personalized greeting + quick stats |

| Transactions | OCR Receipt Scanner |
|---|---|
| Multi-currency support (TRY/USD/EUR) | AI-powered receipt parsing |

---

## 👩‍💻 Developer

**Yağmur Eryılmaz**

---

## 📄 License

This project is for academic / personal use.
