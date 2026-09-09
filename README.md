LEXAI — CONTRACT INTELLIGENCE DASHBOARD

A full-stack platform that analyzes PDF contracts and extracts key contractual information using a deterministic regex/pattern-based engine — no external LLM API required.

LIVE DEMO
https://lex-ai-alpha.vercel.app/
No login, subscriptions, or paid API needed.


WHAT IT DOES

Upload a PDF contract and LexAI will:
- Extract text while preserving page-level location
- Run a single-pass pipeline across six extraction modules
- Classify the contract and flag rule-based risk indicators
- Link every extracted result back to its source page for verification


WHY REGEX INSTEAD OF AN LLM

Most contract-analysis tools lean entirely on an LLM to interpret every document. LexAI's core engine uses deterministic patterns and rules instead, making results traceable, predictable, and free of per-request API costs. Every extracted value can be traced directly back to its source page in the PDF, instead of just presenting a generated summary to trust blindly.


EXTRACTION MODULES

Parties — Identifies contractual parties/entities
Dates — Detects key dates with page references
Financials — Extracts monetary values and financial terms
Jurisdiction — Identifies governing jurisdiction language
Renewal Terms — Detects renewal-related provisions
Classification — Categorizes the contract type

Risk detection runs alongside these modules to surface predefined indicators worth a closer look.


ARCHITECTURE

React + Vite (Frontend)
        ↓
FastAPI Backend
        ↓
pdfminer.six → Page-Aware Text Extraction
        ↓
Single-Pass Regex/Pattern Engine
        ↓
Classification + Risk Detection
        ↓
Structured JSON → React Dashboard


TECH STACK

Frontend: React, Vite, JavaScript, Axios, Lucide React
Backend: Python, FastAPI, pdfminer.six, regex/pattern-based processing
Deployment: Vercel (frontend), Render (backend)


LOCAL SETUP

git clone <your-repository-url>
cd LexAI

Backend:
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload   (runs on localhost:8000)

Frontend (new terminal):
cd frontend
npm install
npm run dev


STATUS

Actively deployed and being tested with real users. Currently supports PDF contracts; future development is driven by real-world feedback.


DISCLAIMER

LexAI is an informational tool, not a substitute for professional legal advice. Extracted information and risk indicators should be independently verified against the original contract.
