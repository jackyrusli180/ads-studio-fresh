#!/usr/bin/env python
"""
Script to run migrations and create a superuser.
Run with: python run_migrations.py
"""
import os
import django
import subprocess
import sys

def main():
    """Run migrations and create a superuser"""
    print("Setting up Django...")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ads_studio.settings')
    django.setup()
    
    try:
        print("Running migrations...")
        subprocess.run([sys.executable, "manage.py", "migrate"], check=True)
        print("Migrations successful!")
        
        # Import after Django is set up
        from django.contrib.auth.models import User
        
        # Create superuser
        username = 'jackyrusli'
        email = 'jackyrusli180@gmail.com'
        password = 'Okx12345678!'
        
        if not User.objects.filter(username=username).exists():
            print(f"Creating superuser '{username}'...")
            User.objects.create_superuser(username, email, password)
            print(f"Superuser created successfully!")
        else:
            print(f"Superuser '{username}' already exists.")
            
        print("Database setup complete!")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(main()) 