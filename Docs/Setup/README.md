
# 🚀 Application Setup Guide (Podman/Docker)

A streamlined guide for setting up the application in a new development environment using **Podman** or **Docker**, initializing the database, and running all services.

---

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)  
- [Environment Configuration](#-environment-configuration)  
- [Start Infrastructure](#-start-infrastructure-database--temporal)  
- [Initialize Database Schema](#-initialize-database-schema)  
- [Automated Setup (Windows)](#-automated-setup-windows)  
- [Running the Application](#-running-the-application)  
- [Core Commands](#-core-commands)  
- [Notes](#-notes)  
- [License](#-license)

---

## ✅ Prerequisites

Ensure the following are installed:

- **Node.js ≥ 18.0.0**  
- **npm ≥ 9.0.0**  
- **Podman** (recommended) or **Docker Desktop**

---

## ⚙️ Environment Configuration

The API and Worker require environment configuration.

### 1. Navigate to the project root  
### 2. Copy environment files

#### Windows (PowerShell)
```powershell
Copy-Item "apps/api/.env.example" "apps/api/.env"
Copy-Item "apps/worker/.env.example" "apps/worker/.env"
```

#### Linux/macOS (Bash)
```bash
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```

---

## 🏗️ Start Infrastructure (Database & Temporal)

Start PostgreSQL + Temporal using Docker or Podman.

### Using Docker:
```bash
docker-compose up -d
```

### Using Podman (Windows):
```powershell
.\start-podman.ps1
```

This launches:

| Service         | Port |
|-----------------|------|
| PostgreSQL      | 5432 |
| Temporal Server | 7233 |
| Temporal UI     | 8080 |

---
## Run npm install 
```bash
npm install 
```
## 🗄️ Initialize Database Schema

Prisma handles migrations. Run:

```bash
npm run migrate -w apps/api
```

This applies the schema from `schema.prisma` to your fresh database.

---

## ⚡ Automated Setup (Windows)

For Podman users on Windows, run:

```powershell
.\setup.ps1
```

This script automatically:

✔ Copies environment files  
✔ Starts containers  
✔ Applies migrations  

---

## 🏃 Running the Application

### Start everything (Windows):
```powershell
.\start-dev.ps1
```

### Start services individually:
```bash
npm run dev -w apps/api    # Backend — http://localhost:3000
npm run dev -w apps/web    # Frontend — http://localhost:5173
npm run dev -w apps/worker # Execution engine
```

---

## 🔧 Core Commands

| Action             | Command                                       |
|--------------------|------------------------------------------------|
| Start containers   | `docker-compose up -d`                         |
| Apply DB schema    | `npm run migrate -w apps/api`                 |
| Reset database     | `npx prisma migrate reset --project apps/api` |
| View DB (Studio)   | `npm run studio -w apps/api`                  |

---

## 📝 Notes

Currently, the application services (**API**, **Web**, **Worker**) run as **local Node.js processes**, with dependencies (Postgres, Temporal) running in containers.

If full production containerization is required (Dockerfiles for services), I can generate them — just ask.

---

## 📄 License

Add your project license here (MIT, Apache, etc.)

