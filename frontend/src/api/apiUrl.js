export function getApiUrl(configured) {
  const value = configured?.trim();
  // Vite's development proxy and the root Vercel services deployment use /api.
  if (!value) return '/api';
  if (value.startsWith('/') && !value.startsWith('//')) return value.replace(/\/+$/, '');
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('VITE_API_URL must use HTTP or HTTPS.');
  if (!url.pathname || url.pathname === '/') url.pathname = '/api';
  return url.toString().replace(/\/+$/, '');
}
