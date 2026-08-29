/**
 * Third-party providers the platform can talk to, and the credentials each
 * one needs. Kept out of the server-action file because a "use server" module
 * may only export async functions.
 */
export const PROVIDERS = [
  { key: "whatsapp", label: "WhatsApp Business (Meta)", fields: ["endpoint", "token", "sender", "wabaId"] },
  { key: "sms", label: "SMS gateway", fields: ["endpoint", "token", "sender"] },
  { key: "ivr", label: "IVR / call provider", fields: ["endpoint", "token", "number"] },
  { key: "meta_ads", label: "Meta Ads", fields: ["accountId", "token"] },
  { key: "google_ads", label: "Google Ads", fields: ["customerId", "developerToken", "refreshToken"] },
  { key: "payment_gateway", label: "Payment gateway", fields: ["keyId", "keySecret", "webhookSecret"] },
  { key: "google_calendar", label: "Google Calendar", fields: ["clientId", "clientSecret", "refreshToken"] },
  { key: "accounting", label: "Accounting software", fields: ["endpoint", "token"] },
] as const;

export type ProviderKey = (typeof PROVIDERS)[number]["key"];
