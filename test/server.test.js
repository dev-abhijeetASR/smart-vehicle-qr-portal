import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { appHandler, escapeHtml, alerts, rateLimits } from '../server.js';

function createMockServer() {
  return http.createServer(appHandler);
}

test('escapeHtml: correctly sanitizes HTML characters', () => {
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml("Tom & Jerry's car"), 'Tom &amp; Jerry&#39;s car');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(123), '123');
});

test('GET /api/info returns valid status object', async () => {
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/info`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(typeof data.version, 'string');
    assert.equal(typeof data.telegramConfigured, 'boolean');
    assert.equal(typeof data.defaultVehicle, 'string');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Security: Path Traversal protection prevents directory escaping', async () => {
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/../../etc/passwd`);
    // Should be blocked as 403 Forbidden or 404
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Security: Hidden and .env files are blocked from HTTP access', async () => {
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/.env.example`);
    assert.equal(res.status, 403);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('Static file serving: Serves index.html with security headers', async () => {
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/index.html`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    const text = await res.text();
    assert.ok(text.includes('Smart Vehicle QR Decal Studio'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('POST /api/test-bot: Rejects missing credentials and @username token format', async () => {
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    // Missing credentials
    const res1 = await fetch(`http://127.0.0.1:${port}/api/test-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res1.status, 400);

    // Invalid username format
    const res2 = await fetch(`http://127.0.0.1:${port}/api/test-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken: '@MyTestBot', chatId: '1234567' })
    });
    assert.equal(res2.status, 400);
    const data2 = await res2.json();
    assert.ok(data2.error.includes('Invalid Bot Token format'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('POST /api/alert: Rate limits rapid requests from same client/vehicle', async () => {
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    rateLimits.clear();
    const payload = {
      vehicle: 'TEST 99 ZZ 9999',
      reason: 'Testing alert system'
    };

    const res1 = await fetch(`http://127.0.0.1:${port}/api/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.ok(data1.alertId);

    // Second request within 30s should be 429
    const res2 = await fetch(`http://127.0.0.1:${port}/api/alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.equal(res2.status, 429);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('GET /api/status: Returns alert status and response once owner replies', async () => {
  const server = createMockServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const alertId = 'ALT_TEST_123';
    alerts.set(alertId, {
      id: alertId,
      vehicle: 'TEST 01 AB 0000',
      reason: 'Testing status endpoint',
      createdAt: Date.now(),
      response: null,
      responseTime: null
    });

    const res1 = await fetch(`http://127.0.0.1:${port}/api/status?id=${alertId}`);
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.status, 'pending');
    assert.equal(data1.response, null);

    // Simulate webhook response
    const alert = alerts.get(alertId);
    alert.response = 'On my way in 2 mins';
    alert.responseTime = '12:00:00 PM';

    const res2 = await fetch(`http://127.0.0.1:${port}/api/status?id=${alertId}`);
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.status, 'replied');
    assert.equal(data2.response, 'On my way in 2 mins');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
