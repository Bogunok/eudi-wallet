/**
 * decodes SD-JWT token and returns claim data.
 *
 * SD-JWT format: <signed_jwt>~<disclosure_1>~<disclosure_2>~
 * Each disclosure is a base64url-encoded JSON string of [salt, fieldName, value]
 *
 * Example disclosure after decoding:
 * ["randomSalt123", "licenseNumber", "UA-2026-001234"]
 */
export function decodeSDJwtClaims(rawJwt: string): Record<string, unknown> {
  try {
    const parts = rawJwt.split('~');
    const disclosures = parts.slice(1).filter(p => p.length > 0);

    const claims: Record<string, unknown> = {};

    for (const disclosureB64 of disclosures) {
      try {
        // decode base64url → string → JSON
        const decoded = base64urlDecode(disclosureB64);
        const parsed = JSON.parse(decoded);

        // Disclosure має формат [salt, fieldName, value]
        if (Array.isArray(parsed) && parsed.length === 3) {
          const [, fieldName, value] = parsed;
          if (typeof fieldName === 'string') {
            claims[fieldName] = value;
          }
        }
      } catch {}
    }

    return claims;
  } catch {
    return {};
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

export function formatClaimsForDisplay(rawJwt: string): Record<string, unknown> | null {
  const claims = decodeSDJwtClaims(rawJwt);
  if (Object.keys(claims).length === 0) return null;
  return claims;
}
