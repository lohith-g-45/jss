# MySQL Database Integration Guide

## 🎯 Overview
This guide helps you set up MySQL database integration for the AI Medical Scribe application, enabling:
- ✅ Store patient information persistently
- ✅ Save consultation history with SOAP notes
- ✅ Retrieve patient records when they return
- ✅ Search patients by name, phone, email
- ✅ View complete consultation history

---

## 📋 Prerequisites

1. **MySQL Server** installed and running
   - Download: https://dev.mysql.com/downloads/mysql/
   - Or use XAMPP/WAMP which includes MySQL

2. **Node.js** (v18 or higher)
   - Already installed for the React app

---

## 🚀 Setup Instructions

### Step 1: Install MySQL (if not installed)

**Windows:**
1. Download MySQL Installer from https://dev.mysql.com/downloads/installer/
2. Run installer → Choose "Custom" → Select MySQL Server
3. Set root password (remember this!)
4. Start MySQL service

**Verify MySQL is running:**
```cmd
mysql --version
```

### Step 2: Create Database and Tables

1. **Open MySQL Command Line Client** or MySQL Workbench

2. **Run the schema file:**
```sql
-- Option 1: From command line
mysql -u root -p < server/database/schema.sql

-- Option 2: In MySQL client
source C:/Users/BHAVYA P/MSS/ai-medical-scribe/server/database/schema.sql
```

3. **Verify database created:**
```sql
SHOW DATABASES;
USE medical_scribe_db;
SHOW TABLES;
```

You should see 4 tables:
- `users` (doctors)
- `patients`
- `consultations`
- `prescriptions`

### Step 3: Configure Backend Server

1. **Navigate to server folder:**
```cmd
cd "C:\Users\BHAVYA P\MSS\ai-medical-scribe\server"
```

2. **Install Node.js dependencies:**
```cmd
npm install
```

3. **Create `.env` file:**
Copy `.env.example` to `.env`:
```cmd
copy .env.example .env
```

4. **Edit `.env` file** with your MySQL credentials:
```env
PORT=5000
NODE_ENV=development

# Update these with your MySQL credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=medical_scribe_db
DB_PORT=3306

JWT_SECRET=your_secret_key_here
JWT_EXPIRE=30d

CORS_ORIGIN=http://localhost:5174
```

### Step 4: Start Backend Server

```cmd
cd server
npm start
```

You should see:
```
✅ Connected to MySQL database: medical_scribe_db
🏥 AI Medical Scribe API Server
🚀 Server running on port 5000
```

### Step 5: Update Frontend Configuration

1. **Create `.env` file in root folder** (if not exists):
```env
VITE_API_URL=http://localhost:5000/api
```

2. **Frontend is already configured!** The `api.js` file has been updated to use the MySQL backend.

### Step 6: Test the Integration

1. **Keep backend server running** (port 5000)

2. **Start frontend** (in a new terminal):
```cmd
cd "C:\Users\BHAVYA P\MSS\ai-medical-scribe"
npm run dev
```

3. **Login to the app:**
   - Email: `sarah.johnson@hospital.com`
   - Password: `password123`

4. **Test patient search and consultation saving**

---

## 📊 Database Schema

### Users Table (Doctors)
```sql
- id (INT, Primary Key)
- name (VARCHAR)
- email (VARCHAR, Unique)
- password (VARCHAR, Hashed)
- role (ENUM: doctor, admin)
- specialization (VARCHAR)
```

### Patients Table
```sql
- id (INT, Primary Key)
- patient_name (VARCHAR)
- age (INT)
- gender (ENUM: Male, Female, Other)
- phone (VARCHAR)
- email (VARCHAR)
- address (TEXT)
- medical_history (TEXT)
- allergies (TEXT)
- blood_group (VARCHAR)
```

