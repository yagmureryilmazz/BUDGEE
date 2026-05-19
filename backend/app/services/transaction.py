from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.transaction import Transaction


def get_category_breakdown(db: Session, from_date=None, to_date=None):
    query = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.user_id == 1,   # şimdilik sabit
        Transaction.type == "expense"
    )

    if from_date:
        query = query.filter(Transaction.date >= from_date)

    if to_date:
        query = query.filter(Transaction.date <= to_date)

    query = query.group_by(Transaction.category)

    results = query.all()

    return {
        category: float(total)
        for category, total in results
    }