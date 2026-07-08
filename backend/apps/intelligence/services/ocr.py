import os
import time
import requests
import io
import pytesseract
import fitz  # PyMuPDF
from PIL import Image
from apps.vault.models import MedicalRecord
from apps.intelligence.models import OCRLog
from apps.intelligence.exceptions import OCRFailedException, OCRValidationException

# Configure local tesseract executable path dynamically
LOCAL_TESS_EXE = r"D:\Coding\Projects\JeevanAI\tesseract\tesseract.exe"
if os.path.exists(LOCAL_TESS_EXE):
    pytesseract.pytesseract.tesseract_cmd = LOCAL_TESS_EXE

class OCRService:
    """Production OCR service downloading files from Cloudinary and processing via Tesseract/PyMuPDF."""

    @classmethod
    def extract_text(cls, record: MedicalRecord) -> tuple:
        """
        Downloads the actual file and extracts text using high-fidelity PyMuPDF/pytesseract.
        Returns:
            (extracted_text, confidence, execution_time)
        """
        file_url = record.file.file_url
        if not file_url:
            raise OCRFailedException("No file URL associated with the medical record.")

        start_time = time.time()
        
        try:
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()
            file_bytes = response.content
        except Exception as e:
            raise OCRFailedException(f"Failed to download file from Cloudinary: {str(e)}")

        # Determine extension from URL (e.g. .pdf, .png, .jpg)
        filename_part = file_url.split("?")[0]
        file_ext = os.path.splitext(filename_part)[1].lower()
        extracted_text = ""

        try:
            if file_ext == ".pdf":
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                pages_text = []
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    # Try direct text extraction first
                    text = page.get_text()
                    if text.strip():
                        pages_text.append(text)
                    else:
                        # Fallback to image-rendering and OCR
                        pix = page.get_pixmap(dpi=150)
                        img_data = pix.tobytes("png")
                        img = Image.open(io.BytesIO(img_data))
                        ocr_text = pytesseract.image_to_string(img)
                        pages_text.append(ocr_text)
                extracted_text = "\n".join(pages_text)
            else:
                # Images (JPG, PNG, JPEG)
                img = Image.open(io.BytesIO(file_bytes))
                extracted_text = pytesseract.image_to_string(img)

        except Exception as e:
            raise OCRFailedException(f"pytesseract OCR processing crashed: {str(e)}")

        execution_time = time.time() - start_time
        clean_text = extracted_text.strip()

        # Perform validations:
        # Reject blank or unreadable documents (meaningful text threshold: 10 chars)
        if len(clean_text) < 10:
            OCRLog.objects.create(
                file=record.file,
                extracted_text_length=len(clean_text),
                raw_text=clean_text,
                confidence=0.0,
                execution_time=execution_time,
                status="Failed (Blank or unreadable)"
            )
            raise OCRValidationException(
                "Blank or unreadable document: The uploaded file contains too little readable text."
            )

        # Log successful OCR run
        confidence = 0.95
        OCRLog.objects.create(
            file=record.file,
            extracted_text_length=len(clean_text),
            raw_text=clean_text,
            confidence=confidence,
            execution_time=execution_time,
            status="Success"
        )

        return clean_text, confidence, execution_time
