import "server-only";

import { NextResponse } from "next/server";

const DEFAULT_JSON_LIMIT_BYTES = 256 * 1024;

type JsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function readJsonObject<T = Record<string, unknown>>(
  request: Request,
  maxBytes = DEFAULT_JSON_LIMIT_BYTES
): Promise<JsonResult<T>> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return payloadTooLarge(maxBytes);
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw) > maxBytes) {
    return payloadTooLarge(maxBytes);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON inválido" }, { status: 400 }),
    };
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "El cuerpo debe ser un objeto JSON" }, { status: 400 }),
    };
  }

  return { ok: true, data: data as T };
}

function payloadTooLarge(maxBytes: number): JsonResult<never> {
  return {
    ok: false,
    response: NextResponse.json(
      { error: "Payload demasiado grande", maxBytes },
      { status: 413 }
    ),
  };
}
