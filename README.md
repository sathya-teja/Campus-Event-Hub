# Campus Event Hub

Campus Event Hub is a full-stack web platform for discovering, organizing, and managing inter-college events. It gives students one place to browse events, register, receive tickets, and collect certificates, while giving college admins tools to create events, approve registrations, track attendance, and review feedback.

##  Live Demo

🌐 Frontend: https://campus-event-hub-nu.vercel.app/

📡 Backend API: https://campus-event-hub-backend-fywy.onrender.com/

> **Note:** The backend is hosted on Render's free tier and may take up to a minute to wake up after periods of inactivity.

## Demo Video

Watch the project demo here:

[Campus Event Hub Demo Video](https://drive.google.com/file/d/1XTwaWpA63f1ko-XDaFKFxNUNNSLkTP4l/view?usp=sharing)

You can also click the preview below:

[![Campus Event Hub Demo Preview](assets/screenshots/home.png)](https://drive.google.com/file/d/1XTwaWpA63f1ko-XDaFKFxNUNNSLkTP4l/view?usp=sharing)

## Overview

This project uses a React frontend and an Express + MongoDB backend.

Users can:
- Browse upcoming events across colleges
- Register and manage their event participation
- View event tickets with QR-based check-in support
- Join event discussions and submit feedback
- Receive notifications for important activity

Admins can:
- Create and manage events
- Approve or reject registrations
- Mark attendance using QR scan or attendance code
- Export registration data in CSV, Excel, PDF, and JSON formats
- Monitor discussions, feedback, logs, and platform health

## Key Features

- Role-based access for `student`, `college_admin`, and `super_admin`
- JWT authentication with forgot-password flow
- Google OAuth login support
- Event creation with image upload
- Student registration and ticket generation
- QR check-in and attendance verification
- Certificate generation and PDF download
- Event discussions and replies
- Event feedback and analytics
- Real-time notifications with Server-Sent Events (SSE)
- Admin activity logs
- AI chatbot endpoint for event-related assistance

## Screenshots

### Home Page

![Home Page](assets/screenshots/home.png)

### Events Pages

![Events Overview](assets/screenshots/events-overview.png)
![Featured Events](assets/screenshots/events-featured.png)
![Event Details](assets/screenshots/event-details.png)

### Authentication Pages

![Register Page](assets/screenshots/register-page.png)
![Login Page](assets/screenshots/login-page.png)

### Student Experience

![Student Dashboard](assets/screenshots/student-dashboard.png)
![Profile Page](assets/screenshots/profile-page.png)
![Attendance Ticket](assets/screenshots/ticket-page.png)
![Certificate](assets/screenshots/certificate.png)
![Notifications](assets/screenshots/notifications.png)
![AI Chatbot](assets/screenshots/chatbot.png)

### Admin Dashboards

![College Admin Dashboard](assets/screenshots/admin-dashboard.png)
![Super Admin Dashboard](assets/screenshots/super-admin-dashboard.png)

## Tech Stack

### Frontend
- React 19
- Vite
- React Router
- Tailwind CSS 4
- Framer Motion
- Axios
- Recharts

### Backend
- Node.js
- Express 5
- MongoDB + Mongoose
- JWT authentication
- Passport Google OAuth
- Multer + Cloudinary for image management
- Nodemailer
- PDFKit / ExcelJS / QRCode

## Project Structure

```text
Campus Event Hub/
|-- assets/
|   `-- screenshots/
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- seed/
|   |   `-- services/
|   |-- package.json
|   `-- server.js
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- pages/
|   |   `-- services/
|   `-- package.json
|-- docs/
|   |-- README.md
|   `-- java-backend-rebuild-spec.md
|-- LICENSE
`-- README.md
```

## User Roles

### Student
- Register and log in
- Browse events
- Register for events
- Access tickets and certificates
- Participate in discussions
- Submit feedback

### College Admin
- Create and update events
- Review registrations
- Mark attendance
- Export participant reports
- View feedback, discussions, and logs

### Super Admin
- Approve or reject college admin accounts
- View all users
- Access system health and platform-wide oversight tools

## Local Setup

### Prerequisites
- Node.js 18+
- npm
- MongoDB running locally or a MongoDB Atlas connection string

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "Campus Event Hub"
```

### 2. Install dependencies

```bash
cd backend
npm install

cd ..\frontend
npm install
```

## Environment Variables

Example environment variable templates are provided in:

- `backend/.env.example`
- `frontend/.env.example`

Copy the example files and rename them to `.env` before running the application.

### Backend Environment Variables

`backend/.env.example`

```env
PORT=5000

# Database
MONGO_URI=your_mongodb_connection_string

# JWT Authentication
JWT_SECRET=your_jwt_secret

# Super Admin Account
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=Password@123

# AI Services (optional)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Email Configuration
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_app_password

# QR/Ticket Security
QR_SECRET=your_qr_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Frontend and Backend URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Frontend Environment Variables

`frontend/.env.example`

```env
VITE_BACKEND_URL=http://localhost:5000
```

Notes:

- `EMAIL_USER` and `EMAIL_PASS` are needed for approval, rejection, and password reset emails.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are needed only if you want Google login.
- `GEMINI_API_KEY` or `GROQ_API_KEY` is needed for the chatbot endpoint.
- Event and profile images are stored and managed using Cloudinary.

## Running the App

### Start the backend

```bash
cd backend
npm run dev
```

If you do not want auto-reload:

```bash
npm start
```

Backend runs at:

```text
http://localhost:5000
```

### Start the frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## Optional Seed Data

This repo includes seed scripts under `backend/src/seed/` for creating a super admin, sample college admins, students, events, and interactions.

Examples:

```bash
cd backend
node src/seed/superAdminSeed.js
node src/seed/collegeAdminsSeed.js
node src/seed/studentsSeed.js
node src/seed/seedEvents.js
node src/seed/interactionsSeed.js
```

## Important API Areas

Main backend route groups:
- `/api/auth`
- `/api/users`
- `/api/admin`
- `/api/events`
- `/api/registrations`
- `/api/discussions`
- `/api/feedback`
- `/api/notifications`
- `/api/certificates`
- `/api/admin-logs`
- `/api/health`
- `/api/chat`

Base health endpoint:

```text
GET /
```

Expected response:

```text
CampusEventHub API running
```

## Current Status

The application already includes:
- Authentication and role-based dashboards
- Event lifecycle management
- Registration approval workflows
- Attendance and ticketing
- Feedback, discussion, and notifications
- Admin logs and health monitoring


## Known Notes

- Frontend API configuration is centralized in `frontend/src/services/api.js`.
- Environment files, uploads, and `node_modules` are already ignored by Git.
- There is currently no automated test suite configured in the root project.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
