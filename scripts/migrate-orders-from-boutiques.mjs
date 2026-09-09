import fs from 'node:fs';
import path from 'node:path';

const accessToken = process.env.FIREBASE_CLI_ACCESS_TOKEN;
if (!accessToken) throw new Error('FIREBASE_CLI_ACCESS_TOKEN is required.');

const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));
const databaseId = config.firestoreDatabaseId || '(default)';
const baseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/${encodeURIComponent(databaseId)}/documents`;
const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

function toValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toValue(item)])),
      },
    };
  }
  return { stringValue: String(value) };
}

function fromValue(value) {
  if (!value || 'nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromValue);
  if ('mapValue' in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, fromValue(item)]));
  }
  return null;
}

async function checkedFetch(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

const boutiquesPayload = await checkedFetch(`${baseUrl}/boutiques?pageSize=300`);
let migratedOrders = 0;
let cleanedBoutiques = 0;

for (const boutiqueDocument of boutiquesPayload.documents || []) {
  const boutiqueId = decodeURIComponent(boutiqueDocument.name.split('/').pop());
  const ordersValue = boutiqueDocument.fields?.manualOrders;
  if (!ordersValue?.mapValue?.fields) continue;

  const orders = fromValue(ordersValue);
  for (const [orderId, rawOrder] of Object.entries(orders)) {
    const order = { ...rawOrder, id: rawOrder.id || orderId, boutiqueId: rawOrder.boutiqueId || boutiqueId };
    await checkedFetch(`${baseUrl}/orders/${encodeURIComponent(order.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: Object.fromEntries(Object.entries(order).map(([key, value]) => [key, toValue(value)])),
      }),
    });
    migratedOrders += 1;
  }

  await checkedFetch(`${baseUrl}/boutiques/${encodeURIComponent(boutiqueId)}?updateMask.fieldPaths=manualOrders`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: {} }),
  });
  cleanedBoutiques += 1;
}

console.log(JSON.stringify({ migratedOrders, cleanedBoutiques }));
