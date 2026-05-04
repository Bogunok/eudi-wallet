export type VerifiableCredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'DELETED';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VerifiableCredential {
  id: string;
  type: string[];
  issuerDid: string;
  subjectDid: string;
  payload: Record<string, unknown>;
  rawJwt: string;
  status: VerifiableCredentialStatus;
  issuedAt: string;
  expiresAt: string | null;
  userId: string;
  organizationId: string | null;
  createdAt: string;
}

export interface Organization {
  id: string;
  lei: string;
  name: string;
  country: string;
  userId: string;
  createdAt: string;
}

export interface TrustedIssuer {
  id: string;
  name: string;
  lei: string;
}

export interface DidDocument {
  id: string;
  did: string;
  method: string;
  keyId: string | null;
  publicKey: unknown;
  userId: string;
  createdAt: string;
  deactivatedAt: string | null;
}

export interface JsonSchemaStructure {
  type?: 'object';
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface JsonSchemaProperty {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  format?: string; // 'date', 'date-time', 'email'
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  description?: string;
  items?: JsonSchemaProperty;
  enum?: string[];
}

export interface AvailableSchema {
  id: string;
  name: string;
  schemaId: string;
  structure: JsonSchemaStructure;
  issuerId: string;
  issuer: {
    id: string;
    email: string;
    organizations: Array<{ name: string; lei: string }>;
  };
}

export function getIssuerDisplayName(schema: AvailableSchema): string {
  return schema.issuer.organizations[0]?.name ?? schema.issuer.email;
}

export function getIssuerLei(schema: AvailableSchema): string | null {
  return schema.issuer.organizations[0]?.lei ?? null;
}
