import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  setDoc, 
  doc, 
  query, 
  where,
  deleteDoc,
  getDoc,
  deleteField,
  increment,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { Boutique, BoutiqueApplication, ManualOrder, Product, UserProfile, VisibilityPoint } from "../types";
import { ensureRequiredClothingSizes, generateShoeSizes, isShoeCategory } from "../utils/productSizes";

// Load Firebase configuration from the auto-generated config file
let firebaseConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    console.log("Loaded Firebase configuration successfully.");
  } else {
    console.warn("firebase-applet-config.json not found. Using empty config fallback.");
  }
} catch (error) {
  console.error("Failed to read firebase-applet-config.json:", error);
}

// Initialize Firebase App and Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// Collection References
export const boutiquesCol = collection(db, "boutiques");
export const productsCol = collection(db, "products");
export const usersCol = collection(db, "users");

// Data helper functions
export async function getBoutiques(): Promise<Boutique[]> {
  const snapshot = await getDocs(boutiquesCol);
  const items: Boutique[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as Boutique);
  });
  return items;
}

export async function getBoutiqueById(id: string): Promise<Boutique | null> {
  const snapshot = await getDoc(doc(db, "boutiques", id));
  return snapshot.exists() ? snapshot.data() as Boutique : null;
}

export async function getProducts(): Promise<Product[]> {
  const snapshot = await getDocs(productsCol);
  const items: Product[] = [];
  snapshot.forEach((doc) => {
    const product = doc.data() as Product;
    const generatedShoeSizes = isShoeCategory(product.category)
      && product.shoeSizeMin !== undefined
      && product.shoeSizeMax !== undefined
      ? generateShoeSizes(product.shoeSizeMin, product.shoeSizeMax)
      : [];
    items.push({
      ...product,
      sizes: generatedShoeSizes.length > 0
        ? generatedShoeSizes
        : ensureRequiredClothingSizes(product.sizes, product.category),
    });
  });
  return items;
}

export async function getProductById(id: string): Promise<Product | null> {
  const snapshot = await getDoc(doc(db, "products", id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Product) : null;
}

export async function addProductToFirestore(product: Product): Promise<void> {
  await setDoc(doc(db, "products", product.id), product);
}

export async function updateProductInFirestore(id: string, updates: Partial<Product>): Promise<void> {
  await setDoc(doc(db, "products", id), updates, { merge: true });
}

export async function saveUserProfile(user: UserProfile): Promise<void> {
  await setDoc(doc(db, "users", user.uid), user, { merge: true });
}

export async function getUserProfile(email: string): Promise<UserProfile | null> {
  const q = query(usersCol, where("email", "==", email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  let user: UserProfile | null = null;
  snapshot.forEach((doc) => {
    user = doc.data() as UserProfile;
  });
  return user;
}

// Admin helper functions
export async function getAllUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(usersCol);
  const items: UserProfile[] = [];
  snapshot.forEach((doc) => {
    items.push(doc.data() as UserProfile);
  });
  return items;
}

export async function updateBoutiqueInFirestore(id: string, updates: Partial<Boutique>): Promise<void> {
  const boutiqueDoc = doc(db, "boutiques", id);
  await setDoc(boutiqueDoc, updates, { merge: true });
}

/** Keep denormalized boutique identity on every product in sync. Batches stay
 * below Firestore's 500-operation limit so large catalogues remain supported. */
export async function syncBoutiqueIdentityInProducts(
  boutiqueId: string,
  identity: { boutiqueName?: string; boutiqueLogo?: string },
): Promise<void> {
  if (!identity.boutiqueName && !identity.boutiqueLogo) return;
  const snapshot = await getDocs(query(productsCol, where("boutiqueId", "==", boutiqueId)));
  let batch = writeBatch(db);
  let operationCount = 0;

  for (const productDoc of snapshot.docs) {
    batch.update(productDoc.ref, identity);
    operationCount += 1;
    if (operationCount === 450) {
      await batch.commit();
      batch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) await batch.commit();
}

export async function deleteBoutiqueFromFirestore(id: string): Promise<void> {
  const boutiqueDoc = doc(db, "boutiques", id);
  await deleteDoc(boutiqueDoc);
}

export async function deleteProductFromFirestore(id: string): Promise<void> {
  const productDoc = doc(db, "products", id);
  await deleteDoc(productDoc);
}

// -------------------------------------------------------------
// Real dashboard statistics
// -------------------------------------------------------------

function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function dailyFieldKey(date = new Date()): string {
  return `d_${isoDate(date).replace(/-/g, "_")}`;
}

export async function trackBoutiqueView(boutiqueId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "boutiques", boutiqueId), {
    "stats.viewsCount": increment(1),
    [`visibilityDaily.${dailyFieldKey()}.boutiqueViews`]: increment(1),
    [`visibilityDaily.${dailyFieldKey()}.productViews`]: increment(0),
    updatedAt: new Date().toISOString()
  });
  await batch.commit();
}

export async function trackProductView(productId: string, boutiqueId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "products", productId), {
    "stats.views": increment(1),
    updatedAt: new Date().toISOString()
  });
  batch.update(doc(db, "boutiques", boutiqueId), {
    [`visibilityDaily.${dailyFieldKey()}.boutiqueViews`]: increment(0),
    [`visibilityDaily.${dailyFieldKey()}.productViews`]: increment(1)
  });
  await batch.commit();
}

