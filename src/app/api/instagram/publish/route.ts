import { NextResponse } from "next/server";
import { enforceUserRateLimit, getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/auth-server";
import { getSupabaseAdmin, getSupabaseForUser } from "@/lib/supabase-admin";

const STORAGE_BUCKET = "instagram-publish-assets";
const GRAPH_VERSION = "v21.0";

type PublishRequest = {
  caption?: string;
  slides?: { slide: number; dataUrl: string }[];
};

export async function POST(request: Request) {
  const token = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(token);
  if (!user || !token) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const limited = await enforceUserRateLimit(request, user.id, "instagram-publish", 8, 60 * 60 * 1000);
  if (limited) return limited;

  const body = await request.json() as PublishRequest;
  const slides = (body.slides ?? []).slice(0, 10);
  const caption = (body.caption ?? "").trim();

  if (!slides.length) {
    return NextResponse.json({ error: "No hay slides para publicar" }, { status: 400 });
  }

  const sb = getSupabaseForUser(token);
  const { data: connection, error } = await sb
    .from("instagram_connections")
    .select("ig_user_id, access_token, page_id")
    .eq("user_id", user.id)
    .single();

  if (error || !connection) {
    return NextResponse.json({ error: "Instagram no conectado" }, { status: 400 });
  }

  try {
    const imageUrls = await uploadSlidesAndCreateSignedUrls(user.id, slides);
    const graphBase = connection.page_id
      ? `https://graph.facebook.com/${GRAPH_VERSION}`
      : `https://graph.instagram.com/${GRAPH_VERSION}`;
    const igUserId = connection.ig_user_id as string;
    const accessToken = connection.access_token as string;

    const creationId = imageUrls.length === 1
      ? await createImageContainer(graphBase, igUserId, accessToken, imageUrls[0], caption)
      : await createCarouselContainer(graphBase, igUserId, accessToken, imageUrls, caption);

    const publishResult = await publishContainer(graphBase, igUserId, accessToken, creationId);
    return NextResponse.json({
      ok: true,
      instagramMediaId: publishResult.id,
      slides: imageUrls.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo publicar en Instagram";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function uploadSlidesAndCreateSignedUrls(
  userId: string,
  slides: { slide: number; dataUrl: string }[]
) {
  const admin = getSupabaseAdmin();
  await ensureBucket();

  const urls: string[] = [];
  const now = Date.now();

  for (const slide of slides) {
    const { buffer, contentType } = parseDataUrl(slide.dataUrl);
    const path = `${userId}/${now}-${String(slide.slide).padStart(2, "0")}.png`;

    const { error: uploadError } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data, error: signedError } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 60 * 60);

    if (signedError || !data?.signedUrl) {
      throw signedError ?? new Error("No se pudo crear URL pública temporal");
    }

    urls.push(data.signedUrl);
  }

  return urls;
}

async function ensureBucket() {
  const admin = getSupabaseAdmin();
  const { data } = await admin.storage.getBucket(STORAGE_BUCKET);
  if (data) return;

  const { error } = await admin.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
    allowedMimeTypes: ["image/png"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/png);base64,(.+)$/);
  if (!match) throw new Error("Formato de imagen no válido");
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

async function createImageContainer(
  graphBase: string,
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  const data = await graphPost<{ id: string }>(`${graphBase}/${igUserId}/media`, {
    access_token: accessToken,
    image_url: imageUrl,
    caption,
  });
  if (!data.id) throw new Error("Instagram no devolvió contenedor de imagen");
  return data.id;
}

async function createCarouselContainer(
  graphBase: string,
  igUserId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string
) {
  const children: string[] = [];

  for (const imageUrl of imageUrls) {
    const child = await graphPost<{ id: string }>(`${graphBase}/${igUserId}/media`, {
      access_token: accessToken,
      image_url: imageUrl,
      is_carousel_item: "true",
    });
    if (!child.id) throw new Error("Instagram no devolvió contenedor de slide");
    children.push(child.id);
  }

  const parent = await graphPost<{ id: string }>(`${graphBase}/${igUserId}/media`, {
    access_token: accessToken,
    media_type: "CAROUSEL",
    children: children.join(","),
    caption,
  });

  if (!parent.id) throw new Error("Instagram no devolvió contenedor de carrusel");
  return parent.id;
}

async function publishContainer(
  graphBase: string,
  igUserId: string,
  accessToken: string,
  creationId: string
) {
  const data = await graphPost<{ id: string }>(`${graphBase}/${igUserId}/media_publish`, {
    access_token: accessToken,
    creation_id: creationId,
  });
  if (!data.id) throw new Error("Instagram no confirmó la publicación");
  return data;
}

async function graphPost<T>(url: string, params: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || "Instagram API error";
    throw new Error(message);
  }
  return data as T;
}
