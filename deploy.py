#!/usr/bin/env python3
"""
Deployment script for PythonAnywhere
Run this script on your PythonAnywhere console to deploy your app
"""

import os
import subprocess
import sys

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(e.stderr)
        return False

def main():
    print("🚀 Starting deployment process...")
    
    # Change to backend directory
    backend_dir = "/home/yourusername/saknew_hybrid_app/saknew_backend"  # Update path
    os.chdir(backend_dir)
    
    # Install dependencies
    if not run_command("pip3.10 install --user -r requirements.txt", "Installing Python dependencies"):
        sys.exit(1)
    
    # Run migrations
    if not run_command("python3.10 manage.py migrate", "Running database migrations"):
        sys.exit(1)
    
    # Collect static files
    if not run_command("python3.10 manage.py collectstatic --noinput", "Collecting static files"):
        sys.exit(1)
    
    # Create superuser (optional)
    print("\n📝 You may want to create a superuser account:")
    print("python3.10 manage.py createsuperuser")
    
    print("\n🎉 Deployment completed successfully!")
    print("\n📋 Next steps:")
    print("1. Update your PythonAnywhere web app configuration")
    print("2. Set the source code path to: /home/yourusername/saknew_hybrid_app/saknew_backend")
    print("3. Set the WSGI configuration file to: /home/yourusername/saknew_hybrid_app/saknew_backend/core_api/wsgi.py")
    print("4. Add environment variables in the Files tab")
    print("5. Reload your web app")

if __name__ == "__main__":
    main()