export async function getVisibilityHistory(boutiqueId: string, days: number): Promise<VisibilityPoint[]> {
  const boutiqueSnapshot = await getDoc(doc(db, "boutiques", boutiqueId));
  const daily = (boutiqueSnapshot.data()?.visibilityDaily || {}) as Record<string, Omit<VisibilityPoint, "date">>;

  const points: VisibilityPoint[] = [];
  const today = new Date();
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

// -------------------------------------------------------------
// Manual orders stored in Firestore
// -------------------------------------------------------------

export async function getOrders(boutiqueId: string): Promise<ManualOrder[]> {
  const snapshot = await getDoc(doc(db, "boutiques", boutiqueId));
  const stored = (snapshot.data()?.manualOrders || {}) as Record<string, ManualOrder>;
  const items = Object.values(stored);
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Return only reservations belonging to the authenticated client. */
export async function getReservationsForClient(clientId: string, clientEmail: string): Promise<ManualOrder[]> {
  const snapshot = await getDocs(boutiquesCol);
  const normalizedEmail = clientEmail.trim().toLowerCase();
  const reservations: ManualOrder[] = [];

  snapshot.forEach((boutiqueDocument) => {
    const stored = (boutiqueDocument.data()?.manualOrders || {}) as Record<string, ManualOrder>;
    Object.values(stored).forEach((order) => {
      const belongsToClient = order.clientId === clientId
        || Boolean(normalizedEmail && order.clientEmail?.trim().toLowerCase() === normalizedEmail);

      if (order.source === "reservation" && belongsToClient) {
        reservations.push(order);
      }
    });
  });

  return reservations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveOrder(order: ManualOrder): Promise<void> {
  if (!order.boutiqueId) throw new Error("Order boutiqueId is required");
  await updateDoc(doc(db, "boutiques", order.boutiqueId), {
    [`manualOrders.${order.id}`]: order
  });
}

export async function updateOrder(id: string, updates: Partial<ManualOrder>): Promise<void> {
  const boutiqueId = updates.boutiqueId || "boutique_1";
  const boutiqueSnapshot = await getDoc(doc(db, "boutiques", boutiqueId));
  const current = boutiqueSnapshot.data()?.manualOrders?.[id] as ManualOrder | undefined;
  if (!current) throw new Error("Order not found");
  await updateDoc(boutiqueSnapshot.ref, {
    [`manualOrders.${id}`]: { ...current, ...updates }
  });
}

export async function deleteOrder(id: string, boutiqueId = "boutique_1"): Promise<void> {
  await updateDoc(doc(db, "boutiques", boutiqueId), {
    [`manualOrders.${id}`]: deleteField()
  });
}

// Previous builds seeded counters from mock data. Reset those counters once so
// every value shown after this migration is generated by real visits.
export async function resetLegacyDemoCountersOnce(): Promise<void> {
  const primaryBoutique = await getDoc(doc(db, "boutiques", "boutique_1"));
  if (Number(primaryBoutique.data()?.statisticsVersion || 0) >= 1) return;

  const [boutiquesSnapshot, productsSnapshot] = await Promise.all([
    getDocs(boutiquesCol),
    getDocs(productsCol)
  ]);
  const batch = writeBatch(db);
  boutiquesSnapshot.forEach((entry) => {
    batch.update(entry.ref, { "stats.viewsCount": 0, statisticsVersion: 1 });
  });
  productsSnapshot.forEach((entry) => {
    batch.update(entry.ref, { "stats.views": 0, "stats.clicks": 0 });
  });
  await batch.commit();
}

// -------------------------------------------------------------
// Live Client-Boutique Chat helper functions
// -------------------------------------------------------------

export interface ChatMessage {
  id: string;
  chatId: string;
  clientId: string;
  clientName: string;
  clientPhoto: string;
  boutiqueId: string;
  boutiqueOwnerId: string;
  boutiqueName: string;
  boutiqueLogo: string;
  senderId: string;
  senderName: string;
  senderRole: "client" | "boutique";
  text: string;
  createdAt: string;
}

const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || "(default)";
const firestoreRestBase = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents`;
const firestoreDocumentRoot = `projects/${firebaseConfig.projectId}/databases/${firestoreDatabaseId}/documents`;

function firestoreDocumentName(collectionId: string, documentId: string): string {
  return `${firestoreDocumentRoot}/${collectionId}/${documentId}`;
}

function firestoreStringFields(message: ChatMessage) {
  return Object.fromEntries(
    Object.entries(message).map(([key, value]) => [key, { stringValue: String(value ?? "") }]),
  );
}

function chatMessageFromRest(document: any): ChatMessage {
  const fields = document?.fields || {};
  const value = (key: keyof ChatMessage) => String(fields[key]?.stringValue || "");
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
    senderRole: value("senderRole") as ChatMessage["senderRole"],
    text: value("text"),
    createdAt: value("createdAt"),
  };
}

async function secureFirestoreRequest(url: string, idToken: string, init: RequestInit): Promise<any> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${idToken}`);
  headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error: any = new Error(payload?.error?.message || "Firestore denied the operation");
    error.status = response.status >= 400 && response.status < 500 ? response.status : 500;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function toFirestoreRestValue(value: any): any {
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
          Object.entries(value)
            .filter(([, nestedValue]) => nestedValue !== undefined)
            .map(([key, nestedValue]) => [key, toFirestoreRestValue(nestedValue)]),
        ),
      },
    };
  }
  return { stringValue: String(value) };
}

