"""
extractor.py  —  Single-Pass Extraction Engine
================================================
One iteration over document lines.
All extractors run in parallel per line. O(n).
Dates include page numbers via the page_map.
"""

import re
from collections import defaultdict
from typing import Any

from pdf_reader import get_page_for_char

# ── Entity patterns ───────────────────────────────────────────────
ENTITY_SUFFIXES = r"(?:Inc\.?|LLC|Ltd\.?|Limited|Corp\.?|Corporation|Company|Co\.?|PLC|Pvt\.?\s*Ltd\.?|LLP|LP|Group|Holdings|Enterprises|Solutions|Services|Technologies|Tech|Systems|Associates|Partners|Foundation|Trust|Authority|Bureau|Agency)"
ENTITY_RE = re.compile(rf'\b([A-Z][A-Za-z0-9\s&,\.\-\']+?)\s+{ENTITY_SUFFIXES}\b')

PARTY_ANCHORS = [
    "between", "hereinafter referred to as", "hereinafter called",
    "referred to as", "undersigned", "entered into by",
    "made by and between", "this agreement is made",
    "made between", "by and between",
]

# ── Jurisdiction ──────────────────────────────────────────────────
JURISDICTION_TRIGGERS = [
    "governed by", "governed under", "laws of the state of",
    "laws of", "jurisdiction of", "courts of",
    "subject to the laws", "choice of law", "applicable law",
    "venue shall be", "exclusive jurisdiction", "competent courts",
]

GEO_ENTITIES = [
    "california", "new york", "texas", "florida", "illinois",
    "delaware", "nevada", "new jersey", "massachusetts", "washington",
    "georgia", "ohio", "pennsylvania", "virginia", "colorado",
    "arizona", "michigan", "north carolina", "india", "united states",
    "united kingdom", "england", "wales", "scotland", "singapore",
    "australia", "canada", "germany", "france", "netherlands",
    "hong kong", "dubai", "uae", "ireland", "switzerland",
]

# ── Dates ─────────────────────────────────────────────────────────
DATE_PATTERN = re.compile(
    r"""(?:
        \d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}
      | \d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}
      | (?:January|February|March|April|May|June|
           July|August|September|October|November|December)
        \s+\d{1,2},?\s+\d{4}
      | \d{1,2}\s+
        (?:January|February|March|April|May|June|
           July|August|September|October|November|December)
        \s+\d{4}
      | (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\.?\s+\d{1,2},?\s+\d{4}
    )""",
    re.VERBOSE | re.IGNORECASE,
)

DATE_CONTEXT_LABELS = [
    ("effective", "Effective Date"),
    ("commencement", "Commencement Date"),
    ("execution", "Execution Date"),
    ("signing", "Signing Date"),
    ("signed", "Signed Date"),
    ("start", "Start Date"),
    ("expir", "Expiry Date"),
    ("terminat", "Termination Date"),
    ("renewal", "Renewal Date"),
    ("notice", "Notice Date"),
    ("deadline", "Deadline"),
    ("due", "Due Date"),
    ("deliver", "Delivery Date"),
    ("payment", "Payment Date"),
    ("closing", "Closing Date"),
]

# ── Financials ────────────────────────────────────────────────────
CURRENCY_RE = re.compile(
    r"""(?:
        (?:USD|INR|EUR|GBP|AUD|CAD|SGD|AED|CHF)\s?[\d,]+(?:\.\d{1,2})?
      | [\$\u20b9\u20ac\u00a3\u00a5]\s?[\d,]+(?:\.\d{1,2})?
    )(?:\s?(?:million|billion|thousand|crore|lakh|mn|bn|k))?""",
    re.VERBOSE | re.IGNORECASE,
)

FINANCIAL_LABELS = [
    "payment", "fee", "fees", "amount", "sum", "compensation",
    "salary", "wage", "consideration", "penalty", "damages",
    "deposit", "premium", "cost", "charge", "price", "invoice",
    "milestone", "retainer", "royalty", "commission", "rent",
    "remuneration", "reimbursement", "advance", "bonus",
]

# ── Renewal ───────────────────────────────────────────────────────
RENEWAL_PHRASES = [
    ("auto-renew", "Auto-Renewal Clause"),
    ("automatically renew", "Auto-Renewal Clause"),
    ("shall renew", "Mandatory Renewal"),
    ("renews automatically", "Auto-Renewal Clause"),
    ("renewal term", "Renewal Term Defined"),
    ("successive term", "Successive Term Renewal"),
    ("evergreen", "Evergreen Clause"),
    ("notice of non-renewal", "Non-Renewal Notice Required"),
    ("opt-out", "Opt-Out Clause"),
    ("right of renewal", "Renewal Right"),
    ("rolling term", "Rolling Term"),
    ("perpetual unless", "Perpetual Unless Terminated"),
    ("automatic extension", "Automatic Extension"),
    ("renewed for", "Fixed Renewal Period"),
    ("days prior written notice", "Notice Period for Termination"),
]

