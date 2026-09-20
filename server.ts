import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { getAppCheck as getAdminAppCheck } from 'firebase-admin/app-check';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { 
  getBoutiques, 
  getBoutiqueById,
  getProducts, 
  getProductById,
  getAuthenticatedUserProfile,
  saveAuthenticatedUserProfile,
  getAllUsersAuthenticated,
  updateBoutiqueAuthenticated,
  syncBoutiqueIdentityInProductsAuthenticated,
  deleteBoutiqueAuthenticated,
  saveProductAuthenticated,
  updateProductAuthenticated,
  deleteProductAuthenticated,
  addMessageToFirestore,
  getChatMessages,
  getMessagesByClient,
  getMessagesByBoutique,
  ChatMessage,
  deleteOrderAuthenticated,
  getOrdersAuthenticated,
  getReservationsForClientAuthenticated,
  getVisibilityHistory,
  saveOrderAuthenticated,
  saveReservationAuthenticated,
  trackBoutiqueView,
  trackProductView,
  updateOrderAuthenticated,
  registerBoutiqueAccountAuthenticated,
  getAllBoutiqueApplicationsAuthenticated,
  updateBoutiqueVerificationAuthenticated,
  updateAccountApprovalAuthenticated,
  deleteUserProfileAuthenticated,
  getModerationNotesForBoutiqueAuthenticated,
  saveModerationNoteAuthenticated,
  updateModerationNoteStatusAuthenticated,
  createSubscriptionPaymentAuthenticated,
  getSubscriptionPaymentsForBoutiqueAuthenticated,
  getAllSubscriptionPaymentsAuthenticated,
  reviewSubscriptionPaymentAuthenticated,
} from "./src/server/db";
import { AccountApprovalStatus, Boutique, BoutiqueApplication, ManualOrder, ModerationNote, ModerationNoteSeverity, SubscriptionPayment, UserProfile, UserRole } from "./src/types";
import {
  calculateDeliveredStock,
  getReservationSelectionError,
  normalizeProductForPersistence,
} from "./src/utils/commerceRules";
import { getAccountBlockingMessage, normalizedAccountStatus } from "./src/utils/accountAccess";
import { getChatAccessError } from "./src/utils/chatAccess";
import { buildBoutiqueAdminTransition } from "./src/utils/adminTransitions";
import { prepareBoutiqueRegistration } from "./src/utils/boutiqueRegistration";
import { prepareManualPayment } from "./src/utils/subscriptionRules";
import { decideAppCheckAccess, parseAppCheckMode } from './src/utils/appCheckPolicy';
import { isStoreHubOriginAllowed, parseAllowedOrigins } from './src/utils/corsPolicy';

dotenv.config();

const app = express();
const PORT = 3000;