function fromFirestoreRestValue(value: any): any {
  if (!value || "nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreRestValue);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [key, fromFirestoreRestValue(nestedValue)]),
    );
  }
  return null;
}

function userProfileFromRest(document: any): UserProfile {
  return Object.fromEntries(
    Object.entries(document?.fields || {}).map(([key, value]) => [key, fromFirestoreRestValue(value)]),
  ) as UserProfile;
}

export async function getAuthenticatedUserProfile(uid: string, idToken: string): Promise<UserProfile | null> {
  const headers = new Headers({ Authorization: `Bearer ${idToken}` });
  const response = await fetch(`${firestoreRestBase}/users/${encodeURIComponent(uid)}`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error: any = new Error(payload?.error?.message || "Impossible de charger le profil utilisateur.");
    error.status = response.status === 401 ? 401 : response.status === 403 ? 403 : 500;
    throw error;
  }
  return userProfileFromRest(await response.json());
}

export async function saveAuthenticatedUserProfile(user: UserProfile, idToken: string): Promise<void> {
  const fields = Object.fromEntries(
    Object.entries(user)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreRestValue(value)]),
  );
  await secureFirestoreRequest(`${firestoreRestBase}/users/${encodeURIComponent(user.uid)}`, idToken, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

function firestoreFieldsFromObject(value: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => fieldValue !== undefined)
      .map(([key, fieldValue]) => [key, toFirestoreRestValue(fieldValue)]),
  );
}

