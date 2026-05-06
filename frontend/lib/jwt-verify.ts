import { importJWK, jwtVerify } from 'jose';

export interface VerificationResult {
  valid: boolean;
  issuerDid: string | null;
  keyId: string | null;
  algorithm: string | null;
  error: string | null;
}

/**
 * verifies SD-JWT token signature.
 *
 * Algorithm:
 * 1. Parse JWT header → extract iss (DID) and kid
 * 2. Resolve DID via GET /did/resolve/:did
 * 3. Extract publicKeyJwk from verificationMethod
 * 4. jose.importJWK + jose.jwtVerify → signature verification
 *
 * @param rawJwt - full SD-JWT string (signedJwt~disclosure1~disclosure2~)
 * @param apiBaseUrl - base URL of the backend (e.g., http://localhost:3000)
 */
export async function verifySDJwtSignature(
  rawJwt: string,
  apiBaseUrl: string,
): Promise<VerificationResult> {
  // Беремо тільки підписану частину (до першого ~)
  const signedJwt = rawJwt.split('~')[0];

  // Парсимо JWT header (перша частина до першої крапки)
  let header: { alg?: string; kid?: string; iss?: string; typ?: string };
  try {
    const headerB64 = signedJwt.split('.')[0];
    const headerJson = base64urlDecode(headerB64);
    header = JSON.parse(headerJson);
  } catch {
    return {
      valid: false,
      issuerDid: null,
      keyId: null,
      algorithm: null,
      error: 'Failed to parse JWT header',
    };
  }

  let payload: { iss?: string };
  try {
    const payloadB64 = signedJwt.split('.')[1];
    const payloadJson = base64urlDecode(payloadB64);
    payload = JSON.parse(payloadJson);
  } catch {
    return {
      valid: false,
      issuerDid: null,
      keyId: header?.kid ?? null,
      algorithm: header?.alg ?? null,
      error: 'Failed to parse JWT payload',
    };
  }

  const issuerDid = payload.iss ?? null;
  const keyId = header.kid ?? null;
  const algorithm = header.alg ?? null;

  if (!issuerDid) {
    return {
      valid: false,
      issuerDid: null,
      keyId,
      algorithm,
      error: 'No issuer DID found in JWT payload (iss field missing)',
    };
  }

  let publicKeyJwk: Record<string, unknown>;
  try {
    const encoded = encodeURIComponent(issuerDid);
    const res = await fetch(`${apiBaseUrl}/did/resolve/${encoded}`, {
      credentials: 'include',
    });

    if (!res.ok) {
      return {
        valid: false,
        issuerDid,
        keyId,
        algorithm,
        error: `Could not resolve DID: ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();
    const verificationMethod = data?.didDocument?.verificationMethod?.[0];

    if (!verificationMethod?.publicKeyJwk) {
      return {
        valid: false,
        issuerDid,
        keyId,
        algorithm,
        error: 'No public key found in DID document',
      };
    }

    publicKeyJwk = verificationMethod.publicKeyJwk;
  } catch (err) {
    return {
      valid: false,
      issuerDid,
      keyId,
      algorithm,
      error: `Failed to resolve DID: ${err instanceof Error ? err.message : 'Network error'}`,
    };
  }

  try {
    const publicKey = await importJWK(publicKeyJwk as Parameters<typeof importJWK>[0], 'EdDSA');

    await jwtVerify(signedJwt, publicKey, {
      algorithms: ['EdDSA'],
    });

    return {
      valid: true,
      issuerDid,
      keyId,
      algorithm,
      error: null,
    };
  } catch (err) {
    return {
      valid: false,
      issuerDid,
      keyId,
      algorithm,
      error: `Signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

function base64urlDecode(input: string): string {
  const base64 = input
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(input.length + ((4 - (input.length % 4)) % 4), '=');

  try {
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return atob(base64);
  }
}
