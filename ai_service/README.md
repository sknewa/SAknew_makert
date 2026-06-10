# Saknew AI Service (MVP)

This lightweight FastAPI microservice provides two MVP endpoints used by the frontend prototype:

- `POST /generate_listing/` — Generate a product title/description from keywords and optional location.
- `GET /recommendations/` — Return nearby drafts filtered by proximity and optional query.

Run locally:

```bash
python -m venv .venv
source .venv/Scripts/activate   # Windows
pip install -r requirements.txt
OPENAI_API_KEY=your_openai_api_key uvicorn main:app --reload --port 8001
```

The service stores drafts in `ai_service/data/ai.db` (SQLite) and is intentionally simple so it can be integrated later with the Django backend or swapped for a production service.

- `OPENAI_API_KEY` enables richer listing generation with OpenAI.
- Without `OPENAI_API_KEY`, the endpoint falls back to templated title/description generation.
