# Ads Studio

Ads Studio is a comprehensive platform for managing advertising campaigns across multiple platforms, with analytics and asset management capabilities.

## Features

- User account management and authentication
- Asset library for creative content
- Campaign management for multiple ad platforms
- Analytics dashboard
- Integration with major advertising platforms
- React frontend with Redux for state management
- Django REST API backend

## Project Structure

The project follows Django and React best practices:

```
django_ads_studio/
├── ads_studio/           # Django project configuration
├── accounts/             # User account management app
├── analytics/            # Analytics functionality
├── assets/               # Asset management
├── campaigns/            # Campaign management
├── common/               # Shared utilities
├── frontend/             # React frontend application
├── integrations/         # Platform integration modules
├── media/                # User-uploaded files
├── static/               # Static files
├── staticfiles/          # Collected static files
├── logs/                 # Application logs
├── manage.py             # Django management script
└── requirements.txt      # Python dependencies
```

## Setup and Installation

### Backend (Django)

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Apply migrations:
   ```
   python manage.py migrate
   ```

4. Create a superuser:
   ```
   python manage.py createsuperuser
   ```

5. Run the development server:
   ```
   python manage.py runserver 8001
   ```

### Frontend (React)

1. Install Node.js dependencies:
   ```
   cd frontend
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

## Development

- Django API runs on: http://localhost:8001/
- React frontend runs on: http://localhost:3000/ or http://localhost:3001/
- Django admin interface: http://localhost:8001/admin/

## API Endpoints

- `/api/` - API root
- `/api/users/` - User management
- `/api/token/` - JWT token generation
- `/api/token/refresh/` - JWT token refresh

## Technologies Used

- **Backend**: Django, Django REST Framework, JWT Authentication
- **Frontend**: React, Redux, Axios
- **Database**: SQLite (development), PostgreSQL (production)
- **Styling**: CSS 

## Environment Variables

The following environment variables need to be set:

```
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=your-database-url
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Meta Ad Library API
META_AD_LIBRARY_ACCESS_TOKEN=your-facebook-access-token
```

### Setting up the Meta Ad Library API

To access the Meta Ad Library API, follow these steps:

1. Confirm your identity and location at [Facebook.com/ID](https://facebook.com/ID)
2. Create a Meta for Developers account at [developers.facebook.com](https://developers.facebook.com)
3. Create a new app by selecting "My Apps > Create App"
4. Generate an access token with the appropriate permissions
5. Add the access token to your environment variables as `META_AD_LIBRARY_ACCESS_TOKEN`

For more details, see the [Meta Ad Library API documentation](https://www.facebook.com/ads/library/api/). 