function objectFromFirestoreDocument<T>(document: any): T {
  return Object.fromEntries(
    Object.entries(document?.fields || {}).map(([key, value]) => [key, fromFirestoreRestValue(value)]),
  ) as T;
}

async function writeAuthenticatedDocument(
  collectionId: string,
  documentId: string,
  value: Record<string, any>,
  idToken: string,
): Promise<void> {
  await secureFirestoreRequest(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    idToken,
    {
      method: "PATCH",
      body: JSON.stringify({ fields: firestoreFieldsFromObject(value) }),
    },
  );
}

async function deleteAuthenticatedDocument(
  collectionId: string,
  documentId: string,
  idToken: string,
): Promise<void> {
  await secureFirestoreRequest(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    idToken,
    { method: "DELETE" },
  );
}

async function getAuthenticatedDocument<T>(
  collectionId: string,
  documentId: string,
  idToken: string,
): Promise<T | null> {
  const headers = new Headers({ Authorization: `Bearer ${idToken}` });
  const response = await fetch(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    { headers },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error: any = new Error(payload?.error?.message || "Firestore denied the operation");
    error.status = response.status === 401 ? 401 : response.status === 403 ? 403 : 500;
    throw error;
  }
  return objectFromFirestoreDocument<T>(await response.json());
}

async function getAuthenticatedRawDocument(
  collectionId: string,
  documentId: string,
  idToken: string,
): Promise<any | null> {
  const headers = new Headers({ Authorization: `Bearer ${idToken}` });
  const response = await fetch(
    `${firestoreRestBase}/${encodeURIComponent(collectionId)}/${encodeURIComponent(documentId)}`,
    { headers },
  );
  if (response.status === 404) return null;
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error: any = new Error(payload?.error?.message || "Firestore denied the operation");
    error.status = response.status >= 400 && response.status < 500 ? response.status : 500;
    throw error;
  }
  return response.json();
}

async function commitAuthenticatedWrites(writes: any[], idToken: string): Promise<void> {
  await secureFirestoreRequest(`${firestoreRestBase}:commit`, idToken, {
    method: "POST",
    body: JSON.stringify({ writes }),
  });
}

/** Create the seller profile and its boutique as one Firestore commit.
 * The `exists: false` preconditions prevent an accidental overwrite or a
 * duplicate registration when the client retries the request. */
export async function registerBoutiqueAccountAuthenticated(
  user: UserProfile,
  boutique: Boutique,
  application: BoutiqueApplication,
  idToken: string,
): Promise<void> {
  await commitAuthenticatedWrites([
    {
      update: {
        name: firestoreDocumentName("users", user.uid),
        fields: firestoreFieldsFromObject(user as unknown as Record<string, any>),
      },
      currentDocument: { exists: false },
    },
    {
      update: {
        name: firestoreDocumentName("boutiques", boutique.id),
        fields: firestoreFieldsFromObject(boutique as unknown as Record<string, any>),
      },
      currentDocument: { exists: false },
    },
    {
      update: {
        name: firestoreDocumentName("boutiqueApplications", application.boutiqueId),
        fields: firestoreFieldsFromObject(application as unknown as Record<string, any>),
      },
      currentDocument: { exists: false },
    },
  ], idToken);
}

async function queryAuthenticatedDocuments<T>(
  collectionId: string,
  fieldPath: string,
  value: string,
  idToken: string,
): Promise<T[]> {
  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "EQUAL",
            value: { stringValue: value },
          },
        },
      },
    }),
  });
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row.document)
    .map((row) => objectFromFirestoreDocument<T>(row.document));
}

