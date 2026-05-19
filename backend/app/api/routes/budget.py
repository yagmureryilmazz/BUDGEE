from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.budget import (
    BudgetCreate,
    BudgetUpdate,
    BudgetOut,
    BudgetUsageResponse,
    BudgetAlertResponse,
)

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def normalize_category(category: str) -> str:
    return category.strip()


def validate_budget_dates(period_start, period_end):
    if period_end < period_start:
        raise HTTPException(
            status_code=400,
            detail="Budget end date cannot be earlier than start date.",
        )


def validate_budget_category(category: str):
    if not category or not category.strip():
        raise HTTPException(
            status_code=400,
            detail="Budget category cannot be empty.",
        )


def validate_budget_amount(amount):
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Budget amount must be greater than 0.",
        )


# CREATE
@router.post("/", response_model=BudgetOut, status_code=201)
def create_budget(
    payload: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_budget_category(payload.category)
    validate_budget_amount(payload.amount)
    validate_budget_dates(payload.period_start, payload.period_end)

    category = normalize_category(payload.category)

    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        func.lower(Budget.category) == category.lower(),
        Budget.period_start == payload.period_start,
        Budget.period_end == payload.period_end,
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=409,
            detail="A budget already exists for this category and period.",
        )

    budget = Budget(
        user_id=current_user.id,
        category=category,
        amount=payload.amount,
        period_start=payload.period_start,
        period_end=payload.period_end,
        is_active=payload.is_active,
    )

    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


# LIST
@router.get("/", response_model=list[BudgetOut])
def list_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    is_active: bool | None = Query(None),
    category: str | None = Query(None),
):
    query = db.query(Budget).filter(Budget.user_id == current_user.id)

    if is_active is not None:
        query = query.filter(Budget.is_active == is_active)

    if category:
        query = query.filter(func.lower(Budget.category) == category.strip().lower())

    return query.order_by(Budget.period_start.desc()).all()


# USAGE
@router.get("/usage", response_model=BudgetUsageResponse)
def get_budget_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    is_active: bool | None = Query(True),
):
    query = db.query(Budget).filter(Budget.user_id == current_user.id)

    if is_active is not None:
        query = query.filter(Budget.is_active == is_active)

    budgets = query.order_by(Budget.period_start.desc()).all()

    items = []

    for budget in budgets:
        spent_amount = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                func.lower(Transaction.category) == budget.category.lower(),
                Transaction.spent_at >= budget.period_start,
                Transaction.spent_at <= budget.period_end,
            )
            .scalar()
        )

        budget_amount = Decimal(budget.amount)
        spent_amount = Decimal(spent_amount)
        remaining_amount = budget_amount - spent_amount

        percentage_used = (
            round(float((spent_amount / budget_amount) * 100), 2)
            if budget_amount > 0
            else 0.0
        )

        items.append({
            "budget_id": budget.id,
            "category": budget.category,
            "budget_amount": budget_amount,
            "spent_amount": spent_amount,
            "remaining_amount": remaining_amount,
            "percentage_used": percentage_used,
            "is_over_budget": spent_amount > budget_amount,
            "period_start": budget.period_start,
            "period_end": budget.period_end,
        })

    return {"items": items}


# ALERTS
@router.get("/alerts", response_model=BudgetAlertResponse)
def get_budget_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.is_active == True
    ).all()

    alerts = []

    for budget in budgets:
        spent_amount = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                func.lower(Transaction.category) == budget.category.lower(),
                Transaction.spent_at >= budget.period_start,
                Transaction.spent_at <= budget.period_end,
            )
            .scalar()
        )

        budget_amount = float(budget.amount)
        spent_amount = float(spent_amount)

        if budget_amount <= 0:
            continue

        percentage_used = round((spent_amount / budget_amount) * 100, 2)

        if percentage_used >= 100:
            alerts.append({
                "category": budget.category,
                "percentage_used": percentage_used,
                "status": "exceeded",
            })
        elif percentage_used >= 80:
            alerts.append({
                "category": budget.category,
                "percentage_used": percentage_used,
                "status": "warning",
            })

    return {"alerts": alerts}


# GET ONE
@router.get("/{budget_id}", response_model=BudgetOut)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.get(Budget, budget_id)

    if not budget or budget.user_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Budget not found.",
        )

    return budget


# UPDATE
@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.get(Budget, budget_id)

    if not budget or budget.user_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Budget not found.",
        )

    data = payload.model_dump(exclude_unset=True)

    new_category = normalize_category(data.get("category", budget.category))
    new_amount = data.get("amount", budget.amount)
    new_period_start = data.get("period_start", budget.period_start)
    new_period_end = data.get("period_end", budget.period_end)

    validate_budget_category(new_category)
    validate_budget_amount(new_amount)
    validate_budget_dates(new_period_start, new_period_end)

    existing_budget = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.id != budget.id,
        func.lower(Budget.category) == new_category.lower(),
        Budget.period_start == new_period_start,
        Budget.period_end == new_period_end,
    ).first()

    if existing_budget:
        raise HTTPException(
            status_code=409,
            detail="Another budget already exists for this category and period.",
        )

    for key, value in data.items():
        if key == "category":
            setattr(budget, key, normalize_category(value))
        else:
            setattr(budget, key, value)

    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


# DELETE
@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    budget = db.get(Budget, budget_id)

    if not budget or budget.user_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Budget not found.",
        )

    db.delete(budget)
    db.commit()
    return None