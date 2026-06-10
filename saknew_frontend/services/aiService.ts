import { AI_SERVICE_URL } from '../config';

const API_BASE = AI_SERVICE_URL;

type GenReq = {
  keywords?: string;
  tone?: string;
  length?: string;
  lat?: number;
  lng?: number;
}

async function generateListing(req: GenReq) {
  const res = await fetch(`${API_BASE}/generate_listing/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  if (!res.ok) throw new Error('AI service error');
  return await res.json();
}

async function getRecommendations(params: { lat: number; lng: number; q?: string }) {
  const url = new URL(`${API_BASE}/recommendations/`);
  url.searchParams.set('lat', String(params.lat));
  url.searchParams.set('lng', String(params.lng));
  if (params.q) url.searchParams.set('q', params.q);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('AI service error');
  return await res.json();
}

async function processImageFile(options: { uri: string; name?: string; type?: string }) {
  const form = new FormData();
  const fileName = options.name || 'photo.jpg';
  form.append('file', {
    uri: options.uri,
    name: fileName,
    type: options.type || 'image/jpeg'
  } as any);

  const url = `${API_BASE}/process_image/?make_gif=true&frames=12`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('AI service error');
  return await res.json();
}

async function moderateText(text: string) {
  const res = await fetch(`${API_BASE}/moderate_text/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('AI moderation error');
  return await res.json();
}

export default { generateListing, getRecommendations, processImageFile, moderateText };
