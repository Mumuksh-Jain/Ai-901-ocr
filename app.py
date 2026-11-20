"""OCR: upload de imagem com extração de texto via OCR.space API."""
from io import BytesIO
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, send_from_directory
from PIL import Image, UnidentifiedImageError
from services.ocr import run_ocr

load_dotenv()
LOG = logging.getLogger(__name__)
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_UPLOAD_MB", "4")) * 1024 * 1024
EXTENSIONS = {"png", "jpg", "jpeg", "bmp", "tiff", "tif"}
VALID_FORMATS = {"PNG", "JPEG", "BMP", "TIFF"}


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/exemplos/<path:filename>")
def sample_file(filename):
    return send_from_directory("exemplos", filename)


@app.post("/api/analyze")
def analyze():
    uploaded = request.files.get("image")
    if not uploaded or not uploaded.filename:
        return jsonify({"success": False, "error": "Selecione uma imagem."}), 400
    extension = Path(uploaded.filename).suffix.lower().lstrip(".")
    if extension not in EXTENSIONS:
        return jsonify({"success": False, "error": "Formato não suportado."}), 415
    content = uploaded.read()
    if not content:
        return jsonify({"success": False, "error": "Arquivo vazio."}), 400
    try:
        with Image.open(BytesIO(content)) as img:
            img.verify()
            if img.format not in VALID_FORMATS:
                raise UnidentifiedImageError()
    except (UnidentifiedImageError, ValueError, OSError):
        return jsonify({"success": False, "error": "O conteúdo enviado não é uma imagem válida."}), 415

    try:
        return jsonify(run_ocr(content, filename=uploaded.filename))
    except RuntimeError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400
    except Exception:
        LOG.exception("Falha no serviço de OCR")
        return jsonify({"success": False, "error": "Falha ao analisar a imagem no serviço de OCR."}), 502


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"success": False, "error": "Arquivo ultrapassa o limite configurado."}), 413


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5001")), debug=False)
