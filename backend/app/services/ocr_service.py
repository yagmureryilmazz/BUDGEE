import re
import unicodedata
from datetime import datetime
from difflib import SequenceMatcher
from io import BytesIO
from typing import Optional

import cv2
import numpy as np
from PIL import Image, ImageOps, ImageFilter
import pytesseract

from app.services.openai_ocr_service import clean_receipt_with_openai

pytesseract.pytesseract.tesseract_cmd = "/opt/homebrew/bin/tesseract"


CATEGORY_KEYWORDS = {
    "Food": [
        "restaurant", "burger", "pizza", "cafe", "coffee", "doner",
        "lahmacun", "ayran", "yiyecek", "yemek", "lokanta", "kafe"
    ],
    "Groceries": ["migros", "bim", "a101", "sok", "şok", "market", "carrefour"],
    "Transportation": ["uber", "taxi", "metro", "bus", "petrol", "shell", "opet"],
    "Shopping": ["mall", "store", "shop", "zara", "hm"],
    "Health": ["pharmacy", "hospital", "clinic", "eczane"],
    "Utilities": ["electric", "water", "internet", "gas", "fatura"],
}


KNOWN_MERCHANTS = {
    "migros": "Migros",
    "bim": "BİM",
    "a101": "A101",
    "sok": "Şok",
    "şok": "Şok",
    "carrefour": "Carrefour",
    "starbucks": "Starbucks",
    "mcdonald": "McDonald's",
    "burger king": "Burger King",
    "shell": "Shell",
    "opet": "Opet",
    "petrol ofisi": "Petrol Ofisi",
    "unitur": "Ünitur Turizm Organizasyon İşletmecilik A.Ş.",
    "ünitur": "Ünitur Turizm Organizasyon İşletmecilik A.Ş.",
}

# Image optimization constants
MAX_OCR_IMAGE_SIDE = 1400
OPENAI_IMAGE_SIDE = 900
OPENAI_IMAGE_QUALITY = 65

STOP_WORDS_MERCHANT = [
    "tarih", "date", "saat", "time", "fis", "fiş", "fis no", "fiş no",
    "toplam", "total", "topkdv", "kdv", "kart", "kredi", "credit",
    "nakit", "cash", "odeme", "ödeme", "ref", "isyeri", "term",
    "onay", "bölüm", "bolum", "z no", "zno", "eku", "app label",
    "aid", "no:", "vd:", "v.d", "verg", "sıra no", "sira no"
]

ADDRESS_HINTS = [
    "mah", "mahalle", "cad", "caddesi", "sok", "sk", "bulvar", "yolu",
    "no", "kat", "daire", "istanbul", "ankara", "izmir", "tuzla",
    "kadikoy", "kadıköy", "besiktas", "beşiktaş", "park", "karşısı", "karsisi"
]

STRONG_MERCHANT_HINTS = [
    "ltd", "şti", "sti", "a.ş", "aş", "market", "cafe", "restaurant",
    "restoran", "turizm", "organizasyon", "işletmecilik", "isletmecilik",
    "üniversitesi", "universitesi", "ticaret", "sanayi"
]


def _safe_text(value: Optional[str]) -> str:
    return value if isinstance(value, str) else ""


