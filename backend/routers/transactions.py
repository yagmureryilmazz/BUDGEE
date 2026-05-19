from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.transaction import Transaction
from schemas.transaction import TransactionCreate, TransactionOut
from services.transaction import get_category_breakdown
from services.currency_service import convert_currency

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
)


@router.post("/", response_model=TransactionOut)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
):
    transaction_data = data.model_dump()
    selected_currency = (data.currency or "TRY").upper()

    if selected_currency != "TRY":
        converted = convert_currency(
            amount=float(data.amount),
            from_currency=selected_currency,
            to_currency="TRY",
        )

        transaction_data["amount"] = Decimal(str(converted["converted_amount"]))
        transaction_data["currency"] = "TRY"
        transaction_data["original_amount"] = data.amount
        transaction_data["original_currency"] = selected_currency
    else:
        transaction_data["amount"] = data.amount
        transaction_data["currency"] = "TRY"
        transaction_data["original_amount"] = None
        transaction_data["original_currency"] = None

    transaction = Transaction(
        user_id=1,
        **transaction_data,
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get("/category-breakdown", response_model=dict[str, float])
def category_breakdown(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    return get_category_breakdown(
        db=db,
        from_date=from_date,
        to_date=to_date,
    )