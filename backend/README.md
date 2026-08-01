# ATS Backend

Django REST API backend for the ATS Score Checker application.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Environment Configuration:
Create a `.env` file in the backend directory with:
```
DEBUG=True
SECRET_KEY=your-secret-key-change-this-in-production
DATABASE_NAME=ats_database
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_HOST=localhost
DATABASE_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create superuser (optional):
```bash
python manage.py createsuperuser
```

6. Start development server:
```bash
python manage.py runserver
```

## Database Configuration

### Current: SQLite (Development)
- File-based database for easy development
- No additional setup required
- Located at `backend/db.sqlite3`

### Planned: PostgreSQL (Production)
- Configuration ready in `settings.py`
- Requires PostgreSQL server installation
- Environment variables configured for easy switch

## API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/refresh/` - Refresh JWT token
- `GET /api/auth/me/` - Get current user info

### Users
- User management endpoints (future)

### Resume
- Resume upload and analysis endpoints (future)

## JWT Authentication

The API uses JWT (JSON Web Tokens) for authentication:
- Access tokens expire in 1 hour
- Refresh tokens expire in 7 days
- Automatic token rotation on refresh
- Bearer token authentication required for protected endpoints

## Models

### User
Custom user model with email-based authentication:
- `email` - Primary authentication field (unique)
- `full_name` - User's display name
- `is_verified` - Email verification status
- `date_joined` - Account creation date

### UserProfile
Extended user information:
- `phone_number` - Optional contact info
- `linkedin_url` - Professional profile
- `github_url` - Developer profile
- `preferred_job_titles` - JSON field for preferences
- `notification_preferences` - JSON field for settings

### Resume Models
Prepared for future integration:
- `UploadedResume` - File storage and metadata
- `ResumeAnalysis` - ATS scoring results

## Development Notes

### Python 3.13 Compatibility
- Using setuptools 68.0.0 for pkg_resources compatibility
- Token blacklisting disabled for Python 3.13
- All functionality tested and working

### Security
- Environment variables for sensitive data
- CORS configured for frontend integration
- Django security middleware enabled
- Password validation with Django defaults