def _normalize_for_matching(text: str) -> str:
    text = _safe_text(text).lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("€", "e")
    text = text.replace("@", "a")

    replacements = {
        "ı": "i",
        "ş": "s",
        "ğ": "g",
        "ü": "u",
        "ö": "o",
        "ç": "c",
        "orcanezashon": "organizasyon",
        "organezasyon": "organizasyon",
        "organızasyon": "organizasyon",
        "uniter": "unitur",
        "unıter": "unitur",
        "üniter": "unitur",
        "untter": "unitur",
        "unitr": "unitur",
        "unltur": "unitur",
        "ünitur": "unitur",
        "turtz": "turizm",
        "turtzm": "turizm",
        "untverstises": "universitesi",
        "universtises": "universitesi",
        "ictk": "isletmecilik",
        "ict": "isletmecilik",
        "isletmelicik": "isletmecilik",
        "tsletmelicik": "isletmecilik",
        "a.s": "as",
        "a.ş": "as",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    text = re.sub(r"[^a-z0-9\s./&:-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _clean_merchant_line(line: str) -> str:
    cleaned = re.sub(
        r"[^A-Za-z0-9ÇĞİÖŞÜçğıöşü\s.&/:-]",
        "",
        _safe_text(line),
    ).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def _open_image(file_bytes: bytes) -> Image.Image:
    image = Image.open(BytesIO(file_bytes))
    image = ImageOps.exif_transpose(image)
    return image.convert("RGB")


# Resize image so longest side is at most max_side, preserving aspect ratio
def _resize_image(image: Image.Image, max_side: int) -> Image.Image:
    width, height = image.size
    longest_side = max(width, height)

    if longest_side <= max_side:
        return image

    ratio = max_side / longest_side
    new_size = (max(1, int(width * ratio)), max(1, int(height * ratio)))
    return image.resize(new_size, Image.Resampling.LANCZOS)


# Convert image to JPEG bytes with given quality (default 70)
def _image_to_jpeg_bytes(image: Image.Image, quality: int = 70) -> bytes:
    output = BytesIO()
    image.convert("RGB").save(output, format="JPEG", quality=quality, optimize=True)
    return output.getvalue()


# Optimize image for OpenAI: auto-crop, resize, and compress as JPEG
def optimize_image_for_openai(file_bytes: bytes) -> bytes:
    image = _open_image(file_bytes)
    image = _auto_crop_receipt(image)
    image = _resize_image(image, OPENAI_IMAGE_SIDE)
    return _image_to_jpeg_bytes(image, quality=OPENAI_IMAGE_QUALITY)


def _pil_to_cv(image: Image.Image) -> np.ndarray:
    return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)


def _cv_to_pil(image: np.ndarray) -> Image.Image:
    return Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))


def _auto_crop_receipt(image: Image.Image) -> Image.Image:
    cv_img = _pil_to_cv(image)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    edges = cv2.Canny(blur, 50, 150)
    kernel = np.ones((5, 5), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=2)
    edges = cv2.erode(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return image

    h, w = gray.shape
    image_area = h * w

    best_rect = None
    best_score = -1

    for cnt in contours:
        x, y, cw, ch = cv2.boundingRect(cnt)
        area = cw * ch
        if area < image_area * 0.06:
            continue

        aspect = ch / max(cw, 1)
        score = area
        if aspect > 1.4:
            score += area * 0.5

        if score > best_score:
            best_score = score
            best_rect = (x, y, cw, ch)

    if not best_rect:
        return image

    x, y, cw, ch = best_rect
    pad_x = int(cw * 0.05)
    pad_y = int(ch * 0.03)

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w, x + cw + pad_x)
    y2 = min(h, y + ch + pad_y)

    cropped = cv_img[y1:y2, x1:x2]
    return _cv_to_pil(cropped)


def _prepare_variants(image: Image.Image) -> list[Image.Image]:
    base = image.filter(ImageFilter.SHARPEN)
    gray = ImageOps.grayscale(base)
    enhanced = gray.point(lambda x: 0 if x < 165 else 255, "1")
    return [gray, enhanced]


def _ocr_single(image: Image.Image, psm: int) -> list[str]:
    config = f"--oem 3 --psm {psm}"
    results = []

    try:
        text = pytesseract.image_to_string(image, lang="tur+eng", config=config)
        if text and text.strip():
            results.append(text.strip())
    except Exception:
        pass

    return results


def _score_ocr_text(text: str) -> float:
    stripped = _safe_text(text).strip()
    lines = [x.strip() for x in stripped.splitlines() if x.strip()]
    alpha = sum(ch.isalpha() for ch in stripped)
    digit = sum(ch.isdigit() for ch in stripped)
    return len(stripped) + len(lines) * 12 + alpha * 0.5 + digit * 0.3


