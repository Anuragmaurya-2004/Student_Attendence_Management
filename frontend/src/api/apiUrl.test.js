import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getApiUrl } from './apiUrl.js';

test('uses same-origin API when no backend is configured', () => {
  assert.equal(getApiUrl(), '/api');
  assert.equal(getApiUrl('  '), '/api');
});

test('separate backend URLs include the API prefix exactly once', () => {
  assert.equal(getApiUrl(' https://backend.vercel.app/ '), 'https://backend.vercel.app/api');
  assert.equal(getApiUrl('https://backend.vercel.app/api/'), 'https://backend.vercel.app/api');
  assert.equal(getApiUrl('/api/'), '/api');
  assert.equal(getApiUrl('http://localhost:5000/api'), 'http://localhost:5000/api');
});

test('rejects unsupported URL schemes', () => {
  assert.throws(() => getApiUrl('file:///api'));
});