### Consultations Table
```sql
- id (INT, Primary Key)
- patient_id (INT, Foreign Key → patients.id)
- doctor_id (INT, Foreign Key → users.id)
- visit_date (DATE)
- transcript (LONGTEXT)
- subjective (TEXT) - SOAP Notes
- objective (TEXT)
- assessment (TEXT)
- plan (TEXT)
- diagnosis (VARCHAR)
- medications (TEXT)
- follow_up (VARCHAR)
- status (ENUM: in-progress, completed, cancelled)
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new doctor

### Patients
- `GET /api/patients` - Get all patients (with search)
- `GET /api/patients/:id` - Get patient with consultation history
- `GET /api/patients/search/:query` - Search patients by name/phone
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient info
- `DELETE /api/patients/:id` - Delete patient

### Consultations
- `GET /api/consultations` - Get all consultations
- `GET /api/consultations/:id` - Get consultation details
- `POST /api/consultations` - Save new consultation
- `PUT /api/consultations/:id` - Update consultation
- `DELETE /api/consultations/:id` - Delete consultation
- `GET /api/consultations/patient/:patient_id/history` - Get patient history

---

## 🔄 Integration Flow

### New Patient Consultation:

1. **Fill Patient Form** (Step 1)
   - Frontend sends patient data to `POST /api/patients`
   - Returns `patient_id`

2. **Record Consultation** (Step 2)
   - Voice recognition creates transcript
   - Frontend calls `generateSOAPFromConversation()`
   - Saves to database: `POST /api/consultations`

3. **View Saved Notes**
   - Notes stored in MySQL with patient_id linkage

### Returning Patient:

1. **Search for Patient**
   - Type name/phone in patient form
   - Call `GET /api/patients/search/:query`
   - Show matching patients

2. **Auto-fill Patient Info**
   - Select patient from dropdown
   - Load patient details from database

3. **Show Previous History**
   - Call `GET /api/patients/:id`
   - Display past consultations
   - Show previous diagnoses, medications

---

## ✅ Testing Checklist

### Database Check:
```sql
-- Check if demo data loaded
SELECT COUNT(*) FROM users;      -- Should return 1
SELECT COUNT(*) FROM patients;  -- Should return 5
SELECT COUNT(*) FROM consultations; -- Should return 2
```

### API Health Check:
```cmd
curl http://localhost:5000/api/health
```

Should return:
```json
{
  "status": "OK",
  "message": "AI Medical Scribe API Server Running",
  "timestamp": "2026-03-07T..."
}
```

### Test Login:
```cmd
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"sarah.johnson@hospital.com\",\"password\":\"password123\"}"
```

### Test Patient Search:
```cmd
curl http://localhost:5000/api/patients/search/John
```

---

## 🐛 Troubleshooting

### "Error connecting to MySQL database"
- ✅ Verify MySQL is running: `mysql -u root -p`
- ✅ Check credentials in `.env` file
- ✅ Ensure `medical_scribe_db` exists

### "ER_NOT_SUPPORTED_AUTH_MODE"
MySQL 8+ uses caching_sha2_password. Fix:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'your_password';
FLUSH PRIVILEGES;
```

### "ECONNREFUSED ::1:3306"
MySQL not running:
```cmd
net start MySQL80
```

### Port 5000 already in use:
Change port in `server/.env`:
```env
PORT=5001
```
And update frontend `.env`:
```env
VITE_API_URL=http://localhost:5001/api
```

---

## 📝 Demo Patients (Pre-loaded)

1. **John Smith** - 45M, O+, Chest Pain
2. **Emily Davis** - 32F, A+, Upper Respiratory Infection
3. **Michael Brown** - 58M, B+, Allergic to Aspirin
4. **Sarah Wilson** - 28F, AB+, Peanut allergy
5. **David Lee** - 67M, O-, Latex allergy

---

## 🎯 Next Steps

Once everything is working:

1. **Patient Search Feature**
   - Add autocomplete in patient form
   - Show patient suggestions as you type

2. **Patient History View**
   - Click patient → view all past consultations
   - Display previous SOAP notes, medications

3. **Export/Print Reports**
   - Generate PDF consultation reports
   - Email to patient

4. **Advanced Features**
   - Patient dashboard with charts
   - Medication tracking
   - Appointment scheduling

---

## 📞 Support

If you encounter issues:
1. Check MySQL service is running
2. Verify `.env` configuration
3. Check server logs for errors
4. Ensure both frontend (5174) and backend (5000) are running

**Server Status:**
- Frontend: http://localhost:5174
- Backend API: http://localhost:5000/api
- API Health: http://localhost:5000/api/health

---

**Status:** ✅ Backend created and ready to use!
**Next:** Follow setup instructions above to connect everything.