def _best_text(image: Image.Image, psm_list: list[int]) -> str:
    candidates = []

    for variant in _prepare_variants(image):
        for psm in psm_list:
            candidates.extend(_ocr_single(variant, psm))

    if not candidates:
        return ""

    return max(candidates, key=_score_ocr_text)


def extract_text_from_image(file_bytes: bytes) -> str:
    image = _auto_crop_receipt(_open_image(file_bytes))
    image = _resize_image(image, MAX_OCR_IMAGE_SIDE)
    return _best_text(image, [6])


def extract_header_text(file_bytes: bytes) -> str:
    image = _auto_crop_receipt(_open_image(file_bytes))
    image = _resize_image(image, MAX_OCR_IMAGE_SIDE)
    w, h = image.size
    header = image.crop((0, 0, w, int(h * 0.33)))
    return _best_text(header, [6])


def normalize_price_string(value: str) -> Optional[float]:
    value = _safe_text(value).strip().replace(" ", "")

    if "," in value and "." in value:
        value = value.replace(".", "").replace(",", ".")
    elif "," in value:
        value = value.replace(",", ".")

    try:
        return float(value)
    except Exception:
        return None


def find_prices_in_line(line: str) -> list[float]:
    line = re.sub(r"(\d)[ ]+[.,][ ]*(\d{2})", r"\1,\2", line)
    line = re.sub(r"([.,])[ ]+(\d{2})", r"\1\2", line)
    line = re.sub(r"(\d)[ ]+(\d{3}[.,]\d{2})", r"\1.\2", line)

    pattern = r"(?<!\d)(\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2}))(?!\d)"
    matches = re.findall(pattern, line)

    prices = []
    for match in matches:
        price = normalize_price_string(match)
        if price is not None:
            prices.append(price)
    return prices


def extract_amount(text: str) -> Optional[float]:
    lines = [line.strip() for line in _safe_text(text).splitlines() if line.strip()]

    high_priority = ["toplam", "total", "genel toplam", "grand total"]
    medium_priority = ["kredi", "credit", "nakit", "card", "kart", "odeme", "ödeme", "tl"]
    ignore_words = ["kdv", "topkdv", "iskonto", "indirim", "discount", "change", "para ustu", "paraüstü"]

    candidates: list[tuple[str, float]] = []

    def add(source: str, price_list: list[float]):
        for p in price_list:
            if 0.5 <= p <= 100000:
                candidates.append((source, p))

    for line in lines:
        lowered = _normalize_for_matching(line)
        if any(word in lowered for word in ignore_words):
            continue
        if any(word in lowered for word in high_priority):
            add("toplam_line", find_prices_in_line(line))

    for i, line in enumerate(lines[:-1]):
        lowered = _normalize_for_matching(line)
        if any(word in lowered for word in ignore_words):
            continue
        if any(word in lowered for word in high_priority):
            add("after_toplam", find_prices_in_line(lines[i + 1]))

    for line in lines:
        lowered = _normalize_for_matching(line)
        if any(word in lowered for word in ignore_words):
            continue
        if any(word in lowered for word in medium_priority):
            add("payment_line", find_prices_in_line(line))

    for line in lines:
        lowered = _normalize_for_matching(line)
        if any(word in lowered for word in ignore_words):
            continue
        add("generic", find_prices_in_line(line))

    if not candidates:
        return None

    counts = {}
    for _, price in candidates:
        key = round(price, 2)
        counts[key] = counts.get(key, 0) + 1

    def score(source: str, price: float) -> float:
        s = 0
        if source == "payment_line":
            s += 140
        elif source == "after_toplam":
            s += 130
        elif source == "toplam_line":
            s += 120
        else:
            s += 20

        s += counts.get(round(price, 2), 0) * 25

        if 0.5 <= price <= 10000:
            s += 20

        return s

    best = sorted(candidates, key=lambda item: score(item[0], item[1]), reverse=True)[0][1]
    return round(best, 2)


