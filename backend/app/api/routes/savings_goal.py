from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.db.session import get_db
from app.models.savings_goal import SavingsGoal
from app.models.user import User
from app.schemas.savings_goal import (
    SavingsGoalCreate,
    SavingsGoalUpdate,
    SavingsGoalOut,
    SavingsGoalProgressResponse,
)

router = APIRouter(prefix="/savings-goals", tags=["Savings Goals"])


# CREATE
@router.post("/", response_model=SavingsGoalOut, status_code=201)
def create_savings_goal(
    payload: SavingsGoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.current_amount > payload.target_amount:
        raise HTTPException(
            status_code=400,
            detail="current_amount cannot be greater than target_amount"
        )

    is_completed = payload.current_amount >= payload.target_amount

    goal = SavingsGoal(
        user_id=current_user.id,
        title=payload.title,
        target_amount=payload.target_amount,
        current_amount=payload.current_amount,
        is_completed=is_completed,
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


# LIST
@router.get("/", response_model=list[SavingsGoalOut])
def list_savings_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(SavingsGoal)
        .filter(SavingsGoal.user_id == current_user.id)
        .order_by(SavingsGoal.created_at.desc())
        .all()
    )


# PROGRESS
@router.get("/progress", response_model=SavingsGoalProgressResponse)
def get_savings_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goals = (
        db.query(SavingsGoal)
        .filter(SavingsGoal.user_id == current_user.id)
        .order_by(SavingsGoal.created_at.desc())
        .all()
    )

    items = []

    for goal in goals:
        target_amount = Decimal(goal.target_amount)
        current_amount = Decimal(goal.current_amount)
        remaining_amount = target_amount - current_amount

        if remaining_amount < 0:
            remaining_amount = Decimal("0")

        progress_percentage = (
            round(float((current_amount / target_amount) * 100), 2)
            if target_amount > 0
            else 0.0
        )

        items.append({
            "id": goal.id,
            "title": goal.title,
            "target_amount": target_amount,
            "current_amount": current_amount,
            "remaining_amount": remaining_amount,
            "progress_percentage": progress_percentage,
            "is_completed": goal.is_completed,
        })

    return {"items": items}


# GET ONE
@router.get("/{goal_id}", response_model=SavingsGoalOut)
def get_savings_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.get(SavingsGoal, goal_id)

    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    return goal


# UPDATE
@router.patch("/{goal_id}", response_model=SavingsGoalOut)
def update_savings_goal(
    goal_id: int,
    payload: SavingsGoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.get(SavingsGoal, goal_id)

    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    data = payload.model_dump(exclude_unset=True)

    new_target_amount = Decimal(data.get("target_amount", goal.target_amount))
    new_current_amount = Decimal(data.get("current_amount", goal.current_amount))

    if new_current_amount > new_target_amount:
        raise HTTPException(
            status_code=400,
            detail="current_amount cannot be greater than target_amount"
        )

    for key, value in data.items():
        setattr(goal, key, value)

    goal.is_completed = Decimal(goal.current_amount) >= Decimal(goal.target_amount)

    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


# DELETE
@router.delete("/{goal_id}", status_code=204)
def delete_savings_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.get(SavingsGoal, goal_id)

    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    db.delete(goal)
    db.commit()
    return None