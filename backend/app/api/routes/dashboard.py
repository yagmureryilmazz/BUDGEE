from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.db.session import get_db
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.dashboard import DashboardResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardResponse)
def get_dashboard(
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

    summary = {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": total_income - total_expense,
    }

    category_query = db.query(
        Transaction.category,
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == "expense",
    )

    if from_date:
        category_query = category_query.filter(Transaction.spent_at >= from_date)

    if to_date:
        category_query = category_query.filter(Transaction.spent_at <= to_date)

    category_results = category_query.group_by(Transaction.category).all()

    category_total_expense = float(sum(float(row.total) for row in category_results))
    category_transaction_count = int(sum(int(row.count) for row in category_results))

    category_breakdown_items = []

    for category, total, count in category_results:
        total = float(total)
        percentage = (
            round((total / category_total_expense) * 100, 2)
            if category_total_expense > 0
            else 0.0
        )

        category_breakdown_items.append(
            {
                "category": category or "Uncategorized",
                "total": total,
                "percentage": percentage,
            }
        )

    category_breakdown_items.sort(key=lambda x: x["total"], reverse=True)

    category_breakdown = {
        "total_expense": category_total_expense,
        "transaction_count": category_transaction_count,
        "breakdown": category_breakdown_items,
    }

    trend_query = db.query(
        func.extract("year", Transaction.spent_at).label("year"),
        func.extract("month", Transaction.spent_at).label("month"),
        Transaction.type.label("type"),
        func.coalesce(func.sum(Transaction.amount), 0).label("total"),
    ).filter(Transaction.user_id == current_user.id)

    if from_date:
        trend_query = trend_query.filter(Transaction.spent_at >= from_date)

    if to_date:
        trend_query = trend_query.filter(Transaction.spent_at <= to_date)

    trend_results = (
        trend_query.group_by(
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

    for year, month, tx_type, total in trend_results:
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

    monthly_trend = {
        "trend": list(grouped.values()),
    }

    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.is_active == True,
        )
        .order_by(Budget.period_start.desc())
        .all()
    )

    usage_items = []
    alerts_items = []

    for budget in budgets:
        spent_amount = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.category == budget.category,
                Transaction.spent_at >= budget.period_start,
                Transaction.spent_at <= budget.period_end,
            )
            .scalar()
        )

        budget_amount = Decimal(budget.amount)
        spent_amount_decimal = Decimal(spent_amount)
        remaining_amount = budget_amount - spent_amount_decimal

        percentage_used = (
            round(float((spent_amount_decimal / budget_amount) * 100), 2)
            if budget_amount > 0
            else 0.0
        )

        usage_items.append(
            {
                "budget_id": budget.id,
                "category": budget.category,
                "budget_amount": budget_amount,
                "spent_amount": spent_amount_decimal,
                "remaining_amount": remaining_amount,
                "percentage_used": percentage_used,
                "is_over_budget": spent_amount_decimal > budget_amount,
                "period_start": budget.period_start,
                "period_end": budget.period_end,
            }
        )

        if percentage_used >= 100:
            alerts_items.append(
                {
                    "category": budget.category,
                    "percentage_used": percentage_used,
                    "status": "exceeded",
                }
            )
        elif percentage_used >= 80:
            alerts_items.append(
                {
                    "category": budget.category,
                    "percentage_used": percentage_used,
                    "status": "warning",
                }
            )

    budget_usage = {
        "items": usage_items,
    }

    alerts = {
        "alerts": alerts_items,
    }

    return {
        "summary": summary,
        "category_breakdown": category_breakdown,
        "monthly_trend": monthly_trend,
        "budget_usage": budget_usage,
        "alerts": alerts,
    }


