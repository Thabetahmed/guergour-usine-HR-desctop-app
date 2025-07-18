import os

class Config:
    # Database configuration
    SQLALCHEMY_DATABASE_URI = 'sqlite:///factory.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Admin PIN for sensitive operations
    ADMIN_PIN = '1234'
    
    # Flask server configuration
    HOST = '127.0.0.1'
    PORT = 5000
    DEBUG = True
    
    # Secret key for sessions (generate a random one for production)
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'gplast-factory-management-2025'