export async function saveProductAuthenticated(product: Product, idToken: string): Promise<void> {
  await writeAuthenticatedDocument("products", product.id, product as unknown as Record<string, any>, idToken);
}

export async function updateProductAuthenticated(
  productId: string,
  updates: Partial<Product>,
  idToken: string,
): Promise<Product> {
  const current = await getAuthenticatedDocument<Product>("products", productId, idToken);
  if (!current) throw new Error("Product not found");
  const product = { ...current, ...updates, id: productId };
  await writeAuthenticatedDocument("products", productId, product as unknown as Record<string, any>, idToken);
  return product;
}

export async function deleteProductAuthenticated(productId: string, idToken: string): Promise<void> {
  await deleteAuthenticatedDocument("products", productId, idToken);
}

export async function updateBoutiqueAuthenticated(
  boutiqueId: string,
  updates: Partial<Boutique>,
  idToken: string,
): Promise<Boutique> {
  const current = await getAuthenticatedDocument<Boutique>("boutiques", boutiqueId, idToken);
  if (!current) throw new Error("Boutique not found");
  const boutique = { ...current, ...updates, id: boutiqueId };
  await writeAuthenticatedDocument("boutiques", boutiqueId, boutique as unknown as Record<string, any>, idToken);
  return boutique;
}

export async function deleteBoutiqueAuthenticated(boutiqueId: string, idToken: string): Promise<void> {
  await deleteAuthenticatedDocument("boutiques", boutiqueId, idToken);
}

export async function syncBoutiqueIdentityInProductsAuthenticated(
  boutiqueId: string,
  identity: { boutiqueName?: string; boutiqueLogo?: string },
  idToken: string,
): Promise<void> {
  if (!identity.boutiqueName && !identity.boutiqueLogo) return;
  const snapshot = await getDocs(query(productsCol, where("boutiqueId", "==", boutiqueId)));
  for (const productDocument of snapshot.docs) {
    const product = { id: productDocument.id, ...productDocument.data(), ...identity } as Product;
    await writeAuthenticatedDocument("products", product.id, product as unknown as Record<string, any>, idToken);
  }
}

export async function getAllUsersAuthenticated(idToken: string): Promise<UserProfile[]> {
  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "users" }] } }),
  });
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row.document)
    .map((row) => objectFromFirestoreDocument<UserProfile>(row.document));
}

export async function updateAccountApprovalAuthenticated(
  uid: string,
  updates: Pick<UserProfile, 'accountStatus' | 'approvalReviewedAt' | 'approvalRejectionReason'>,
  idToken: string,
): Promise<UserProfile> {
  const userDocument = await getAuthenticatedRawDocument("users", uid, idToken);
  if (!userDocument) throw new Error("User profile not found");
  const currentUser = objectFromFirestoreDocument<UserProfile>(userDocument);
  const user = { ...currentUser, ...updates, uid };
  await commitAuthenticatedWrites([{
    update: {
      name: firestoreDocumentName("users", uid),
      fields: firestoreFieldsFromObject(user as unknown as Record<string, any>),
    },
    currentDocument: { updateTime: userDocument.updateTime },
  }], idToken);
  return user;
}

export async function getAllBoutiqueApplicationsAuthenticated(idToken: string): Promise<BoutiqueApplication[]> {
  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "boutiqueApplications" }] } }),
  });
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row.document)
    .map((row) => objectFromFirestoreDocument<BoutiqueApplication>(row.document));
}

