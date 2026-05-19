from pydantic import BaseModel

from app.schemas.transaction import (
    TransactionSummary,
    CategoryBreakdownResponse,
    MonthlyTrendResponse,
)
from app.schemas.budget import (
    BudgetUsageResponse,
    BudgetAlertResponse,
)


class DashboardResponse(BaseModel):
    summary: TransactionSummary
    category_breakdown: CategoryBreakdownResponse
    monthly_trend: MonthlyTrendResponse
    budget_usage: BudgetUsageResponse
    alerts: BudgetAlertResponse