import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database settings
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/db_name")

# Authentication settings
SECRET_KEY = os.getenv("SECRET_KEY")  # Required in .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))

# Admin account settings
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")  # Required in .env
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")  # Required in .env
ADMIN_NAME = os.getenv("ADMIN_NAME", "Administrator")

# CLOVA API settings
CLOVA_STUDIO_API_KEY = os.getenv("CLOVA_STUDIO_API_KEY")  # Required in .env
CLOVA_STUDIO_API_ENDPOINT = os.getenv("CLOVA_STUDIO_API_ENDPOINT")  # Required in .env

# Security settings
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# OAuth2.0 settings
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")  # Required in .env
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")  # Required in .env
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
