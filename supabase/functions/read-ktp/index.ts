// Reads an Indonesian KTP (ID card) photo using an AI vision model and
// returns structured fields (NIK, name, birth date, address, etc).
//
// Uses the Lovable AI Gateway, which Lovable Cloud projects get for free via
// the auto-provisioned LOVABLE_API_KEY secret — no separate OpenAI/Google key
// needed. If this project isn't on Lovable Cloud (or the secret is missing),
// this function will fail loudly with a clear error instead of silently
// returning garbage; swap the fetch call below for your own vision provider
// if needed.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Kamu membaca foto KTP (Kartu Tanda Penduduk) Indonesia.
Balas HANYA dengan JSON valid (tanpa markdown, tanpa penjelasan), dengan bentuk persis:
{
  "nik": "16 digit NIK atau string kosong kalau tidak terbaca",
  "fullName": "nama sesuai KTP",
  "birthPlace": "tempat lahir",
  "birthDate": "tanggal lahir apa adanya seperti tertulis di KTP",
  "address": "alamat lengkap",
  "gender": "LAKI-LAKI atau PEREMPUAN",
  "religion": "agama",
  "maritalStatus": "status perkawinan",
  "occupation": "pekerjaan",
  "nationality": "kewarganegaraan"
}
Kalau gambar yang dikirim BUKAN KTP atau tidak cukup jelas untuk dibaca, balas persis: {"error": "not_a_ktp"}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageDataUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "LOVABLE_API_KEY belum tersedia di edge function ini. Pastikan project sudah pakai Lovable Cloud (AI Gateway aktif otomatis).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Baca data KTP di foto ini." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return new Response(
        JSON.stringify({ error: `AI Gateway error (${aiResponse.status}): ${text.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await aiResponse.json();
    const raw: string = payload?.choices?.[0]?.message?.content ?? "";

    // Models sometimes wrap JSON in ```json fences despite instructions — strip if present.
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    let extracted: Record<string, unknown> | null = null;
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        extracted = parsed?.error ? null : parsed;
      } catch {
        extracted = null;
      }
    }

    return new Response(JSON.stringify({ extracted, raw }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
