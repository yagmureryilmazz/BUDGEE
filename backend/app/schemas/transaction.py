from datetime import datetime
from decimal import Decimal
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    amount: Decimal = Field(..., gt=0)
    type: Literal["income", "expense"]
    category: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None

    currency: str = Field(default="TRY", min_length=3, max_length=3)

    # ✅ YENİ EKLENENLER
    original_amount: Optional[Decimal] = None
    original_currency: Optional[str] = None

    is_ocr: bool = False
    spent_at: Optional[datetime] = None


class TransactionUpdate(BaseModel):
    amount: Optional[Decimal] = Field(default=None, gt=0)
    type: Optional[Literal["income", "expense"]] = None
    category: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = None

    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)

    # ✅ YENİ EKLENENLER
    original_amount: Optional[Decimal] = None
    original_currency: Optional[str] = None

    is_ocr: Optional[bool] = None
    spent_at: Optional[datetime] = None


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: Decimal
    type: str
    category: str
    description: Optional[str]

    currency: str

    # ✅ YENİ EKLENENLER
    original_amount: Optional[Decimal]
    original_currency: Optional[str]

    is_ocr: bool
    spent_at: datetime
    created_at: datetime


class TransactionSummary(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal


class CategoryBreakdownItem(BaseModel):
    category: str
    total: float
    percentage: float


class CategoryBreakdownResponse(BaseModel):
    total_expense: float
    transaction_count: int
    breakdown: list[CategoryBreakdownItem]


class MonthlyTrendItem(BaseModel):
    period: str
    income: float
    expense: float
    balance: float


class MonthlyTrendResponse(BaseModel):
    trend: list[MonthlyTrendItem]