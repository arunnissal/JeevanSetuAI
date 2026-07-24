# JeevanSetu AI - Installation & Deployment Guide ⚙️

This document provides step-by-step instructions to set up, run locally, and deploy JeevanSetu AI to production.

---

## 📋 System Requirements

Before you begin, ensure you have the following installed on your machine:
*   **Python (v3.12 or higher)**
*   **Node.js (v18.x or higher)** and `npm`
*   **Git**
*   *Optional:* A Neon PostgreSQL cloud database or a local PostgreSQL instance.

---

## 🛠️ Local Development Setup

### 1. Backend Setup (Django API)

1.  Navigate into the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Create a Python virtual environment:
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Windows (PowerShell):** `venv\Scripts\Activate.ps1`
    *   **macOS / Linux:** `source venv/bin/activate`
4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Set up your local configuration:
    *   Copy `.env.template` to `.env`.
    *   Fill in the required variables (specifically `SARVAM_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`).
    *   *Note:* If `DATABASE_URL` is left empty, the application will automatically fall back to local SQLite (`db.sqlite3`).
6.  Run the database migrations:
    ```bash
    python manage.py migrate
    ```
7.  Start the backend development server:
    ```bash
    python manage.py runserver
    ```
    The backend server will run on `http://127.0.0.1:8000/`.

---

### 2. Frontend Setup (React Native / Expo)

1.  Navigate into the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install the required packages:
    ```bash
    npm install
    ```
3.  Set up environment configuration:
    *   Create a `.env` file in the `frontend/` directory (or copy from `.env.template`).
    *   Set `EXPO_PUBLIC_API_URL` to point to your local backend API (e.g. `http://localhost:8000/api/v1`).
    *   Set `EXPO_PUBLIC_ENV` to `development`.
4.  Start the Expo development server:
    ```bash
    npm run web
    ```
    This launches the client in web mode. You can also run `npm run start` to scan the QR code and test on physical devices via Expo Go.

---

## 🚀 Production Deployment Guide

JeevanSetu AI is configured for a free-tier hosting pipeline using Render, Vercel, and Neon.

### 1. Database (Neon PostgreSQL)
1.  Sign up at [Neon.tech](https://neon.tech/) and create a free PostgreSQL project.
2.  Copy the connection string (with SSL mode enabled: `?sslmode=require`).
3.  Save this connection string as `DATABASE_URL` in your backend server environments.

### 2. Backend Hosting (Render)
1.  Create a new **Web Service** on [Render](https://render.com/) pointing to your Git repository.
2.  Set the **Root Directory** to `backend`.
3.  Set the **Environment Runtime** to `Python 3`.
4.  Set the **Build Command** to:
    ```bash
    pip install -r requirements.txt && python manage.py migrate --noinput && python manage.py collectstatic --noinput
    ```
5.  Set the **Start Command** to:
    ```bash
    gunicorn jeevansetu.wsgi:application
    ```
6.  Add the environment variables in Render's dashboard:
    *   `DEBUG`: `False`
    *   `SECRET_KEY`: *[Generate a strong secret key]*
    *   `DATABASE_URL`: *[Your Neon database connection string]*
    *   `SARVAM_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### 3. Frontend Hosting (Vercel)
1.  Import your repository into [Vercel](https://vercel.com/).
2.  Set the **Root Directory** to `frontend`.
3.  Choose framework preset **Other**.
4.  In the Build and Output settings, override:
    *   **Build Command:** `npx expo export --platform web`
    *   **Output Directory:** `dist`
5.  Add the environment variables:
    *   `EXPO_PUBLIC_API_URL`: `https://[your-render-domain].onrender.com/api/v1`
    *   `EXPO_PUBLIC_ENV`: `production`
6.  Click **Deploy**.
