import { NextRequest, NextResponse } from "next/server";
import { normalizeBarcode, parseOpenFoodFacts } from "@/lib/packaged-food";

export const runtime = "nodejs";
export const maxDuration = 10;
const limits = new Map<string, { count: number; reset: number }>();
function allowed(key: string, limit: number) {
  const now = Date.now();
  const prior = limits.get(key);
  if (!prior || now >= prior.reset) { limits.set(key, { count: 1, reset: now + 60000 }); return true; }
  if (prior.count >= limit) return false;
  prior.count += 1;
  return true;
}
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest, context: { params: Promise<{ barcode: string }> }) {
  const english = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ?? false;
  const t = (indonesian: string, translated: string) => english ? translated : indonesian;
  const code = normalizeBarcode((await context.params).barcode);
  if (!code) return reply({ error: t("Kode batang tidak valid. Masukkan EAN atau UPC yang tercetak pada kemasan.", "Invalid barcode. Enter an EAN or UPC printed on the package.") }, 400);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allowed("global", 10) || !allowed(`ip:${ip}`, 5)) return reply({ error: t("Pencarian sedang dibatasi. Coba lagi sebentar atau isi label kemasan.", "Lookups are temporarily limited. Try again shortly or enter the package label.") }, 429);
  const url = `https://world.openfoodfacts.org/api/v3/product/${code}?fields=code,product_name,product_name_id,product_name_en,brands,quantity,serving_size,product_quantity_unit,nutrition_data_per,nutriments&lc=id&cc=id`;
  try {
    const response = await fetch(url, { headers: { "User-Agent": "Forkcast/0.2 (https://forkcastfood.vercel.app; packaged-food-scan)", Accept: "application/json" }, signal: AbortSignal.timeout(6500), cache: "no-store" });
    if (response.status === 404) return reply({ status: "not_found" });
    if (!response.ok || !response.body) return reply({ error: t("Layanan produk belum tersedia. Isi label kemasan secara manual.", "Product lookup is unavailable. Enter the package label manually.") }, 503);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 256000) { await reader.cancel(); return reply({ error: t("Data produk terlalu besar untuk diproses. Isi label secara manual.", "Product data is too large to process. Enter the label manually.") }, 503); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const result = parseOpenFoodFacts(JSON.parse(new TextDecoder().decode(bytes)), code, new Date().toISOString());
    return reply(result);
  } catch { return reply({ error: t("Pencarian produk gagal. Periksa koneksi atau isi label kemasan.", "Product lookup failed. Check the connection or enter the package label.") }, 503); }
}
