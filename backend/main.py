from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time, io

from extractor import run_single_pass
from pdf_reader import extract_text_with_pages

app = FastAPI(title="LexAI", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://lex-ai-alpha.vercel.app",
        "https://lex-ai-git-main-akshai-0s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "LexAI v5 running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze_contract(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 20MB.")

    start = time.time()
    try:
        raw_text, page_map = extract_text_with_pages(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not extract text: {str(e)}")
    if not raw_text or len(raw_text.strip()) < 50:
        raise HTTPException(status_code=422, detail="PDF appears to be scanned/image-only.")

    result = run_single_pass(raw_text, page_map)
    elapsed = round(time.time() - start, 3)

    return JSONResponse({
        "filename":          file.filename,
        "scan_time_seconds": elapsed,
        "char_count":        len(raw_text),
        "page_count":        len(page_map),
        "parties":           result["parties"],
        "jurisdiction":      result["jurisdiction"],
        "key_dates":         result["key_dates"],
        "renewal_terms":     result["renewal_terms"],
        "financials":        result["financials"],
        "classification":    result["classification"],
        "risk":              result["risk"],
        "stats":             result["stats"],
    })