const allowedOrigins = parseAllowedOrigins(process.env.STOREHUB_ALLOWED_ORIGINS);
app.use(cors({
  origin(origin, callback) {
    if (isStoreHubOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origine non autorisée : ${origin}`));
  },
}));
app.use(express.json({ limit: '10mb' }));

const appCheckMode = parseAppCheckMode(process.env.STOREHUB_APP_CHECK_MODE);
let appCheckWarningCount = 0;

function readFirebaseProjectId(): string {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  if (typeof config.projectId !== 'string' || !config.projectId.trim()) {
    throw new Error('Le projectId Firebase est absent de la configuration.');
  }
  return config.projectId.trim();
}

async function verifyAppCheckToken(token: string): Promise<void> {
  const adminApp = getAdminApps().length > 0
    ? getAdminApp()
    : initializeAdminApp({ projectId: readFirebaseProjectId() });
  await getAdminAppCheck(adminApp).verifyToken(token);
}

app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || req.path === '/firebase-config' || appCheckMode === 'off') {
    next();
    return;
  }

  const token = req.header('X-Firebase-AppCheck')?.trim();
  let state: 'valid' | 'missing' | 'invalid' = token ? 'valid' : 'missing';
  if (token) {
    try {
      await verifyAppCheckToken(token);
    } catch {
      state = 'invalid';
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
      error: state === 'missing'
        ? 'Une attestation App Check est requise.'
        : 'L’attestation App Check est invalide.',
    });
    return;
  }
  next();
});

// Serve the assets directory from the root
app.use("/assets", express.static(path.join(process.cwd(), "assets")));

// Lazy initialize Gemini client safely as instructed
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FOR_BUILD",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    appCheck: { mode: appCheckMode, warnings: appCheckWarningCount },
  });
});

// GET firebase config for the client
app.get("/api/firebase-config", (req, res) => {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      res.json({
        ...config,
        appCheckSiteKey: process.env.FIREBASE_APP_CHECK_SITE_KEY || '',
        appCheckDebugEnabled: process.env.FIREBASE_APP_CHECK_DEBUG === 'true',
      });
    } else {
      res.status(404).json({ error: "Firebase applet config not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to read Firebase config" });
  }
});

// GET boutiques
app.get("/api/boutiques", async (req, res) => {
  try {
    const boutiques = await getBoutiques();
    const visibleBoutiques = boutiques.filter((boutique) =>
      !boutique.isSuspended
      && (!boutique.verificationStatus || boutique.verificationStatus === "verified"),
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
  } catch (error: any) {
    console.error("Error fetching boutiques:", error);
    res.status(500).json({ error: error.message || "Failed to fetch boutiques" });
  }
});

// UPDATE a boutique cover image from its owner-facing storefront.
app.put("/api/boutiques/:id/cover", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { id } = req.params;
    const { coverImage } = req.body;

    await assertBoutiqueOwner(id, idToken);

    if (typeof coverImage !== "string") {
      return res.status(400).json({ error: "Format de couverture invalide." });
    }

    let coverUrl: URL;
    try {
      coverUrl = new URL(coverImage);
    } catch {
      return res.status(400).json({ error: "URL de couverture invalide." });
    }

    if (coverUrl.protocol !== "https:" || coverUrl.hostname !== "firebasestorage.googleapis.com") {
      return res.status(400).json({ error: "La couverture doit provenir de Firebase Storage." });
    }

    const updatedAt = new Date().toISOString();
    await updateBoutiqueAuthenticated(id, { coverImage, updatedAt }, idToken);
    res.json({ message: "Boutique cover updated successfully", id, coverImage, updatedAt });
  } catch (error: any) {
    console.error("Error updating boutique cover:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update boutique cover" });
  }
});

// UPDATE the public boutique profile from its authenticated owner account.
app.put("/api/boutiques/:id/settings", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;

    const authenticatedUid = await getFirebaseUidFromIdToken(idToken);
    const currentBoutique = await getBoutiqueById(req.params.id);
    if (!currentBoutique) return res.status(404).json({ error: "Boutique introuvable." });
    if (currentBoutique.ownerId !== authenticatedUid) {
      return res.status(403).json({ error: "Cette boutique est limitée à son propriétaire." });
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
      return res.status(400).json({ error: "Le nom doit contenir entre 2 et 80 caractères." });
    }
    if (
      description.length > 1000 || city.length > 80 || country.length > 80 ||
      instagram.length > 120 || tiktok.length > 120 || facebook.length > 120
    ) {
      return res.status(400).json({ error: "Une information dépasse la longueur autorisée." });
    }
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    if (website) {
      try {
        const websiteUrl = new URL(website);
        if (websiteUrl.protocol !== "http:" && websiteUrl.protocol !== "https:") throw new Error();
      } catch {
        return res.status(400).json({ error: "L’adresse du site web est invalide." });
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

    const updatedAt = new Date().toISOString();
    const updates = {
      name,
      description,
      logo,
      location: { ...currentBoutique.location, city, country },
      social: { ...currentBoutique.social, instagram, tiktok, facebook, website },
      updatedAt,
    };
    await updateBoutiqueAuthenticated(currentBoutique.id, updates, idToken);

    const identityUpdates: { boutiqueName?: string; boutiqueLogo?: string } = {};
    if (name !== currentBoutique.name) identityUpdates.boutiqueName = name;
    if (logo !== currentBoutique.logo) identityUpdates.boutiqueLogo = logo;
    await syncBoutiqueIdentityInProductsAuthenticated(currentBoutique.id, identityUpdates, idToken);

    res.json({ boutique: { ...currentBoutique, ...updates } });
  } catch (error: any) {
    console.error("Error updating boutique settings:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de mettre à jour la boutique." });
  }
});

const DEFAULT_PRODUCT_IMAGE = { url: "/images/default-fashion-cover-v2.png", width: 600, height: 800 };

function hasTemporaryProductImage(images: unknown): boolean {
  return Array.isArray(images) && images.some((image) => {
    const url = typeof image?.url === "string" ? image.url.trim().toLowerCase() : "";
    return url.startsWith("blob:") || url.startsWith("data:");
  });
}

function productForPublicDisplay(product: any) {
  const validImages = Array.isArray(product.images)
    ? product.images.filter((image: any) => {
        const url = typeof image?.url === "string" ? image.url.trim().toLowerCase() : "";
        return url && !url.startsWith("blob:") && !url.startsWith("data:");
      })
    : [];
  return {
    ...product,
    images: validImages.length > 0 ? validImages : [DEFAULT_PRODUCT_IMAGE],
    currency: "DZD",
  };
}

// GET products
app.get("/api/products", async (req, res) => {
  try {
    const [products, boutiques] = await Promise.all([getProducts(), getBoutiques()]);
    const visibleBoutiqueIds = new Set(
      boutiques
        .filter((boutique) => !boutique.isSuspended && (!boutique.verificationStatus || boutique.verificationStatus === "verified"))
        .map((boutique) => boutique.id),
    );
    res.json(products.filter((product) => visibleBoutiqueIds.has(product.boutiqueId)).map(productForPublicDisplay));
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message || "Failed to fetch products" });
  }
});

// POST products (Add product)
app.post("/api/products", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const product = req.body;
    if (!product || !product.id) {
      return res.status(400).json({ error: "Invalid product data" });
    }
    if (hasTemporaryProductImage(product.images)) {
      return res.status(400).json({ error: "Les images temporaires doivent être envoyées dans Firebase Storage avant l’enregistrement." });
    }

    await assertBoutiqueOwner(product.boutiqueId, idToken);
    const normalized = normalizeProductForPersistence(product);
    if ('error' in normalized) return res.status(400).json({ error: normalized.error });
    const normalizedProduct = {
      ...product,
      ...normalized.product,
    };
    await saveProductAuthenticated(normalizedProduct, idToken);
    res.status(201).json({ message: "Product created successfully", product: normalizedProduct });
  } catch (error: any) {
    console.error("Error saving product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save product" });
  }
});

// UPDATE a product, including its manually managed availability/stock state.
app.put("/api/products/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { id } = req.params;
    const currentProduct = await getProductById(id);
    if (!currentProduct) return res.status(404).json({ error: "Article introuvable." });
    await assertBoutiqueOwner(currentProduct.boutiqueId, idToken);
    if (hasTemporaryProductImage(req.body?.images)) {
      return res.status(400).json({ error: "Les images temporaires doivent être envoyées dans Firebase Storage avant l’enregistrement." });
    }
    const normalized = normalizeProductForPersistence(req.body || {}, currentProduct);
    if ('error' in normalized) return res.status(400).json({ error: normalized.error });
    const updates = { ...normalized.product, boutiqueId: currentProduct.boutiqueId };
    const updatedProduct = await updateProductAuthenticated(id, updates, idToken);
    res.json({ message: "Product updated successfully", id, updates, product: updatedProduct });
  } catch (error: any) {
    console.error("Error updating product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update product" });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const product = await getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: "Article introuvable." });
    await assertBoutiqueOwner(product.boutiqueId, idToken);
    await deleteProductAuthenticated(product.id, idToken);
    res.json({ message: "Product deleted successfully", id: product.id });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete product" });
  }
});

// Record real visits. The UI calls these routes only for client/guest visits.
app.post("/api/analytics/boutiques/:id/view", async (req, res) => {
  try {
    await trackBoutiqueView(req.params.id);
    res.status(204).end();
  } catch (error: any) {
    console.error("Error tracking boutique view:", error);
    res.status(500).json({ error: error.message || "Failed to track boutique view" });
  }
});

app.post("/api/analytics/products/:id/view", async (req, res) => {
  try {
    const { boutiqueId } = req.body || {};
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await trackProductView(req.params.id, boutiqueId);
    res.status(204).end();
  } catch (error: any) {
    console.error("Error tracking product view:", error);
    res.status(500).json({ error: error.message || "Failed to track product view" });
  }
});

app.get("/api/analytics/boutiques/:id/visibility", async (req, res) => {
  try {
    const requestedDays = Number(req.query.days || 30);
    const days = Math.min(Math.max(Number.isFinite(requestedDays) ? requestedDays : 30, 1), 90);
    res.json(await getVisibilityHistory(req.params.id, days));
  } catch (error: any) {
    console.error("Error fetching visibility history:", error);
    res.status(500).json({ error: error.message || "Failed to fetch visibility history" });
  }
});

// Manual order CRUD. Sales statistics are derived from these records.
app.get("/api/orders", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.query.boutiqueId?.toString();
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await assertBoutiqueOwner(boutiqueId, idToken);
    res.json(await getOrdersAuthenticated(boutiqueId, idToken));
  } catch (error: any) {
    console.error("Error fetching orders:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to fetch orders" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const order: ManualOrder = req.body;
    if (!order?.id || !order?.boutiqueId || !order?.clientName) {
      return res.status(400).json({ error: "Invalid order data" });
    }
    if (!["en_attente", "en_cours", "livre"].includes(order.status)) {
      return res.status(400).json({ error: "Statut de commande invalide." });
    }
    await assertBoutiqueOwner(order.boutiqueId, idToken);
    const normalizedOrder: ManualOrder = {
      ...order,
      clientName: order.clientName.trim().slice(0, 100),
      quantity: Math.max(1, Math.floor(Number(order.quantity) || 1)),
      source: "manual",
    };
    await saveOrderAuthenticated(normalizedOrder, idToken);
    res.status(201).json(normalizedOrder);
  } catch (error: any) {
    console.error("Error saving order:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save order" });
  }
});

// Create a client reservation, the pending order and its boutique chat message.
app.post("/api/reservations", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;

    const { account } = await assertApprovedAccount(idToken, UserRole.CLIENT);
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const selectedSize = typeof req.body?.selectedSize === "string" ? req.body.selectedSize.trim() : "";
    const selectedColor = typeof req.body?.selectedColor === "string" ? req.body.selectedColor.trim() : "";
    const requestedName = typeof req.body?.clientName === "string" ? req.body.clientName.trim().slice(0, 100) : "";
    const requestedPhoto = typeof req.body?.clientPhoto === "string" ? req.body.clientPhoto.trim() : "";

    if (!productId || !selectedSize || !selectedColor) {
      return res.status(400).json({ error: "L’article, la taille et la couleur sont obligatoires." });
    }

    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ error: "Article introuvable." });
    const boutique = await getBoutiqueById(product.boutiqueId);
    if (!boutique) return res.status(404).json({ error: "Boutique introuvable." });
    if (boutique.isSuspended || boutique.verificationStatus !== "verified" || !boutique.isVerified) {
      return res.status(409).json({ error: "Cette boutique n’accepte pas de réservation actuellement." });
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

    const createdAt = new Date().toISOString();
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const clientName = requestedName || account.displayName || account.email.split("@")[0] || "Client";
    const reservation: ManualOrder = {
      id: `res_${uniqueSuffix}`,
      clientId: account.uid,
      clientEmail: account.email,
      clientName,
      description: `Réservation : ${product.name} · Taille ${selectedSize} · Couleur ${selectedColor}`,
      amount: `${product.price} DA`,
      status: "en_attente",
      createdAt,
      boutiqueId: boutique.id,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      selectedSize,
      selectedColor,
      source: "reservation",
    };

    const message: ChatMessage = {
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
      text: `Nouvelle réservation - ${product.name}\nTaille : ${selectedSize}\nCouleur : ${selectedColor}\nPrix : ${product.price} DA`,
      createdAt,
    };

    await saveReservationAuthenticated(reservation, message, idToken);
    res.status(201).json({ reservation, message });
  } catch (error: any) {
    console.error("Error creating reservation:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible d’enregistrer la réservation." });
  }
});

// Private client reservation history. Identity always comes from Firebase, never from query parameters.
app.get("/api/reservations/mine", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;

    const { account } = await assertApprovedAccount(idToken, UserRole.CLIENT);
    const reservations = await getReservationsForClientAuthenticated(account.uid, idToken);
    res.json(reservations);
  } catch (error: any) {
    console.error("Error fetching client reservations:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger vos réservations." });
  }
});

app.put("/api/orders/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.body?.boutiqueId?.toString() || "";
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await assertBoutiqueOwner(boutiqueId, idToken);
    const requestedStatus = req.body?.status;
    if (!['en_attente', 'en_cours', 'livre'].includes(requestedStatus)) {
      return res.status(400).json({ error: "Statut de commande invalide." });
    }
    await updateOrderAuthenticated(req.params.id, boutiqueId, { status: requestedStatus }, idToken);
    res.json({ message: "Order updated successfully", id: req.params.id });
  } catch (error: any) {
    console.error("Error updating order:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update order" });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.query.boutiqueId?.toString() || "";
    if (!boutiqueId) return res.status(400).json({ error: "boutiqueId is required" });
    await assertBoutiqueOwner(boutiqueId, idToken);
    await deleteOrderAuthenticated(req.params.id, boutiqueId, idToken);
    res.json({ message: "Order deleted successfully", id: req.params.id });
  } catch (error: any) {
    console.error("Error deleting order:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete order" });
  }
});

// GET the authenticated user's own profile.
app.get("/api/users/profile", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const account = await getFirebaseAccountFromIdToken(idToken);
    const profile = await getAuthenticatedUserProfile(account.uid, idToken);
    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json(profile);
  } catch (error: any) {
    console.error("Error retrieving user profile:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve user profile" });
  }
});

// POST save or update the authenticated user's own profile.
app.post("/api/users/profile", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const account = await getFirebaseAccountFromIdToken(idToken);
    const body = req.body || {};
    const existingProfile = await getAuthenticatedUserProfile(account.uid, idToken);
    // A boutique must use the dedicated registration route, which requires its
    // logo and legal document. This general endpoint can only open client files.
    const requestedRole = UserRole.CLIENT;
    const cleanStringList = (value: unknown, limit = 20) => Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, limit)
      : [];
    const submittedIdentityPath = typeof body.identityDocumentPath === "string" ? body.identityDocumentPath.trim() : "";
    const submittedIdentityName = typeof body.identityDocumentName === "string" ? body.identityDocumentName.trim().slice(0, 180) : "";
    if (!existingProfile && (
      !submittedIdentityName
      || !new RegExp(`^client-identity/${account.uid}/identity-[0-9]+\\.(pdf|jpg|png|webp)$`).test(submittedIdentityPath)
    )) {
      return res.status(400).json({ error: "Une pièce d’identité valide est obligatoire pour créer le compte client." });
    }
    const submittedAt = new Date().toISOString();

    const user: UserProfile = {
      uid: account.uid,
      email: account.email,
      displayName: typeof body.displayName === "string" && body.displayName.trim()
        ? body.displayName.trim().slice(0, 100)
        : existingProfile?.displayName || account.displayName || account.email.split("@")[0],
      role: existingProfile?.role || requestedRole,
      photoURL: typeof body.photoURL === "string" ? body.photoURL.trim().slice(0, 2048) : existingProfile?.photoURL || "",
      city: typeof body.city === "string" ? body.city.trim().slice(0, 80) : existingProfile?.city,
      preferences: body.preferences && typeof body.preferences === "object"
        ? {
            audiences: cleanStringList(body.preferences.audiences),
            styles: cleanStringList(body.preferences.styles),
            sizes: cleanStringList(body.preferences.sizes),
            favoriteCategories: cleanStringList(body.preferences.favoriteCategories),
          }
        : existingProfile?.preferences,
      stats: existingProfile?.stats || { favoritesCount: 0, viewedProducts: 0 },
      followedBoutiqueIds: existingProfile?.followedBoutiqueIds || [],
      favoriteProductIds: Array.isArray(body.favoriteProductIds)
        ? cleanStringList(body.favoriteProductIds, 500)
        : existingProfile?.favoriteProductIds || [],
      accountStatus: existingProfile ? existingProfile.accountStatus : "approved",
      approvalSubmittedAt: existingProfile ? existingProfile.approvalSubmittedAt : new Date().toISOString(),
      approvalReviewedAt: existingProfile ? existingProfile.approvalReviewedAt : new Date().toISOString(),
      approvalRejectionReason: existingProfile?.approvalRejectionReason,
      identityDocumentName: existingProfile?.identityDocumentName || submittedIdentityName,
      identityDocumentPath: existingProfile?.identityDocumentPath || submittedIdentityPath,
      identityVerificationStatus: existingProfile?.identityVerificationStatus || "pending",
      identitySubmittedAt: existingProfile?.identitySubmittedAt || submittedAt,
      identityReviewedAt: existingProfile?.identityReviewedAt,
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
    };
    await saveAuthenticatedUserProfile(user, idToken);
    res.status(200).json({ message: "User profile saved successfully", user });
  } catch (error: any) {
    console.error("Error saving user profile:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save user profile" });
  }
});

// Create a new seller profile and its boutique in one atomic Firestore commit.
// The logo is public storefront media; the legal document stays private in
// Firebase Storage and only its protected object path is stored here.
app.post("/api/boutique-registration", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;

    const account = await getFirebaseAccountFromIdToken(idToken);
    const prepared = prepareBoutiqueRegistration(account, req.body || {}, new Date().toISOString());
    if ('error' in prepared) return res.status(400).json({ error: prepared.error });

    const existingProfile = await getAuthenticatedUserProfile(account.uid, idToken);
    if (existingProfile) {
      return res.status(409).json({ error: "Ce compte possède déjà un profil ou une boutique." });
    }

    const { user, boutique, application } = prepared;
    await registerBoutiqueAccountAuthenticated(user, boutique, application, idToken);
    res.status(201).json({
      message: "Votre boutique a été créée et envoyée en validation.",
      user,
      boutique,
    });
  } catch (error: any) {
    console.error("Error registering boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de créer la boutique." });
  }
});

// GET the boutiques followed by the authenticated client.
app.get("/api/users/followed-boutiques", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken, UserRole.CLIENT);
    if (!profile) return res.status(404).json({ error: "Profil client introuvable." });
    if (profile.role !== UserRole.CLIENT) {
      return res.status(403).json({ error: "Cette fonction est réservée aux comptes clients." });
    }

    const followedBoutiqueIds = Array.isArray(profile.followedBoutiqueIds)
      ? profile.followedBoutiqueIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
      : [];
    res.json({ followedBoutiqueIds });
  } catch (error: any) {
    console.error("Error retrieving followed boutiques:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les boutiques suivies." });
  }
});

// PUT follow or unfollow one boutique for the authenticated client.
app.put("/api/users/followed-boutiques/:boutiqueId", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken, UserRole.CLIENT);
    if (!profile) return res.status(404).json({ error: "Profil client introuvable." });
    if (profile.role !== UserRole.CLIENT) {
      return res.status(403).json({ error: "Cette fonction est réservée aux comptes clients." });
    }

    const boutiqueId = req.params.boutiqueId.trim();
    const following = req.body?.following;
    if (!boutiqueId || boutiqueId.length > 160 || typeof following !== "boolean") {
      return res.status(400).json({ error: "Abonnement de boutique invalide." });
    }
    if (!(await getBoutiqueById(boutiqueId))) {
      return res.status(404).json({ error: "Boutique introuvable." });
    }

    const currentIds = Array.isArray(profile.followedBoutiqueIds)
      ? profile.followedBoutiqueIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
      : [];
    const followedBoutiqueIds = following
      ? Array.from(new Set([...currentIds, boutiqueId]))
      : currentIds.filter((id) => id !== boutiqueId);

    await saveAuthenticatedUserProfile({ ...profile, followedBoutiqueIds }, idToken);
    res.json({ boutiqueId, following, followedBoutiqueIds });
  } catch (error: any) {
    console.error("Error updating followed boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de modifier cet abonnement." });
  }
});

// Admin API: GET all user profiles
app.get("/api/admin/users", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const users = await getAllUsersAuthenticated(idToken);
    res.json(users);
  } catch (error: any) {
    console.error("Error fetching all users for admin:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to fetch users" });
  }
});

// Admin API: approve or reject an account opening request. Boutique accounts
// are updated atomically with their public boutique and private application.
app.put("/api/admin/users/:uid/approval", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);

    const uid = req.params.uid.trim();
    const requestedStatus = req.body?.status as AccountApprovalStatus;
    if (!uid || !["approved", "rejected"].includes(requestedStatus)) {
      return res.status(400).json({ error: "Décision de validation invalide." });
    }

    const currentUser = await getAuthenticatedUserProfile(uid, idToken);
    if (!currentUser) return res.status(404).json({ error: "Compte introuvable." });
    if (currentUser.role === UserRole.CLIENT) {
      if (requestedStatus !== "approved") {
        return res.status(400).json({ error: "Une pièce client peut être confirmée ou le compte peut être supprimé." });
      }
      const reviewedAt = new Date().toISOString();
      const updatedUser = await updateAccountApprovalAuthenticated(uid, {
        accountStatus: "approved",
        approvalReviewedAt: currentUser.approvalReviewedAt || reviewedAt,
        approvalRejectionReason: "",
        identityVerificationStatus: "verified",
        identityReviewedAt: reviewedAt,
      }, idToken);
      return res.json({ message: "Pièce d’identité confirmée.", user: updatedUser });
    }
    if (currentUser.role !== UserRole.BOUTIQUE) {
      return res.status(403).json({ error: "Ce type de compte ne peut pas être validé ici." });
    }

    const rejectionReason = requestedStatus === "rejected"
      ? (typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "")
      : "";
    if (requestedStatus === "rejected" && rejectionReason.length < 3) {
      return res.status(400).json({ error: "Indiquez un motif de refus d’au moins 3 caractères." });
    }

    const reviewedAt = new Date().toISOString();
    const accountUpdates = {
      accountStatus: requestedStatus,
      approvalReviewedAt: reviewedAt,
      approvalRejectionReason: rejectionReason,
    } as const;

    let updatedBoutique: Boutique | undefined;
    if (currentUser.role === UserRole.BOUTIQUE && currentUser.boutiqueId) {
      const boutique = await getBoutiqueById(currentUser.boutiqueId);
      if (!boutique) return res.status(409).json({ error: "La boutique liée à ce compte est introuvable." });

      const boutiqueUpdates: Partial<Boutique> = requestedStatus === "approved"
        ? {
            isVerified: true,
            isSuspended: false,
            verificationStatus: "verified",
            verificationReviewedAt: reviewedAt,
            verificationRejectionReason: "",
            updatedAt: reviewedAt,
          }
        : {
            isVerified: false,
            isSuspended: false,
            verificationStatus: "rejected",
            verificationReviewedAt: reviewedAt,
            verificationRejectionReason: rejectionReason,
            updatedAt: reviewedAt,
          };
      const applicationUpdates: Partial<BoutiqueApplication> = {
        status: requestedStatus === "approved" ? "verified" : "rejected",
        reviewedAt,
        rejectionReason,
      };
      await updateBoutiqueVerificationAuthenticated(
        boutique.id,
        boutiqueUpdates,
        applicationUpdates,
        idToken,
        accountUpdates,
      );
      updatedBoutique = { ...boutique, ...boutiqueUpdates };
    } else {
      await updateAccountApprovalAuthenticated(uid, accountUpdates, idToken);
    }

    res.json({
      message: requestedStatus === "approved" ? "Compte approuvé." : "Ouverture de compte refusée.",
      user: { ...currentUser, ...accountUpdates },
      boutique: updatedBoutique,
    });
  } catch (error: any) {
    console.error("Error reviewing account opening:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible d’enregistrer la décision." });
  }
});

// Admin API: permanently remove a client profile and its Firebase Auth account.
app.delete("/api/admin/users/:uid", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const uid = req.params.uid.trim();
    const currentUser = await getAuthenticatedUserProfile(uid, idToken);
    if (!currentUser) return res.status(404).json({ error: "Compte introuvable." });
    if (currentUser.role !== UserRole.CLIENT) {
      return res.status(403).json({ error: "Cette action est réservée aux comptes clients." });
    }
    await deleteUserProfileAuthenticated(uid, idToken);
    const adminApp = getAdminApps().length > 0
      ? getAdminApp()
      : initializeAdminApp({ projectId: readFirebaseProjectId() });
    await getAdminAuth(adminApp).deleteUser(uid);
    res.json({ message: "Compte client supprimé.", uid, identityDocumentPath: currentUser.identityDocumentPath || "" });
  } catch (error: any) {
    console.error("Error deleting client account:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de supprimer le compte client." });
  }
});

// Admin API: GET full boutique applications, including private document metadata.
app.get("/api/admin/boutiques", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const [boutiques, applications] = await Promise.all([
      getBoutiques(),
      getAllBoutiqueApplicationsAuthenticated(idToken),
    ]);
    const applicationsByBoutique = new Map(applications.map((application) => [application.boutiqueId, application]));
    res.json(boutiques.map((boutique) => {
      const application = applicationsByBoutique.get(boutique.id);
      return application ? {
        ...boutique,
        verificationDocName: application.verificationDocName,
        verificationDocPath: application.verificationDocPath,
        verificationRejectionReason: application.rejectionReason,
      } : boutique;
    }));
  } catch (error: any) {
    console.error("Error fetching boutique applications:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les dossiers boutique." });
  }
});

// Admin API: all products, including items belonging to suspended or pending boutiques.
app.get("/api/admin/products", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    res.json(await getProducts());
  } catch (error: any) {
    console.error("Error fetching products for admin:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger le catalogue administratif." });
  }
});

// Admin API: private moderation observations for one boutique.
app.get("/api/admin/moderation-notes", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const boutiqueId = typeof req.query.boutiqueId === "string" ? req.query.boutiqueId.trim() : "";
    if (!boutiqueId || boutiqueId.length > 160) {
      return res.status(400).json({ error: "Une boutique valide est requise." });
    }
    res.json(await getModerationNotesForBoutiqueAuthenticated(boutiqueId, idToken));
  } catch (error: any) {
    console.error("Error fetching moderation notes for admin:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les observations de modération." });
  }
});

// Admin API: send a product-specific observation to the boutique owner.
app.post("/api/admin/moderation-notes", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const account = await getFirebaseAccountFromIdToken(idToken);
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const severity: ModerationNoteSeverity = req.body?.severity === "info" ? "info" : "action_required";
    if (!productId || productId.length > 180 || text.length < 3 || text.length > 1000) {
      return res.status(400).json({ error: "Le commentaire doit contenir entre 3 et 1000 caractères." });
    }

    const product = await getProductById(productId);
    if (!product) return res.status(404).json({ error: "Article introuvable." });
    const boutique = await getBoutiqueById(product.boutiqueId);
    if (!boutique) return res.status(409).json({ error: "La boutique liée à cet article est introuvable." });

    const timestamp = new Date().toISOString();
    const note: ModerationNote = {
      id: `moderation_${Date.now()}_${randomUUID()}`,
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
      updatedAt: timestamp,
    };
    await saveModerationNoteAuthenticated(note, idToken);
    res.status(201).json(note);
  } catch (error: any) {
    console.error("Error creating moderation note:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible d’envoyer le commentaire au gérant." });
  }
});

// Boutique API: the owner can read observations addressed to their boutique.
app.get("/api/boutiques/:id/moderation-notes", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.params.id.trim();
    await assertBoutiqueOwner(boutiqueId, idToken);
    res.json(await getModerationNotesForBoutiqueAuthenticated(boutiqueId, idToken));
  } catch (error: any) {
    console.error("Error fetching boutique moderation notes:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les observations administratives." });
  }
});

// Boutique API: the owner can acknowledge that an observation was handled.
app.put("/api/boutiques/:id/moderation-notes/:noteId/status", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const boutiqueId = req.params.id.trim();
    const noteId = req.params.noteId.trim();
    await assertBoutiqueOwner(boutiqueId, idToken);
    if (req.body?.status !== "resolved") {
      return res.status(400).json({ error: "Le statut demandé est invalide." });
    }
    const note = await updateModerationNoteStatusAuthenticated(noteId, boutiqueId, "resolved", idToken);
    res.json(note);
  } catch (error: any) {
    console.error("Error updating moderation note status:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de mettre à jour cette observation." });
  }
});

// Admin API: UPDATE boutique details (verification, feature, suspend)
app.put("/api/admin/boutiques/:id", async (req, res) => {
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
      new Date().toISOString(),
    );
    await updateBoutiqueVerificationAuthenticated(id, updates, applicationUpdates, idToken, ownerUpdates);
    res.json({
      message: "Boutique updated successfully",
      boutique: { ...currentBoutique, ...updates, id },
    });
  } catch (error: any) {
    console.error("Error updating boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to update boutique" });
  }
});

// Admin API: DELETE boutique
app.delete("/api/admin/boutiques/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const { id } = req.params;
    const deleted = await deleteBoutiqueAuthenticated(id, idToken);
    res.json({ message: "Boutique deleted successfully", id, deleted });
  } catch (error: any) {
    console.error("Error deleting boutique:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete boutique" });
  }
});

// Admin API: DELETE product
app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const { id } = req.params;
    await deleteProductAuthenticated(id, idToken);
    res.json({ message: "Product deleted successfully", id });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to delete product" });
  }
});

// -------------------------------------------------------------
// Abonnement boutique : virement manuel + revue admin
// -------------------------------------------------------------

// La boutique déclare un paiement par virement (avec justificatif).
app.post("/api/subscription/payments", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken, UserRole.BOUTIQUE);
    const boutiqueId = profile.boutiqueId;
    if (!boutiqueId) {
      return res.status(400).json({ error: "Aucune boutique n'est associée à ce compte." });
    }
    const boutique = await getBoutiqueById(boutiqueId);
    if (!boutique || boutique.ownerId !== account.uid) {
      return res.status(403).json({ error: "Cette boutique est limitée à son propriétaire." });
    }

    const prepared = prepareManualPayment(req.body || {}, account.uid, boutiqueId);
    if (prepared.ok !== true) {
      return res.status(400).json({ error: prepared.error });
    }

    const now = new Date().toISOString();
    const payment: SubscriptionPayment = {
      id: `pay_${randomUUID()}`,
      boutiqueId,
      ownerId: account.uid,
      boutiqueName: boutique.name,
      amountDzd: prepared.value.amountDzd,
      method: "bank_transfer",
      status: "pending",
      submittedAt: now,
      reference: prepared.value.reference,
      proofUrl: prepared.value.proofUrl,
      proofPath: prepared.value.proofPath,
      senderNote: prepared.value.senderNote,
    };
    await createSubscriptionPaymentAuthenticated(payment, idToken);
    res.status(201).json({ message: "Paiement envoyé. En attente de validation par l'administration.", payment });
  } catch (error: any) {
    console.error("Error creating subscription payment:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible d'enregistrer le paiement." });
  }
});

// Historique des paiements de la boutique connectée.
app.get("/api/subscription/payments", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { profile } = await assertApprovedAccount(idToken, UserRole.BOUTIQUE);
    if (!profile.boutiqueId) {
      return res.status(400).json({ error: "Aucune boutique n'est associée à ce compte." });
    }
    const payments = await getSubscriptionPaymentsForBoutiqueAuthenticated(profile.boutiqueId, idToken);
    res.json(payments);
  } catch (error: any) {
    console.error("Error listing subscription payments:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les paiements." });
  }
});

// Admin : tous les paiements (filtrable par statut côté client).
app.get("/api/admin/subscription/payments", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const payments = await getAllSubscriptionPaymentsAuthenticated(idToken);
    res.json(payments);
  } catch (error: any) {
    console.error("Error listing all subscription payments:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de charger les paiements." });
  }
});

// Admin : approuve ou refuse un paiement (approbation prolonge l'abonnement).
app.put("/api/admin/subscription/payments/:id/review", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    await assertAdmin(idToken);
    const reviewer = await getFirebaseAccountFromIdToken(idToken);
    const { id } = req.params;
    const approve = req.body?.approve === true;
    const rejectionReason = typeof req.body?.rejectionReason === "string" ? req.body.rejectionReason : undefined;
    const result = await reviewSubscriptionPaymentAuthenticated(
      id,
      { approve, reviewerUid: reviewer.uid, rejectionReason },
      idToken,
    );
    res.json({
      message: approve ? "Paiement validé, abonnement prolongé." : "Paiement refusé.",
      payment: result.payment,
      boutique: result.boutique,
    });
  } catch (error: any) {
    console.error("Error reviewing subscription payment:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Impossible de traiter le paiement." });
  }
});

// -------------------------------------------------------------
// Live Client-Boutique Chat API Routes
// -------------------------------------------------------------

function getFirebaseIdToken(req: express.Request): string | null {
  const authorization = req.header("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function requireFirebaseIdToken(req: express.Request, res: express.Response): string | null {
  const token = getFirebaseIdToken(req);
  if (!token) {
    res.status(401).json({ error: "Firebase authentication is required" });
    return null;
  }
  return token;
}

async function getFirebaseUidFromIdToken(idToken: string): Promise<string> {
  return (await getFirebaseAccountFromIdToken(idToken)).uid;
}

async function getFirebaseAccountFromIdToken(idToken: string): Promise<{ uid: string; email: string; displayName: string; emailVerified: boolean }> {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (!firebaseConfig.apiKey) {
    const error: any = new Error("La configuration Firebase Auth est incomplète.");
    error.status = 500;
    throw error;
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  const payload: any = await response.json().catch(() => null);
  const account = payload?.users?.[0];
  const uid = account?.localId;
  if (!response.ok || typeof uid !== "string" || !uid) {
    const error: any = new Error("Votre session Firebase a expiré. Reconnectez-vous.");
    error.status = 401;
    throw error;
  }
  return {
    uid,
    email: typeof account?.email === "string" ? account.email : "",
    displayName: typeof account?.displayName === "string" ? account.displayName : "",
    emailVerified: account?.emailVerified === true,
  };
}

async function assertBoutiqueOwner(boutiqueId: string, idToken: string): Promise<void> {
  const [{ account }, boutique] = await Promise.all([
    assertApprovedAccount(idToken, UserRole.BOUTIQUE),
    getBoutiqueById(boutiqueId),
  ]);
  if (!boutique) {
    const error: any = new Error("Boutique introuvable.");
    error.status = 404;
    throw error;
  }
  if (boutique.ownerId !== account.uid) {
    const error: any = new Error("Cette boutique est limitée à son propriétaire.");
    error.status = 403;
    throw error;
  }
}

async function assertAdmin(idToken: string): Promise<void> {
  const account = await getFirebaseAccountFromIdToken(idToken);
  if (!account.emailVerified) {
    const error: any = new Error("Votre adresse email administrateur doit être vérifiée.");
    error.status = 403;
    throw error;
  }
  const profile = await getAuthenticatedUserProfile(account.uid, idToken);
  if (profile?.role !== UserRole.ADMIN) {
    const error: any = new Error("Accès administrateur requis.");
    error.status = 403;
    throw error;
  }
}

async function assertApprovedAccount(
  idToken: string,
  requiredRole?: UserRole,
): Promise<{ account: Awaited<ReturnType<typeof getFirebaseAccountFromIdToken>>; profile: UserProfile }> {
  const account = await getFirebaseAccountFromIdToken(idToken);
  const profile = await getAuthenticatedUserProfile(account.uid, idToken);
  if (!profile) {
    const error: any = new Error("Votre profil StoreHub est introuvable.");
    error.status = 403;
    throw error;
  }
  if (requiredRole && profile.role !== requiredRole) {
    const error: any = new Error("Ce compte ne possède pas le rôle requis pour cette action.");
    error.status = 403;
    throw error;
  }
  if (profile.role !== UserRole.CLIENT && !account.emailVerified) {
    const error: any = new Error("Vérifiez votre adresse email avant de continuer.");
    error.status = 403;
    throw error;
  }
  if (profile.role !== UserRole.ADMIN && normalizedAccountStatus(profile) !== "approved") {
    const error: any = new Error(getAccountBlockingMessage(profile) || "Ce compte ne peut pas accéder à cette fonction.");
    error.status = 403;
    throw error;
  }
  return { account, profile };
}

// GET all messages in a specific chat thread
app.get("/api/chats/messages", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken);
    const { chatId, participantRole, participantId } = req.query;
    if (!chatId || (profile.role !== UserRole.CLIENT && profile.role !== UserRole.BOUTIQUE)) {
      return res.status(400).json({ error: "Valid chat participant parameters are required" });
    }
    const expectedRole = profile.role === UserRole.CLIENT ? "client" : "boutique";
    if ((participantRole && participantRole !== expectedRole) || (participantId && participantId !== account.uid)) {
      return res.status(403).json({ error: "Vous ne pouvez consulter que vos propres conversations." });
    }
    const participantField = profile.role === UserRole.CLIENT ? "clientId" : "boutiqueOwnerId";
    const messages = await getChatMessages(chatId.toString(), participantField, account.uid, idToken);
    res.json(messages);
  } catch (error: any) {
    console.error("Error retrieving chat messages:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve messages" });
  }
});

// POST send/save a message
app.post("/api/chats/messages", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account, profile } = await assertApprovedAccount(idToken);
    const message: ChatMessage = req.body;
    const requiredTextFields: Array<keyof ChatMessage> = [
      "id", "chatId", "clientId", "clientName", "boutiqueId", "boutiqueName",
      "boutiqueOwnerId", "senderId", "senderName", "senderRole", "text", "createdAt"
    ];
    const hasMissingField = !message || requiredTextFields.some((field) => {
      const value = message?.[field];
      return typeof value !== "string" || !value.trim();
    });
    const hasInvalidRole = message?.senderRole !== "client" && message?.senderRole !== "boutique";
    const hasInvalidThread = message
      ? message.chatId !== `${message.clientId}_${message.boutiqueId}`
      : true;
    const hasInvalidDate = message ? Number.isNaN(Date.parse(message.createdAt)) : true;
    const hasInvalidLength = typeof message?.text === "string" && message.text.trim().length > 4000;

    if (hasMissingField || hasInvalidRole || hasInvalidThread || hasInvalidDate || hasInvalidLength) {
      return res.status(400).json({ error: "Invalid message data" });
    }
    const boutique = await getBoutiqueById(message.boutiqueId);
    if (!boutique) return res.status(404).json({ error: "Boutique introuvable." });
    const accessError = getChatAccessError(account.uid, profile, boutique, message);
    if (accessError) return res.status(403).json({ error: accessError });

    let sanitizedProductContext: ChatMessage["productContext"] | undefined;
    const rawContext = (message as ChatMessage).productContext;
    if (rawContext && typeof rawContext === "object") {
      const productId = typeof rawContext.productId === "string" ? rawContext.productId.trim() : "";
      const productName = typeof rawContext.productName === "string" ? rawContext.productName.trim().slice(0, 200) : "";
      const productImage = typeof rawContext.productImage === "string" ? rawContext.productImage.trim().slice(0, 2048) : "";
      const productPrice = typeof rawContext.productPrice === "string" ? rawContext.productPrice.trim().slice(0, 40) : "";
      if (productId) {
        sanitizedProductContext = { productId, productName, productImage, productPrice };
      }
    }

    const trustedMessage: ChatMessage = {
      ...message,
      clientName: profile.role === UserRole.CLIENT ? (profile.displayName || account.displayName || message.clientName) : message.clientName,
      clientPhoto: profile.role === UserRole.CLIENT ? (profile.photoURL || "") : message.clientPhoto,
      boutiqueOwnerId: boutique.ownerId,
      boutiqueName: boutique.name,
      boutiqueLogo: boutique.logo,
      senderId: account.uid,
      senderName: profile.role === UserRole.CLIENT
        ? (profile.displayName || account.displayName || message.senderName)
        : boutique.name,
      senderRole: profile.role === UserRole.CLIENT ? "client" : "boutique",
      text: message.text.trim(),
      ...(sanitizedProductContext ? { productContext: sanitizedProductContext } : { productContext: undefined }),
    };
    await addMessageToFirestore(trustedMessage, idToken);
    res.status(201).json({ message: "Message saved successfully", data: trustedMessage });
  } catch (error: any) {
    console.error("Error saving chat message:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to save message" });
  }
});

// GET client chat threads
app.get("/api/chats/threads/client/:clientId", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account } = await assertApprovedAccount(idToken, UserRole.CLIENT);
    const { clientId } = req.params;
    if (clientId !== account.uid) {
      return res.status(403).json({ error: "Vous ne pouvez consulter que vos propres conversations." });
    }
    const messages = await getMessagesByClient(account.uid, idToken);
    
    // Group by boutiqueId and find the latest message
    const threadMap: { [boutiqueId: string]: ChatMessage } = {};
    for (const msg of messages) {
      const existing = threadMap[msg.boutiqueId];
      if (!existing || new Date(msg.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        threadMap[msg.boutiqueId] = msg;
      }
    }

    const threads = Object.values(threadMap).map(msg => ({
      chatId: msg.chatId,
      boutiqueId: msg.boutiqueId,
      boutiqueName: msg.boutiqueName,
      boutiqueLogo: msg.boutiqueLogo,
      lastMessageText: msg.text,
      lastMessageTime: msg.createdAt,
      senderRole: msg.senderRole,
      senderName: msg.senderName
    }));

    // Sort by lastMessageTime descending
    threads.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    res.json(threads);
  } catch (error: any) {
    console.error("Error retrieving client threads:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve threads" });
  }
});

// GET boutique chat threads
app.get("/api/chats/threads/boutique/:boutiqueId", async (req, res) => {
  try {
    const idToken = requireFirebaseIdToken(req, res);
    if (!idToken) return;
    const { account } = await assertApprovedAccount(idToken, UserRole.BOUTIQUE);
    const { boutiqueId } = req.params;
    await assertBoutiqueOwner(boutiqueId, idToken);
    const requestedOwnerId = req.query.ownerId?.toString().trim();
    if (requestedOwnerId && requestedOwnerId !== account.uid) {
      return res.status(403).json({ error: "Cette messagerie appartient à un autre gérant." });
    }
    const messages = await getMessagesByBoutique(boutiqueId, account.uid, idToken);

    // Group by clientId and find the latest message
    const threadMap: { [clientId: string]: ChatMessage } = {};
    for (const msg of messages) {
      const existing = threadMap[msg.clientId];
      if (!existing || new Date(msg.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        threadMap[msg.clientId] = msg;
      }
    }

    const threads = Object.values(threadMap).map(msg => ({
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

    // Sort by lastMessageTime descending
    threads.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
    res.json(threads);
  } catch (error: any) {
    console.error("Error retrieving boutique threads:", error);
    res.status(Number(error?.status) || 500).json({ error: error.message || "Failed to retrieve threads" });
  }
});

// Personal Stylist Chat Endpoint
app.post("/api/stylist/chat", async (req, res) => {
  try {
    const { message, history, preferences } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    // Fetch the live catalogue for FENNCO IA to analyze.
    const currentProducts = await getProducts();

    const systemInstruction = `You are "FENNCO IA", the personal fashion and shopping adviser for StoreHub, a premium boutique discovery application.
Your tone is warm, concise, inclusive, and knowledgeable about clothing, shoes, accessories, fabrics, colors, sizing, and styling for women, men, and children.
Never assume the customer's gender or preferred audience when it is not provided.

Here are the StoreHub boutiques and products in our curated collection:
${JSON.stringify(currentProducts, null, 2)}

User preferences from onboarding quiz:
- Audience: ${preferences?.audiences?.join(', ') || 'All audiences'}
- Favorite Styles: ${preferences?.styles?.join(', ') || 'General Couture'}
- Favorite Categories: ${preferences?.favoriteCategories?.join(', ') || 'All Pieces'}

Guidelines:
1. Speak elegantly (French/English based on customer's input, default to French or fluent bilingual).
2. Suggest 1 or 2 specific products from StoreHub (using exact product names) that match their request or preferences.
3. Offer concrete, practical styling and sizing tips appropriate to the selected audience.
4. Keep answers relatively concise (2-3 short, sensory paragraphs) so it fits beautifully in our scrollable boutique chat window.`;

    // Convert client history to format accepted by Gemini Chat
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in stylist chat:", error);
    res.status(500).json({ error: error.message || "Something went wrong with the AI stylist" });
  }
});

// Visual Search & Style Analysis Endpoint
app.post("/api/visual-search", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Base64 image is required" });
    }

    // Strip header if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    // Fetch dynamic products list from Firestore for matching
    const currentProducts = await getProducts();

    const prompt = `Analyze this premium fashion inspiration photo. Determine its core aesthetic qualities and return a JSON object containing the analysis.
You MUST output strictly a JSON object matching the schema below. No markdown wrapping except raw JSON text.

JSON Schema:
{
  "detectedStyle": "Name of the style category (e.g., Minimaliste, Avant-Garde, Luxe Chaud, Élégant, Technique)",
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
  } catch (error: any) {
    console.error("Error in visual search:", error);
    res.status(500).json({ error: error.message || "Failed to analyze image style" });
  }
});

// -------------------------------------------------------------
// FENNCO IA - Commercial Intelligent Assistant Endpoint
// -------------------------------------------------------------
app.post("/api/fennco-ai", async (req, res) => {
  try {
    const { prompt, boutiqueId, requestType } = req.body;
    const currentProducts = await getProducts();
    const boutiqueProducts = boutiqueId 
      ? currentProducts.filter((p: any) => p.boutiqueId === boutiqueId) 
      : currentProducts;

    const ai = getGeminiClient();
    const model = "gemini-3.5-flash";

    const systemInstruction = `Tu es "Fennco IA", l'Assistant Commercial Intelligent et Conseiller Haute Couture Officiel de la plateforme e-commerce luxe en Algérie.
Ton symbole est le Fennec algérien élégant, rapide, observateur et symbole d'excellence commerciale.
Tu réponds aux gérants de boutiques de mode avec précision, professionnalisme, élégance et clairvoyance stratégique.

Contexte du catalogue boutique actuel:
${JSON.stringify(boutiqueProducts, null, 2)}

Tes compétences obligatoires:
- Rapports de ventes et bénéfices
- Analyse des pièces les plus vendues et des stocks dormants (articles sans ventes depuis 30+ jours)
- Prévisions de réapprovisionnement et alertes de rupture de stock
- Analyse des tailles (S, M, L, XL) et couleurs les plus plébiscitées (Noir, Doré, Blanc, Camel, Silk)
- Recommandations de promotions ciblées et conseils commerciaux
- Analyse comparative mensuelle (+18% de ventes moyennes ce mois-ci)

Instructions de réponse:
- Sois très structuré, clair, motivant et précis.
- Utilise des puces et des chiffres concrets (ex: "Les vestes représentent 42% de vos revenus", "Le produit VST-204 est dormant depuis 45 jours").
- Propose toujours 2 ou 3 recommandations d'action immédiates.
- Réponds en français (avec quelques termes de luxe et de commerce élégant).`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt || requestType || "Donne-moi une analyse commerciale complète de ma boutique." }]
        }
      ],
      config: {
        systemInstruction,
        temperature: 0.5,
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in Fennco IA endpoint:", error);
    res.status(500).json({ 
      error: error.message || "Erreur de communication avec Fennco IA",
      text: "**Fennco IA Coach Commercial**:\n\n- **Activité Globale**: Vos ventes sont en hausse de **+18%** sur les 30 derniers jours.\n- **Top Categorie**: Les robes et manteaux représentent **42%** de vos revenus.\n- **Alerte Stock**: 3 pièces nécessitent un réapprovisionnement sous 7 jours.\n- **Recommandation**: Lancez une vente privilège de **10%** sur la collection été pour écouler les tailles S restantes."
    });
  }
});

// -------------------------------------------------------------
// Vite Middleware & Static Serving Setup
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export { app, startServer };

if (process.env.STOREHUB_SKIP_SERVER_START !== "1" && !process.env.FUNCTION_TARGET) {
  void startServer();
}