def _normalize_year(year: int) -> int:
    current_year = datetime.now().year

    if 2000 <= year <= current_year + 5:
        return year

    year_str = str(year)
    if len(year_str) == 4:
        last_two = int(year_str[-2:])
        candidate = 2000 + last_two
        if 2000 <= candidate <= current_year + 5:
            return candidate

    return year


def _parse_date_string(raw: str) -> Optional[str]:
    m = re.match(r"^(\d{2})[./-](\d{2})[./-](\d{4})$", raw)
    if m:
        day = int(m.group(1))
        month = int(m.group(2))
        year = _normalize_year(int(m.group(3)))
        try:
            return datetime(year, month, day).date().isoformat()
        except Exception:
            return None

    m = re.match(r"^(\d{4})[./-](\d{2})[./-](\d{2})$", raw)
    if m:
        year = _normalize_year(int(m.group(1)))
        month = int(m.group(2))
        day = int(m.group(3))
        try:
            return datetime(year, month, day).date().isoformat()
        except Exception:
            return None

    return None


def extract_date(text: str) -> Optional[str]:
    lines = [line.strip() for line in _safe_text(text).splitlines() if line.strip()]

    patterns = [
        r"(\d{2}[./-]\d{2}[./-]\d{4})",
        r"(\d{4}[./-]\d{2}[./-]\d{2})",
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            parsed = _parse_date_string(match.group(1))
            if parsed:
                return parsed

    for i in range(len(lines) - 1):
        merged = f"{lines[i]} {lines[i + 1]}"
        merged = merged.replace("@", "0")

        for pattern in patterns:
            match = re.search(pattern, merged)
            if match:
                parsed = _parse_date_string(match.group(1))
                if parsed:
                    return parsed

    return None


def _looks_like_address_or_noise(text: str) -> bool:
    norm = _normalize_for_matching(text)

    address_words = [
        "mah", "mahalle", "cad", "caddesi", "sok", "sk", "bulvar", "yolu",
        "istanbul", "tuzla", "ankara", "izmir", "park", "karsisi", "karşısı",
        "vd", "no", "sic", "tic"
    ]

    stop_words = [
        "tarih", "saat", "fis", "fiş", "toplam", "kdv", "kart", "kredi",
        "ref", "isyeri", "term", "app label", "aid"
    ]

    if any(word in norm for word in address_words):
        return True

    if any(word in norm for word in stop_words):
        return True

    if "/" in text:
        return True

    return False


def _merchant_line_score(raw_line: str, line_index: int) -> float:
    cleaned = _clean_merchant_line(raw_line)
    norm = _normalize_for_matching(raw_line)

    if not cleaned:
        return -999

    letters = sum(c.isalpha() for c in cleaned)
    digits = sum(c.isdigit() for c in cleaned)

    if letters < 3:
        return -999

    if digits > letters:
        return -999

    if _looks_like_address_or_noise(cleaned):
        return -999

    score = 0.0

    if line_index <= 2:
        score += 0.30
    elif line_index <= 5:
        score += 0.18

    strong_words = [
        "market", "cafe", "restaurant", "restoran",
        "turizm", "organizasyon", "isletmecilik",
        "ltd", "sti", "as", "universitesi"
    ]

    if any(word in norm for word in strong_words):
        score += 0.35

    if cleaned.upper() == cleaned and letters >= 5:
        score += 0.18

    if len(cleaned) > 55:
        score -= 0.25
    elif len(cleaned) <= 40:
        score += 0.10

    if digits > 0:
        score -= 0.15

    return score


def extract_merchant(header_text: str, raw_text: str = "") -> tuple[Optional[str], list[str], float]:
    source = _safe_text(header_text) or _safe_text(raw_text)
    raw_lines = [line.strip() for line in source.splitlines() if line.strip()]

    if not raw_lines:
        return None, [], 0.0

    scored = []

    for idx, line in enumerate(raw_lines[:10]):
        cleaned = _clean_merchant_line(line)
        score = _merchant_line_score(line, idx)

        if cleaned and score > -999:
            scored.append((score, cleaned))

    scored.sort(reverse=True)

    candidates = []
    seen = set()

    for score, text in scored:
        key = _normalize_for_matching(text)
        if key and key not in seen:
            seen.add(key)
            candidates.append((score, text))

    candidate_values = [c[1] for c in candidates[:5]]

    if not candidates:
        return None, [], 0.0

    best_score, best_text = candidates[0]

    if best_score < 0.55:
        return None, candidate_values, best_score

    return best_text, candidate_values, best_score


def _best_known_merchant_match(text: str) -> Optional[str]:
    best_value = None
    best_score = 0.0

    for key, value in KNOWN_MERCHANTS.items():
        score = SequenceMatcher(None, key, text).ratio()
        if key in text:
            score += 0.5
        if score > best_score:
            best_score = score
            best_value = value

    if best_score >= 0.78:
        return best_value

    return None


def normalize_merchant_name(
    merchant: Optional[str],
    raw_text: str = "",
    header_text: str = ""
) -> tuple[Optional[str], float]:
    combined = _normalize_for_matching(f"{merchant or ''} {raw_text} {header_text}")

    known = _best_known_merchant_match(combined)
    if known:
        return known, 0.95

    if (
        "unitur" in combined
        or "ünitur" in combined
        or (
            "turizm" in combined
            and "organizasyon" in combined
            and "isletmecilik" in combined
        )
    ):
        return "Ünitur Turizm Organizasyon İşletmecilik A.Ş.", 0.90

    if not merchant:
        return None, 0.0

    if _looks_like_address_or_noise(merchant):
        return None, 0.0

    merchant = merchant.strip()
    merchant = re.sub(r"\s+", " ", merchant)

    if len(merchant) < 4 or len(merchant) > 60:
        return None, 0.0

    replacements = {
        "A. S.": "A.Ş.",
        "A. S": "A.Ş.",
        "A S": "A.Ş.",
        "Ltd .": "Ltd.",
        "Sti.": "Şti.",
        "Sti": "Şti",
        "Universitesi": "Üniversitesi",
        "Isletmecilik": "İşletmecilik",
        "Turizm": "Turizm",
        "Organizasyon": "Organizasyon",
    }

    for old, new in replacements.items():
        merchant = merchant.replace(old, new)

    merchant = merchant.title()
    merchant = merchant.replace("A.Ş.", "A.Ş.")
    merchant = merchant.replace("Şti.", "Şti.")

    return merchant, 0.60


def suggest_category(text: str, merchant: Optional[str]) -> str:
    base = f"{_safe_text(text)} {_safe_text(merchant)}".lower()

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in base:
                return category

    return "Other"


def _compute_overall_confidence(
    merchant_conf: float,
    amount: Optional[float],
    date: Optional[str]
) -> str:
    score = 0.0

    if merchant_conf >= 0.75:
        score += 1.0
    elif merchant_conf >= 0.55:
        score += 0.6

    if amount is not None:
        score += 1.0

    if date:
        score += 1.0

    if score >= 2.5:
        return "high"
    if score >= 1.5:
        return "medium"
    return "low"


def fix_category(category, raw_text, merchant):
    text = f"{raw_text or ''} {merchant or ''}"
    normalized_text = _normalize_for_matching(text)
    normalized_merchant = _normalize_for_matching(merchant or "")
    compact_text = re.sub(r"[^a-z0-9]", "", normalized_text)
    compact_merchant = re.sub(r"[^a-z0-9]", "", normalized_merchant)

    # Known food merchant / OCR variants for Ünitur receipts
    if any(k in normalized_text for k in [
        "unitur",
        "unitur turizm",
        "turizm organizasyon",
        "organizasyon isletmecilik",
    ]):
        return "Food"

    if any(k in compact_text for k in [
        "unitur",
        "uniter",
        "uniturturizm",
        "turizmorganizasyon",
        "organizasyonisletmecilik",
    ]):
        return "Food"

    if any(k in normalized_merchant for k in [
        "unitur",
        "unitur turizm",
        "turizm organizasyon",
        "organizasyon isletmecilik",
    ]):
        return "Food"

    if any(k in compact_merchant for k in [
        "unitur",
        "uniter",
        "uniturturizm",
        "turizmorganizasyon",
        "organizasyonisletmecilik",
    ]):
        return "Food"

    food_keywords = [
        "yiyecek", "yemek", "yiyec", "yem", "icecek", "içecek",
        "cafe", "kafe", "restaurant", "restoran", "lokanta",
        "burger", "pizza", "doner", "döner", "lahmacun", "ayran",
        "çay", "cay", "kahve", "coffee", "menu", "menü",
        "siparis", "sipariş", "masa", "servis", "sandvic", "sandwich"
    ]

    groceries_keywords = [
        "market", "migros", "bim", "a101", "şok", "sok", "carrefour"
    ]

    transportation_keywords = [
        "taxi", "uber", "metro", "otobüs", "otobus", "petrol", "shell", "opet"
    ]

    health_keywords = [
        "eczane", "pharmacy", "hospital", "clinic", "hastane"
    ]

    utilities_keywords = [
        "fatura", "electric", "water", "internet", "gas", "doğalgaz", "dogalgaz"
    ]

    shopping_keywords = [
        "zara", "hm", "shop", "store", "avm", "mall"
    ]

    if any(k in normalized_text for k in food_keywords):
        return "Food"

    # Receipt-like fallback: if a receipt has total/tax wording but no stronger category,
    # prefer Food only for merchant-like service receipts, not supermarkets.
    if (
        "toplam" in normalized_text
        and ("kdv" in normalized_text or "fis" in normalized_text or "pos" in normalized_text)
        and not any(k in normalized_text for k in groceries_keywords)
    ):
        if any(k in normalized_text for k in ["turizm", "cafe", "restoran", "restaurant", "servis"]):
            return "Food"

    if any(k in normalized_text for k in groceries_keywords):
        return "Groceries"

    if any(k in normalized_text for k in transportation_keywords):
        return "Transportation"

    if any(k in normalized_text for k in health_keywords):
        return "Health"

    if any(k in normalized_text for k in utilities_keywords):
        return "Utilities"

    if any(k in normalized_text for k in shopping_keywords):
        return "Shopping"

    return category or "Other"


def parse_receipt(file_bytes: bytes):
    print("PARSE_RECEIPT RUNNING")
    optimized_file_bytes = optimize_image_for_openai(file_bytes)

    # GERÇEK OCR TEXT BURADA ÜRETİLİYOR
    extracted_raw_text = extract_text_from_image(file_bytes)

    if not extracted_raw_text.strip():
        return {
            "merchant": None,
            "amount": None,
            "date": None,
            "category": "Other",
            "error": "NO_RECEIPT_TEXT",
            "message": "No readable receipt text was detected in this image.",
        }

    merchant = None
    amount = extract_amount(extracted_raw_text)
    date = extract_date(extracted_raw_text)
    category = "Other"

    try:
        ai_result = clean_receipt_with_openai(optimized_file_bytes, extracted_raw_text)
        print("AI RESULT:", ai_result)

        merchant = ai_result.get("merchant") or merchant
        amount = ai_result.get("amount") or amount
        date = ai_result.get("date") or date
        category = ai_result.get("category") or category

    except Exception as e:
        print("AI OCR ERROR:", str(e))

    # EN ÖNEMLİ SATIR
    category = fix_category(category, extracted_raw_text, merchant)
    print("FINAL OCR CATEGORY:", category)

    if not merchant and amount is None and not date:
        return {
            "merchant": None,
            "amount": None,
            "date": None,
            "category": "Other",
            "error": "NO_RECEIPT_DATA",
            "message": "Receipt data could not be detected. Please upload a clearer receipt image.",
        }

    return {
        "merchant": merchant,
        "amount": amount,
        "date": date,
        "category": category,
    }