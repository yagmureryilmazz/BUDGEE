from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BudgetCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=50)
    amount: Decimal = Field(..., gt=0)
    period_start: datetime
    period_end: datetime
    is_active: bool = True


class BudgetUpdate(BaseModel):
    category: Optional[str] = Field(default=None, min_length=1, max_length=50)
    amount: Optional[Decimal] = Field(default=None, gt=0)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    is_active: Optional[bool] = None


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category: str
    amount: Decimal
    period_start: datetime
    period_end: datetime
    is_active: bool
    created_at: datetime


class BudgetUsageItem(BaseModel):
    budget_id: int
    category: str
    budget_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_used: float
    is_over_budget: bool
    period_start: datetime
    period_end: datetime


class BudgetUsageResponse(BaseModel):
    items: list[BudgetUsageItem]

class BudgetAlertItem(BaseModel):
    category: str
    percentage_used: float
    status: str


class BudgetAlertResponse(BaseModel):
    alerts: list[BudgetAlertItem]