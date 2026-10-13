import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { AnalysisSchema, imageType } from "@/lib/analysis";
import { verifiedUserId } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const counts = new Map<string, { count: number; reset: number }>();
const DAY = 24 * 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 4_000_000;
const MAX_REQUEST_BYTES = 4_400_000;
function allowed(key: string, limit: number) {
  const now = Date.now();
  const current = counts.get(key);
  if (!current || now > current.reset) { counts.set(key, { count: 1, reset: now + DAY }); return true; }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
export async function POST(request: NextRequest) {
  const english = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ?? false;
  const t = (indonesian: string, translated: string) => english ? translated : indonesian;
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_REQUEST_BYTES) return NextResponse.json({ error: t("Foto terlalu besar setelah dikompresi. Pilih foto lain.", "Photo is too large after compression. Choose another photo.") }, { status: 413 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed(`ip:${ip}`, 10) || !allowed("global", 200)) return NextResponse.json({ error: t("Batas analisis sementara tercapai. Kamu tetap bisa mencatat manual.", "The analysis limit has been reached for now. You can still log food manually.") }, { status: 429 });
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1] ?? "";
  if (token) {
    const userId = await verifiedUserId(token);
    if (!userId) return NextResponse.json({ error: t("Sesi masuk sudah berakhir. Masuk lagi atau coba tanpa akun.", "Your session has expired. Sign in again or try without an account.") }, { status: 401 });
    if (!allowed(`user:${userId}`, 20)) return NextResponse.json({ error: t("Batas analisis akun hari ini tercapai. Catat makanan secara manual.", "You have reached today's account analysis limit. Log food manually.") }, { status: 429 });
  } else if (!allowed(`guest:${ip}`, 3)) {
    return NextResponse.json({ error: t("Batas 3 analisis tamu hari ini tercapai. Masuk ke akun atau catat makanan secara manual.", "You have used today's 3 guest analyses. Sign in or log food manually.") }, { status: 429 });
  }
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: t("Unggahan tidak dapat dibaca.", "Could not read the upload.") }, { status: 400 }); }
  const image = form.get("image");
  const context = form.get("context");
  if (!(image instanceof File) || image.size === 0 || image.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: t("Foto terkompresi harus di bawah 4 MB. Pilih foto lain.", "The compressed photo must be under 4 MB. Choose another photo.") }, { status: 400 });
  if (context && (typeof context !== "string" || context.length > 300)) return NextResponse.json({ error: t("Keterangan terlalu panjang.", "Description is too long.") }, { status: 400 });
  const buffer = Buffer.from(await image.arrayBuffer());
  const mimeType = imageType(buffer);
  if (!mimeType || mimeType !== image.type) return NextResponse.json({ error: t("Format foto tidak didukung. Gunakan JPEG, PNG, atau WebP.", "Unsupported photo format. Use JPEG, PNG, or WebP.") }, { status: 400 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: t("Analisis foto belum dikonfigurasi. Kamu tetap bisa mencatat makanan secara manual.", "Photo analysis is not configured. You can still log food manually.") }, { status: 503 });

  let compressed: Buffer;
  try {
    compressed = await sharp(buffer, { limitInputPixels: 20_000_000, failOn: "error" }).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
  } catch { return NextResponse.json({ error: t("Foto tidak dapat diproses. Pilih foto lain.", "Could not process the photo. Choose another photo.") }, { status: 400 }); }

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const labelMode = typeof context === "string" && /label gizi/i.test(context);
  const schema = {
    type: "object", properties: {
      items: { type: "array", minItems: 1, maxItems: 10, items: { type: "object", properties: {
        candidateName: { type: "string" },
        estimatedServing: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" }, gramsMin: { type: "number" }, gramsMax: { type: "number" } }, required: ["value", "unit", "gramsMin", "gramsMax"] },
        estimatedNutritionPer100g: { type: "object", properties: { calories: { type: "number" }, protein: { type: "number" }, carbs: { type: "number" }, fat: { type: "number" } }, required: ["calories", "protein", "carbs", "fat"] },
        nutritionConfidence: { type: "string", enum: ["low", "medium", "high"] },
        visibleNotes: { type: "string" }, confidence: { type: "string", enum: ["low", "medium", "high"] }, needsConfirmation: { type: "boolean" },
      }, required: ["candidateName", "estimatedServing", "estimatedNutritionPer100g", "nutritionConfidence", "visibleNotes", "confidence", "needsConfirmation"] } },
      followUpQuestion: { type: "string" }, disclaimer: { type: "string" },
    }, required: ["items", "disclaimer"],
  };
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [
        { text: `${labelMode ? "Read the visible nutrition facts label and product name. When serving size and nutrient values are legible, convert the values to an estimated per-100-g basis; if the basis is unclear, keep confidence low and explain what is unclear in visibleNotes. Do not invent unreadable values." : "Identify only foods or visible components in this meal image. Estimate approximate nutrition per 100 g of edible food."} Respond in ${english ? "English" : "Indonesian"}. Use approximate serving ranges in grams. Mark ambiguous foods with low confidence. Hidden oil, sauces or ingredients are unknown unless visible or supplied by the user. Use typical preparation only when supported by the image; hidden oil, sauces, and ingredients are unknown. Keep estimates conservative, round to sensible values, mark nutrition confidence low when uncertain, and present values as editable suggestions rather than verified facts. Do not give medical advice or claim measured precision. Optional user context: ${typeof context === "string" ? context : "none"}` },
        { inlineData: { mimeType: "image/jpeg", data: compressed.toString("base64") } },
      ] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } }),
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 429) return NextResponse.json({ error: t("Kuota analisis sedang habis. Catat makanan secara manual dan coba lagi nanti.", "Analysis quota is exhausted. Log food manually and try again later.") }, { status: 503 });
    if ([400, 401, 403].includes(response.status)) return NextResponse.json({ error: t("Permintaan Gemini ditolak. Periksa GEMINI_API_KEY dan model di .env.local, lalu mulai ulang server.", "Gemini rejected the request. Check GEMINI_API_KEY and the model in .env.local, then restart the server.") }, { status: 503 });
    if (response.status === 404) return NextResponse.json({ error: t("Model Gemini tidak tersedia. Periksa GEMINI_MODEL atau gunakan model bawaan.", "Gemini model unavailable. Check GEMINI_MODEL or use the default model.") }, { status: 503 });
    if (!response.ok) return NextResponse.json({ error: t("Analisis foto belum tersedia. Catat makanan secara manual.", "Photo analysis is unavailable. Log food manually.") }, { status: 503 });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => typeof part.text === "string")?.text;
    if (!text) throw new Error("empty model response");
    const parsed = AnalysisSchema.parse(JSON.parse(text));
    return NextResponse.json({ ...parsed, demo: false }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: t("Hasil foto tidak dapat dipastikan. Coba foto lain atau catat manual.", "Could not determine the photo result. Try another photo or log manually.") }, { status: 503 });
  }
}
