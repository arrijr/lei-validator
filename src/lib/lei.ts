import type { Address, GleifRecord } from "./types";

const GLEIF_BASE = process.env.GLEIF_API_ENDPOINT || "https://api.gleif.org/api/v1";
const GLEIF_TIMEOUT = 5000;

export class NotFoundError extends Error {
  constructor() {
    super("LEI not found in GLEIF database");
    this.name = "NotFoundError";
  }
}

export class ServiceUnavailableError extends Error {
  constructor(cause?: string) {
    super(cause || "GLEIF database temporarily unavailable");
    this.name = "ServiceUnavailableError";
  }
}

export function normalizeLei(lei: string): string {
  return lei.replace(/\s/g, "").toUpperCase();
}

export function validateLeiFormat(lei: string): boolean {
  return /^[A-Z0-9]{20}$/.test(lei);
}

export function isExpiringSoon(nextRenewalDate: string | null): boolean {
  if (!nextRenewalDate) return false;
  const renewal = new Date(nextRenewalDate);
  const now = new Date();
  const diffMs = renewal.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays < 90;
}

export function isActive(entityStatus: string, registrationStatus: string): boolean {
  return entityStatus === "ACTIVE" && registrationStatus === "ISSUED";
}

function parseAddress(addr: Record<string, unknown> | null | undefined): Address {
  if (!addr) {
    return { street: null, city: null, region: null, postal_code: null, country: "" };
  }
  const lines = addr.addressLines;
  const street = Array.isArray(lines) && lines.length > 0 ? lines.join(", ") : null;
  return {
    street,
    city: (addr.city as string) || null,
    region: (addr.region as string) || null,
    postal_code: (addr.postalCode as string) || null,
    country: (addr.country as string) || "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGleifResponse(data: any): GleifRecord {
  const attrs = data.attributes;
  const entity = attrs.entity;
  const registration = attrs.registration;

  const legalName =
    typeof entity.legalName === "object"
      ? (entity.legalName.name as string)
      : (entity.legalName as string);

  const legalForm = entity.legalForm
    ? ((entity.legalForm.other || entity.legalForm.id) as string | null)
    : null;

  const nextRenewalDate = registration.nextRenewalDate
    ? (registration.nextRenewalDate as string).split("T")[0]
    : null;

  return {
    lei: attrs.lei as string,
    legal_name: legalName,
    country: parseAddress(entity.legalAddress).country,
    jurisdiction: (entity.jurisdiction as string) || null,
    legal_form: legalForm,
    entity_status: entity.status as string,
    registration_status: registration.status as string,
    next_renewal_date: nextRenewalDate,
    legal_address: parseAddress(entity.legalAddress),
    headquarters_address: parseAddress(entity.headquartersAddress),
  };
}

export async function fetchGleif(lei: string): Promise<GleifRecord> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GLEIF_TIMEOUT);

  try {
    const res = await fetch(`${GLEIF_BASE}/lei-records/${lei}`, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.api+json" },
    });

    if (res.status === 404) throw new NotFoundError();
    if (!res.ok) throw new ServiceUnavailableError(`GLEIF responded with ${res.status}`);

    const json = await res.json();
    return normalizeGleifResponse(json.data);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err instanceof ServiceUnavailableError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new ServiceUnavailableError("GLEIF request timed out");
    }
    throw new ServiceUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}
