from decimal import Decimal
from pydantic import BaseModel


class PredictionItem(BaseModel):
    category: str
    budget_amount: Decimal
    current_spent: Decimal
    predicted_spent: Decimal
    remaining_budget: Decimal
    risk_level: str


class PredictionResponse(BaseModel):
    items: list[PredictionItem]