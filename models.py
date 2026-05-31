import os
import hashlib
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

# Resolve database URL (PostgreSQL from environment, fallback to SQLite locally)
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    # SQLAlchemy requires 'postgresql://' protocol scheme
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = "sqlite:///data.db"

# SQLite specific argument for thread-safety in FastAPI
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Stored settings & keys
    anthropic_key = Column(String, nullable=True)
    anthropic_base = Column(String, nullable=True)
    elevenlabs_key = Column(String, nullable=True)
    voice_id = Column(String, nullable=True)
    chat_model = Column(String, nullable=True)
    response_language = Column(String, nullable=True)
    elevenlabs_model = Column(String, nullable=True)
    translate_enabled = Column(Boolean, default=False)
    translate_target = Column(String, default="Chinese")
    ui_theme = Column(String, default="dark")
    is_muted = Column(Boolean, default=False)
    
    sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(String, primary_key=True, index=True)  # Front-end UUID
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    messages = Column(Text, default="[]")  # JSON string of messages list
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="sessions")

# Utility functions for secure password hashing (PBKDF2 with salt)
def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}${pwdhash}"

def verify_password(stored_password_hash: str, password: str) -> bool:
    try:
        salt, pwdhash = stored_password_hash.split('$')
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
        return pwdhash == new_hash
    except Exception:
        return False

# Initialize database schema
def init_db():
    Base.metadata.create_all(bind=engine)
