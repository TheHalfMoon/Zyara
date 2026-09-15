// Zyara identity primitives (M002).
// OIDC abstraction with synthetic Keycloak-compatible claims, session
// revocation, MFA assurance contract, and localized auth errors.
// Security: tokens are minimized and never logged by this package.

export type Locale = "ar" | "en" | "fr" | "de" | "es";

export interface MinimalClaims {
  sub: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sid: string;
  tenant: string;
  assurance: "aal1" | "aal2";
}

export interface OidcProvider {
  name: string;
  verify(token: string, nowSec: number): MinimalClaims;
}

// Synthetic Keycloak realm descriptor for local/dev only.
export const SYNTHETIC_REALM = {
  realm: "zyara-synthetic",
  issuer: "https://keycloak.synthetic.local/realms/zyara-synthetic",
  audience: "zyara-api",
  note: "Synthetic local realm. No production users, no real PHI.",
} as const;

// In-memory synthetic OIDC provider. Tokens are opaque handles of the
// form `syn.<sid>` mapped server-side to claims; the token itself carries
// no authority and the tenant always comes from server-side session state,
// never from request bodies.
export class SyntheticOidcProvider implements OidcProvider {
  name = "synthetic-keycloak";
  private sessions = new Map<string, MinimalClaims>();
  private revokedSessions = new Set<string>();

  issue(claims: Omit<MinimalClaims, "iss" | "aud" | "iat"> & { iat?: number }): string {
    const now = Math.floor(Date.now() / 1000);
    const full: MinimalClaims = {
      iss: SYNTHETIC_REALM.issuer,
      aud: SYNTHETIC_REALM.audience,
      iat: claims.iat ?? now,
      ...claims,
    };
    this.sessions.set(claims.sid, full);
    this.revokedSessions.delete(claims.sid);
    return `syn.${claims.sid}`;
  }

  revokeSession(sid: string): void {
    this.revokedSessions.add(sid);
    this.sessions.delete(sid);
  }

  isRevoked(sid: string): boolean {
    return this.revokedSessions.has(sid);
  }

  verify(token: string, nowSec: number): MinimalClaims {
    if (!token.startsWith("syn.")) throw authError("STALE_SESSION", "en");
    const sid = token.slice(4);
    if (this.revokedSessions.has(sid)) throw authError("SESSION_REVOKED", "en");
    const claims = this.sessions.get(sid);
    if (!claims) throw authError("STALE_SESSION", "en");
    if (claims.exp <= nowSec) throw authError("STALE_SESSION", "en");
    if (claims.iss !== SYNTHETIC_REALM.issuer) throw authError("INVALID_TENANT", "en");
    return { ...claims };
  }
}

export type AuthErrorCode =
  | "UNAUTHENTICATED"
  | "STALE_SESSION"
  | "SESSION_REVOKED"
  | "INVALID_TENANT"
  | "FORBIDDEN"
  | "ASSURANCE_REQUIRED";

const MESSAGES: Record<AuthErrorCode, Record<Locale, string>> = {
  UNAUTHENTICATED: {
    ar: "غير مصادق. سجل الدخول من فضلك.",
    en: "Not authenticated. Please sign in.",
    fr: "Non authentifié. Veuillez vous connecter.",
    de: "Nicht angemeldet. Bitte melden Sie sich an.",
    es: "No autenticado. Inicie sesión, por favor.",
  },
  STALE_SESSION: {
    ar: "انتهت الجلسة. سجل الدخول مرة أخرى.",
    en: "Session expired or stale. Please sign in again.",
    fr: "Session expirée ou invalide. Veuillez vous reconnecter.",
    de: "Sitzung abgelaufen oder ungültig. Bitte erneut anmelden.",
    es: "Sesión caducada o inválida. Vuelva a iniciar sesión.",
  },
  SESSION_REVOKED: {
    ar: "تم إلغاء الجلسة. سجل الدخول مرة أخرى.",
    en: "Session has been revoked. Please sign in again.",
    fr: "Session révoquée. Veuillez vous reconnecter.",
    de: "Sitzung wurde widerrufen. Bitte erneut anmelden.",
    es: "Sesión revocada. Vuelva a iniciar sesión.",
  },
  INVALID_TENANT: {
    ar: "مستأجر غير صالح.",
    en: "Invalid tenant.",
    fr: "Locataire invalide.",
    de: "Ungültiger Mandant.",
    es: "Inquilino no válido.",
  },
  FORBIDDEN: {
    ar: "غير مسموح. ليست لديك صلاحية.",
    en: "Forbidden. You lack permission.",
    fr: "Interdit. Permission insuffisante.",
    de: "Verboten. Fehlende Berechtigung.",
    es: "Prohibido. Sin permiso suficiente.",
  },
  ASSURANCE_REQUIRED: {
    ar: "يتطلب هذا الإجراء تحققا أقوى.",
    en: "This action requires stronger assurance (MFA).",
    fr: "Cette action exige une assurance renforcée (MFA).",
    de: "Diese Aktion erfordert eine stärkere Assurance (MFA).",
    es: "Esta acción requiere mayor garantía (MFA).",
  },
};

export interface LocalizedAuthError extends Error {
  code: AuthErrorCode;
  locale: Locale;
}

export function authError(code: AuthErrorCode, locale: Locale): LocalizedAuthError {
  const err = new Error(MESSAGES[code][locale]) as LocalizedAuthError;
  err.code = code;
  err.locale = locale;
  return err;
}

export function localizeAuthError(code: AuthErrorCode, locale: Locale): string {
  return MESSAGES[code][locale];
}

// Redaction helper: never log tokens. Keeps only a non-reversible prefix hint.
export function redactToken(token: string): string {
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}…(${token.length})`;
}
