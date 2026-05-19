from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.transactions import router as transactions_router
from app.api.routes.admin import router as admin_router
from app.api.routes.budget import router as budget_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.savings_goal import router as savings_goals_router
from app.api.routes.prediction import router as prediction_router
from app.api.routes.currency import router as currency_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(transactions_router)
api_router.include_router(admin_router)
api_router.include_router(budget_router)
api_router.include_router(dashboard_router)
api_router.include_router(savings_goals_router)
api_router.include_router(prediction_router)
api_router.include_router(currency_router)

