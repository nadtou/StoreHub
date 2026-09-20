var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// functions-entry.mjs
var functions_entry_exports = {};
__export(functions_entry_exports, {
  api: () => api
});
module.exports = __toCommonJS(functions_entry_exports);
var import_https = require("firebase-functions/v2/https");

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_node_crypto = require("node:crypto");
var import_genai = require("@google/genai");
var import_app2 = require("firebase-admin/app");
var import_app_check = require("firebase-admin/app-check");
var import_auth = require("firebase-admin/auth");

// src/server/db.ts
var import_app = require("firebase/app");
var import_firestore = require("firebase/firestore");
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);

// src/utils/productSizes.ts
var SHOE_SIZE_MIN = 16;
var SHOE_SIZE_MAX = 49;
var ALL_SHOE_SIZES = Array.from(
  { length: SHOE_SIZE_MAX - SHOE_SIZE_MIN + 1 },
  (_, index) => String(SHOE_SIZE_MIN + index)
);
var NO_CLOTHING_SIZE_CATEGORIES = ["accessoires", "bijoux", "sacs"];
var UNIQUE_SIZE_LABELS = ["unique", "taille unique", "one size", "moyenne"];
function isShoeCategory(category) {
  return (category ?? "").trim().toLocaleLowerCase("fr").includes("chauss");
}
function generateShoeSizes(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < SHOE_SIZE_MIN || max > SHOE_SIZE_MAX || min >= max) {
    return [];
  }
  return Array.from({ length: max - min + 1 }, (_, index) => String(min + index));
}
function getShoeSizeError(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return "Les pointures doivent \xEAtre des nombres entiers.";
  }
  if (min < SHOE_SIZE_MIN || max > SHOE_SIZE_MAX) {
    return `Les pointures doivent \xEAtre comprises entre ${SHOE_SIZE_MIN} et ${SHOE_SIZE_MAX}.`;
  }
  if (min >= max) {
    return "La pointure minimale doit \xEAtre inf\xE9rieure \xE0 la pointure maximale.";
  }
  return null;
}
function ensureRequiredClothingSizes(sizes, category) {
  const uniqueSizes = Array.from(
    new Set((sizes ?? []).map((size) => String(size).trim()).filter(Boolean))
  );
  const normalizedCategory = (category ?? "").trim().toLocaleLowerCase("fr");
  const hasOnlyUniqueSize = uniqueSizes.length > 0 && uniqueSizes.every((size) => UNIQUE_SIZE_LABELS.includes(size.toLocaleLowerCase("fr")));
  if (isShoeCategory(category) || uniqueSizes.length === 0 || hasOnlyUniqueSize || NO_CLOTHING_SIZE_CATEGORIES.some((name) => normalizedCategory.includes(name))) {
    return uniqueSizes;
  }
  for (const requiredSize of ["XL", "XXL"]) {
    if (!uniqueSizes.some((size) => size.toLocaleUpperCase("fr") === requiredSize)) {
      uniqueSizes.push(requiredSize);
    }
  }
  return uniqueSizes;
}

// src/utils/commerceRules.ts
function finiteStock(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : fallback;
}
function inferShoeRange(sizes) {
  const numericSizes = sizes.map(Number).filter((size) => Number.isInteger(size)).sort((a, b) => a - b);
  return { min: numericSizes.at(0), max: numericSizes.at(-1) };
}
function normalizeProductForPersistence(changes, current) {
  const merged = { ...current || {}, ...changes };
  const category = String(merged.category || "").trim();
  const submittedSizes = Array.isArray(merged.sizes) ? merged.sizes.map(String) : [];
  let sizes = ensureRequiredClothingSizes(submittedSizes, category);
  let shoeSizeMin = merged.shoeSizeMin;
  let shoeSizeMax = merged.shoeSizeMax;
  if (isShoeCategory(category)) {
    const inferred = inferShoeRange(submittedSizes);
    const min = Number(shoeSizeMin ?? inferred.min);
    const max = Number(shoeSizeMax ?? inferred.max);
    const error = getShoeSizeError(min, max);
    if (error) return { ok: false, error };
    shoeSizeMin = min;
    shoeSizeMax = max;
    sizes = generateShoeSizes(min, max);
  }
  const stock = finiteStock(merged.stock, 0);
  const requestedAvailability = changes.isAvailable ?? current?.isAvailable ?? true;
  const product = {
    ...changes,
    sizes,
    stock,
    isAvailable: Boolean(requestedAvailability) && stock > 0,
    currency: "DZD"
  };
  if (isShoeCategory(category)) {
    product.shoeSizeMin = shoeSizeMin;
    product.shoeSizeMax = shoeSizeMax;
  } else {
    product.shoeSizeMin = void 0;
    product.shoeSizeMax = void 0;
  }
  return { ok: true, product };
}
function getReservationSelectionError(product, selectedSize, selectedColor) {
  if (!product.isAvailable || Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0) {
    return "Cet article n\u2019est plus disponible.";
  }
  const configuredSizes = isShoeCategory(product.category) ? product.shoeSizeMin !== void 0 && product.shoeSizeMax !== void 0 ? generateShoeSizes(product.shoeSizeMin, product.shoeSizeMax) : product.sizes : ensureRequiredClothingSizes(product.sizes, product.category);
  const allowedSizes = configuredSizes.length > 0 ? configuredSizes : isShoeCategory(product.category) ? ALL_SHOE_SIZES : ["Taille unique"];
  const allowedColors = product.colors.length > 0 ? product.colors : ["Standard"];
  if (!allowedSizes.includes(String(selectedSize)) || !allowedColors.includes(selectedColor)) {
    return "La taille ou la couleur s\xE9lectionn\xE9e n\u2019est pas disponible.";
  }
  return null;
}
function calculateDeliveredStock(previousStatus, nextStatus, stock, quantity) {
  if (previousStatus === "livre" || nextStatus !== "livre") return { changed: false };
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const safeStock = Number.isFinite(Number(stock)) ? Math.max(0, Number(stock)) : 1;
  if (safeStock < safeQuantity) {
    throw new Error("Stock insuffisant pour marquer cette commande comme livr\xE9e.");
  }
  const remainingStock = safeStock - safeQuantity;
  return { changed: true, remainingStock, isAvailable: remainingStock > 0 };
}
var ORDER_STATUS_RANK = {
  en_attente: 0,
  en_cours: 1,
  livre: 2
};
function isOrderStatusTransitionAllowed(previousStatus, nextStatus) {
  return ORDER_STATUS_RANK[nextStatus] >= ORDER_STATUS_RANK[previousStatus];
}

