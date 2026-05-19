from fastapi import APIRouter, Query
from app.services.currency_service import convert_currency
from app.schemas.currency import CurrencyEnum

router = APIRouter(prefix="/currency", tags=["Currency"])


@router.get("/convert")
def currency_convert(
    amount: float = Query(..., gt=0),
    from_currency: CurrencyEnum = Query(...),
    to_currency: CurrencyEnum = Query(...),
):
    return convert_currency(amount, from_currency, to_currency)