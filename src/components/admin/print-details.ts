import type { PrintDocument } from "@/components/admin/PrintableDocument";
import type { Settings } from "@/lib/queries";

type ContactLike = { name: string; email: string; phone: string; whatsapp: string; isPrimary: boolean };

type ClientLike = {
  name: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  gstin: string;
  contacts?: ContactLike[];
};

/**
 * Shapes a client for a printed document. Mobile and email live on the
 * client's contacts rather than the company row, so the primary contact is
 * used and any contact that carries the detail fills the gap.
 */
export function clientForPrint(client: ClientLike): PrintDocument["client"] {
  const contacts = client.contacts ?? [];
  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];

  return {
    name: client.name,
    address: [client.addressLine, client.city, client.state, client.postalCode].filter(Boolean).join(", "),
    gstin: client.gstin,
    contactName: primary?.name ?? "",
    email: primary?.email || contacts.find((c) => c.email)?.email || "",
    phone:
      primary?.phone ||
      primary?.whatsapp ||
      contacts.find((c) => c.phone)?.phone ||
      contacts.find((c) => c.whatsapp)?.whatsapp ||
      "",
  };
}

/** The owner's own details, read live from settings on every render. */
export function agencyForPrint(settings: Settings): PrintDocument["agency"] {
  return {
    name: settings.siteName,
    address: [settings.addressLine, settings.city, settings.state, settings.postalCode].filter(Boolean).join(", "),
    email: settings.email,
    phone: settings.phone,
    logo: settings.logoLight,
    gstin: settings.gstin,
    pan: settings.pan,
    // Only falls back once there is an actual account to name, so an agency
    // that has filled in nothing gets no payment block at all.
    bankAccountName: settings.bankAccountName || (settings.bankAccountNumber ? settings.siteName : ""),
    bankName: settings.bankName,
    bankAccountNumber: settings.bankAccountNumber,
    bankIfsc: settings.bankIfsc,
    bankBranch: settings.bankBranch,
    upiId: settings.upiId,
    upiQr: settings.upiQr,
    paymentNote: settings.paymentNote,
  };
}
