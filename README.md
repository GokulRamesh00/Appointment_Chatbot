# Appointment Chatbot System

A complete AI-powered appointment scheduling system built with modern web technologies and LangChain integration. This system provides an intelligent chatbot interface that can understand natural language and automatically schedule appointments based on user conversations.

## 🚀 Features

- **AI-Powered Chatbot**: Intelligent appointment scheduling using LangChain and OpenAI GPT
- **Real-time Chat Interface**: Modern React-based chat UI with real-time messaging
- **User Authentication**: Secure JWT-based authentication system
- **Appointment Management**: Full CRUD operations for appointment scheduling
- **Database Integration**: PostgreSQL with Supabase cloud hosting
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **Date/Time Parsing**: Smart parsing of natural language date/time expressions
- **Multi-Service Architecture**: Microservices with Node.js backend and Python AI service

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Frontend │    │ Node.js Backend │    │ Python Service  │
│   (Port 3000)   │◄──►│   (Port 5000)   │◄──►│   (Port 8000)   │
│                 │    │                 │    │                 │
│ • Next.js 14    │    │ • Express.js    │    │ • Flask         │
│ • TypeScript    │    │ • JWT Auth      │    │ • LangChain     │
│ • Tailwind CSS  │    │ • PostgreSQL    │    │ • OpenAI GPT    │
│ • React Hook    │    │ • Rate Limiting │    │ • Date Parsing  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Supabase      │
                       │   PostgreSQL    │
                       │   Database      │
                       └─────────────────┘
```

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js 18+** installed
- **Python 3.9+** installed
- **Git** installed
- **Supabase account** (free tier available)
- **OpenAI API key** (get from OpenAI.com)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd appointment-chatbot-system
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all service dependencies
npm run install:all
```

### 3. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your database connection details from Settings → Database
3. Run the database schema in Supabase SQL Editor:

```sql
-- Copy and paste the contents of database/schema.sql
-- This will create all necessary tables and indexes
```

### 4. Configure Environment Variables

#### Backend Configuration (`backend/.env`)
```bash
# Database Configuration - Supabase
DB_HOST=your-supabase-host
DB_PORT=6543
DB_NAME=postgres
DB_USER=your-supabase-user
DB_PASSWORD=your-supabase-password

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# Python Service Configuration
PYTHON_SERVICE_URL=http://localhost:8000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

#### Python Service Configuration (`python-service/.env`)
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration - Supabase (same as backend)
DB_HOST=your-supabase-host
DB_PORT=6543
DB_NAME=postgres
DB_USER=your-supabase-user
DB_PASSWORD=your-supabase-password

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
PORT=8000

# LangChain Configuration
LLM_MODEL=gpt-3.5-turbo
TEMPERATURE=0.7
MAX_TOKENS=1000

# Backend API Configuration
BACKEND_API_URL=http://localhost:5000
```

#### Frontend Configuration (`frontend/.env.local`)
```bash
# Backend API Configuration
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:5000
```

### 5. Start All Services

```bash
# Start all services concurrently
npm run dev
```

This will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Python Service**: http://localhost:8000

## 🎯 How to Use

### 1. Register and Login
1. Go to http://localhost:3000
2. Click "Register" and create a new account
3. Login with your credentials

### 2. Schedule Appointments via Chat
1. Click "Chat Assistant" tab
2. Start chatting with the AI assistant
3. Try these example messages:
   - "I need to schedule a medical appointment for tomorrow at 2 PM"
   - "Can I book a consultation for Monday morning?"
   - "Schedule a checkup for next Friday at 3:30 PM"

### 3. Manage Appointments
1. Click "My Appointments" tab
2. View all your scheduled appointments
3. Edit or delete appointments as needed
4. Create new appointments manually

## 📅 Supported Date/Time Formats

The chatbot understands these natural language formats:

- **"tomorrow at 2 PM"** → Tomorrow at 2:00 PM
- **"Monday morning"** → Next Monday at 9:00 AM
- **"next Friday at 3:30 PM"** → Next Friday at 3:30 PM
- **"today afternoon"** → Today at 2:00 PM
- **"Wednesday evening"** → Next Wednesday at 6:00 PM
- **"next week"** → Next week at 10:00 AM
- **"2:30 PM"** → Today at 2:30 PM

## 🔧 Manual Service Startup

If you prefer to start services individually:

### Backend Service
```bash
cd backend
npm run dev
```

### Python Service
```bash
cd python-service
python app.py
```

### Frontend Service
```bash
cd frontend
npm run dev
```

## 🧪 Testing

### Health Checks
```bash
# Backend health check
curl http://localhost:5000/health

# Python service health check
curl http://localhost:8000/health
```

### API Testing
```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123","firstName":"Test","lastName":"User"}'

# Login user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'
```

## 📊 Database Schema

The system uses these main tables:

- **`users`** - User authentication and profiles
- **`appointments`** - Appointment scheduling data
- **`chat_sessions`** - Chat conversation sessions
- **`chat_messages`** - Individual chat messages

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt password encryption
- **Rate Limiting** - API request rate limiting
- **Input Validation** - Comprehensive input sanitization
- **CORS Protection** - Cross-origin request security
- **SQL Injection Prevention** - Parameterized queries

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check Supabase credentials in `.env` files
   - Verify database is running in Supabase dashboard

2. **Python Service Not Starting**
   - Install Python dependencies: `pip install -r requirements.txt`
   - Check OpenAI API key is valid
   - Ensure Python 3.9+ is installed

3. **Frontend Build Errors**
   - Clear Next.js cache: `rm -rf .next`
   - Reinstall dependencies: `npm install`
   - Check Node.js version (18+ required)

4. **Chatbot Not Responding**
   - Verify OpenAI API key is set
   - Check Python service is running on port 8000
   - Review Python service logs for errors

### Logs and Debugging

- **Backend logs**: Check console output
- **Python service logs**: Check console output
- **Frontend errors**: Check browser console
- **Database logs**: Check Supabase dashboard

## 📈 Performance

- **Database Indexing** - Optimized queries with proper indexes
- **Connection Pooling** - Efficient database connections
- **Rate Limiting** - Prevents API abuse
- **Caching** - Session and response caching
- **Lazy Loading** - Frontend component optimization


## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **OpenAI** for GPT API
- **Supabase** for database hosting
- **LangChain** for AI framework
- **Next.js** for React framework
- **Tailwind CSS** for styling

---

