import crypto from "node:crypto";

/**
 * Client minimal pour Chargily Pay v2 (passerelle algérienne CIB / Edahabia).
 * Activé uniquement si CHARGILY_SECRET_KEY est présent dans l'environnement.
 * Docs: https://dev.chargily.com/pay-v2/introduction
 */

export interface ChargilyConfig {
  secretKey: string;
  mode: "test" | "live";
  baseUrl: string;
}

export function readChargilyConfig(): ChargilyConfig | null {
  const secretKey = process.env.CHARGILY_SECRET_KEY?.trim();
  if (!secretKey) return null;
  const mode = process.env.CHARGILY_MODE?.trim() === "live" ? "live" : "test";
  const baseUrl = mode === "live"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";
  return { secretKey, mode, baseUrl };
}

export interface CreateCheckoutInput {
  amountDzd: number;
  successUrl: string;
  failureUrl: string;
  webhookEndpoint: string;
  metadata: Record<string, string>;
  description?: string;
}

export interface ChargilyCheckout {
  id: string;
  checkoutUrl: string;
}

export async function createChargilyCheckout(
  config: ChargilyConfig,
  input: CreateCheckoutInput,
): Promise<ChargilyCheckout> {
  const response = await fetch(`${config.baseUrl}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.floor(input.amountDzd),
      currency: "dzd",
      success_url: input.successUrl,
      failure_url: input.failureUrl,
      webhook_endpoint: input.webhookEndpoint,
      description: input.description || "Abonnement StoreHub",
      metadata: input.metadata,
    }),
  });
  const payload: any = await response.json().catch(() => null);
  if (!response.ok || !payload?.id || !payload?.checkout_url) {
    const message = payload?.message || payload?.error || "Chargily a refusé la création du paiement.";
    const error: any = new Error(typeof message === "string" ? message : "Erreur Chargily.");
    error.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw error;
  }
  return { id: String(payload.id), checkoutUrl: String(payload.checkout_url) };
}

/**
 * Vérifie la signature du webhook Chargily : HMAC-SHA256 du corps brut avec la
 * clé secrète, comparé au header `signature`.
 */
export function verifyChargilySignature(
  config: ChargilyConfig,
  rawBody: string,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  const computed = crypto.createHmac("sha256", config.secretKey).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  } catch {
    return false;
  }
}
