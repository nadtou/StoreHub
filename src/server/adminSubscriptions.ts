import { getApp as getAdminApp, getApps as getAdminApps, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { Boutique, SubscriptionPayment } from "../types";
import { applyApprovedPayment } from "../utils/subscriptionRules";

/**
 * Écritures d'abonnement effectuées par le serveur lui-même (webhook Chargily),
 * sans jeton utilisateur. Utilise le SDK Admin (service account). Sur Cloud Run
 * / Functions les identifiants sont fournis automatiquement (ADC).
 */

function readProjectId(): string {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (typeof config.projectId !== "string" || !config.projectId.trim()) {
    throw new Error("projectId Firebase absent de la configuration.");
  }
  return config.projectId.trim();
}

function readDatabaseId(): string {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return typeof config.firestoreDatabaseId === "string" && config.firestoreDatabaseId.trim()
      ? config.firestoreDatabaseId.trim()
      : "(default)";
  } catch {
    return "(default)";
  }
}

function adminDb() {
  const adminApp = getAdminApps().length > 0 ? getAdminApp() : initializeAdminApp({ projectId: readProjectId() });
  return getAdminFirestore(adminApp, readDatabaseId());
}

export async function createChargilyPendingPaymentAdmin(payment: SubscriptionPayment): Promise<void> {
  const db = adminDb();
  await db.collection("subscriptionPayments").doc(payment.id).set(payment);
}

/**
 * Active un paiement Chargily à réception du webhook `checkout.paid`.
 * Idempotent : si le paiement est déjà approuvé, ne fait rien.
 */
export async function activateChargilyPaymentAdmin(
  checkoutId: string,
): Promise<{ activated: boolean; boutiqueId?: string }> {
  const db = adminDb();
  const snapshot = await db
    .collection("subscriptionPayments")
    .where("chargilyCheckoutId", "==", checkoutId)
    .limit(1)
    .get();
  if (snapshot.empty) return { activated: false };

  const doc = snapshot.docs[0];
  const payment = doc.data() as SubscriptionPayment;
  if (payment.status === "approved") return { activated: false, boutiqueId: payment.boutiqueId };

  const now = new Date().toISOString();
  const boutiqueRef = db.collection("boutiques").doc(payment.boutiqueId);

  await db.runTransaction(async (tx) => {
    const boutiqueSnap = await tx.get(boutiqueRef);
    if (!boutiqueSnap.exists) throw new Error("Boutique introuvable pour ce paiement Chargily.");
    const boutique = boutiqueSnap.data() as Boutique;
    const { subscription, periodStart, periodEnd } = applyApprovedPayment(boutique.subscription, "chargily", now);

    tx.update(doc.ref, {
      status: "approved",
      reviewedAt: now,
      reviewedBy: "chargily-webhook",
      periodStart,
      periodEnd,
    });
    tx.update(boutiqueRef, { subscription, updatedAt: now });
  });

  return { activated: true, boutiqueId: payment.boutiqueId };
}
