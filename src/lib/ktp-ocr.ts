import { supabase } from "@/integrations/supabase/client";
import type { KtpExtracted } from "@/lib/staff-auth";

/**
 * Sends a KTP photo (data URL) to the `read-ktp` edge function, which asks an
 * AI vision model to read the card and return structured fields. Throws on
 * network/HTTP failure; returns `{ extracted: null, raw }` if the model
 * couldn't confidently read a KTP in the image (blurry, wrong document, etc).
 */
export async function readKtpPhoto(
  imageDataUrl: string,
): Promise<{ extracted: KtpExtracted | null; raw: string }> {
  const { data, error } = await supabase.functions.invoke("read-ktp", {
    body: { imageDataUrl },
  });
  if (error) throw error;
  return data as { extracted: KtpExtracted | null; raw: string };
}

/** Loose NIK comparison: digits only, so spacing/formatting differences don't false-flag a mismatch. */
export function niksMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = (a ?? "").replace(/\D/g, "");
  const db = (b ?? "").replace(/\D/g, "");
  return da.length === 16 && da === db;
}
