"""Serviço de OCR via OCR.space API."""
from io import BytesIO
import os
from PIL import Image
import requests


def run_ocr(image_bytes: bytes, filename: str = "image.png") -> dict:
    """Processa bytes de imagem usando a API OCR.space e retorna estrutura padronizada."""
    api_key = os.getenv("OCR_SPACE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Chave OCR_SPACE_API_KEY não configurada no arquivo .env.")

    with Image.open(BytesIO(image_bytes)) as img:
        img_width, img_height = img.size

    response = requests.post(
        "https://api.ocr.space/parse/image",
        files={"file": (filename, image_bytes)},
        data={
            "apikey": api_key,
            "isOverlayRequired": True,
            "detectOrientation": True,
        },
        timeout=30,
    )

    if response.status_code != 200:
        raise RuntimeError(f"Falha na API OCR.space (HTTP {response.status_code}).")

    result = response.json()
    if result.get("IsErroredOnProcessing"):
        error_msg = result.get("ErrorMessage") or "Erro ao processar OCR."
        if isinstance(error_msg, list):
            error_msg = "; ".join(error_msg)
        raise RuntimeError(str(error_msg))

    parsed_results = result.get("ParsedResults") or []
    if not parsed_results:
        raise RuntimeError("Nenhum resultado retornado pelo serviço de OCR.")

    first_result = parsed_results[0]
    exit_code = first_result.get("FileParseExitCode", 1)
    if exit_code not in (1, 2):
        err = first_result.get("ErrorMessage") or first_result.get("ErrorDetails") or "Falha ao processar o arquivo de imagem."
        if isinstance(err, list):
            err = "; ".join(err)
        raise RuntimeError(str(err))

    content = (first_result.get("ParsedText") or "").strip()
    text_overlay = first_result.get("TextOverlay") or {}
    ocr_lines = text_overlay.get("Lines") or []

    lines = []
    words = []
    default_conf = 0.95 if exit_code == 1 else 0.50

    for line in ocr_lines:
        line_text = line.get("LineText", "")
        line_words = line.get("Words") or []
        line_word_objects = []

        for w in line_words:
            w_text = w.get("WordText", "")
            left = int(w.get("Left", 0))
            top = int(w.get("Top", 0))
            width_w = int(w.get("Width", 0))
            height_w = int(w.get("Height", 0))
            w_box = [[left, top], [left + width_w, top], [left + width_w, top + height_w], [left, top + height_w]]
            w_obj = {"content": w_text, "confidence": default_conf, "bounding_box": w_box}
            line_word_objects.append(w_obj)
            words.append(w_obj)

        if line_word_objects:
            min_l = min(w.get("Left", 0) for w in line_words)
            min_t = min(w.get("Top", 0) for w in line_words)
            max_r = max(w.get("Left", 0) + w.get("Width", 0) for w in line_words)
            max_b = max(w.get("Top", 0) + w.get("Height", 0) for w in line_words)
            line_box = [[min_l, min_t], [max_r, min_t], [max_r, max_b], [min_l, max_b]]
        else:
            line_box = None

        lines.append({"content": line_text, "confidence": default_conf, "bounding_box": line_box})

    if not lines and content:
        for line_str in content.splitlines():
            line_str = line_str.strip()
            if line_str:
                lines.append({"content": line_str, "confidence": default_conf, "bounding_box": None})
                for w_str in line_str.split():
                    words.append({"content": w_str, "confidence": default_conf, "bounding_box": None})

    avg_confidence = round(sum(w["confidence"] for w in words) / len(words), 2) if words else 0.0

    return {
        "success": True,
        "content": content,
        "confidence": avg_confidence,
        "lines": lines,
        "words": words,
        "pages": [
            {
                "page_number": 1,
                "width": img_width,
                "height": img_height,
                "unit": "pixel",
                "lines": lines,
                "words": words,
            }
        ],
        "styles": [],
    }
