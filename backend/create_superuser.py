#!/usr/bin/env python
"""
Script to create a superuser for authentication testing.
Run with: python create_superuser.py
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ads_studio.settings')
django.setup()

# Django imports
from django.contrib.auth.models import User

def create_test_superuser():
    """Create a test superuser if it doesn't exist"""
    username = 'admin'
    email = 'admin@example.com'
    password = 'adminpassword'
    
    if not User.objects.filter(username=username).exists():
        print(f"Creating superuser '{username}'...")
        User.objects.create_superuser(username, email, password)
        print(f"Superuser created successfully. Use username: '{username}' and password: '{password}' to log in.")
    else:
        print(f"Superuser '{username}' already exists.")

if __name__ == '__main__':
    create_test_superuser() 