# ── Classification ────────────────────────────────────────────────
CONTRACT_TYPES: dict[str, list[str]] = {
    "Non-Disclosure Agreement": [
        "non-disclosure", "nda", "confidentiality agreement",
        "proprietary information", "trade secret", "confidential information",
        "disclosing party", "receiving party",
    ],
    "Employment Agreement": [
        "employment", "employee", "employer", "salary", "at-will",
        "probation", "job duties", "termination for cause",
        "compensation package", "annual leave",
    ],
    "Service Agreement": [
        "service", "services", "deliverables", "milestone",
        "statement of work", "service provider", "client",
        "scope of services", "service level",
    ],
    "Lease Agreement": [
        "lease", "landlord", "tenant", "rent", "premises",
        "property", "occupancy", "eviction", "lessee", "lessor",
    ],
    "Software License Agreement": [
        "license", "software", "saas", "end-user", "intellectual property",
        "source code", "sublicense", "api", "licensee", "licensor",
    ],
    "Purchase Agreement": [
        "purchase", "sale", "buyer", "seller", "goods",
        "delivery", "title", "warranty", "purchase price", "vendor",
    ],
    "Partnership Agreement": [
        "partnership", "partner", "profit sharing", "capital contribution",
        "dissolution", "general partner", "limited partner",
    ],
    "Loan Agreement": [
        "loan", "borrower", "lender", "interest rate", "repayment",
        "principal", "collateral", "default", "promissory note",
    ],
    "Consulting Agreement": [
        "consultant", "consulting", "advisory", "engagement",
        "independent contractor", "professional services", "consulting fee",
    ],
}

# ── Risk flags ────────────────────────────────────────────────────
RISK_FLAGS = [
    ("unlimited liability",        20, "Unlimited liability clause detected",        "high"),
    ("indemnif",                   10, "Indemnification clause present",             "medium"),
    ("auto-renew",                 12, "Auto-renewal without explicit opt-out",      "medium"),
    ("automatically renew",        12, "Auto-renewal without explicit opt-out",      "medium"),
    ("irrevocable",                15, "Irrevocable clause present",                 "high"),
    ("waive",                       8, "Rights waiver detected",                     "medium"),
    ("exclusive",                   8, "Exclusivity clause present",                 "low"),
    ("perpetual",                  10, "Perpetual term detected",                    "medium"),
    ("non-compete",                15, "Non-compete clause present",                 "high"),
    ("liquidated damages",         12, "Liquidated damages clause",                  "medium"),
    ("sole discretion",            14, "Unilateral sole discretion clause",          "high"),
    ("governing law",              -5, "Governing law specified",                    "good"),
    ("dispute resolution",         -5, "Dispute resolution clause present",          "good"),
    ("termination for convenience",-8, "Termination for convenience allowed",        "good"),
]

# ── Party validation ──────────────────────────────────────────────
BLACKLIST_WORDS = {
    "agreement", "contract", "effective", "date", "parties", "party", "exhibit",
    "schedule", "section", "paragraph", "term", "thereto", "herein", "hereof",
    "state", "united", "states", "court", "laws", "between", "and", "by", "made",
    "entered", "into", "hereinafter", "referred", "called", "undersigned", "the",
    "for", "to", "or", "in", "on", "at", "with", "is", "are", "was", "were", "be",
    "been", "this", "these", "that", "those", "each", "both", "all", "any", "other",
    "another", "such", "same", "following", "preceding", "above", "below", "hereunder",
    "thereunder", "hereinabove", "subject", "provisions", "conditions", "covenants",
    "terms", "witnesseth", "whereas", "now", "therefore", "hereby",
    "confidential", "information", "intellectual", "property",
    "notice", "written", "right", "rights", "obligation", "obligations",
    "payment", "service", "services", "work", "order",
}

_ROLE_WORDS = {
    "company", "employer", "employee", "client", "vendor", "consultant",
    "contractor", "landlord", "tenant", "lessee", "lessor", "licensor",
    "licensee", "buyer", "seller", "lender", "borrower", "partner",
    "provider", "disclosing party", "receiving party",
    "party a", "party b", "first party", "second party",
}