export async function updateBoutiqueVerificationAuthenticated(
  boutiqueId: string,
  boutiqueUpdates: Partial<Boutique>,
  applicationUpdates: Partial<BoutiqueApplication>,
  idToken: string,
  ownerUpdates?: Pick<UserProfile, 'accountStatus' | 'approvalReviewedAt' | 'approvalRejectionReason'>,
): Promise<void> {
  const [boutiqueDocument, applicationDocument] = await Promise.all([
    getAuthenticatedRawDocument("boutiques", boutiqueId, idToken),
    getAuthenticatedRawDocument("boutiqueApplications", boutiqueId, idToken),
  ]);
  if (!boutiqueDocument) throw new Error("Boutique not found");

  const currentBoutique = objectFromFirestoreDocument<Boutique>(boutiqueDocument);
  const writes: any[] = [{
    update: {
      name: firestoreDocumentName("boutiques", boutiqueId),
      fields: firestoreFieldsFromObject({ ...currentBoutique, ...boutiqueUpdates, id: boutiqueId }),
    },
    currentDocument: { updateTime: boutiqueDocument.updateTime },
  }];

  if (applicationDocument) {
    const currentApplication = objectFromFirestoreDocument<BoutiqueApplication>(applicationDocument);
    writes.push({
      update: {
        name: firestoreDocumentName("boutiqueApplications", boutiqueId),
        fields: firestoreFieldsFromObject({ ...currentApplication, ...applicationUpdates, boutiqueId }),
      },
      currentDocument: { updateTime: applicationDocument.updateTime },
    });
  }


  if (ownerUpdates) {
    const ownerDocument = await getAuthenticatedRawDocument("users", currentBoutique.ownerId, idToken);
    if (!ownerDocument) throw new Error("Boutique owner profile not found");
    const currentOwner = objectFromFirestoreDocument<UserProfile>(ownerDocument);
    writes.push({
      update: {
        name: firestoreDocumentName("users", currentBoutique.ownerId),
        fields: firestoreFieldsFromObject({ ...currentOwner, ...ownerUpdates, uid: currentBoutique.ownerId }),
      },
      currentDocument: { updateTime: ownerDocument.updateTime },
    });
  }

  await commitAuthenticatedWrites(writes, idToken);
}

