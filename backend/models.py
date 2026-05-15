from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    favorites = relationship("Favorite", back_populates="owner", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="owner", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="owner", uselist=False, cascade="all, delete-orphan")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    internship_id = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    email = Column(String, default="")
    specialties = Column(String, default="")
    date_added = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="favorites")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    internship_id = Column(String, nullable=False)
    company_name = Column(String, nullable=False)
    status = Column(String, default="Sent")
    date_applied = Column(DateTime, default=datetime.utcnow)
    cv_filename = Column(String, nullable=True)
    motivation_filename = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    owner = relationship("User", back_populates="applications")


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    skills = Column(Text, default="")
    interests = Column(Text, default="")
    preferred_locations = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="profile")
