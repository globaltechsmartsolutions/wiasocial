import "server-only";

import { createHmac } from "node:crypto";
import type { LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { BlockList } from "node:net";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

const blockedAddresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:2::", 48],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

interface SafeWebhookDestination {
  url: URL;
  address: string;
  family: 4 | 6;
}

export class UnsafeWebhookUrlError extends Error {
  constructor(message = "La URL del webhook no es un destino público permitido") {
    super(message);
    this.name = "UnsafeWebhookUrlError";
  }
}

export async function resolveSafeWebhookDestination(rawUrl: string): Promise<SafeWebhookDestination> {
  if (!rawUrl || rawUrl.length > 2_048) {
    throw new UnsafeWebhookUrlError("La URL del webhook no es válida");
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeWebhookUrlError("La URL del webhook no es válida");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new UnsafeWebhookUrlError("El webhook debe usar HTTPS y no puede incluir credenciales");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new UnsafeWebhookUrlError();
  }

  let addresses: LookupAddress[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UnsafeWebhookUrlError("No se ha podido resolver el host del webhook");
  }

  if (addresses.length === 0) {
    throw new UnsafeWebhookUrlError("El host del webhook no tiene direcciones públicas");
  }

  for (const address of addresses) {
    const family = address.family === 6 ? "ipv6" : "ipv4";
    if (blockedAddresses.check(address.address, family)) {
      throw new UnsafeWebhookUrlError();
    }
  }

  const destination = addresses[0];
  return {
    url,
    address: destination.address,
    family: destination.family === 6 ? 6 : 4,
  };
}

export async function deliverWebhook(
  rawUrl: string,
  body: string,
  event: string
): Promise<{ status: number }> {
  const destination = await resolveSafeWebhookDestination(rawUrl);
  const signingSecret = process.env.WEBHOOK_SIGNING_SECRET?.trim();
  const signature = signingSecret
    ? `sha256=${createHmac("sha256", signingSecret).update(body).digest("hex")}`
    : null;

  return new Promise((resolve, reject) => {
    let settled = false;
    const request = httpsRequest({
      protocol: "https:",
      hostname: destination.address,
      family: destination.family,
      port: destination.url.port || 443,
      path: `${destination.url.pathname}${destination.url.search}`,
      method: "POST",
      servername: destination.url.hostname,
      rejectUnauthorized: true,
      headers: {
        Host: destination.url.host,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "WIASocial-Webhooks/1.0",
        "X-WIASocial-Event": event,
        ...(signature ? { "X-WIASocial-Signature": signature } : {}),
      },
    });
    const deadline = setTimeout(() => {
      request.destroy(new Error("El webhook ha superado el tiempo de espera"));
    }, REQUEST_TIMEOUT_MS);
    deadline.unref();

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("El webhook ha superado el tiempo de espera"));
    });

    request.on("response", (response) => {
      const status = response.statusCode ?? 502;
      let responseBytes = 0;

      response.on("data", (chunk: Buffer) => {
        responseBytes += chunk.length;
        if (responseBytes > MAX_RESPONSE_BYTES) response.destroy();
      });

      response.on("end", () => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        resolve({ status });
      });

      response.on("close", () => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        resolve({ status });
      });
    });

    request.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      reject(error);
    });

    request.end(body);
  });
}
