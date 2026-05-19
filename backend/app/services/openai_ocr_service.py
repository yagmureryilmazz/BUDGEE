import os
import json
import base64
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def clean_receipt_with_openai(file_bytes: bytes, raw_text: str = ""):
    print("OPENAI OCR FUNCTION CALLED")

    base64_image = base64.b64encode(file_bytes).decode("utf-8")

    response = client.responses.create(
        model="gpt-4o-mini",
        input=[
            {
                "role": "system",
                "content": (
                    "You extract structured data from receipt images. "
                    "Do not invent values. If unsure, return null. "
                    "Use the image as the primary source. OCR text is secondary context only. "
                    "Merchant must be the business name only, not the address. "
                    "Prefer the printed merchant name at the top of the receipt. "
                    "Prefer the final total payment amount, not VAT, tax, or subtotal. "
                    "Normalize date to YYYY-MM-DD when possible. "
                    "Category must be one of: Food, Groceries, Transportation, Shopping, Health, Utilities, Other."
                ),
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Extract merchant, amount, date, and category from this receipt image. "
                            "Keep legal suffixes like A.Ş., Ltd., Şti. if clearly present. "
                            f"Secondary OCR text:\n{raw_text}"
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "high",
                    },
                ],
            },
        ],
        text={
            "format": {
                "type": "json_schema",
                "name": "receipt_extraction",
                "strict": True,
                "schema": {
                    "type": "object",
                    "properties": {
                        "merchant": {"type": ["string", "null"]},
                        "amount": {"type": ["number", "null"]},
                        "date": {"type": ["string", "null"]},
                        "category": {
                            "type": ["string", "null"],
                            "enum": [
                                "Food",
                                "Groceries",
                                "Transportation",
                                "Shopping",
                                "Health",
                                "Utilities",
                                "Other",
                                None
                            ]
                        },
                        "merchant_confidence": {"type": "number"},
                        "amount_confidence": {"type": "number"},
                        "date_confidence": {"type": "number"}
                    },
                    "required": [
                        "merchant",
                        "amount",
                        "date",
                        "category",
                        "merchant_confidence",
                        "amount_confidence",
                        "date_confidence"
                    ],
                    "additionalProperties": False
                }
            }
        }
    )

    print("OPENAI OUTPUT TEXT:", response.output_text)
    result = json.loads(response.output_text)
    print("OPENAI PARSED RESULT:", result)
    return result