from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import calendar

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.prediction import PredictionResponse

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.get("/", response_model=PredictionResponse)
def get_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)

    year = now.year
    month = now.month

    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    days_in_month = calendar.monthrange(year, month)[1]
    current_day = now.day

    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_active == True,
        Budget.period_start <= now,
        Budget.period_end >= now,
    ).all()

    items = []

    for budget in budgets:
        spent_amount = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.category == budget.category,
                Transaction.spent_at >= month_start,
                Transaction.spent_at <= now,
            )
            .scalar()
        )

        budget_amount = Decimal(budget.amount)
        current_spent = Decimal(spent_amount)

        if current_day > 0:
            daily_average = current_spent / Decimal(current_day)
        else:
            daily_average = Decimal("0")

        predicted_spent = (daily_average * Decimal(days_in_month)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        remaining_budget = (budget_amount - predicted_spent).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        usage_ratio = float(predicted_spent / budget_amount) if budget_amount > 0 else 0.0

        if usage_ratio >= 1:
            risk_level = "high"
        elif usage_ratio >= 0.8:
            risk_level = "medium"
        else:
            risk_level = "low"

        items.append({
            "category": budget.category,
            "budget_amount": budget_amount,
            "current_spent": current_spent,
            "predicted_spent": predicted_spent,
            "remaining_budget": remaining_budget,
            "risk_level": risk_level,
        })

    return {"items": items}