def is_valid_party_name(name: str) -> bool:
    name_clean = name.strip()
    if not name_clean or len(name_clean) < 3 or len(name_clean) > 80:
        return False
    if not any(c.isupper() for c in name_clean):
        return False
    words = [w.strip(".,;:()\"\'\u201c\u201d\u2018\u2019").lower() for w in name_clean.split()]
    if all(w in BLACKLIST_WORDS or w in _ROLE_WORDS for w in words):
        return False
    if len(words) == 1 and (words[0] in BLACKLIST_WORDS or words[0] in _ROLE_WORDS):
        return False
    blacklisted_count = sum(1 for w in words if w in BLACKLIST_WORDS or w in _ROLE_WORDS)
    if len(words) > 1 and blacklisted_count / len(words) > 0.5:
        return False
    if re.search(r'\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\b', name_clean, re.I):
        return False
    if re.search(r'\b(?:19|20)\d{2}\b', name_clean):
        return False
    return True


# ── Main engine ───────────────────────────────────────────────────

def run_single_pass(text: str, page_map: list[dict] | None = None) -> dict[str, Any]:
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    parties:        list[dict] = []
    party_seen:     set[str]   = set()
    jurisdiction:   list[dict] = []
    jur_seen:       set[str]   = set()
    key_dates:      list[dict] = []
    date_seen:      set[str]   = set()
    renewal_terms:  list[dict] = []
    renewal_seen:   set[str]   = set()
    financials:     list[dict] = []
    fin_seen:       set[str]   = set()
    class_scores:   dict       = defaultdict(int)
    class_matches:  dict       = defaultdict(list)
    risk_score:     int        = 40
    risk_flags:     list[dict] = []
    risk_flag_seen: set[str]   = set()

    # ── Pre-pass: dates with page numbers ────────────────────────
    for match in DATE_PATTERN.finditer(text):
        raw_date = match.group(0)
        key = raw_date.lower().strip()
        if key in date_seen:
            continue
        date_seen.add(key)

        ctx_start = max(0, match.start() - 80)
        ctx = text[ctx_start: match.end() + 40].lower()

        label = "Date"
        for trigger, lbl in DATE_CONTEXT_LABELS:
            if trigger in ctx:
                label = lbl
                break

        page_num = get_page_for_char(match.start(), page_map) if page_map else None
        key_dates.append({"label": label, "value": raw_date, "page": page_num, "char": match.start()})

    # ── Compile party pattern A once ─────────────────────────────
    p_defined = re.compile(
        r'\b([A-Z][A-Za-z0-9\s&,\.\-\']{2,60}?)\s*'
        r'(?:,\s*)?(?:a\s+[a-z]+\s+)?(?:\([^)]{0,40}\)\s*)?'
        r'(?:hereinafter(?:\s+referred\s+to\s+as)?|referred\s+to\s+as|hereinafter\s+called)'
        r'\s*["\u201c\u2018]([^"\u201d\u2019]{2,40})["\u201d\u2019]',
        re.I
    )

    # ── Main single-pass line loop ────────────────────────────────
    char_cursor = 0

    for line in lines:
        ll = line.lower()
        line_start = text.find(line, char_cursor)
        char_cursor = line_start + len(line) if line_start != -1 else char_cursor
        page_num = get_page_for_char(line_start, page_map) if page_map else 1

        # ── 1. PARTIES ────────────────────────────────────────────
        has_anchor = any(a in ll for a in PARTY_ANCHORS)
        if has_anchor or re.search(ENTITY_SUFFIXES, line):

            # Pattern A: "Full Name Inc., hereinafter referred to as "Role""
            for m in p_defined.finditer(line):
                for name in [m.group(1).strip(), m.group(2).strip()]:
                    if is_valid_party_name(name):
                        key = name.lower()
                        if key not in party_seen:
                            party_seen.add(key)
                            parties.append({"name": name, "page": page_num})

            # Pattern B: Entity with legal suffix — "Acme Corp.", "GlobalTech LLC"
            for m in ENTITY_RE.finditer(line):
                name = m.group(0).strip()
                if is_valid_party_name(name):
                    key = name.lower()
                    if key not in party_seen:
                        party_seen.add(key)
                        parties.append({"name": name, "page": page_num})

        # ── 2. JURISDICTION ───────────────────────────────────────
        if any(t in ll for t in JURISDICTION_TRIGGERS):
            gov_m = re.search(
                r'(?:governed by(?: the)? laws of|laws of the state of|'
                r'jurisdiction of|courts of|venue shall be)\s+([a-zA-Z\s]+?)(?:[,\.\;]|$)',
                ll,
            )
            if gov_m:
                place = gov_m.group(1).strip()
                if place and place not in jur_seen and len(place) > 2:
                    jur_seen.add(place)
                    jurisdiction.append({"place": place.title(), "context": line[:120].strip(), "page": page_num})
            for geo in GEO_ENTITIES:
                if geo in ll and geo not in jur_seen:
                    jur_seen.add(geo)
                    jurisdiction.append({"place": geo.title(), "context": line[:120].strip(), "page": page_num})

        # ── 3. FINANCIALS ─────────────────────────────────────────
        fin_label_hit = next((f for f in FINANCIAL_LABELS if f in ll), None)
        currency_hits = CURRENCY_RE.findall(line)
        if currency_hits:
            label = fin_label_hit.title() if fin_label_hit else "Amount"
            for amount in currency_hits:
                key = amount.strip().lower()
                if key not in fin_seen:
                    fin_seen.add(key)
                    financials.append({"label": label, "value": amount.strip(), "context": line[:100].strip(), "page": page_num})

        # ── 4. RENEWAL TERMS ──────────────────────────────────────
        for phrase, label in RENEWAL_PHRASES:
            if phrase in ll and phrase not in renewal_seen:
                renewal_seen.add(phrase)
                renewal_terms.append({"label": label, "clause": line[:160].strip(), "page": page_num})

        # ── 5. CLASSIFICATION ─────────────────────────────────────
        for contract_type, keywords in CONTRACT_TYPES.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', ll):
                    class_scores[contract_type] += 1
                    class_matches[contract_type].append({"keyword": kw, "context": line[:120].strip(), "page": page_num})

        # ── 6. RISK FLAGS ─────────────────────────────────────────
        for trigger, delta, description, severity in RISK_FLAGS:
            if trigger in ll and description not in risk_flag_seen:
                risk_flag_seen.add(description)
                risk_score += delta
                risk_flags.append({"description": description, "delta": delta, "context": line[:120].strip(), "severity": severity, "page": page_num})

    # ── Resolve classification ────────────────────────────────────
    sorted_types = sorted(class_scores.items(), key=lambda x: x[1], reverse=True)
    if sorted_types and sorted_types[0][1] > 0:
        primary_type, primary_score = sorted_types[0]
        total_kws   = sum(v for _, v in sorted_types)
        confidence  = min(98, round((primary_score / max(total_kws, 1)) * 100 + 20))
        pm          = class_matches[primary_type]
        secondary_type = secondary_page = secondary_kw = secondary_ctx = None
        if len(sorted_types) > 1 and sorted_types[1][1] > 0:
            secondary_type = sorted_types[1][0]
            sm = class_matches[secondary_type]
            secondary_page = sm[0]["page"] if sm else 1
            secondary_kw   = sm[0]["keyword"] if sm else None
            secondary_ctx  = sm[0]["context"] if sm else None
        classification = {
            "primary": primary_type, "confidence": confidence,
            "page": pm[0]["page"] if pm else 1,
            "keyword": pm[0]["keyword"] if pm else None,
            "context": pm[0]["context"] if pm else None,
            "secondary": secondary_type, "secondary_page": secondary_page,
            "secondary_keyword": secondary_kw, "secondary_context": secondary_ctx,
            "scores": [{"type": t, "score": s, "page": class_matches[t][0]["page"] if class_matches[t] else 1, "keyword": class_matches[t][0]["keyword"] if class_matches[t] else None, "context": class_matches[t][0]["context"] if class_matches[t] else None} for t, s in sorted_types[:4] if s > 0],
        }
    else:
        classification = {"primary": "General Contract", "confidence": 25, "page": 1, "keyword": None, "context": None, "secondary": None, "secondary_page": 1, "secondary_keyword": None, "secondary_context": None, "scores": []}

    # ── Risk base adjustments ─────────────────────────────────────
    if not jurisdiction:
        risk_score += 15
        risk_flags.append({"description": "No governing jurisdiction found", "delta": 15, "context": "", "severity": "high", "page": 1})
    if len(parties) < 2:
        risk_score += 10
        risk_flags.append({"description": "Fewer than 2 parties identified", "delta": 10, "context": "", "severity": "medium", "page": 1})
    if len(key_dates) < 2:
        risk_score += 8
        risk_flags.append({"description": "Very few dates found — contract may lack clear timelines", "delta": 8, "context": "", "severity": "medium", "page": 1})

    risk_score = max(0, min(100, risk_score))

    return {
        "parties":        parties[:20],
        "jurisdiction":   jurisdiction[:10],
        "key_dates":      key_dates[:20],
        "renewal_terms":  renewal_terms[:10],
        "financials":     financials[:20],
        "classification": classification,
        "risk": {
            "score": risk_score,
            "level": "Low" if risk_score < 40 else "Medium" if risk_score < 70 else "High",
            "flags": risk_flags,
        },
        "stats": {
            "parties_found":    len(parties),
            "dates_found":      len(key_dates),
            "financials_found": len(financials),
            "renewal_clauses":  len(renewal_terms),
            "risk_flags":       len(risk_flags),
            "lines_scanned":    len(lines),
        },
    }