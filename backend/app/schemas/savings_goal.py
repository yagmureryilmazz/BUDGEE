from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SavingsGoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    target_amount: Decimal = Field(..., gt=0)
    current_amount: Decimal = Field(default=0, ge=0)


class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=100)
    target_amount: Optional[Decimal] = Field(default=None, gt=0)
    current_amount: Optional[Decimal] = Field(default=None, ge=0)
    is_completed: Optional[bool] = None


class SavingsGoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    target_amount: Decimal
    current_amount: Decimal
    is_completed: bool
    created_at: datetime


class SavingsGoalProgressItem(BaseModel):
    id: int
    title: str
    target_amount: Decimal
    current_amount: Decimal
    remaining_amount: Decimal
    progress_percentage: float
    is_completed: bool


class SavingsGoalProgressResponse(BaseModel):
    items: list[SavingsGoalProgressItem]