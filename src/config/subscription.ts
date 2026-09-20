import { SUBSCRIPTION_PRICE_DZD } from '../utils/subscriptionRules';

/**
 * Coordonnées de paiement StoreHub affichées à la boutique pour le virement
 * manuel. À REMPLIR avec tes vraies informations (CCP / compte bancaire).
 */
export const STOREHUB_PAYMENT_INFO = {
  priceDzd: SUBSCRIPTION_PRICE_DZD,
  beneficiary: 'IA UNIVER — StoreHub',
  ccpNumber: '0000000000 clé 00',
  ccpKey: '',
  ripBaridiMob: '00799999000000000000',
  bankName: '',
  bankRib: '',
  contactPhone: '+213 000 00 00 00',
  contactEmail: 'iastation198@gmail.com',
  instructions:
    "Effectuez un virement CCP / BaridiMob du montant indiqué, puis envoyez le reçu ci-dessous. L'administration validera votre abonnement sous 24-48h.",
} as const;
