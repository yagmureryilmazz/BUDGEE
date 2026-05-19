from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.auth_deps import get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.transaction import (
    TransactionCreate,
    TransactionUpdate,
    TransactionOut,
    TransactionSummary,
    CategoryBreakdownResponse,
    MonthlyTrendResponse,
)
from app.services.currency_service import convert_currency

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def normalize_transaction_currency(data: dict) -> dict:
    selected_currency = (data.get("currency") or "TRY").upper()
    amount = data.get("amount")

    if selected_currency != "TRY" and amount is not None:
        converted = convert_currency(
            amount=float(amount),
            from_currency=selected_currency,
            to_currency="TRY",
        )

        data["original_amount"] = amount
        data["original_currency"] = selected_currency
        data["amount"] = Decimal(str(converted["converted_amount"]))
        data["currency"] = "TRY"
    else:
        data["original_amount"] = None
        data["original_currency"] = None
        data["currency"] = "TRY"

    return data


# CREATE
@router.post("/", response_model=TransactionOut, status_code=201)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump()

    if data.get("spent_at") is None:
        data["spent_at"] = datetime.utcnow()

    data = normalize_transaction_currency(data)

    tx = Transaction(user_id=current_user.id, **data)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# LIST
@router.get("/", response_model=list[TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tx_type: str | None = Query(None, alias="type"),
    category: str | None = Query(None),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if tx_type:
        query = query.filter(Transaction.type == tx_type)

    if category:
        query = query.filter(Transaction.category == category)

    return (
        query.order_by(Transaction.spent_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )


# SUMMARY
@router.get("/summary", response_model=TransactionSummary)
def get_transaction_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
):
    base_query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if from_date:
        base_query = base_query.filter(Transaction.spent_at >= from_date)

    if to_date:
        base_query = base_query.filter(Transaction.spent_at <= to_date)

    total_income = (
        base_query.filter(Transaction.type == "income")
        .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
        .scalar()
    )

    total_expense = (
        base_query.filter(Transaction.type == "expense")
        .with_entities(func.coalesce(func.sum(Transaction.amount), 0))
        .scalar()
    )

    total_income = Decimal(total_income)
    total_expense = Decimal(total_expense)

    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
    }


# CATEGORY BREAKDOWN
@router.get("/category-breakdown", response_model=CategoryBreakdownResponse)
def get_category_breakdown_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
):
    query = db.query(
        Transaction.category,
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
    )

    if from_date:
        query = query.filter(Transaction.spent_at >= from_date)

    if to_date:
        query = query.filter(Transaction.spent_at <= to_date)

    results = query.group_by(Transaction.category).all()

    total_expense = float(sum(float(row.total) for row in results))
    transaction_count = int(sum(int(row.count) for row in results))

    breakdown = []
    for category, total, count in results:
        total = float(total)
        percentage = round((total / total_expense) * 100, 2) if total_expense > 0 else 0.0

        breakdown.append({
            "category": category or "Uncategorized",
            "total": total,
            "percentage": percentage,
        })

    breakdown.sort(key=lambda x: x["total"], reverse=True)

    return {
        "total_expense": total_expense,
        "transaction_count": transaction_count,
        "breakdown": breakdown,
    }


# MONTHLY TREND
@router.get("/monthly-trend", response_model=MonthlyTrendResponse)
def get_monthly_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
):
    query = db.query(
        func.extract("year", Transaction.spent_at).label("year"),
        func.extract("month", Transaction.spent_at).label("month"),
        Transaction.type.label("type"),
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
    ).filter(
        Transaction.user_id == current_user.id
    )

    if from_date:
        query = query.filter(Transaction.spent_at >= from_date)

    if to_date:
        query = query.filter(Transaction.spent_at <= to_date)

    results = (
        query.group_by(
            func.extract("year", Transaction.spent_at),
            func.extract("month", Transaction.spent_at),
            Transaction.type,
        )
        .order_by(
            func.extract("year", Transaction.spent_at),
            func.extract("month", Transaction.spent_at),
        )
        .all()
    )

    grouped = {}

    for year, month, tx_type, total in results:
        year = int(year)
        month = int(month)
        period = f"{year}-{month:02d}"

        if period not in grouped:
            grouped[period] = {
                "period": period,
                "income": 0.0,
                "expense": 0.0,
                "balance": 0.0,
            }

        if tx_type == "income":
            grouped[period]["income"] = float(total)
        elif tx_type == "expense":
            grouped[period]["expense"] = float(total)

        grouped[period]["balance"] = (
            grouped[period]["income"] - grouped[period]["expense"]
        )

    return {
        "trend": list(grouped.values())
    }


# GET ONE
@router.get("/{transaction_id}", response_model=TransactionOut)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.get(Transaction, transaction_id)

    if not tx or tx.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return tx


# UPDATE
@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.get(Transaction, transaction_id)

    if not tx or tx.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "currency" in update_data or "amount" in update_data:
        base_data = {
            "amount": update_data.get("amount", tx.amount),
            "currency": update_data.get("currency", tx.currency),
        }

        normalized = normalize_transaction_currency(base_data)

        update_data["amount"] = normalized["amount"]
        update_data["currency"] = normalized["currency"]
        update_data["original_amount"] = normalized["original_amount"]
        update_data["original_currency"] = normalized["original_currency"]

    for key, value in update_data.items():
        setattr(tx, key, value)

    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


# DELETE
@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    tx = db.get(Transaction, transaction_id)

    if not tx or tx.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(tx)
    db.commit()
    return None