import crypto from "crypto";

type SharePayload = {
  key: string;
  name: string;
  type: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.SHARE_SECRET;

  if (!secret) {
    throw new Error("Missing SHARE_SECRET");
  }

  return secret;
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

export function createShareToken(payload: SharePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `${encoded}.${sign(encoded)}`;
}

export function verifyShareToken(token: string): SharePayload | null {
  try {
    const [encoded, signature] = token.split(".");

    if (!encoded || !signature) {
      return null;
    }

    const expected = sign(encoded);

    if (signature.length !== expected.length) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as SharePayload;

    if (!payload.key || !payload.name || !payload.type || !payload.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
