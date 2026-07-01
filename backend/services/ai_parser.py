import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

# Migrate note: using google-genai SDK (pip install google-genai)
# Old SDK was google.generativeai (pip install google-generativeai) — different import path
_client = None

def _get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY not found. Make sure it's set in your .env file."
            )
        _client = genai.Client(api_key=api_key)
    return _client


SYSTEM_PROMPT = """
You are a stock screening query parser for Indian equity markets (NSE/BSE).

Convert the user's natural language query into a structured JSON filter object.
Return ONLY valid JSON — no markdown, no backticks, no explanation.

Valid sectors: Banking, Finance, IT, Pharma, Healthcare, Auto, FMCG, Energy, Metal, Infra, Telecom

Output schema (include only fields that are relevant — omit the rest as null):
{
  "sectors": ["Banking"] or null,
  "max_pe": number or null,
  "min_pe": number or null,
  "min_roe": number or null,
  "max_debt_to_equity": number or null,
  "min_revenue_growth": number or null,
  "min_earnings_growth": number or null,
  "min_profit_margin": number or null,
  "min_market_cap_cr": number or null,
  "max_market_cap_cr": number or null,
  "min_dividend_yield": number or null,
  "sort_by": "roe" | "pe_ratio" | "market_cap_cr" | "revenue_growth" | "debt_to_equity" | "dividend_yield" | "price" | null,
  "sort_order": "asc" | "desc",
  "limit": number (default 10, max 50),
  "keywords": []
}

Interpretation rules:
- "worst ROE" or "lowest ROE" → sort_by: "roe", sort_order: "asc"
- "best ROE" or "highest ROE" → sort_by: "roe", sort_order: "desc"
- "undervalued" → max_pe: 15
- "high growth" → min_revenue_growth: 0.15, min_earnings_growth: 0.15
- "debt free" or "low debt" → max_debt_to_equity: 0.3
- "large cap" → min_market_cap_cr: 20000
- "mid cap" → min_market_cap_cr: 5000, max_market_cap_cr: 20000
- "dividend" → sort_by: "dividend_yield", sort_order: "desc", min_dividend_yield: 0.01
- If no sector mentioned, set sectors to null (search all)
- If no sort preference, default sort_by: "market_cap_cr", sort_order: "desc"

Examples:
"find stocks with worst roi" → {"sort_by":"roe","sort_order":"asc","limit":10}
"undervalued banking stocks" → {"sectors":["Banking"],"max_pe":15,"sort_by":"pe_ratio","sort_order":"asc","limit":10}
"IT companies with high ROE" → {"sectors":["IT"],"min_roe":0.15,"sort_by":"roe","sort_order":"desc","limit":10}
"top 5 pharma stocks by revenue growth" → {"sectors":["Pharma"],"sort_by":"revenue_growth","sort_order":"desc","limit":5}
"""


def parse_query(query: str) -> dict:
    client = _get_client()

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"{SYSTEM_PROMPT}\n\nUser Query:\n{query}"
        )

        raw = response.text.strip()

        # Strip markdown fences if Gemini adds them despite instructions
        raw = raw.replace("```json", "").replace("```", "").strip()

        parsed = json.loads(raw)

        # Enforce defaults for fields the route layer depends on
        parsed.setdefault("sort_order", "desc")
        parsed.setdefault("limit", 10)

        # Clamp limit to sane bounds
        parsed["limit"] = max(1, min(int(parsed["limit"]), 50))

        return parsed

    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON: {e}. Raw response: {raw!r}")
    except Exception as e:
        raise RuntimeError(f"AI parsing failed: {e}")