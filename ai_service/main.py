from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import base64
import math
from uuid import uuid4
from pathlib import Path
import sqlite3
import json
import io
import base64
from rembg import remove
from PIL import Image, ImageFilter, ImageOps
import imageio
from providers import openai_generate_listing, openai_moderate_text

app = FastAPI(title="Saknew AI Service")

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "ai.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def haversine(lat1, lng1, lat2, lng2):
    # returns distance in kilometers
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def ensure_schema():
    conn = get_db()
    c = conn.cursor()
    c.execute('''
    CREATE TABLE IF NOT EXISTS product_drafts (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        tags TEXT,
        category TEXT,
        lat REAL,
        lng REAL,
        created_at TEXT
    )
    ''')
    conn.commit()
    conn.close()

ensure_schema()


class GenerateRequest(BaseModel):
    keywords: Optional[str] = None
    tone: Optional[str] = "professional"
    length: Optional[str] = "short"
    lat: Optional[float] = None
    lng: Optional[float] = None


class ModerateRequest(BaseModel):
    text: str


@app.post("/generate_listing/")
async def generate_listing(req: GenerateRequest):
    if not req.keywords and not (req.lat and req.lng):
        raise HTTPException(status_code=400, detail="Provide keywords or location for a suggestion")

    title = (req.keywords or "Local handmade item").strip()
    description = f"{title}. A lovely locally made product, crafted with care. Perfect for buyers who appreciate quality and local makers."
    tags = [t.strip() for t in (req.keywords or "").split(",") if t.strip()]
    category = "General"

    if os.environ.get('OPENAI_API_KEY'):
        try:
            ai_result = openai_generate_listing(req.keywords, req.tone, req.length, req.lat, req.lng)
            title = ai_result.get('title') or title
            description = ai_result.get('description') or description
            tags = ai_result.get('tags') or tags
            category = ai_result.get('category') or category
        except Exception as exc:
            # fallback to templated text if OpenAI fails, but log error
            print(f'OpenAI listing generation failed: {exc}')
            if req.tone == "friendly":
                description = f"Meet {title}! Made with love by your local makers — perfect for everyday use and gifting."
            if req.length == "long":
                description = description + "\n\nFeatures:\n- Handcrafted\n- Locally sourced materials\n- Great value"

    else:
        if req.tone == "friendly":
            description = f"Meet {title}! Made with love by your local makers — perfect for everyday use and gifting."
        if req.length == "long":
            description = description + "\n\nFeatures:\n- Handcrafted\n- Locally sourced materials\n- Great value"

    # persist draft
    item_id = str(uuid4())
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO product_drafts (id,title,description,tags,category,lat,lng,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))",
        (item_id, title, description, json.dumps(tags), category, req.lat, req.lng)
    )
    conn.commit()
    conn.close()

    return {"id": item_id, "title": title, "description": description, "tags": tags, "category": category}


@app.post('/moderate_text/')
async def moderate_text(req: ModerateRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail='Text is required for moderation')

    if not os.environ.get('OPENAI_API_KEY'):
        raise HTTPException(status_code=503, detail='Moderation service unavailable')

    try:
        return openai_moderate_text(req.text)
    except Exception as exc:
        print(f'OpenAI moderation failed: {exc}')
        raise HTTPException(status_code=500, detail='Text moderation failed')


@app.get("/recommendations/")
async def recommendations(lat: float, lng: float, radius_km: float = 50.0, q: Optional[str] = None, limit: int = 20):
    # Simple geo + keyword filter + recency ordering
    conn = get_db()
    c = conn.cursor()
    rows = c.execute("SELECT * FROM product_drafts").fetchall()
    results = []
    for r in rows:
        if r[4] is None or r[5] is None:
            continue
        dist = haversine(lat, lng, r[4], r[5])
        if dist <= radius_km:
            score = 0
            tags = json.loads(r[3]) if r[3] else []
            if q:
                ql = q.lower()
                if ql in (r[1] or "").lower() or any(ql in t.lower() for t in tags):
                    score += 10
            # newer items get slight boost (created_at ordering approximate)
            results.append({"id": r[0], "title": r[1], "description": r[2], "tags": tags, "lat": r[4], "lng": r[5], "distance_km": dist, "score": score})

    results.sort(key=lambda x: (x["score"], -x["distance_km"]), reverse=True)
    return {"count": len(results), "results": results[:limit]}


@app.post('/process_image/')
async def process_image(file: UploadFile = File(...), make_gif: bool = True, frames: int = 12):
    """Remove background and produce a simple 2.5D parallax GIF (base64-encoded).
    This is a lightweight prototype using rembg + Pillow.
    """
    contents = await file.read()
    try:
        inp = Image.open(io.BytesIO(contents)).convert('RGBA')
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid image')

    # Background removal
    try:
        fg_bytes = remove(contents)
        fg = Image.open(io.BytesIO(fg_bytes)).convert('RGBA')
    except Exception:
        # fallback: use original with alpha
        fg = inp

    # create blurred background from original
    bg = inp.convert('RGB').filter(ImageFilter.GaussianBlur(radius=12))
    w, h = fg.size

    # center canvas
    canvas_w = max(w, bg.width)
    canvas_h = max(h, bg.height)

    frames_list = []
    # generate frames by shifting foreground and scaling slightly
    for i in range(frames):
        t = i / (frames - 1) if frames > 1 else 0
        # horizontal parallax oscillation
        dx = int((t - 0.5) * 20)
        dy = int((t - 0.5) * 8)
        scale = 1.0 + (t - 0.5) * 0.03

        layer = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
        # place background (centered)
        bg_center = bg.resize((canvas_w, canvas_h))
        frame_img = Image.new('RGBA', (canvas_w, canvas_h))
        frame_img.paste(bg_center, (0, 0))

        # resize foreground slightly
        new_w = int(w * scale)
        new_h = int(h * scale)
        fg_resized = fg.resize((new_w, new_h), Image.LANCZOS)

        # compute position (centered plus offsets)
        x = (canvas_w - new_w) // 2 + dx
        y = (canvas_h - new_h) // 2 + dy

        frame_img.paste(fg_resized, (x, y), fg_resized)

        # optional vignette / shadow for depth
        shadow = Image.new('RGBA', frame_img.size, (0, 0, 0, 0))
        shadow_blur = fg_resized.convert('L').filter(ImageFilter.GaussianBlur(radius=10))
        shadow_pos = (x + 6, y + 6)
        shadow.paste(ImageOps.colorize(shadow_blur, (0, 0, 0), (0, 0, 0)), shadow_pos, shadow_blur)
        frame_img = Image.alpha_composite(frame_img, shadow)

        frames_list.append(frame_img.convert('RGB'))

    # encode background-removed PNG
    out_buf = io.BytesIO()
    fg.save(out_buf, format='PNG')
    out_png_b64 = base64.b64encode(out_buf.getvalue()).decode('utf-8')

    gif_b64 = None
    if make_gif and len(frames_list) > 0:
        gif_buf = io.BytesIO()
        frames_list[0].save(gif_buf, format='GIF', save_all=True, append_images=frames_list[1:], loop=0, duration=60)
        gif_b64 = base64.b64encode(gif_buf.getvalue()).decode('utf-8')

    return {"png_base64": out_png_b64, "gif_base64": gif_b64}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