export async function getOrdersAuthenticated(boutiqueId: string, idToken: string): Promise<ManualOrder[]> {
  const orders = await queryAuthenticatedDocuments<ManualOrder>("orders", "boutiqueId", boutiqueId, idToken);
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getReservationsForClientAuthenticated(
  clientId: string,
  idToken: string,
): Promise<ManualOrder[]> {
  const orders = await queryAuthenticatedDocuments<ManualOrder>("orders", "clientId", clientId, idToken);
  return orders
    .filter((order) => order.source === "reservation")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveOrderAuthenticated(order: ManualOrder, idToken: string): Promise<void> {
  await writeAuthenticatedDocument("orders", order.id, order as unknown as Record<string, any>, idToken);
}

export async function saveReservationAuthenticated(
  order: ManualOrder,
  message: ChatMessage,
  idToken: string,
): Promise<void> {
  await commitAuthenticatedWrites([
    {
      update: {
        name: firestoreDocumentName("orders", order.id),
        fields: firestoreFieldsFromObject(order as unknown as Record<string, any>),
      },
      currentDocument: { exists: false },
    },
    {
      update: {
        name: firestoreDocumentName("chats", message.id),
        fields: firestoreStringFields(message),
      },
      currentDocument: { exists: false },
    },
  ], idToken);
}

export async function updateOrderAuthenticated(
  orderId: string,
  boutiqueId: string,
  updates: Partial<ManualOrder>,
  idToken: string,
): Promise<ManualOrder> {
  const currentDocument = await getAuthenticatedRawDocument("orders", orderId, idToken);
  const current = currentDocument ? objectFromFirestoreDocument<ManualOrder>(currentDocument) : null;
  if (!current || current.boutiqueId !== boutiqueId) throw new Error("Order not found");
  const order = { ...current, ...updates, id: orderId, boutiqueId: current.boutiqueId };

  const writes: any[] = [{
    update: {
      name: firestoreDocumentName("orders", orderId),
      fields: firestoreFieldsFromObject(order as unknown as Record<string, any>),
    },
    currentDocument: { updateTime: currentDocument.updateTime },
  }];

  const becameDelivered = current.status !== "livre" && order.status === "livre";
  if (becameDelivered && current.productId) {
    const productDocument = await getAuthenticatedRawDocument("products", current.productId, idToken);
    if (!productDocument) {
      const error: any = new Error("Le produit associé à cette commande est introuvable.");
      error.status = 409;
      throw error;
    }

    const product = objectFromFirestoreDocument<Product>(productDocument);
    if (product.boutiqueId !== boutiqueId) {
      const error: any = new Error("La commande et le produit n’appartiennent pas à la même boutique.");
      error.status = 403;
      throw error;
    }

    const quantity = Math.max(1, Math.floor(Number(current.quantity) || 1));
    const currentStock = Number.isFinite(product.stock) ? Math.max(0, Number(product.stock)) : 1;
    if (currentStock < quantity) {
      const error: any = new Error("Stock insuffisant pour marquer cette commande comme livrée.");
      error.status = 409;
      throw error;
    }

    const remainingStock = currentStock - quantity;
    const updatedProduct: Product = {
      ...product,
      stock: remainingStock,
      isAvailable: remainingStock > 0,
      updatedAt: new Date().toISOString(),
    };
    writes.push({
      update: {
        name: firestoreDocumentName("products", current.productId),
        fields: firestoreFieldsFromObject(updatedProduct as unknown as Record<string, any>),
      },
      currentDocument: { updateTime: productDocument.updateTime },
    });
  }

  await commitAuthenticatedWrites(writes, idToken);
  return order;
}

export async function deleteOrderAuthenticated(
  orderId: string,
  boutiqueId: string,
  idToken: string,
): Promise<void> {
  const current = await getAuthenticatedDocument<ManualOrder>("orders", orderId, idToken);
  if (!current || current.boutiqueId !== boutiqueId) throw new Error("Order not found");
  await deleteAuthenticatedDocument("orders", orderId, idToken);
}

type ChatQueryField = "chatId" | "clientId" | "boutiqueId" | "boutiqueOwnerId";

async function querySecureMessages(
  filters: Array<{ fieldPath: ChatQueryField; value: string }>,
  idToken: string,
): Promise<ChatMessage[]> {
  const fieldFilters = filters.map(({ fieldPath, value }) => ({
    fieldFilter: {
      field: { fieldPath },
      op: "EQUAL",
      value: { stringValue: value },
    },
  }));
  const where = fieldFilters.length === 1
    ? fieldFilters[0]
    : { compositeFilter: { op: "AND", filters: fieldFilters } };

  const rows = await secureFirestoreRequest(`${firestoreRestBase}:runQuery`, idToken, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "chats" }],
        where,
      },
    }),
  });
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row.document)
    .map((row) => chatMessageFromRest(row.document));
}

export async function addMessageToFirestore(message: ChatMessage, idToken: string): Promise<void> {
  await secureFirestoreRequest(`${firestoreRestBase}/chats/${encodeURIComponent(message.id)}`, idToken, {
    method: "PATCH",
    body: JSON.stringify({ fields: firestoreStringFields(message) }),
  });
}

export async function getChatMessages(
  chatId: string,
  participantField: "clientId" | "boutiqueOwnerId",
  participantId: string,
  idToken: string,
): Promise<ChatMessage[]> {
  const items = await querySecureMessages([
    { fieldPath: "chatId", value: chatId },
    { fieldPath: participantField, value: participantId },
  ], idToken);
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getMessagesByClient(clientId: string, idToken: string): Promise<ChatMessage[]> {
  return querySecureMessages([{ fieldPath: "clientId", value: clientId }], idToken);
}

export async function getMessagesByBoutique(boutiqueId: string, ownerId: string, idToken: string): Promise<ChatMessage[]> {
  return querySecureMessages([
    { fieldPath: "boutiqueId", value: boutiqueId },
    { fieldPath: "boutiqueOwnerId", value: ownerId },
  ], idToken);
}