@router.get("/insights")
def get_dashboard_insights(
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
    balance = total_income - total_expense

    top_category_row = (
        base_query.filter(Transaction.type == "expense")
        .with_entities(
            Transaction.category,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        )
        .group_by(Transaction.category)
        .order_by(func.coalesce(func.sum(Transaction.amount), 0).desc())
        .first()
    )

    top_category = top_category_row.category if top_category_row else None
    top_category_total = (
        Decimal(top_category_row.total) if top_category_row else Decimal("0")
    )

    budgets = (
        db.query(Budget)
        .filter(
            Budget.user_id == current_user.id,
            Budget.is_active == True,
        )
        .all()
    )

    highest_budget_usage = None

    for budget in budgets:
        spent_amount = (
            db.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == "expense",
                Transaction.category == budget.category,
                Transaction.spent_at >= budget.period_start,
                Transaction.spent_at <= budget.period_end,
            )
            .scalar()
        )

        budget_amount = Decimal(budget.amount)
        spent_amount = Decimal(spent_amount)

        percentage_used = (
            round(float((spent_amount / budget_amount) * 100), 2)
            if budget_amount > 0
            else 0.0
        )

        item = {
            "category": budget.category,
            "budget_amount": float(budget_amount),
            "spent_amount": float(spent_amount),
            "percentage_used": percentage_used,
        }

        if (
            highest_budget_usage is None
            or percentage_used > highest_budget_usage["percentage_used"]
        ):
            highest_budget_usage = item

    messages = []

    if total_income == 0 and total_expense == 0:
        status = "empty"
        title = "Henüz finansal veri yok"
        summary_message = (
            "İlk gelir veya gider işlemini eklediğinde kişisel finansal "
            "içgörülerin burada oluşacak."
        )
    elif total_expense > total_income:
        status = "danger"
        title = "Harcamaların gelirini geçti"
        summary_message = (
            "Bu dönemde giderlerin gelirinden fazla. Harcama kategorilerini "
            "gözden geçirmen faydalı olabilir."
        )
    elif total_income > 0 and total_expense >= total_income * Decimal("0.8"):
        status = "warning"
        title = "Gelirinin büyük kısmı harcanmış"
        summary_message = (
            "Harcamaların gelirinin %80 seviyesine yaklaştı veya geçti. "
            "Kalan dönem için kontrollü ilerlemen önerilir."
        )
    else:
        status = "healthy"
        title = "Finansal durumun sağlıklı görünüyor"
        summary_message = (
            "Gelirin şu an harcamalarını karşılıyor. Bu şekilde devam edersen "
            "pozitif bakiyeni koruyabilirsin."
        )

    messages.append(summary_message)

    if top_category:
        messages.append(
            f"Bu dönemde en yüksek harcama kategorin {top_category}. "
            f"Toplam harcama: ₺{float(top_category_total):,.2f}."
        )

    if total_income > 0:
        expense_ratio = round(float((total_expense / total_income) * 100), 2)
        messages.append(f"Harcamaların gelirinin %{expense_ratio} seviyesinde.")

    if highest_budget_usage:
        if highest_budget_usage["percentage_used"] >= 100:
            messages.append(
                f"{highest_budget_usage['category']} bütçesini aştın. "
                f"Kullanım oranı: %{highest_budget_usage['percentage_used']}."
            )
        elif highest_budget_usage["percentage_used"] >= 80:
            messages.append(
                f"{highest_budget_usage['category']} bütçesinde sınıra yaklaşıyorsun. "
                f"Kullanım oranı: %{highest_budget_usage['percentage_used']}."
            )
        else:
            messages.append(
                f"En yüksek bütçe kullanımın {highest_budget_usage['category']} "
                f"kategorisinde: %{highest_budget_usage['percentage_used']}."
            )

    return {
        "status": status,
        "title": title,
        "summary": summary_message,
        "messages": messages,
        "metrics": {
            "total_income": float(total_income),
            "total_expense": float(total_expense),
            "balance": float(balance),
            "top_category": top_category,
            "top_category_total": float(top_category_total),
            "highest_budget_usage": highest_budget_usage,
        },
    }