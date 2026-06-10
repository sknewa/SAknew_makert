"""
Provider integrations for background removal and depth estimation.
This file contains helper functions to call hosted providers (ClipDrop, Replicate, etc.) using environment variables for API keys.

NOTE: This is a scaffold. Do NOT commit API keys. Set provider keys in environment variables and call these functions from `main.py` if you prefer hosted providers.
"""
import os
import json
import requests

import openai

CLIPDROP_API_KEY = os.environ.get('CLIPDROP_API_KEY')
REPLICATE_API_TOKEN = os.environ.get('REPLICATE_API_TOKEN')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-3.5-turbo')


def clipdrop_remove_bg(image_bytes: bytes) -> bytes:
    if not CLIPDROP_API_KEY:
        raise RuntimeError('CLIPDROP_API_KEY not set')
    url = 'https://clipdrop-api.ai/remove-background/v1'
    headers = {'x-api-key': CLIPDROP_API_KEY}
    files = {'image_file': ('image.jpg', image_bytes)}
    r = requests.post(url, headers=headers, files=files, timeout=30)
    r.raise_for_status()
    return r.content


def replicate_depth_estimate(image_bytes: bytes) -> bytes:
    if not REPLICATE_API_TOKEN:
        raise RuntimeError('REPLICATE_API_TOKEN not set')
    # Example: call a replicate model that returns a depth map
    url = 'https://api.replicate.com/v1/predictions'
    headers = {'Authorization': f'Token {REPLICATE_API_TOKEN}', 'Content-Type': 'application/json'}
    # The exact payload depends on the chosen model; this is a placeholder.
    payload = {
        'version': 'replace-with-model-version',
        'input': {'image': 'data:image/jpeg;base64,...'}
    }
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    r.raise_for_status()
    return r.content


def openai_generate_listing(keywords: str | None, tone: str = 'professional', length: str = 'short', lat: float | None = None, lng: float | None = None) -> dict:
    if not OPENAI_API_KEY:
        raise RuntimeError('OPENAI_API_KEY not set')

    openai.api_key = OPENAI_API_KEY
    system_message = (
        'You are an AI assistant that writes product listings for an online marketplace. '
        'Generate a concise title, an engaging description, a list of 5 tags, and one best-fit product category. '
        'Keep the language persuasive, accurate, and appropriate for ecommerce buyers. '
        'Return only valid JSON with keys title, description, tags, and category.'
    )

    location_hint = ''
    if lat is not None and lng is not None:
        location_hint = f' The product is being sold near latitude {lat} and longitude {lng}.'

    prompt = (
        f'Create an ecommerce product listing using the following keywords: "{keywords or "local handmade item"}". '
        f'Tone: {tone}. Length: {length}.{location_hint} '
        'Produce JSON in the exact form: {"title": "...", "description": "...", "tags": ["...", ...], "category": "..."}.'
    )

    response = openai.ChatCompletion.create(
        model=OPENAI_MODEL,
        messages=[
            {'role': 'system', 'content': system_message},
            {'role': 'user', 'content': prompt},
        ],
        max_tokens=300,
        temperature=0.75,
    )

    text = response.choices[0].message.content.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Some models may add markdown or extra text around the JSON.
        start = text.find('{')
        end = text.rfind('}')
        if start == -1 or end == -1:
            raise RuntimeError(f'OpenAI returned invalid JSON: {text}')
        data = json.loads(text[start:end+1])

    if not isinstance(data, dict):
        raise RuntimeError('OpenAI returned unexpected listing format')

    return {
        'title': data.get('title', '').strip(),
        'description': data.get('description', '').strip(),
        'tags': [t.strip() for t in data.get('tags', []) if isinstance(t, str)],
        'category': data.get('category', '').strip() or 'General',
        'category': data.get('category', '').strip() or 'General'
    }


def openai_moderate_text(text: str) -> dict:
    if not OPENAI_API_KEY:
        raise RuntimeError('OPENAI_API_KEY not set')

    openai.api_key = OPENAI_API_KEY
    moderation = openai.Moderation.create(
        model='omni-moderation-latest',
        input=text
    )
    result = moderation['results'][0]
    return {
        'flagged': result.get('flagged', False),
        'categories': result.get('categories', {}),
        'category_scores': result.get('category_scores', {}),
    }
