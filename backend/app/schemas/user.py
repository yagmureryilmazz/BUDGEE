from datetime import date
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserPublic(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool
    is_active: bool
    is_verified: bool
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    birth_date: Optional[date] = None

    class Config:
        from_attributes = True


class AdminUserUpdateRequest(BaseModel):
    is_admin: bool