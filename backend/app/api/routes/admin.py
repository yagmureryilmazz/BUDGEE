from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, extract
from sqlalchemy.orm import Session

from app.core.auth_deps import require_admin
from app.db.deps import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.user import AdminUserUpdateRequest, UserPublic

router = APIRouter(prefix="/admin", tags=["admin"])


# LIST USERS
@router.get("/users", response_model=list[UserPublic])
def list_users(
    admin_data=Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.execute(select(User).order_by(User.id)).scalars().all()
    return users


# UPDATE ADMIN STATUS
@router.patch("/users/{user_id}", response_model=UserPublic)
def update_user_admin_status(
    user_id: int,
    payload: AdminUserUpdateRequest,
    admin_data=Depends(require_admin),
    db: Session = Depends(get_db),
):
    current_admin, _payload = admin_data

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # ❗ ADMIN KENDİ YETKİSİNİ KALDIRAMAZ
    if user_id == current_admin.id and payload.is_admin is False:
        raise HTTPException(
            status_code=400,
            detail="You cannot remove admin permission from your own account.",
        )

    user.is_admin = payload.is_admin
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


# DELETE USER (ADMIN)
@router.delete("/users/{user_id}", status_code=204)
def delete_user_admin(
    user_id: int,
    admin_data=Depends(require_admin),
    db: Session = Depends(get_db),
):
    current_admin, _payload = admin_data

    # ❗ ADMIN KENDİNİ SİLEMEZ
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own admin account.",
        )

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()

    return None


# GENERAL STATS
@router.get("/stats")
def get_admin_stats(
    admin_data=Depends(require_admin),
    db: Session = Depends(get_db),
):
    total_users = db.query(func.count(User.id)).scalar()

    total_transactions = db.query(func.count(Transaction.id)).scalar()

    total_expense = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.type == "expense")
        .scalar()
    )

    total_income = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.type == "income")
        .scalar()
    )

    return {
        "total_users": total_users,
        "total_transactions": total_transactions,
        "total_expense": total_expense,
        "total_income": total_income,
    }


# MONTHLY STATS
@router.get("/monthly-stats")
def get_monthly_stats(
    admin_data=Depends(require_admin),
    db: Session = Depends(get_db),
):
    results = (
        db.query(
            extract("month", Transaction.created_at).label("month"),
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .group_by(
            extract("month", Transaction.created_at),
            Transaction.type,
        )
        .order_by(extract("month", Transaction.created_at))
        .all()
    )

    data = {}

    for row in results:
        month = int(row.month)

        if month not in data:
            data[month] = {
                "month": month,
                "income": 0,
                "expense": 0,
            }

        if row.type == "income":
            data[month]["income"] = float(row.total)
        else:
            data[month]["expense"] = float(row.total)

    return list(data.values())