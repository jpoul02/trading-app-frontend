export function wsUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  const url = base.replace(/^http/, "ws") + path;
  const key = process.env.NEXT_PUBLIC_API_KEY;
  if (!key) return url;
  return url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(key);
}
