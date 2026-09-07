import { supabase } from "@/integrations/supabase/client";
import type { KtpExtracted } from "@/lib/staff-auth";

/**
 * Downscales a data URL so a full-resolution phone-camera photo (often 3-8MB)
 * doesn't hit the edge function / AI Gateway's payload limits. A KTP only
 * needs to be legible, not full sensor resolution — 1280px on the long edge
 * is plenty for the OCR model to read every field.
 */
export function downscaleImageDataUrl(dataUrl: string, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas tidak tersedia."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("Gagal memuat foto untuk diproses."));
    img.src = dataUrl;
  });
}

/** Pulls the real error message out of a Supabase Edge Function invocation failure. */
async function describeFunctionError(error: unknown): Promise<string> {
  const withContext = error as { message?: string; context?: Response };
  if (withContext?.context instanceof Response) {
    try {
      const body = await withContext.context.clone().json();
      if (typeof body?.error === "string") return body.error;
    } catch {
      // response body wasn't JSON — fall through to the generic message
    }
  }
  return withContext?.message || "Gagal menghubungi layanan AI pembaca KTP.";
}

/**
 * Sends a KTP photo (data URL) to the `read-ktp` edge function, which asks an
 * AI vision model to read the card and return structured fields.
 *
 * Throws an Error with a real, specific message on network/HTTP/deployment
 * failure (e.g. edge function not deployed, AI Gateway error) — this is NOT
 * the same as the model simply not finding a KTP in the photo, so callers
 * should show this message as-is rather than blaming photo quality.
 *
 * Returns `{ extracted: null, raw }` only when the model itself ran fine but
 * couldn't confidently read a KTP in the image (blurry, wrong document, etc).
 */
export async function readKtpPhoto(
  imageDataUrl: string,
): Promise<{ extracted: KtpExtracted | null; raw: string }> {
  const downscaled = await downscaleImageDataUrl(imageDataUrl);
  const { data, error } = await supabase.functions.invoke("read-ktp", {
    body: { imageDataUrl: downscaled },
  });
  if (error) throw new Error(await describeFunctionError(error));
  return data as { extracted: KtpExtracted | null; raw: string };
}

/** Loose NIK comparison: digits only, so spacing/formatting differences don't false-flag a mismatch. */
export function niksMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = (a ?? "").replace(/\D/g, "");
  const db = (b ?? "").replace(/\D/g, "");
  return da.length === 16 && da === db;
}
