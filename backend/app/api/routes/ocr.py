import asyncio
import time

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr_service import parse_receipt

router = APIRouter(prefix="/ocr", tags=["OCR"])

MAX_FILE_SIZE_MB = 5
OCR_TIMEOUT_SECONDS = 120


@router.post("/scan")
async def scan_receipt(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "INVALID_FILE_TYPE",
                "message": "Only image files are allowed."
            }
        )

    file_bytes = await file.read()
    print(
        "OCR UPLOAD:",
        {
            "filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": len(file_bytes),
        },
    )

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "EMPTY_FILE",
                "message": "Uploaded file is empty."
            }
        )

    max_file_size_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "FILE_TOO_LARGE",
                "message": f"Image file must be smaller than {MAX_FILE_SIZE_MB} MB."
            }
        )
    started_at = time.perf_counter()
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(parse_receipt, file_bytes),
            timeout=OCR_TIMEOUT_SECONDS,
        )
        elapsed = round(time.perf_counter() - started_at, 2)
        print(f"OCR COMPLETED IN {elapsed}s")
        if isinstance(result, dict):
            print(
                "OCR RESULT SUMMARY:",
                {
                    "merchant": result.get("merchant"),
                    "amount": result.get("amount"),
                    "date": result.get("date"),
                    "category": result.get("category"),
                    "confidence": result.get("confidence"),
                },
            )

        return result

    except asyncio.TimeoutError:
        elapsed = round(time.perf_counter() - started_at, 2)
        print(f"OCR TIMEOUT AFTER {elapsed}s")
        raise HTTPException(
            status_code=504,
            detail={
                "code": "OCR_TIMEOUT",
                "message": "Receipt processing took too long. Please try again with a clearer receipt image."
            }
        )

    except Exception as e:
        print("OCR ERROR:", e)  # backend log için

        raise HTTPException(
            status_code=500,
            detail={
                "code": "OCR_FAILED",
                "message": "Receipt could not be processed."
            }
        )