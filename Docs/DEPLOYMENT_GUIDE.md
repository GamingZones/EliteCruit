# 🚀 EliteCruit Deployment Guide & Production Runbook

This guide covers everything required to deploy the EliteCruit digital recruitment platform to production.

---

## 📋 Table of Contents
1. [Architecture & Deployment Models](#1-architecture--deployment-models)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [Option A: Deploy to Render (Recommended - Free / Easy)](#3-option-a-deploy-to-render-recommended)
4. [Option B: Deploy to Railway](#4-option-b-deploy-to-railway)
5. [Option C: Deploy via Docker / Docker Compose (VPS / AWS / DigitalOcean)](#5-option-c-deploy-via-docker--docker-compose)
6. [Option D: Split Deployment (Vercel Frontend + Render Backend)](#6-option-d-split-deployment)
7. [Post-Deployment Verification Checklist](#7-post-deployment-verification-checklist)

---

## 1. Architecture & Deployment Models

EliteCruit supports two standard production architectures:

### Model 1: Unified Full-Stack Service (Simplest)
* The Express server in `Backend/server.js` serves both the backend REST APIs (`/api/*`) and the built static React frontend (`Frontend/dist`).
* Everything runs under a single domain (e.g. `https://elitecruit.com`), eliminating CORS issues and domain cookie synchronization problems.

### Model 2: Decoupled / Split Services
* **Frontend**: Hosted on Vercel, Netlify, or Cloudflare Pages.
* **Backend**: Hosted on Render, Railway, AWS ECS, or a VPS.
* Communication happens via CORS with `FRONTEND_URL` set in backend environment variables.

---

## 2. Environment Variables Reference

Configure these environment variables in your cloud hosting provider's dashboard:

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Enables production security & disables dev bypasses | `production` |
| `PORT` | **Yes** | Port to listen on (automatically injected by Render/Railway) | `5400` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `DATABASE_SSL` | Optional | Set to `true` if cloud DB requires SSL | `true` |
| `JWT_SECRET` | **Yes** | 64+ char random string for signing JWT tokens | Generate via `crypto.randomBytes(32)` |
| `FRONTEND_URL` | If Split | Allowed CORS domain (comma-separated if multiple) | `https://elitecruit.com` |
| `ADMIN_INITIAL_EMAIL` | Optional | Initial admin account email created on first boot | `admin@yourdomain.com` |
| `ADMIN_INITIAL_PASSWORD` | Optional | Initial admin password created on first boot | `AdminSecurePass123!` |
| `SMTP_HOST` | **Yes** (2FA) | Outgoing mail server for 2FA email codes | `smtp.gmail.com` or `smtp.resend.com` |
| `SMTP_PORT` | **Yes** (2FA) | SMTP server port | `587` (TLS) or `465` (SSL) |
| `SMTP_USER` | **Yes** (2FA) | Email address or SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | **Yes** (2FA) | Email app password or API key | `xxxx-xxxx-xxxx-xxxx` |
| `SMTP_FROM` | **Yes** (2FA) | "From" sender string | `"EliteCruit" <noreply@yourdomain.com>` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for ATS resume features | `AIzaSy...` |

---

## 3. Option A: Deploy to Render (Recommended)

Render offers free/low-cost managed PostgreSQL databases and Node.js Web Services.

### Quick Setup:
1. Push your EliteCruit repository to **GitHub** or **GitLab**.
2. Log into [Render.com](https://render.com).
3. Click **New +** → **Blueprint**, select your GitHub repository, and Render will automatically detect [`render.yaml`](../render.yaml).
4. Fill in the required environment variables:
   * `ADMIN_INITIAL_EMAIL` (e.g. `admin@yourdomain.com`)
   * `ADMIN_INITIAL_PASSWORD` (e.g. `YourAdminPass123!`)
   * `SMTP_USER` & `SMTP_PASS` (for 2FA codes)
5. Click **Apply**. Render will:
   - Provision a managed PostgreSQL database.
   - Build the React frontend (`npm run build`).
   - Launch `Backend/server.js`.
   - Assign you a free HTTPS URL (`https://elitecruit-app.onrender.com`).

---

## 4. Option B: Deploy to Railway

Railway auto-detects Node.js applications and provisions PostgreSQL with one click.

1. Log into [Railway.app](https://railway.app).
2. Click **New Project** → **Provision PostgreSQL**.
3. In the same project, click **New** → **GitHub Repo** → select EliteCruit.
4. Under **Variables**, add:
   * `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (Railway references this automatically)
   * `NODE_ENV`: `production`
   * `JWT_SECRET`: Click "Generate" or paste a random string.
   * `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
5. Under **Settings**:
   * Build Command: `npm --prefix Frontend install && npm --prefix Frontend run build && npm --prefix Backend install`
   * Start Command: `node Backend/server.js`
6. Click **Generate Domain** under Networking.

---

## 5. Option C: Deploy via Docker / Docker Compose

If you have a Linux VPS (Ubuntu, Debian, AlmaLinux on AWS, DigitalOcean, Hetzner, or Linode):

1. Install Docker & Docker Compose on your server:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose
   ```
2. Clone your repository:
   ```bash
   git clone https://github.com/your-username/EliteCruit.git
   cd EliteCruit
   ```
3. Edit `docker-compose.yml` to set your passwords and SMTP credentials:
   ```bash
   nano docker-compose.yml
   ```
4. Start the stack in background:
   ```bash
   docker-compose up -d --build
   ```
5. Set up an Nginx reverse proxy with Certbot for free SSL:
   ```nginx
   server {
       server_name elitecruit.yourdomain.com;
       location / {
           proxy_pass http://127.0.0.1:5400;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

## 6. Option D: Split Deployment

### Deploying Frontend to Vercel:
1. Root Directory: `Frontend`
2. Framework Preset: `Vite`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Environment Variable: `VITE_API_URL=https://your-backend.onrender.com`

### Deploying Backend to Render:
1. Root Directory: `Backend`
2. Build Command: `npm install`
3. Start Command: `node server.js`
4. Set `FRONTEND_URL=https://your-app.vercel.app`

---

## 7. Post-Deployment Verification Checklist

Once your deployment is live:

- [ ] **Health Endpoint**: Visit `https://your-domain.com/api/health` — it should return:
  ```json
  { "ok": true, "service": "elitecruit-backend" }
  ```
- [ ] **Frontend Loading**: Visit `https://your-domain.com/` — all branding, fonts, and images load without 404s.
- [ ] **Admin Login & 2FA**:
  - Visit `/login`
  - Enter your `ADMIN_INITIAL_EMAIL` and `ADMIN_INITIAL_PASSWORD`.
  - Check your real email inbox for the 6-digit code.
  - Enter the code and verify redirection to `/admin-dashboard`.
- [ ] **Candidate Registration**:
  - Visit `/create-account`
  - Create a new candidate profile with a real email.
  - Confirm profile setup and ability to browse job listings.
- [ ] **Security Checks**:
  - Confirm HTTP requests automatically upgrade or redirect to HTTPS.
  - Verify that unauthorized URL tampering properly redirects to `/login?auth=required`.
