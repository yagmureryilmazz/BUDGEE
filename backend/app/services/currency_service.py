import requests


FRANKFURTER_BASE_URL = "https://api.frankfurter.dev/v1"


def convert_currency(amount: float, from_currency: str, to_currency: str):
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    if from_currency == to_currency:
        return {
            "amount": amount,
            "from_currency": from_currency,
            "to_currency": to_currency,
            "rate": 1.0,
            "converted_amount": round(amount, 2),
            "date": None,
        }

    url = (
        f"{FRANKFURTER_BASE_URL}/latest"
        f"?amount={amount}&base={from_currency}&symbols={to_currency}"
    )

    response = requests.get(url, timeout=10)
    response.raise_for_status()

    data = response.json()

    rate = data["rates"][to_currency] / amount if amount != 0 else 0
    converted_amount = data["rates"][to_currency]

    return {
        "amount": amount,
        "from_currency": from_currency,
        "to_currency": to_currency,
        "rate": round(rate, 6),
        "converted_amount": round(converted_amount, 2),
        "date": data.get("date"),
    }