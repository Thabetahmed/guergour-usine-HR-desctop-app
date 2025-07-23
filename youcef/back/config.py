import os
import sys

class Config:
    @staticmethod
    def get_base_path():
        """Get the base path for resources, works in both development and PyInstaller bundle"""
        if getattr(sys, 'frozen', False):
            # Running in PyInstaller bundle
            return sys._MEIPASS
        else:
            # Running in development
            return os.path.dirname(os.path.abspath(__file__))
    
    @staticmethod
    def get_database_path():
        """Get the database path, ensuring it's writable in production"""
        if getattr(sys, 'frozen', False):
            # In production, store database in user's AppData folder
            app_data = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'GPLAST Factory Management')
            os.makedirs(app_data, exist_ok=True)
            return os.path.join(app_data, 'factory.db')
        else:
            # In development, keep it in the project folder
            return os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'db', 'factory.db')
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{get_database_path()}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Admin PIN for sensitive operations
    ADMIN_PIN = '1234'
    
    # Flask server configuration
    HOST = '127.0.0.1'
    PORT = 5000
    DEBUG = not getattr(sys, 'frozen', False)  # Debug only in development
    
    # Secret key for sessions
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'gplast-factory-management-2025'