// src/server/db.ts
var firebaseConfig = {};
try {
  const configPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf-8"));
    console.log("Loaded Firebase configuration successfully.");
  } else {
    console.warn("firebase-applet-config.json not found. Using empty config fallback.");
  }
} catch (error) {
  console.error("Failed to read firebase-applet-config.json:", error);
}
var app = (0, import_app.initializeApp)(firebaseConfig);
var db = (0, import_firestore.getFirestore)(app, firebaseConfig.firestoreDatabaseId || "(default)");
var boutiquesCol = (0, import_firestore.collection)(db, "boutiques");
var productsCol = (0, import_firestore.collection)(db, "products");
var usersCol = (0, import_firestore.collection)(db, "users");
async function getBoutiques() {
  const snapshot = await (0, import_firestore.getDocs)(boutiquesCol);
  const items = [];
  snapshot.forEach((doc2) => {
    items.push(doc2.data());
  });
  return items;
}
async function getBoutiqueById(id) {
  const snapshot = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "boutiques", id));
  return snapshot.exists() ? snapshot.data() : null;
}
async function getProducts() {
  const snapshot = await (0, import_firestore.getDocs)(productsCol);
  const items = [];
  snapshot.forEach((doc2) => {
    const product = doc2.data();
    const generatedShoeSizes = isShoeCategory(product.category) && product.shoeSizeMin !== void 0 && product.shoeSizeMax !== void 0 ? generateShoeSizes(product.shoeSizeMin, product.shoeSizeMax) : [];
    items.push({
      ...product,
      sizes: generatedShoeSizes.length > 0 ? generatedShoeSizes : ensureRequiredClothingSizes(product.sizes, product.category)
    });
  });
  return items;
}
async function getProductById(id) {
  const snapshot = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "products", id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
function isoDate(date = /* @__PURE__ */ new Date()) {
  return date.toISOString().slice(0, 10);
}
function dailyFieldKey(date = /* @__PURE__ */ new Date()) {
  return `d_${isoDate(date).replace(/-/g, "_")}`;
}
async function trackBoutiqueView(boutiqueId) {
  const batch = (0, import_firestore.writeBatch)(db);
  batch.update((0, import_firestore.doc)(db, "boutiques", boutiqueId), {
    "stats.viewsCount": (0, import_firestore.increment)(1),
    [`visibilityDaily.${dailyFieldKey()}.boutiqueViews`]: (0, import_firestore.increment)(1),
    [`visibilityDaily.${dailyFieldKey()}.productViews`]: (0, import_firestore.increment)(0),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await batch.commit();
}
async function trackProductView(productId, boutiqueId) {
  const batch = (0, import_firestore.writeBatch)(db);
  batch.update((0, import_firestore.doc)(db, "products", productId), {
    "stats.views": (0, import_firestore.increment)(1),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  batch.update((0, import_firestore.doc)(db, "boutiques", boutiqueId), {
    [`visibilityDaily.${dailyFieldKey()}.boutiqueViews`]: (0, import_firestore.increment)(0),
    [`visibilityDaily.${dailyFieldKey()}.productViews`]: (0, import_firestore.increment)(1)
  });
  await batch.commit();
}
async function getVisibilityHistory(boutiqueId, days) {
  const boutiqueSnapshot = await (0, import_firestore.getDoc)((0, import_firestore.doc)(db, "boutiques", boutiqueId));
  const daily = boutiqueSnapshot.data()?.visibilityDaily || {};
  const points = [];
  const today = /* @__PURE__ */ new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    const key = isoDate(date);
    const value = daily[dailyFieldKey(date)];
    points.push({
      date: key,
      boutiqueViews: Number(value?.boutiqueViews || 0),
      productViews: Number(value?.productViews || 0)
    });
  }
  return points;
}
var firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || "(default)";
var firestoreRestBase = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents`;
var firestoreDocumentRoot = `projects/${firebaseConfig.projectId}/databases/${firestoreDatabaseId}/documents`;
function firestoreDocumentName(collectionId, documentId) {
  return `${firestoreDocumentRoot}/${collectionId}/${documentId}`;
}
function firestoreStringFields(message) {
  return Object.fromEntries(
    Object.entries(message).map(([key, value]) => [key, { stringValue: String(value ?? "") }])
  );
}
function chatMessageFromRest(document) {
  const fields = document?.fields || {};
  const value = (key) => String(fields[key]?.stringValue || "");
  return {
    id: value("id"),
    chatId: value("chatId"),
    clientId: value("clientId"),
    clientName: value("clientName"),
    clientPhoto: value("clientPhoto"),
    boutiqueId: value("boutiqueId"),
    boutiqueOwnerId: value("boutiqueOwnerId"),
    boutiqueName: value("boutiqueName"),
    boutiqueLogo: value("boutiqueLogo"),
    senderId: value("senderId"),
    senderName: value("senderName"),
    senderRole: value("senderRole"),
    text: value("text"),
    createdAt: value("createdAt")
  };
}
async function secureFirestoreRequest(url, idToken, init) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error?.message || "Firestore denied the operation");
    error.status = response.status >= 400 && response.status < 500 ? response.status : 500;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}
function toFirestoreRestValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreRestValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).filter(([, nestedValue]) => nestedValue !== void 0).map(([key, nestedValue]) => [key, toFirestoreRestValue(nestedValue)])
        )
      }
    };
  }
  return { stringValue: String(value) };
}
function fromFirestoreRestValue(value) {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreRestValue);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [key, fromFirestoreRestValue(nestedValue)])
    );
  }
  return null;
}
function userProfileFromRest(document) {
  return Object.fromEntries(
    Object.entries(document?.fields || {}).map(([key, value]) => [key, fromFirestoreRestValue(value)])
  );
}
async function getAuthenticatedUserProfile(uid, idToken) {
  const headers = new Headers({ Authorization: `Bearer ${idToken}` });
  const response = await fetch(`${firestoreRestBase}/users/${encodeURIComponent(uid)}`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error?.message || "Impossible de charger le profil utilisateur.");
    error.status = response.status === 401 ? 401 : response.status === 403 ? 403 : 500;
    throw error;
  }
  return userProfileFromRest(await response.json());
}
async function saveAuthenticatedUserProfile(user, idToken) {
  const fields = Object.fromEntries(
    Object.entries(user).filter(([, value]) => value !== void 0).map(([key, value]) => [key, toFirestoreRestValue(value)])
  );
  await secureFirestoreRequest(`${firestoreRestBase}/users/${encodeURIComponent(user.uid)}`, idToken, {
    method: "PATCH",
    body: JSON.stringify({ fields })
  });
}
function firestoreFieldsFromObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== void 0).map(([key, fieldValue]) => [key, toFirestoreRestValue(fieldValue)])
  );
}
function objectFromFirestoreDocument(document) {
  return Object.fromEntries(
    Object.entries(document?.fields || {}).map(([key, value]) => [key, fromFirestoreRestValue(value)])
  );
}
async function writeAuthenticatedDocument(collectionId, documentId, value, idToken) {
  await secureFirestoreRequest(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    idToken,
    {
      method: "PATCH",
      body: JSON.stringify({ fields: firestoreFieldsFromObject(value) })
    }
  );
}
async function deleteAuthenticatedDocument(collectionId, documentId, idToken) {
  await secureFirestoreRequest(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    idToken,
    { method: "DELETE" }
  );
}
async function getAuthenticatedDocument(collectionId, documentId, idToken) {
  const headers = new Headers({ Authorization: `Bearer ${idToken}` });
  const response = await fetch(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    { headers }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error?.message || "Firestore denied the operation");
    error.status = response.status === 401 ? 401 : response.status === 403 ? 403 : 500;
    throw error;
  }
  return objectFromFirestoreDocument(await response.json());
}
async function getAuthenticatedRawDocument(collectionId, documentId, idToken) {
  const headers = new Headers({ Authorization: `Bearer ${idToken}` });
  const response = await fetch(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    { headers }
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = new Error(payload?.error?.message || "Firestore denied the operation");
    error.status = response.status >= 400 && response.status < 500 ? response.status : 500;
    throw error;
  }
  return response.json();
}
async function commitAuthenticatedWrites(writes, idToken) {
  await secureFirestoreRequest(`${firestoreRestBase}:commit`, idToken, {
    method: "POST",
    body: JSON.stringify({ writes })
  });
}
async function registerBoutiqueAccountAuthenticated(user, boutique, application, idToken) {
  await commitAuthenticatedWrites([
    {
      update: {
        name: firestoreDocumentName("users", user.uid),
        fields: firestoreFieldsFromObject(user)
      },
      currentDocument: { exists: false }
    },
    {
      update: {
        name: firestoreDocumentName("boutiques", boutique.id),
        fields: firestoreFieldsFromObject(boutique)
      },
      currentDocument: { exists: false }
    },
    {
      update: {
        name: firestoreDocumentName("boutiqueApplications", application.boutiqueId),
        fields: firestoreFieldsFromObject(application)
      },
      currentDocument: { exists: false }
    }
  ], idToken);
}
async function queryAuthenticatedDocuments(collectionId, fieldPath, value, idToken) {
  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "EQUAL",
            value: { stringValue: value }
          }
        }
      }
    })
  });
  return (Array.isArray(rows) ? rows : []).filter((row) => row.document).map((row) => objectFromFirestoreDocument(row.document));
}
async function getModerationNotesForBoutiqueAuthenticated(boutiqueId, idToken) {
  const notes = await queryAuthenticatedDocuments(
    "moderationNotes",
    "boutiqueId",
    boutiqueId,
    idToken
  );
  return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function saveModerationNoteAuthenticated(note, idToken) {
  await writeAuthenticatedDocument(
    "moderationNotes",
    note.id,
    note,
    idToken
  );
}
async function updateModerationNoteStatusAuthenticated(noteId, boutiqueId, status, idToken) {
  const currentDocument = await getAuthenticatedRawDocument("moderationNotes", noteId, idToken);
  const current = currentDocument ? objectFromFirestoreDocument(currentDocument) : null;
  if (!current || current.boutiqueId !== boutiqueId) {
    const error = new Error("Observation de mod\xE9ration introuvable.");
    error.status = 404;
    throw error;
  }
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const note = {
    ...current,
    status,
    updatedAt,
    ...status === "resolved" ? { resolvedAt: updatedAt } : { resolvedAt: void 0 }
  };
  await writeAuthenticatedDocument(
    "moderationNotes",
    noteId,
    note,
    idToken
  );
  return note;
}
async function saveProductAuthenticated(product, idToken) {
  await writeAuthenticatedDocument("products", product.id, product, idToken);
}
async function updateProductAuthenticated(productId, updates, idToken) {
  const current = await getAuthenticatedDocument("products", productId, idToken);
  if (!current) throw new Error("Product not found");
  const product = { ...current, ...updates, id: productId };
  await writeAuthenticatedDocument("products", productId, product, idToken);
  return product;
}
async function deleteProductAuthenticated(productId, idToken) {
  await deleteAuthenticatedDocument("products", productId, idToken);
}
async function updateBoutiqueAuthenticated(boutiqueId, updates, idToken) {
  const current = await getAuthenticatedDocument("boutiques", boutiqueId, idToken);
  if (!current) throw new Error("Boutique not found");
  const boutique = { ...current, ...updates, id: boutiqueId };
  await writeAuthenticatedDocument("boutiques", boutiqueId, boutique, idToken);
  return boutique;
}
async function deleteBoutiqueAuthenticated(boutiqueId, idToken) {
  const boutiqueDocument = await getAuthenticatedRawDocument("boutiques", boutiqueId, idToken);
  if (!boutiqueDocument) {
    const error = new Error("Boutique introuvable.");
    error.status = 404;
    throw error;
  }
  const boutique = objectFromFirestoreDocument(boutiqueDocument);
  const [products, collections, orders, moderationNotes, chats, applicationDocument, ownerDocument] = await Promise.all([
    queryAuthenticatedDocuments("products", "boutiqueId", boutiqueId, idToken),
    queryAuthenticatedDocuments("collections", "boutiqueId", boutiqueId, idToken),
    queryAuthenticatedDocuments("orders", "boutiqueId", boutiqueId, idToken),
    queryAuthenticatedDocuments("moderationNotes", "boutiqueId", boutiqueId, idToken),
    queryAuthenticatedDocuments("chats", "boutiqueId", boutiqueId, idToken),
    getAuthenticatedRawDocument("boutiqueApplications", boutiqueId, idToken),
    boutique.ownerId ? getAuthenticatedRawDocument("users", boutique.ownerId, idToken) : Promise.resolve(null)
  ]);
  const relatedDocuments = [
    ...products.map((item) => ({ collectionId: "products", id: item.id })),
    ...collections.map((item) => ({ collectionId: "collections", id: item.id })),
    ...orders.map((item) => ({ collectionId: "orders", id: item.id })),
    ...moderationNotes.map((item) => ({ collectionId: "moderationNotes", id: item.id })),
    ...chats.map((item) => ({ collectionId: "chats", id: item.id }))
  ].filter((item) => item.id);
  for (let index = 0; index < relatedDocuments.length; index += 400) {
    const writes = relatedDocuments.slice(index, index + 400).map((item) => ({
      delete: firestoreDocumentName(item.collectionId, item.id)
    }));
    await commitAuthenticatedWrites(writes, idToken);
  }
  const finalWrites = [];
  if (applicationDocument) {
    finalWrites.push({ delete: firestoreDocumentName("boutiqueApplications", boutiqueId) });
  }
  if (ownerDocument && boutique.ownerId) {
    const owner = objectFromFirestoreDocument(ownerDocument);
    const reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    finalWrites.push({
      update: {
        name: firestoreDocumentName("users", boutique.ownerId),
        fields: firestoreFieldsFromObject({
          ...owner,
          uid: boutique.ownerId,
          accountStatus: "rejected",
          approvalReviewedAt: reviewedAt,
          approvalRejectionReason: "Boutique supprim\xE9e par l\u2019administration."
        })
      },
      currentDocument: { updateTime: ownerDocument.updateTime }
    });
  }
  finalWrites.push({ delete: firestoreDocumentName("boutiques", boutiqueId) });
  await commitAuthenticatedWrites(finalWrites, idToken);
  return {
    products: products.length,
    collections: collections.length,
    orders: orders.length,
    moderationNotes: moderationNotes.length,
    chats: chats.length
  };
}
async function syncBoutiqueIdentityInProductsAuthenticated(boutiqueId, identity, idToken) {
  if (!identity.boutiqueName && !identity.boutiqueLogo) return;
  const snapshot = await (0, import_firestore.getDocs)((0, import_firestore.query)(productsCol, (0, import_firestore.where)("boutiqueId", "==", boutiqueId)));
  for (const productDocument of snapshot.docs) {
    const product = { id: productDocument.id, ...productDocument.data(), ...identity };
    await writeAuthenticatedDocument("products", product.id, product, idToken);
  }
}
async function getAllUsersAuthenticated(idToken) {
  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "users" }] } })
  });
  return (Array.isArray(rows) ? rows : []).filter((row) => row.document).map((row) => objectFromFirestoreDocument(row.document));
}
async function updateAccountApprovalAuthenticated(uid, updates, idToken) {
  const userDocument = await getAuthenticatedRawDocument("users", uid, idToken);
  if (!userDocument) throw new Error("User profile not found");
  const currentUser = objectFromFirestoreDocument(userDocument);
  const user = { ...currentUser, ...updates, uid };
  await commitAuthenticatedWrites([{
    update: {
      name: firestoreDocumentName("users", uid),
      fields: firestoreFieldsFromObject(user)
    },
    currentDocument: { updateTime: userDocument.updateTime }
  }], idToken);
  return user;
}
async function deleteUserProfileAuthenticated(uid, idToken) {
  await deleteAuthenticatedDocument("users", uid, idToken);
}
async function getAllBoutiqueApplicationsAuthenticated(idToken) {
  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "boutiqueApplications" }] } })
  });
  return (Array.isArray(rows) ? rows : []).filter((row) => row.document).map((row) => objectFromFirestoreDocument(row.document));
}
async function updateBoutiqueVerificationAuthenticated(boutiqueId, boutiqueUpdates, applicationUpdates, idToken, ownerUpdates) {
  const [boutiqueDocument, applicationDocument] = await Promise.all([
    getAuthenticatedRawDocument("boutiques", boutiqueId, idToken),
    getAuthenticatedRawDocument("boutiqueApplications", boutiqueId, idToken)
  ]);
  if (!boutiqueDocument) throw new Error("Boutique not found");
  const currentBoutique = objectFromFirestoreDocument(boutiqueDocument);
  const writes = [{
    update: {
      name: firestoreDocumentName("boutiques", boutiqueId),
      fields: firestoreFieldsFromObject({ ...currentBoutique, ...boutiqueUpdates, id: boutiqueId })
    },
    currentDocument: { updateTime: boutiqueDocument.updateTime }
  }];
  if (applicationDocument) {
    const currentApplication = objectFromFirestoreDocument(applicationDocument);
    writes.push({
      update: {
        name: firestoreDocumentName("boutiqueApplications", boutiqueId),
        fields: firestoreFieldsFromObject({ ...currentApplication, ...applicationUpdates, boutiqueId })
      },
      currentDocument: { updateTime: applicationDocument.updateTime }
    });
  }
  if (ownerUpdates) {
    const ownerDocument = await getAuthenticatedRawDocument("users", currentBoutique.ownerId, idToken);
    if (ownerDocument) {
      const currentOwner = objectFromFirestoreDocument(ownerDocument);
      writes.push({
        update: {
          name: firestoreDocumentName("users", currentBoutique.ownerId),
          fields: firestoreFieldsFromObject({ ...currentOwner, ...ownerUpdates, uid: currentBoutique.ownerId })
        },
        currentDocument: { updateTime: ownerDocument.updateTime }
      });
    } else {
      console.warn(`Boutique ${boutiqueId} has no owner profile; boutique status was updated without an account status write.`);
    }
  }
  await commitAuthenticatedWrites(writes, idToken);
}
async function getOrdersAuthenticated(boutiqueId, idToken) {
  const orders = await queryAuthenticatedDocuments("orders", "boutiqueId", boutiqueId, idToken);
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function getReservationsForClientAuthenticated(clientId, idToken) {
  const orders = await queryAuthenticatedDocuments("orders", "clientId", clientId, idToken);
  return orders.filter((order) => order.source === "reservation").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
async function saveOrderAuthenticated(order, idToken) {
  const writes = [{
    update: {
      name: firestoreDocumentName("orders", order.id),
      fields: firestoreFieldsFromObject(order)
    },
    currentDocument: { exists: false }
  }];
  if (order.status === "livre" && order.productId && order.boutiqueId) {
    const productDocument = await getAuthenticatedRawDocument("products", order.productId, idToken);
    if (!productDocument) {
      const error = new Error("Le produit associ\xE9 \xE0 cette commande est introuvable.");
      error.status = 409;
      throw error;
    }
    const product = objectFromFirestoreDocument(productDocument);
    if (product.boutiqueId !== order.boutiqueId) {
      const error = new Error("La commande et le produit n\u2019appartiennent pas \xE0 la m\xEAme boutique.");
      error.status = 403;
      throw error;
    }
    let stockChange;
    try {
      stockChange = calculateDeliveredStock("en_attente", "livre", product.stock, order.quantity);
    } catch {
      const error = new Error("Stock insuffisant pour enregistrer cette commande livr\xE9e.");
      error.status = 409;
      throw error;
    }
    if (stockChange.changed) {
      writes.push({
        update: {
          name: firestoreDocumentName("products", order.productId),
          fields: firestoreFieldsFromObject({
            ...product,
            stock: stockChange.remainingStock,
            isAvailable: stockChange.isAvailable,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          })
        },
        currentDocument: { updateTime: productDocument.updateTime }
      });
    }
  }
  await commitAuthenticatedWrites(writes, idToken);
}
async function saveReservationAuthenticated(order, message, idToken) {
  await commitAuthenticatedWrites([
    {
      update: {
        name: firestoreDocumentName("orders", order.id),
        fields: firestoreFieldsFromObject(order)
      },
      currentDocument: { exists: false }
    },
    {
      update: {
        name: firestoreDocumentName("chats", message.id),
        fields: firestoreStringFields(message)
      },
      currentDocument: { exists: false }
    }
  ], idToken);
}
async function updateOrderAuthenticated(orderId, boutiqueId, updates, idToken) {
  const currentDocument = await getAuthenticatedRawDocument("orders", orderId, idToken);
  const current = currentDocument ? objectFromFirestoreDocument(currentDocument) : null;
  if (!current || current.boutiqueId !== boutiqueId) throw new Error("Order not found");
  const order = { ...current, ...updates, id: orderId, boutiqueId: current.boutiqueId };
  if (!isOrderStatusTransitionAllowed(current.status, order.status)) {
    const error = new Error("Une commande livr\xE9e ne peut pas revenir \xE0 un statut ant\xE9rieur.");
    error.status = 409;
    throw error;
  }
  const writes = [{
    update: {
      name: firestoreDocumentName("orders", orderId),
      fields: firestoreFieldsFromObject(order)
    },
    currentDocument: { updateTime: currentDocument.updateTime }
  }];
  const becameDelivered = current.status !== "livre" && order.status === "livre";
  if (becameDelivered && current.productId) {
    const productDocument = await getAuthenticatedRawDocument("products", current.productId, idToken);
    if (!productDocument) {
      const error = new Error("Le produit associ\xE9 \xE0 cette commande est introuvable.");
      error.status = 409;
      throw error;
    }
    const product = objectFromFirestoreDocument(productDocument);
    if (product.boutiqueId !== boutiqueId) {
      const error = new Error("La commande et le produit n\u2019appartiennent pas \xE0 la m\xEAme boutique.");
      error.status = 403;
      throw error;
    }
    let stockChange;
    try {
      stockChange = calculateDeliveredStock(current.status, order.status, product.stock, current.quantity);
    } catch (stockError) {
      const error = new Error("Stock insuffisant pour marquer cette commande comme livr\xE9e.");
      error.status = 409;
      throw error;
    }
    if (!stockChange.changed) {
      const error = new Error("La transition de stock demand\xE9e est invalide.");
      error.status = 409;
      throw error;
    }
    const updatedProduct = {
      ...product,
      stock: stockChange.remainingStock,
      isAvailable: stockChange.isAvailable,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writes.push({
      update: {
        name: firestoreDocumentName("products", current.productId),
        fields: firestoreFieldsFromObject(updatedProduct)
      },
      currentDocument: { updateTime: productDocument.updateTime }
    });
  }
  await commitAuthenticatedWrites(writes, idToken);
  return order;
}
async function deleteOrderAuthenticated(orderId, boutiqueId, idToken) {
  const current = await getAuthenticatedDocument("orders", orderId, idToken);
  if (!current || current.boutiqueId !== boutiqueId) throw new Error("Order not found");
  if (current.status === "livre") {
    const error = new Error("Une commande livr\xE9e ne peut pas \xEAtre supprim\xE9e afin de pr\xE9server le stock et l\u2019historique.");
    error.status = 409;
    throw error;
  }
  await deleteAuthenticatedDocument("orders", orderId, idToken);
}
async function querySecureMessages(filters, idToken) {
  const fieldFilters = filters.map(({ fieldPath, value }) => ({
    fieldFilter: {
      field: { fieldPath },
      op: "EQUAL",
      value: { stringValue: value }
    }
  }));
  const where2 = fieldFilters.length === 1 ? fieldFilters[0] : { compositeFilter: { op: "AND", filters: fieldFilters } };
  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "chats" }],
        where: where2
      }
    })
  });
  return (Array.isArray(rows) ? rows : []).filter((row) => row.document).map((row) => chatMessageFromRest(row.document));
}
async function addMessageToFirestore(message, idToken) {
  await secureFirestoreRequest(`${firestoreRestBase}/chats/${encodeURIComponent(message.id)}`, idToken, {
    method: "PATCH",
    body: JSON.stringify({ fields: firestoreStringFields(message) })
  });
}
async function getChatMessages(chatId, participantField, participantId, idToken) {
  const items = await querySecureMessages([
    { fieldPath: "chatId", value: chatId },
    { fieldPath: participantField, value: participantId }
  ], idToken);
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
async function getMessagesByClient(clientId, idToken) {
  return querySecureMessages([{ fieldPath: "clientId", value: clientId }], idToken);
}
async function getMessagesByBoutique(boutiqueId, ownerId, idToken) {
  return querySecureMessages([
    { fieldPath: "boutiqueId", value: boutiqueId },
    { fieldPath: "boutiqueOwnerId", value: ownerId }
  ], idToken);
}

// src/utils/accountAccess.ts
function normalizedAccountStatus(profile) {
  if (profile.accountStatus) return profile.accountStatus;
  return profile.role === "boutique" /* BOUTIQUE */ ? "pending" : "approved";
}
function getAccountBlockingMessage(profile) {
  const status = normalizedAccountStatus(profile);
  if (status === "pending") {
    return "Votre compte est en attente de confirmation par l\u2019administration.";
  }
  if (status === "rejected") {
    return `Votre demande d\u2019ouverture a \xE9t\xE9 refus\xE9e${profile.approvalRejectionReason ? ` : ${profile.approvalRejectionReason}` : "."}`;
  }
  if (status === "suspended") {
    return "Votre compte est suspendu. Contactez l\u2019administration.";
  }
  return null;
}

// src/utils/chatAccess.ts
function getChatAccessError(accountUid, profile, boutique, input) {
  if (input.boutiqueId !== boutique.id || input.boutiqueOwnerId !== boutique.ownerId) {
    return "La boutique de cette conversation est invalide.";
  }
  if (input.chatId !== `${input.clientId}_${input.boutiqueId}`) {
    return "L\u2019identifiant de conversation est invalide.";
  }
  if (profile.role === "client" /* CLIENT */) {
    if (input.senderRole !== "client" || input.senderId !== accountUid || input.clientId !== accountUid) {
      return "Un client ne peut envoyer un message qu\u2019en son propre nom.";
    }
    return null;
  }
  if (profile.role === "boutique" /* BOUTIQUE */) {
    if (boutique.ownerId !== accountUid || input.senderRole !== "boutique" || input.senderId !== accountUid || input.boutiqueOwnerId !== accountUid) {
      return "Un g\xE9rant ne peut \xE9crire que pour sa propre boutique.";
    }
    return null;
  }
  return "Ce r\xF4le ne peut pas envoyer de message dans cette conversation.";
}

// src/utils/adminTransitions.ts
function buildBoutiqueAdminTransition(current, request, reviewedAt) {
  const boutiqueUpdates = { updatedAt: reviewedAt };
  const applicationUpdates = {};
  let ownerUpdates;
  if (typeof request.isFeatured === "boolean") {
    boutiqueUpdates.isFeatured = request.isFeatured;
  }
  if (request.isSuspended === true) {
    Object.assign(boutiqueUpdates, {
      isSuspended: true,
      verificationStatus: "suspended",
      verificationReviewedAt: reviewedAt
    });
    Object.assign(applicationUpdates, { status: "suspended", reviewedAt });
    ownerUpdates = { accountStatus: "suspended", approvalReviewedAt: reviewedAt, approvalRejectionReason: "" };
  } else if (request.isSuspended === false && current.isSuspended) {
    const restoredStatus = current.isVerified ? "verified" : "pending";
    Object.assign(boutiqueUpdates, {
      isSuspended: false,
      verificationStatus: restoredStatus,
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: ""
    });
    Object.assign(applicationUpdates, { status: restoredStatus, reviewedAt, rejectionReason: "" });
    ownerUpdates = {
      accountStatus: current.isVerified ? "approved" : "pending",
      approvalReviewedAt: reviewedAt,
      approvalRejectionReason: ""
    };
  } else if (request.isVerified === true) {
    Object.assign(boutiqueUpdates, {
      isVerified: true,
      isSuspended: false,
      verificationStatus: "verified",
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: ""
    });
    Object.assign(applicationUpdates, { status: "verified", reviewedAt, rejectionReason: "" });
    ownerUpdates = { accountStatus: "approved", approvalReviewedAt: reviewedAt, approvalRejectionReason: "" };
  } else if (request.verificationStatus === "rejected") {
    const reason = typeof request.verificationRejectionReason === "string" ? request.verificationRejectionReason.trim().slice(0, 500) : "Dossier refus\xE9 par l\u2019administration.";
    Object.assign(boutiqueUpdates, {
      isVerified: false,
      isSuspended: false,
      verificationStatus: "rejected",
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: reason
    });
    Object.assign(applicationUpdates, { status: "rejected", reviewedAt, rejectionReason: reason });
    ownerUpdates = { accountStatus: "rejected", approvalReviewedAt: reviewedAt, approvalRejectionReason: reason };
  } else if (request.isVerified === false) {
    Object.assign(boutiqueUpdates, {
      isVerified: false,
      isSuspended: false,
      verificationStatus: "pending",
      verificationReviewedAt: reviewedAt,
      verificationRejectionReason: ""
    });
    Object.assign(applicationUpdates, { status: "pending", reviewedAt, rejectionReason: "" });
    ownerUpdates = { accountStatus: "pending", approvalReviewedAt: reviewedAt, approvalRejectionReason: "" };
  }
  return { boutiqueUpdates, applicationUpdates, ownerUpdates };
}

// src/utils/boutiqueRegistration.ts
function prepareBoutiqueRegistration(account, body, now) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const requestedBoutiqueId = typeof body.boutiqueId === "string" ? body.boutiqueId.trim() : "";
  const expectedBoutiqueId = `boutique_${account.uid}`;
  const logo = typeof body.logo === "string" ? body.logo.trim() : "";
  const logoStoragePath = typeof body.logoStoragePath === "string" ? body.logoStoragePath.trim() : "";
  const verificationDocPath = typeof body.verificationDocPath === "string" ? body.verificationDocPath.trim() : "";
  const verificationDocName = typeof body.verificationDocName === "string" ? body.verificationDocName.replace(/[\/ -]/g, "_").trim().slice(0, 180) : "";
  if (name.length < 2 || name.length > 80) {
    return { ok: false, error: "Le nom de boutique doit contenir entre 2 et 80 caract\xE8res." };
  }
  if (requestedBoutiqueId !== expectedBoutiqueId) {
    return { ok: false, error: "Identifiant de boutique invalide." };
  }
  if (!verificationDocName) {
    return { ok: false, error: "Le nom du document de v\xE9rification est obligatoire." };
  }
  const expectedLogoPrefix = `boutique-media/${account.uid}/${expectedBoutiqueId}/logos/`;
  const expectedDocumentPrefix = `boutique-verification/${account.uid}/${expectedBoutiqueId}/`;
  if (!logoStoragePath.startsWith(expectedLogoPrefix) || !verificationDocPath.startsWith(expectedDocumentPrefix)) {
    return { ok: false, error: "Chemin Firebase Storage invalide." };
  }
  try {
    const logoUrl = new URL(logo);
    if (logoUrl.protocol !== "https:" || logoUrl.hostname !== "firebasestorage.googleapis.com") throw new Error();
    const markerIndex = logoUrl.pathname.indexOf("/o/");
    if (markerIndex < 0) throw new Error();
    const encodedObjectPath = logoUrl.pathname.slice(markerIndex + 3).split("/")[0];
    if (decodeURIComponent(encodedObjectPath) !== logoStoragePath) throw new Error();
  } catch {
    return { ok: false, error: "Le logo doit correspondre au fichier Firebase Storage envoy\xE9 par ce compte." };
  }
  const slugBase = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "boutique";
  const user = {
    uid: account.uid,
    email: account.email,
    displayName: name,
    role: "boutique" /* BOUTIQUE */,
    photoURL: logo,
    boutiqueId: expectedBoutiqueId,
    accountStatus: "pending",
    approvalSubmittedAt: now,
    stats: { favoritesCount: 0, viewedProducts: 0 },
    createdAt: now
  };
  const boutique = {
    id: expectedBoutiqueId,
    ownerId: account.uid,
    name,
    slug: `${slugBase}-${account.uid.slice(0, 8).toLowerCase()}`,
    description: "",
    logo,
    coverImage: "/images/default-fashion-cover-v2.png",
    location: { city: "", country: "Alg\xE9rie" },
    categories: [],
    tags: [],
    social: {},
    stats: { productsCount: 0, followersCount: 0, viewsCount: 0 },
    isVerified: false,
    isFeatured: false,
    isSuspended: false,
    verificationStatus: "pending",
    verificationSubmittedAt: now,
    createdAt: now,
    updatedAt: now
  };
  const application = {
    boutiqueId: expectedBoutiqueId,
    ownerId: account.uid,
    status: "pending",
    verificationDocName,
    verificationDocPath,
    submittedAt: now
  };
  return { ok: true, user, boutique, application };
}

// src/utils/appCheckPolicy.ts
function parseAppCheckMode(value) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "enforce" || normalized === "monitor" || normalized === "off") return normalized;
  return "monitor";
}
function decideAppCheckAccess(mode, state) {
  if (mode === "off" || state === "valid") {
    return { allow: true, shouldLog: false };
  }
  if (mode === "monitor") {
    return { allow: true, shouldLog: true };
  }
  return {
    allow: false,
    shouldLog: true,
    statusCode: state === "missing" ? 401 : 403
  };
}

// src/utils/corsPolicy.ts
function normalizeCorsOrigin(value) {
  const url = new URL(value);
  return url.origin === "null" ? `${url.protocol}//${url.host}` : url.origin;
}
function parseAllowedOrigins(value) {
  return new Set(
    (value || "").split(",").map((origin) => origin.trim()).filter(Boolean).map(normalizeCorsOrigin)
  );
}
function isStoreHubOriginAllowed(origin, allowedOrigins2) {
  if (!origin) return true;
  if (allowedOrigins2.size === 0) return true;
  try {
    return allowedOrigins2.has(normalizeCorsOrigin(origin));
  } catch {
    return false;
  }
}

// server.ts
import_dotenv.default.config();
var app2 = (0, import_express.default)();
var PORT = 3e3;
var allowedOrigins = parseAllowedOrigins(process.env.STOREHUB_ALLOWED_ORIGINS);
app2.use((0, import_cors.default)({
  origin(origin, callback) {
    if (isStoreHubOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origine non autoris\xE9e : ${origin}`));
  }
}));
app2.use(import_express.default.json({ limit: "10mb" }));
var appCheckMode = parseAppCheckMode(process.env.STOREHUB_APP_CHECK_MODE);
var appCheckWarningCount = 0;
function readFirebaseProjectId() {
  const configPath = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
  const config = JSON.parse(import_fs2.default.readFileSync(configPath, "utf-8"));
  if (typeof config.projectId !== "string" || !config.projectId.trim()) {
    throw new Error("Le projectId Firebase est absent de la configuration.");
  }
  return config.projectId.trim();
}
async function verifyAppCheckToken(token) {
  const adminApp = (0, import_app2.getApps)().length > 0 ? (0, import_app2.getApp)() : (0, import_app2.initializeApp)({ projectId: readFirebaseProjectId() });
  await (0, import_app_check.getAppCheck)(adminApp).verifyToken(token);
}
app2.use("/api", async (req, res, next) => {
  if (req.path === "/health" || req.path === "/firebase-config" || appCheckMode === "off") {
    next();
    return;
  }
  const token = req.header("X-Firebase-AppCheck")?.trim();
  let state = token ? "valid" : "missing";
  if (token) {
    try {
      await verifyAppCheckToken(token);
    } catch {
      state = "invalid";
    }
  }
  const decision = decideAppCheckAccess(appCheckMode, state);
  if (decision.shouldLog) {
    appCheckWarningCount += 1;
    if (appCheckWarningCount <= 10 || appCheckWarningCount % 100 === 0) {
      console.warn(`[App Check:${appCheckMode}] ${state} ${req.method} ${req.originalUrl}`);
    }
  }
  if (!decision.allow) {
    res.status(decision.statusCode || 403).json({
      error: state === "missing" ? "Une attestation App Check est requise." : "L\u2019attestation App Check est invalide."
    });
    return;
  }
  next();
});
app2.use("/assets", import_express.default.static(import_path2.default.join(process.cwd(), "assets")));
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FOR_BUILD",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
app2.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: (/* @__PURE__ */ new Date()).toISOString(),
    appCheck: { mode: appCheckMode, warnings: appCheckWarningCount }
  });
});
app2.get("/api/firebase-config", (req, res) => {
  try {
    const configPath = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
    if (import_fs2.default.existsSync(configPath)) {
      const config = JSON.parse(import_fs2.default.readFileSync(configPath, "utf-8"));
      res.json({
        ...config,
        appCheckSiteKey: process.env.FIREBASE_APP_CHECK_SITE_KEY || "",
        appCheckDebugEnabled: process.env.FIREBASE_APP_CHECK_DEBUG === "true"
      });
    } else {
      res.status(404).json({ error: "Firebase applet config not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to read Firebase config" });
  }
});
app2.get("/api/boutiques", async (req, res) => {
  try {
    const boutiques = await getBoutiques();
    const visibleBoutiques = boutiques.filter(
      (boutique) => !boutique.isSuspended && (!boutique.verificationStatus || boutique.verificationStatus === "verified")
    );
    res.json(visibleBoutiques.map((boutique) => {
      const {
        verificationDocPath: _verificationDocPath,
        verificationDocName: _verificationDocName,
        verificationRejectionReason: _verificationRejectionReason,
        ...publicBoutique
      } = boutique;
      return publicBoutique;
    }));
  } catch (error) {
    console.error("Error fetching boutiques:", error);
    res.status(500).json({ error: error.message || "Failed to fetch boutiques" });
  }
});
app2.put("/api/boutiques/:id/cover", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { id } = req.params;
    const { coverImage } = req.body;
    await assertBoutiqueOwner(id, idToken);
    if (typeof coverImage !== "string") {
      return res.status(400).json({ error: "Format de couverture invalide." });
    }
    let coverUrl;
    try {
      coverUrl = new URL(coverImage);
    } catch {
      return res.status(400).json({ error: "URL de couverture invalide." });
    }
    if (coverUrl.protocol !== "https:" || coverUrl.hostname !== "firebasestorage.googleapis.com") {
      return res.status(400).json({ error: "La couverture doit provenir de Firebase Storage." });
    }
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await updateBoutiqueAuthenticated(id, { coverImage, updatedAt }, idToken);
    res.json({ message: "Boutique cover updated successfully", id, coverImage, updatedAt });
  } catch (error) {
    console.error("Error updating boutique cover:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update boutique cover" });
  }
});
app2.put("/api/boutiques/:id/settings", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const authenticatedUid = await getFirebaseUidFromIdToken(idToken);
    const currentBoutique = await getBoutiqueById(req.params.id);
    if (!currentBoutique) return res.status(404).json({ error: "Boutique introuvable." });
    if (currentBoutique.ownerId !== authenticatedUid) {
      return res.status(403).json({ error: "Cette boutique est limit\xE9e \xE0 son propri\xE9taire." });
    }
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "";
    const instagram = typeof body.instagram === "string" ? body.instagram.trim() : "";
    const tiktok = typeof body.tiktok === "string" ? body.tiktok.trim() : "";
    const facebook = typeof body.facebook === "string" ? body.facebook.trim() : "";
    const logo = typeof body.logo === "string" ? body.logo.trim() : currentBoutique.logo;
    let website = typeof body.website === "string" ? body.website.trim() : "";
    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ error: "Le nom doit contenir entre 2 et 80 caract\xE8res." });
    }
    if (description.length > 1e3 || city.length > 80 || country.length > 80 || instagram.length > 120 || tiktok.length > 120 || facebook.length > 120) {
      return res.status(400).json({ error: "Une information d\xE9passe la longueur autoris\xE9e." });
    }
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    if (website) {
      try {
        const websiteUrl = new URL(website);
        if (websiteUrl.protocol !== "http:" && websiteUrl.protocol !== "https:") throw new Error();
      } catch {
        return res.status(400).json({ error: "L\u2019adresse du site web est invalide." });
      }
    }
    if (logo !== currentBoutique.logo) {
      try {
        const logoUrl = new URL(logo);
        if (logoUrl.protocol !== "https:" || logoUrl.hostname !== "firebasestorage.googleapis.com") throw new Error();
      } catch {
        return res.status(400).json({ error: "La photo doit provenir de Firebase Storage." });
      }
    }
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const updates = {
      name,
      description,
      logo,
      location: { ...currentBoutique.location, city, country },
      social: { ...currentBoutique.social, instagram, tiktok, facebook, website },
      updatedAt
    };
    await updateBoutiqueAuthenticated(currentBoutique.id, updates, idToken);
    const identityUpdates = {};
    if (name !== currentBoutique.name) identityUpdates.boutiqueName = name;
    if (logo !== currentBoutique.logo) identityUpdates.boutiqueLogo = logo;
    await syncBoutiqueIdentityInProductsAuthenticated(currentBoutique.id, identityUpdates, idToken);
    res.json({ boutique: { ...currentBoutique, ...updates } });
  } catch (error) {
    console.error("Error updating boutique settings:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de mettre \xE0 jour la boutique." });
  }
});
var DEFAULT_PRODUCT_IMAGE = { url: "/images/default-fashion-cover-v2.png", width: 600, height: 800 };
function hasTemporaryProductImage(images) {
  return Array.isArray(images) && images.some((image) => {
    const url = typeof image?.url === "string" ? image.url.trim().toLowerCase() : "";
    return url.startsWith("blob:") || url.startsWith("data:");
  });
}
function productForPublicDisplay(product) {
  const validImages = Array.isArray(product.images) ? product.images.filter((image) => {
    const url = typeof image?.url === "string" ? image.url.trim().toLowerCase() : "";
    return url && !url.startsWith("blob:") && !url.startsWith("data:");
  }) : [];
  return {
    ...product,
    images: validImages.length > 0 ? validImages : [DEFAULT_PRODUCT_IMAGE],
    currency: "DZD"
  };
}
app2.get("/api/products", async (req, res) => {
  try {
    const [products, boutiques] = await Promise.all([getProducts(), getBoutiques()]);
    const visibleBoutiqueIds = new Set(
      boutiques.filter((boutique) => !boutique.isSuspended && (!boutique.verificationStatus || boutique.verificationStatus === "verified")).map((boutique) => boutique.id)
    );
    res.json(products.filter((product) => visibleBoutiqueIds.has(product.boutiqueId)).map(productForPublicDisplay));
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message || "Failed to fetch products" });
  }
});
app2.post("/api/products", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const product = req.body;
    if (!product || !product.id) {
      return res.status(400).json({ error: "Invalid product data" });
    }
    if (hasTemporaryProductImage(product.images)) {
      return res.status(400).json({ error: "Les images temporaires doivent \xEAtre envoy\xE9es dans Firebase Storage avant l\u2019enregistrement." });
    }
    await assertBoutiqueOwner(product.boutiqueId, idToken);
    const normalized = normalizeProductForPersistence(product);
    if ("error" in normalized) return res.status(400).json({ error: normalized.error });
    const normalizedProduct = {
      ...product,
      ...normalized.product
    };
    await saveProductAuthenticated(normalizedProduct, idToken);
    res.status(201).json({ message: "Product created successfully", product: normalizedProduct });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save product" });
  }
});
app2.put("/api/products/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { id } = req.params;
    const currentProduct = await getProductById(id);
    if (!currentProduct) return res.status(404).json({ error: "Article introuvable." });
    await assertBoutiqueOwner(currentProduct.boutiqueId, idToken);
    if (hasTemporaryProductImage(req.body?.images)) {
      return res.status(400).json({ error: "Les images temporaires doivent \xEAtre envoy\xE9es dans Firebase Storage avant l\u2019enregistrement." });
    }
    const normalized = normalizeProductForPersistence(req.body || {}, currentProduct);
    if ("error" in normalized) return res.status(400).json({ error: normalized.error });
    const updates = { ...normalized.product, boutiqueId: currentProduct.boutiqueId };
    const updatedProduct = await updateProductAuthenticated(id, updates, idToken);
    res.json({ message: "Product updated successfully", id, updates, product: updatedProduct });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update product" });
  }
});
app2.delete("/api/products/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: "Article introuvable." });
    await assertBoutiqueOwner(product.boutiqueId, idToken);
    await deleteProductAuthenticated(product.id, idToken);
    res.json({ message: "Product deleted successfully", id: product.id });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete product" });
  }
});
app2.post("/api/analytics/boutiques/:id/view", async (req, res) => {
  try {
    await trackBoutiqueView(req.params.id);
    res.status(204).end();
  } catch (error) {
    console.error("Error tracking boutique view:", error);
    res.status(500).json({ error: error.message || "Failed to track boutique view" });
  }
});
app2.post("/api/analytics/products/:id/view", async (req, res) => {
  try {
    const { boutiqueId } = req.body || {};
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await trackProductView(req.params.id, boutiqueId);
    res.status(204).end();
  } catch (error) {
    console.error("Error tracking product view:", error);
    res.status(500).json({ error: error.message || "Failed to track product view" });
  }
});
app2.get("/api/analytics/boutiques/:id/visibility", async (req, res) => {
  try {
    const requestedDays = Number(req.query.days || 30);
    const days = Math.min(Math.max(Number.isFinite(requestedDays) ? requestedDays : 30, 1), 90);
    res.json(await getVisibilityHistory(req.params.id, days));
  } catch (error) {
    console.error("Error fetching visibility history:", error);
    res.status(500).json({ error: error.message || "Failed to fetch visibility history" });
  }
});
app2.get("/api/orders", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.query.boutiqueId?.toString();
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await assertBoutiqueOwner(boutiqueId, idToken);
    res.json(await getOrdersAuthenticated(boutiqueId, idToken));
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to fetch orders" });
  }
});
app2.post("/api/orders", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const order = req.body;
    if (!order?.id || !order?.boutiqueId || !order?.clientName) {
      return res.status(400).json({ error: "Invalid order data" });
    }
    if (!["en_attente", "en_cours", "livre"].includes(order.status)) {
      return res.status(400).json({ error: "Statut de commande invalide." });
    }
    await assertBoutiqueOwner(order.boutiqueId, idToken);
    const normalizedOrder = {
      ...order,
      clientName: order.clientName.trim().slice(0, 100),
      quantity: Math.max(1, Math.floor(Number(order.quantity) || 1)),
      source: "manual"
    };
    await saveOrderAuthenticated(normalizedOrder, idToken);
    res.status(201).json(normalizedOrder);
  } catch (error) {
    console.error("Error saving order:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save order" });
  }
});
app2.post("/api/reservations", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account } = await assertApprovedAccount(idToken, "client" /* CLIENT */);
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const selectedSize = typeof req.body?.selectedSize === "string" ? req.body.selectedSize.trim() : "";
    const selectedColor = typeof req.body?.selectedColor === "string" ? req.body.selectedColor.trim() : "";
    const requestedName = typeof req.body?.clientName === "string" ? req.body.clientName.trim().slice(0, 100) : "";
    const requestedPhoto = typeof req.body?.clientPhoto === "string" ? req.body.clientPhoto.trim() : "";
    if (!productId || !selectedSize || !selectedColor) {
      return res.status(400).json({ error: "L\u2019article, la taille et la couleur sont obligatoires." });
    }
    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ error: "Article introuvable." });
    const boutique = await getBoutiqueById(product.boutiqueId);
    if (!boutique) return res.status(404).json({ error: "Boutique introuvable." });
    if (boutique.isSuspended || boutique.verificationStatus !== "verified" || !boutique.isVerified) {
      return res.status(409).json({ error: "Cette boutique n\u2019accepte pas de r\xE9servation actuellement." });
    }
    const selectionError = getReservationSelectionError(product, selectedSize, selectedColor);
    if (selectionError) {
      return res.status(selectionError.includes("plus disponible") ? 409 : 400).json({ error: selectionError });
    }
    let clientPhoto = "";
    if (requestedPhoto) {
      try {
        const photoUrl = new URL(requestedPhoto);
        if (photoUrl.protocol === "https:") clientPhoto = requestedPhoto;
      } catch {
        clientPhoto = "";
      }
    }
    const createdAt = (/* @__PURE__ */ new Date()).toISOString();
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const clientName = requestedName || account.displayName || account.email.split("@")[0] || "Client";
    const reservation = {
      id: `res_${uniqueSuffix}`,
      clientId: account.uid,
      clientEmail: account.email,
      clientName,
      description: `R\xE9servation : ${product.name} \xB7 Taille ${selectedSize} \xB7 Couleur ${selectedColor}`,
      amount: `${product.price} DA`,
      status: "en_attente",
      createdAt,
      boutiqueId: boutique.id,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      selectedSize,
      selectedColor,
      source: "reservation"
    };
    const message = {
      id: `msg_res_${uniqueSuffix}`,
      chatId: `${account.uid}_${boutique.id}`,
      clientId: account.uid,
      clientName,
      clientPhoto,
      boutiqueId: boutique.id,
      boutiqueOwnerId: boutique.ownerId,
      boutiqueName: boutique.name,
      boutiqueLogo: boutique.logo,
      senderId: account.uid,
      senderName: clientName,
      senderRole: "client",
      text: `Nouvelle r\xE9servation - ${product.name}
Taille : ${selectedSize}
Couleur : ${selectedColor}
Prix : ${product.price} DA`,
      createdAt
    };
    await saveReservationAuthenticated(reservation, message, idToken);
    res.status(201).json({ reservation, message });
  } catch (error) {
    console.error("Error creating reservation:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible d\u2019enregistrer la r\xE9servation." });
  }
});
app2.get("/api/reservations/mine", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account } = await assertApprovedAccount(idToken, "client" /* CLIENT */);
    const reservations = await getReservationsForClientAuthenticated(account.uid, idToken);
    res.json(reservations);
  } catch (error) {
    console.error("Error fetching client reservations:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger vos r\xE9servations." });
  }
});
app2.put("/api/orders/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.body?.boutiqueId?.toString() || "";
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await assertBoutiqueOwner(boutiqueId, idToken);
    const requestedStatus = req.body?.status;
    if (!["en_attente", "en_cours", "livre"].includes(requestedStatus)) {
      return res.status(400).json({ error: "Statut de commande invalide." });
    }
    await updateOrderAuthenticated(req.params.id, boutiqueId, { status: requestedStatus }, idToken);
    res.json({ message: "Order updated successfully", id: req.params.id });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update order" });
  }
});
app2.delete("/api/orders/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.query.boutiqueId?.toString() || "";
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await assertBoutiqueOwner(boutiqueId, idToken);
    await deleteOrderAuthenticated(req.params.id, boutiqueId, idToken);
    res.json({ message: "Order deleted successfully", id: req.params.id });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete order" });
  }
});
app2.get("/api/users/profile", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const account = await getFirebaseAccountFromIdToken(idToken);
    const profile = await getAuthenticatedUserProfile(account.uid, idToken);
    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve user profile" });
  }
});
app2.post("/api/users/profile", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const account = await getFirebaseAccountFromIdToken(idToken);
    const body = req.body || {};
    const existingProfile = await getAuthenticatedUserProfile(account.uid, idToken);
    const requestedRole = "client" /* CLIENT */;
    const cleanStringList = (value, limit = 20) => Array.isArray(value) ? value.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit) : [];
    const submittedIdentityPath = typeof body.identityDocumentPath === "string" ? body.identityDocumentPath.trim() : "";
    const submittedIdentityName = typeof body.identityDocumentName === "string" ? body.identityDocumentName.trim().slice(0, 180) : "";
    if (!existingProfile && (!submittedIdentityName || !new RegExp(`^client-identity/${account.uid}/identity-[0-9]+\\.(pdf|jpg|png|webp)$`).test(submittedIdentityPath))) {
      return res.status(400).json({ error: "Une pi\xE8ce d\u2019identit\xE9 valide est obligatoire pour cr\xE9er le compte client." });
    }
    const submittedAt = (/* @__PURE__ */ new Date()).toISOString();
    const user = {
      uid: account.uid,
      email: account.email,
      displayName: typeof body.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 100) : existingProfile?.displayName || account.displayName || account.email.split("@")[0],
      role: existingProfile?.role || requestedRole,
      photoURL: typeof body.photoURL === "string" ? body.photoURL.trim().slice(0, 2048) : existingProfile?.photoURL || "",
      city: typeof body.city === "string" ? body.city.trim().slice(0, 80) : existingProfile?.city,
      preferences: body.preferences && typeof body.preferences === "object" ? {
        audiences: cleanStringList(body.preferences.audiences),
        styles: cleanStringList(body.preferences.styles),
        sizes: cleanStringList(body.preferences.sizes),
        favoriteCategories: cleanStringList(body.preferences.favoriteCategories)
      } : existingProfile?.preferences,
      stats: existingProfile?.stats || { favoritesCount: 0, viewedProducts: 0 },
      followedBoutiqueIds: existingProfile?.followedBoutiqueIds || [],
      favoriteProductIds: Array.isArray(body.favoriteProductIds) ? cleanStringList(body.favoriteProductIds, 500) : existingProfile?.favoriteProductIds || [],
      accountStatus: existingProfile ? existingProfile.accountStatus : "approved",
      approvalSubmittedAt: existingProfile ? existingProfile.approvalSubmittedAt : (/* @__PURE__ */ new Date()).toISOString(),
      approvalReviewedAt: existingProfile ? existingProfile.approvalReviewedAt : (/* @__PURE__ */ new Date()).toISOString(),
      approvalRejectionReason: existingProfile?.approvalRejectionReason,
      identityDocumentName: existingProfile?.identityDocumentName || submittedIdentityName,
      identityDocumentPath: existingProfile?.identityDocumentPath || submittedIdentityPath,
      identityVerificationStatus: existingProfile?.identityVerificationStatus || "pending",
      identitySubmittedAt: existingProfile?.identitySubmittedAt || submittedAt,
      identityReviewedAt: existingProfile?.identityReviewedAt,
      createdAt: existingProfile?.createdAt || (/* @__PURE__ */ new Date()).toISOString()
    };
    await saveAuthenticatedUserProfile(user, idToken);
    res.status(200).json({ message: "User profile saved successfully", user });
  } catch (error) {
    console.error("Error saving user profile:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save user profile" });
  }
});
app2.post("/api/boutique-registration", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const account = await getFirebaseAccountFromIdToken(idToken);
    const prepared = prepareBoutiqueRegistration(account, req.body || {}, (/* @__PURE__ */ new Date()).toISOString());
    if ("error" in prepared) return res.status(400).json({ error: prepared.error });
    const existingProfile = await getAuthenticatedUserProfile(account.uid, idToken);
    if (existingProfile) {
      return res.status(409).json({ error: "Ce compte poss\xE8de d\xE9j\xE0 un profil ou une boutique." });
    }
    const { user, boutique, application } = prepared;
    await registerBoutiqueAccountAuthenticated(user, boutique, application, idToken);
    res.status(201).json({
      message: "Votre boutique a \xE9t\xE9 cr\xE9\xE9e et envoy\xE9e en validation.",
      user,
      boutique
    });
  } catch (error) {
    console.error("Error registering boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de cr\xE9er la boutique." });
  }
});
app2.get("/api/users/followed-boutiques", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken, "client" /* CLIENT */);
    if (!profile) return res.status(404).json({ error: "Profil client introuvable." });
    if (profile.role !== "client" /* CLIENT */) {
      return res.status(403).json({ error: "Cette fonction est r\xE9serv\xE9e aux comptes clients." });
    }
    const followedBoutiqueIds = Array.isArray(profile.followedBoutiqueIds) ? profile.followedBoutiqueIds.filter((id) => typeof id === "string" && Boolean(id.trim())) : [];
    res.json({ followedBoutiqueIds });
  } catch (error) {
    console.error("Error retrieving followed boutiques:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les boutiques suivies." });
  }
});
app2.put("/api/users/followed-boutiques/:boutiqueId", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken, "client" /* CLIENT */);
    if (!profile) return res.status(404).json({ error: "Profil client introuvable." });
    if (profile.role !== "client" /* CLIENT */) {
      return res.status(403).json({ error: "Cette fonction est r\xE9serv\xE9e aux comptes clients." });
    }
    const boutiqueId = req.params.boutiqueId.trim();
    const following = req.body?.following;
    if (!boutiqueId || boutiqueId.length > 160 || typeof following !== "boolean") {
      return res.status(400).json({ error: "Abonnement de boutique invalide." });
    }
    if (!await getBoutiqueById(boutiqueId)) {
      return res.status(404).json({ error: "Boutique introuvable." });
    }
    const currentIds = Array.isArray(profile.followedBoutiqueIds) ? profile.followedBoutiqueIds.filter((id) => typeof id === "string" && Boolean(id.trim())) : [];
    const followedBoutiqueIds = following ? Array.from(/* @__PURE__ */ new Set([...currentIds, boutiqueId])) : currentIds.filter((id) => id !== boutiqueId);
    await saveAuthenticatedUserProfile({ ...profile, followedBoutiqueIds }, idToken);
    res.json({ boutiqueId, following, followedBoutiqueIds });
  } catch (error) {
    console.error("Error updating followed boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de modifier cet abonnement." });
  }
});
app2.get("/api/admin/users", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const users = await getAllUsersAuthenticated(idToken);
    res.json(users);
  } catch (error) {
    console.error("Error fetching all users for admin:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to fetch users" });
  }
});
app2.put("/api/admin/users/:uid/approval", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const uid = req.params.uid.trim();
    const requestedStatus = req.body?.status;
    if (!uid || !["approved", "rejected"].includes(requestedStatus)) {
      return res.status(400).json({ error: "D\xE9cision de validation invalide." });
    }
    const currentUser = await getAuthenticatedUserProfile(uid, idToken);
    if (!currentUser) return res.status(404).json({ error: "Compte introuvable." });
    if (currentUser.role === "client" /* CLIENT */) {
      if (requestedStatus !== "approved") {
        return res.status(400).json({ error: "Une pi\xE8ce client peut \xEAtre confirm\xE9e ou le compte peut \xEAtre supprim\xE9." });
      }
      const reviewedAt2 = (/* @__PURE__ */ new Date()).toISOString();
      const updatedUser = await updateAccountApprovalAuthenticated(uid, {
        accountStatus: "approved",
        approvalReviewedAt: currentUser.approvalReviewedAt || reviewedAt2,
        approvalRejectionReason: "",
        identityVerificationStatus: "verified",
        identityReviewedAt: reviewedAt2
      }, idToken);
      return res.json({ message: "Pi\xE8ce d\u2019identit\xE9 confirm\xE9e.", user: updatedUser });
    }
    if (currentUser.role !== "boutique" /* BOUTIQUE */) {
      return res.status(403).json({ error: "Ce type de compte ne peut pas \xEAtre valid\xE9 ici." });
    }
    const rejectionReason = requestedStatus === "rejected" ? typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "" : "";
    if (requestedStatus === "rejected" && rejectionReason.length < 3) {
      return res.status(400).json({ error: "Indiquez un motif de refus d\u2019au moins 3 caract\xE8res." });
    }
    const reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
    const accountUpdates = {
      accountStatus: requestedStatus,
      approvalReviewedAt: reviewedAt,
      approvalRejectionReason: rejectionReason
    };
    let updatedBoutique;
    if (currentUser.role === "boutique" /* BOUTIQUE */ && currentUser.boutiqueId) {
      const boutique = await getBoutiqueById(currentUser.boutiqueId);
      if (!boutique) return res.status(409).json({ error: "La boutique li\xE9e \xE0 ce compte est introuvable." });
      const boutiqueUpdates = requestedStatus === "approved" ? {
        isVerified: true,
        isSuspended: false,
        verificationStatus: "verified",
        verificationReviewedAt: reviewedAt,
        verificationRejectionReason: "",
        updatedAt: reviewedAt
      } : {
        isVerified: false,
        isSuspended: false,
        verificationStatus: "rejected",
        verificationReviewedAt: reviewedAt,
        verificationRejectionReason: rejectionReason,
        updatedAt: reviewedAt
      };
      const applicationUpdates = {
        status: requestedStatus === "approved" ? "verified" : "rejected",
        reviewedAt,
        rejectionReason
      };
      await updateBoutiqueVerificationAuthenticated(
        boutique.id,
        boutiqueUpdates,
        applicationUpdates,
        idToken,
        accountUpdates
      );
      updatedBoutique = { ...boutique, ...boutiqueUpdates };
    } else {
      await updateAccountApprovalAuthenticated(uid, accountUpdates, idToken);
    }
    res.json({
      message: requestedStatus === "approved" ? "Compte approuv\xE9." : "Ouverture de compte refus\xE9e.",
      user: { ...currentUser, ...accountUpdates },
      boutique: updatedBoutique
    });
  } catch (error) {
    console.error("Error reviewing account opening:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible d\u2019enregistrer la d\xE9cision." });
  }
});
app2.delete("/api/admin/users/:uid", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const uid = req.params.uid.trim();
    const currentUser = await getAuthenticatedUserProfile(uid, idToken);
    if (!currentUser) return res.status(404).json({ error: "Compte introuvable." });
    if (currentUser.role !== "client" /* CLIENT */) {
      return res.status(403).json({ error: "Cette action est r\xE9serv\xE9e aux comptes clients." });
    }
    await deleteUserProfileAuthenticated(uid, idToken);
    const adminApp = (0, import_app2.getApps)().length > 0 ? (0, import_app2.getApp)() : (0, import_app2.initializeApp)({ projectId: readFirebaseProjectId() });
    await (0, import_auth.getAuth)(adminApp).deleteUser(uid);
    res.json({ message: "Compte client supprim\xE9.", uid, identityDocumentPath: currentUser.identityDocumentPath || "" });
  } catch (error) {
    console.error("Error deleting client account:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de supprimer le compte client." });
  }
});
app2.get("/api/admin/boutiques", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const [boutiques, applications] = await Promise.all([
      getBoutiques(),
      getAllBoutiqueApplicationsAuthenticated(idToken)
    ]);
    const applicationsByBoutique = new Map(applications.map((application) => [application.boutiqueId, application]));
    res.json(boutiques.map((boutique) => {
      const application = applicationsByBoutique.get(boutique.id);
      return application ? {
        ...boutique,
        verificationDocName: application.verificationDocName,
        verificationDocPath: application.verificationDocPath,
        verificationRejectionReason: application.rejectionReason
      } : boutique;
    }));
  } catch (error) {
    console.error("Error fetching boutique applications:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les dossiers boutique." });
  }
});
app2.get("/api/admin/products", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    res.json(await getProducts());
  } catch (error) {
    console.error("Error fetching products for admin:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger le catalogue administratif." });
  }
});
app2.get("/api/admin/moderation-notes", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const boutiqueId = typeof req.query.boutiqueId === "string" ? req.query.boutiqueId.trim() : "";
    if (!boutiqueId || boutiqueId.length > 160) {
      return res.status(400).json({ error: "Une boutique valide est requise." });
    }
    res.json(await getModerationNotesForBoutiqueAuthenticated(boutiqueId, idToken));
  } catch (error) {
    console.error("Error fetching moderation notes for admin:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les observations de mod\xE9ration." });
  }
});
app2.post("/api/admin/moderation-notes", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const account = await getFirebaseAccountFromIdToken(idToken);
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const severity = req.body?.severity === "info" ? "info" : "action_required";
    if (!productId || productId.length > 180 || text.length < 3 || text.length > 1e3) {
      return res.status(400).json({ error: "Le commentaire doit contenir entre 3 et 1000 caract\xE8res." });
    }
    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ error: "Article introuvable." });
    const boutique = await getBoutiqueById(product.boutiqueId);
    if (!boutique) return res.status(409).json({ error: "La boutique li\xE9e \xE0 cet article est introuvable." });
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const note = {
      id: `moderation_${Date.now()}_${(0, import_node_crypto.randomUUID)()}`,
      boutiqueId: boutique.id,
      boutiqueOwnerId: boutique.ownerId,
      boutiqueName: boutique.name,
      productId: product.id,
      productName: product.name,
      productImage: product.images?.[0]?.url || "",
      text,
      severity,
      status: "open",
      createdByUid: account.uid,
      createdByName: account.displayName || account.email || "Administration StoreHub",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    await saveModerationNoteAuthenticated(note, idToken);
    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating moderation note:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible d\u2019envoyer le commentaire au g\xE9rant." });
  }
});
app2.get("/api/boutiques/:id/moderation-notes", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.params.id.trim();
    await assertBoutiqueOwner(boutiqueId, idToken);
    res.json(await getModerationNotesForBoutiqueAuthenticated(boutiqueId, idToken));
  } catch (error) {
    console.error("Error fetching boutique moderation notes:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les observations administratives." });
  }
});
app2.put("/api/boutiques/:id/moderation-notes/:noteId/status", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.params.id.trim();
    const noteId = req.params.noteId.trim();
    await assertBoutiqueOwner(boutiqueId, idToken);
    if (req.body?.status !== "resolved") {
      return res.status(400).json({ error: "Le statut demand\xE9 est invalide." });
    }
    const note = await updateModerationNoteStatusAuthenticated(noteId, boutiqueId, "resolved", idToken);
    res.json(note);
  } catch (error) {
    console.error("Error updating moderation note status:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de mettre \xE0 jour cette observation." });
  }
});
app2.put("/api/admin/boutiques/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const { id } = req.params;
    const body = req.body || {};
    const currentBoutique = await getBoutiqueById(id);
    if (!currentBoutique) return res.status(404).json({ error: "Boutique introuvable." });
    const { boutiqueUpdates: updates, applicationUpdates, ownerUpdates } = buildBoutiqueAdminTransition(
      currentBoutique,
      body,
      (/* @__PURE__ */ new Date()).toISOString()
    );
    await updateBoutiqueVerificationAuthenticated(id, updates, applicationUpdates, idToken, ownerUpdates);
    res.json({
      message: "Boutique updated successfully",
      boutique: { ...currentBoutique, ...updates, id }
    });
  } catch (error) {
    console.error("Error updating boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update boutique" });
  }
});
app2.delete("/api/admin/boutiques/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const { id } = req.params;
    const deleted = await deleteBoutiqueAuthenticated(id, idToken);
    res.json({ message: "Boutique deleted successfully", id, deleted });
  } catch (error) {
    console.error("Error deleting boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete boutique" });
  }
});
app2.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const { id } = req.params;
    await deleteProductAuthenticated(id, idToken);
    res.json({ message: "Product deleted successfully", id });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete product" });
  }
});
function getFirebaseIdToken(req) {
  const authorization = req.header("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}
function requireFirebaseIdToken(req, res) {
  const token = getFirebaseIdToken(req);
  if (!token) {
    res.status(401).json({ error: "Firebase authentication is required" });
    return null;
  }
  return token;
}
async function getFirebaseUidFromIdToken(idToken) {
  return (await getFirebaseAccountFromIdToken(idToken)).uid;
}
async function getFirebaseAccountFromIdToken(idToken) {
  const configPath = import_path2.default.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig2 = JSON.parse(import_fs2.default.readFileSync(configPath, "utf-8"));
  if (!firebaseConfig2.apiKey) {
    const error = new Error("La configuration Firebase Auth est incompl\xE8te.");
    error.status = 500;
    throw error;
  }
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig2.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );
  const payload = await response.json().catch(() => null);
  const account = payload?.users?.[0];
  const uid = account?.localId;
  if (!response.ok || typeof uid !== "string" || !uid) {
    const error = new Error("Votre session Firebase a expir\xE9. Reconnectez-vous.");
    error.status = 401;
    throw error;
  }
  return {
    uid,
    email: typeof account?.email === "string" ? account.email : "",
    displayName: typeof account?.displayName === "string" ? account.displayName : "",
    emailVerified: account?.emailVerified === true
  };
}
async function assertBoutiqueOwner(boutiqueId, idToken) {
  const [{ account }, boutique] = await Promise.all([
    assertApprovedAccount(idToken, "boutique" /* BOUTIQUE */),
    getBoutiqueById(boutiqueId)
  ]);
  if (!boutique) {
    const error = new Error("Boutique introuvable.");
    error.status = 404;
    throw error;
  }
  if (boutique.ownerId !== account.uid) {
    const error = new Error("Cette boutique est limit\xE9e \xE0 son propri\xE9taire.");
    error.status = 403;
    throw error;
  }
}
async function assertAdmin(idToken) {
  const account = await getFirebaseAccountFromIdToken(idToken);
  if (!account.emailVerified) {
    const error = new Error("Votre adresse email administrateur doit \xEAtre v\xE9rifi\xE9e.");
    error.status = 403;
    throw error;
  }
  const profile = await getAuthenticatedUserProfile(account.uid, idToken);
  if (profile?.role !== "admin" /* ADMIN */) {
    const error = new Error("Acc\xE8s administrateur requis.");
    error.status = 403;
    throw error;
  }
}
async function assertApprovedAccount(idToken, requiredRole) {
  const account = await getFirebaseAccountFromIdToken(idToken);
  const profile = await getAuthenticatedUserProfile(account.uid, idToken);
  if (!profile) {
    const error = new Error("Votre profil StoreHub est introuvable.");
    error.status = 403;
    throw error;
  }
  if (requiredRole && profile.role !== requiredRole) {
    const error = new Error("Ce compte ne poss\xE8de pas le r\xF4le requis pour cette action.");
    error.status = 403;
    throw error;
  }
  if (profile.role !== "client" /* CLIENT */ && !account.emailVerified) {
    const error = new Error("V\xE9rifiez votre adresse email avant de continuer.");
    error.status = 403;
    throw error;
  }
  if (profile.role !== "admin" /* ADMIN */ && normalizedAccountStatus(profile) !== "approved") {
    const error = new Error(getAccountBlockingMessage(profile) || "Ce compte ne peut pas acc\xE9der \xE0 cette fonction.");
    error.status = 403;
    throw error;
  }
  return { account, profile };
}
app2.get("/api/chats/messages", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken);
    const { chatId, participantRole, participantId } = req.query;
    if (!chatId || profile.role !== "client" /* CLIENT */ && profile.role !== "boutique" /* BOUTIQUE */) {
      return res.status(400).json({ error: "Valid chat participant parameters are required" });
    }
    const expectedRole = profile.role === "client" /* CLIENT */ ? "client" : "boutique";
    if (participantRole && participantRole !== expectedRole || participantId && participantId !== account.uid) {
      return res.status(403).json({ error: "Vous ne pouvez consulter que vos propres conversations." });
    }
    const participantField = profile.role === "client" /* CLIENT */ ? "clientId" : "boutiqueOwnerId";
    const messages = await getChatMessages(chatId.toString(), participantField, account.uid, idToken);
    res.json(messages);
  } catch (error) {
    console.error("Error retrieving chat messages:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve messages" });
  }
});
app2.post("/api/chats/messages", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken);
    const message = req.body;
    const requiredTextFields = [
      "id",
      "chatId",
      "clientId",
      "clientName",
      "boutiqueId",
      "boutiqueName",
      "boutiqueOwnerId",
      "senderId",
      "senderName",
      "senderRole",
      "text",
      "createdAt"
    ];
    const hasMissingField = !message || requiredTextFields.some((field) => {
      const value = message?.[field];
      return typeof value !== "string" || !value.trim();
    });
    const hasInvalidRole = message?.senderRole !== "client" && message?.senderRole !== "boutique";
    const hasInvalidThread = message ? message.chatId !== `${message.clientId}_${message.boutiqueId}` : true;
    const hasInvalidDate = message ? Number.isNaN(Date.parse(message.createdAt)) : true;
    const hasInvalidLength = typeof message?.text === "string" && message.text.trim().length > 4e3;
    if (hasMissingField || hasInvalidRole || hasInvalidThread || hasInvalidDate || hasInvalidLength) {
      return res.status(400).json({ error: "Invalid message data" });
    }
    const boutique = await getBoutiqueById(message.boutiqueId);
    if (!boutique) return res.status(404).json({ error: "Boutique introuvable." });
    const accessError = getChatAccessError(account.uid, profile, boutique, message);
    if (accessError) return res.status(403).json({ error: accessError });
    const trustedMessage = {
      ...message,
      clientName: profile.role === "client" /* CLIENT */ ? profile.displayName || account.displayName || message.clientName : message.clientName,
      clientPhoto: profile.role === "client" /* CLIENT */ ? profile.photoURL || "" : message.clientPhoto,
      boutiqueOwnerId: boutique.ownerId,
      boutiqueName: boutique.name,
      boutiqueLogo: boutique.logo,
      senderId: account.uid,
      senderName: profile.role === "client" /* CLIENT */ ? profile.displayName || account.displayName || message.senderName : boutique.name,
      senderRole: profile.role === "client" /* CLIENT */ ? "client" : "boutique",
      text: message.text.trim()
    };
    await addMessageToFirestore(trustedMessage, idToken);
    res.status(201).json({ message: "Message saved successfully", data: trustedMessage });
  } catch (error) {
    console.error("Error saving chat message:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save message" });
  }
});
app2.get("/api/chats/threads/client/:clientId", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account } = await assertApprovedAccount(idToken, "client" /* CLIENT */);
    const { clientId } = req.params;
    if (clientId !== account.uid) {
      return res.status(403).json({ error: "Vous ne pouvez consulter que vos propres conversations." });
    }
    const messages = await getMessagesByClient(account.uid, idToken);
    const threadMap = {};
    for (const msg of messages) {
      const existing = threadMap[msg.boutiqueId];
      if (!existing || new Date(msg.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        threadMap[msg.boutiqueId] = msg;
      }
    }
    const threads = Object.values(threadMap).map((msg) => ({
      chatId: msg.chatId,
      boutiqueId: msg.boutiqueId,
      boutiqueName: msg.boutiqueName,
      boutiqueLogo: msg.boutiqueLogo,
      lastMessageText: msg.text,
      lastMessageTime: msg.createdAt,
      senderRole: msg.senderRole,
      senderName: msg.senderName
    }));
    threads.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    res.json(threads);
  } catch (error) {
    console.error("Error retrieving client threads:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve threads" });
  }
});
app2.get("/api/chats/threads/boutique/:boutiqueId", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account } = await assertApprovedAccount(idToken, "boutique" /* BOUTIQUE */);
    const { boutiqueId } = req.params;
    await assertBoutiqueOwner(boutiqueId, idToken);
    const requestedOwnerId = req.query.ownerId?.toString().trim();
    if (requestedOwnerId && requestedOwnerId !== account.uid) {
      return res.status(403).json({ error: "Cette messagerie appartient \xE0 un autre g\xE9rant." });
    }
    const messages = await getMessagesByBoutique(boutiqueId, account.uid, idToken);
    const threadMap = {};
    for (const msg of messages) {
      const existing = threadMap[msg.clientId];
      if (!existing || new Date(msg.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        threadMap[msg.clientId] = msg;
      }
    }
    const threads = Object.values(threadMap).map((msg) => ({
      chatId: msg.chatId,
      boutiqueId: msg.boutiqueId,
      boutiqueName: msg.boutiqueName,
      boutiqueLogo: msg.boutiqueLogo,
      clientId: msg.clientId,
      clientName: msg.clientName,
      clientPhoto: msg.clientPhoto,
      lastMessageText: msg.text,
      lastMessageTime: msg.createdAt,
      senderRole: msg.senderRole,
      senderName: msg.senderName
    }));
    threads.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    res.json(threads);
  } catch (error) {
    console.error("Error retrieving boutique threads:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve threads" });
  }
});
app2.post("/api/stylist/chat", async (req, res) => {
  try {
    const { message, history, preferences } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";
    const currentProducts = await getProducts();
    const systemInstruction = `You are "FENNCO IA", the personal fashion and shopping adviser for StoreHub, a premium boutique discovery application.
Your tone is warm, concise, inclusive, and knowledgeable about clothing, shoes, accessories, fabrics, colors, sizing, and styling for women, men, and children.
Never assume the customer's gender or preferred audience when it is not provided.

Here are the StoreHub boutiques and products in our curated collection:
${JSON.stringify(currentProducts, null, 2)}

User preferences from onboarding quiz:
- Audience: ${preferences?.audiences?.join(", ") || "All audiences"}
- Favorite Styles: ${preferences?.styles?.join(", ") || "General Couture"}
- Favorite Categories: ${preferences?.favoriteCategories?.join(", ") || "All Pieces"}

Guidelines:
1. Speak elegantly (French/English based on customer's input, default to French or fluent bilingual).
2. Suggest 1 or 2 specific products from StoreHub (using exact product names) that match their request or preferences.
3. Offer concrete, practical styling and sizing tips appropriate to the selected audience.
4. Keep answers relatively concise (2-3 short, sensory paragraphs) so it fits beautifully in our scrollable boutique chat window.`;
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Error in stylist chat:", error);
    res.status(500).json({ error: error.message || "Something went wrong with the AI stylist" });
  }
});
app2.post("/api/visual-search", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Base64 image is required" });
    }
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";
    const currentProducts = await getProducts();
    const prompt = `Analyze this premium fashion inspiration photo. Determine its core aesthetic qualities and return a JSON object containing the analysis.
You MUST output strictly a JSON object matching the schema below. No markdown wrapping except raw JSON text.

JSON Schema:
{
  "detectedStyle": "Name of the style category (e.g., Minimaliste, Avant-Garde, Luxe Chaud, \xC9l\xE9gant, Technique)",
  "colorPalette": ["List", "of", "dominant", "hex", "or", "color", "names"],
  "materials": ["Detected fabrics like linen, silk, wool, leather"],
  "vibe": "A luxurious description of the visual theme/vibe (1 sentence)",
  "matchingCatalogProductIds": ["Choose 1 or 2 matching product IDs from StoreHub catalog that correspond to this look"],
  "stylingTip": "A professional styling tip on how to elevate or wear this look"
}

StoreHub Catalog for matching:
${JSON.stringify(currentProducts, null, 2)}`;
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });
    const textResult = response.text || "{}";
    const parsedData = JSON.parse(textResult.trim());
    res.json(parsedData);
  } catch (error) {
    console.error("Error in visual search:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image style" });
  }
});
app2.post("/api/fennco-ai", async (req, res) => {
  try {
    const { prompt, boutiqueId, requestType } = req.body;
    const currentProducts = await getProducts();
    const boutiqueProducts = boutiqueId ? currentProducts.filter((p) => p.boutiqueId === boutiqueId) : currentProducts;
    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";
    const systemInstruction = `Tu es "Fennco IA", l'Assistant Commercial Intelligent et Conseiller Haute Couture Officiel de la plateforme e-commerce luxe en Alg\xE9rie.
Ton symbole est le Fennec alg\xE9rien \xE9l\xE9gant, rapide, observateur et symbole d'excellence commerciale.
Tu r\xE9ponds aux g\xE9rants de boutiques de mode avec pr\xE9cision, professionnalisme, \xE9l\xE9gance et clairvoyance strat\xE9gique.

Contexte du catalogue boutique actuel:
${JSON.stringify(boutiqueProducts, null, 2)}

Tes comp\xE9tences obligatoires:
- Rapports de ventes et b\xE9n\xE9fices
- Analyse des pi\xE8ces les plus vendues et des stocks dormants (articles sans ventes depuis 30+ jours)
- Pr\xE9visions de r\xE9approvisionnement et alertes de rupture de stock
- Analyse des tailles (S, M, L, XL) et couleurs les plus pl\xE9biscit\xE9es (Noir, Dor\xE9, Blanc, Camel, Silk)
- Recommandations de promotions cibl\xE9es et conseils commerciaux
- Analyse comparative mensuelle (+18% de ventes moyennes ce mois-ci)

Instructions de r\xE9ponse:
- Sois tr\xE8s structur\xE9, clair, motivant et pr\xE9cis.
- Utilise des puces et des chiffres concrets (ex: "Les vestes repr\xE9sentent 42% de vos revenus", "Le produit VST-204 est dormant depuis 45 jours").
- Propose toujours 2 ou 3 recommandations d'action imm\xE9diates.
- R\xE9ponds en fran\xE7ais (avec quelques termes de luxe et de commerce \xE9l\xE9gant).`;
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt || requestType || "Donne-moi une analyse commerciale compl\xE8te de ma boutique." }]
        }
      ],
      config: {
        systemInstruction,
        temperature: 0.5
      }
    });
    res.json({ text: response.text });
  } catch (error) {
    console.error("Error in Fennco IA endpoint:", error);
    res.status(500).json({
      error: error.message || "Erreur de communication avec Fennco IA",
      text: "**Fennco IA Coach Commercial**:\n\n- **Activit\xE9 Globale**: Vos ventes sont en hausse de **+18%** sur les 30 derniers jours.\n- **Top Categorie**: Les robes et manteaux repr\xE9sentent **42%** de vos revenus.\n- **Alerte Stock**: 3 pi\xE8ces n\xE9cessitent un r\xE9approvisionnement sous 7 jours.\n- **Recommandation**: Lancez une vente privil\xE8ge de **10%** sur la collection \xE9t\xE9 pour \xE9couler les tailles S restantes."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app2.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app2.use(import_express.default.static(distPath));
    app2.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app2.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
if (process.env.STOREHUB_SKIP_SERVER_START !== "1" && !process.env.FUNCTION_TARGET) {
  void startServer();
}

// functions-entry.mjs
var api = (0, import_https.onRequest)(
  {
    region: "northamerica-northeast1",
    memory: "1GiB",
    timeoutSeconds: 120,
    maxInstances: 10
  },
  app2
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  api
});
//# sourceMappingURL=index.cjs.map
