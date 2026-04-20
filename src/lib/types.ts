export type Tier = "free" | "basic" | "pro" | "business";

export const TIER_MONTHLY_LIMITS: Record<Tier, number> = {
  free: 100,
  basic: 1000,
  pro: 10000,
  business: 100000,
};

export const TIER_BATCH_LIMITS: Record<Tier, number> = {
  free: 0,
  basic: 10,
  pro: 50,
  business: 50,
};

export interface Address {
  street: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
}

export interface GleifRecord {
  lei: string;
  legal_name: string;
  country: string;
  jurisdiction: string | null;
  legal_form: string | null;
  entity_status: string;
  registration_status: string;
  next_renewal_date: string | null;
  legal_address: Address;
  headquarters_address: Address;
}

export interface ValidLeiResponse {
  valid: true;
  active: boolean;
  lei: string;
  legal_name: string;
  country: string;
  jurisdiction: string | null;
  entity_status: string;
  registration_status: string;
  next_renewal_date: string | null;
  expires_soon: boolean;
  source: "GLEIF";
  cached: boolean;
  verified_at: string;
}

export interface InvalidLeiResponse {
  valid: false;
  lei: string;
  error_code: "INVALID_FORMAT" | "NOT_FOUND" | "SERVICE_UNAVAILABLE";
  error: string;
}

export type LeiResult = ValidLeiResponse | InvalidLeiResponse;

export interface LeiLookupResponse extends GleifRecord {
  expires_soon: boolean;
  source: "GLEIF";
  cached: boolean;
  verified_at: string;
}
