import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import {
  createRemoteJWKSet,
  importPKCS8,
  jwtVerify,
  SignJWT,
} from "jose";

const appleIssuer = "https://appleid.apple.com";
const appleKeys = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

type AppleTokenResponse = {
  access_token?: unknown;
  expires_in?: unknown;
  id_token?: unknown;
  refresh_token?: unknown;
  token_type?: unknown;
};

export type ExchangedAppleToken = {
  refreshToken: string;
  subject: string;
};

function getRequiredAppleConfiguration() {
  const clientId = process.env.APPLE_CLIENT_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const teamId = process.env.APPLE_TEAM_ID?.trim();

  if (!clientId || !keyId || !privateKey || !teamId) {
    throw new Error("Apple server credentials are not configured.");
  }

  return { clientId, keyId, privateKey, teamId };
}

async function createAppleClientSecret() {
  const configuration = getRequiredAppleConfiguration();
  const key = await importPKCS8(configuration.privateKey, "ES256");
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: configuration.keyId })
    .setIssuer(configuration.teamId)
    .setSubject(configuration.clientId)
    .setAudience(appleIssuer)
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}

export async function exchangeAppleAuthorizationCode(
  authorizationCode: string,
): Promise<ExchangedAppleToken> {
  const configuration = getRequiredAppleConfiguration();
  const clientSecret = await createAppleClientSecret();
  const response = await fetch(`${appleIssuer}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: clientSecret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Apple token exchange failed with status ${response.status}.`);
  }

  const tokenResponse = (await response.json()) as AppleTokenResponse;
  const refreshToken =
    typeof tokenResponse.refresh_token === "string"
      ? tokenResponse.refresh_token
      : "";
  const idToken =
    typeof tokenResponse.id_token === "string" ? tokenResponse.id_token : "";

  if (!refreshToken || !idToken) {
    throw new Error("Apple token exchange returned an incomplete response.");
  }

  const { payload } = await jwtVerify(idToken, appleKeys, {
    audience: configuration.clientId,
    issuer: appleIssuer,
  });

  if (!payload.sub) {
    throw new Error("Apple identity token did not include a subject.");
  }

  return { refreshToken, subject: payload.sub };
}

function getEncryptionKey() {
  const encodedKey = process.env.APPLE_TOKEN_ENCRYPTION_KEY?.trim();

  if (!encodedKey) {
    throw new Error("Apple token encryption is not configured.");
  }

  const key = Buffer.from(encodedKey, "base64");

  if (key.length !== 32) {
    throw new Error("APPLE_TOKEN_ENCRYPTION_KEY must be 32 bytes in base64.");
  }

  return key;
}

export function encryptAppleRefreshToken(refreshToken: string) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    initializationVector,
  );
  const ciphertext = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);

  return [
    initializationVector.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptAppleRefreshToken(encryptedToken: string) {
  const [initializationVector, authTag, ciphertext] = encryptedToken.split(".");

  if (!initializationVector || !authTag || !ciphertext) {
    throw new Error("Stored Apple token is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(initializationVector, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function revokeAppleRefreshToken(refreshToken: string) {
  const configuration = getRequiredAppleConfiguration();
  const clientSecret = await createAppleClientSecret();
  const response = await fetch(`${appleIssuer}/auth/revoke`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Apple token revocation failed with status ${response.status}.`);
  }
}
