"""Configuration for Travlr-ID Backend"""

import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    
    # App
    APP_NAME: str = "Travlr-ID API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (Business logic only) - PostgreSQL for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://travlr:travlr_secure_pass@localhost:5433/travlr_business")
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_USER: str = "travlr"
    DATABASE_PASSWORD: str = "travlr_secure_pass"
    DATABASE_NAME: str = "travlr_business"
    
    # KERIA Configuration (following Veridian pattern)
    KERIA_ADMIN_URL: str = "http://localhost:3904"  # Admin API (3901 internally)
    KERIA_AGENT_URL: str = "http://localhost:3904"  # Use Admin API for all operations
    KERIA_BOOT_URL: str = "http://localhost:3906"   # Boot API (3903 internally)
    
    # Production Witness URLs (Geographic Distribution) - 5 witnesses as decided
    WITNESS_URLS: List[str] = [
        "https://witness1.travlrid.com:5631/oobi",  # US East
        "https://witness2.travlrid.com:5632/oobi",  # US West  
        "https://witness3.travlrid.com:5633/oobi",  # EU West
        "https://witness4.travlrid.com:5634/oobi",  # EU Central
        "https://witness5.travlrid.com:5635/oobi"   # Asia Pacific
    ]
    WITNESS_THRESHOLD: int = 3  # 3 out of 5 witnesses required (as originally decided)
    
    # Development Witness URLs (Local witnesses for testing)
    DEV_WITNESS_URLS: List[str] = [
        "http://localhost:5632/oobi",
        "http://localhost:5633/oobi", 
        "http://localhost:5634/oobi",
        "http://localhost:5635/oobi",
        "http://localhost:5636/oobi",
        "http://localhost:5637/oobi",
        "http://localhost:5638/oobi"
    ]
    DEV_WITNESS_THRESHOLD: int = 4  # 4 out of 7 witnesses for dev (matching production pattern)
    
    # Security
    SECRET_KEY: str = "travlr-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # React dev
        "http://localhost:8080",  # Mobile dev
        "http://localhost:5173"   # Vite dev
    ]
    # Allow any localhost/LAN origin in dev (used by Expo/RN web, emulators)
    # Example matches: http://localhost:19006, http://10.0.2.2:8081, http://192.168.1.10:3000
    CORS_ORIGIN_REGEX: str = r"^https?://(localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$"
    
    class Config:
        env_file = ".env"

# Global settings instance
settings = Settings()