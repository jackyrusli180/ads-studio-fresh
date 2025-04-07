# Ads Studio V1

A full-stack web application for creating and managing advertisement campaigns using AI-generated content.

## Project Structure

This project is divided into two main components:

1. **Backend**: A Django-based REST API
2. **Frontend**: A React-based single-page application

## Technologies

### Backend
- Python 3.9+
- Django 4.2
- Django REST Framework
- Google Gemini API for AI image generation and editing
- PostgreSQL database (in production)

### Frontend
- React 18
- Redux Toolkit for state management
- Material UI for components
- React Router for navigation

## Deployment

This project is configured for deployment on Railway.app with separate services for frontend and backend.

### Backend
- API endpoints for authentication, image generation, and campaign management
- Media storage for AI-generated images
- Integration with Google Gemini API

### Frontend
- Modern React-based UI
- Responsive design
- User authentication
- Image editing capabilities

## Getting Started

1. Clone the repository
2. Set up the backend:
   ```
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

3. Set up the frontend:
   ```
   cd frontend
   npm install
   npm start
   ```

## Environment Variables

### Backend
- `GEMINI_API_KEY`: API key for Google Gemini AI services
- `SECRET_KEY`: Django secret key
- `DEBUG`: Set to True for development, False for production
- `DATABASE_URL`: PostgreSQL connection string (for production)

### Frontend
- `REACT_APP_API_URL`: URL of the backend API

## License

MIT 