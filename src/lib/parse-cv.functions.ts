import { createServerFn } from "@tanstack/react-start";

/**
 * Real CV parsing: sends an uploaded resume (PDF or image) to the Lovable AI
 * Gateway and returns structured JSON for the ATS matching engine.
 */

const SYSTEM_PROMPT = `Kamu adalah mesin parsing CV/resume untuk sistem ATS.
Balas HANYA JSON valid (tanpa markdown), bentuk persis:
{
  "personal_info": {"name":"","email":"","phone":"","location":"","linkedin":""},
  "skills": {"hard_skills":[],"soft_skills":[],"tools":[]},
  "experiences": [{"job_title":"","company":"","duration":"","description":""}],
  "education": [{"degree":"","institution":""}],
  "summary": "ringkasan 3 kalimat tentang kandidat",
  "parsing_confidence": 0.9
}
Normalisasi nama skill (contoh: "react.js" -> "React", "node js" -> "Node.js").
Kalau dokumen jelas bukan CV, balas: {"error":"not_a_cv"}`;

type ParseInput = { fileDataUrl: string; fileName: string; mimeType: string };

export const parseCvServerFn = createServerFn({ method: "POST" })
  .inputValidator((data: ParseInput) => {
    if (!data?.fileDataUrl || typeof data.fileDataUrl !== "string") {
      throw new Error("Berkas CV tidak terbaca.");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("Layanan AI belum tersedia (LOVABLE_API_KEY tidak ditemukan).");
    }

    const isImage = (data.mimeType ?? "").startsWith("image/");
    const contentBlock = isImage
      ? { type: "image_url", image_url: { url: data.fileDataUrl } }
      : {
          type: "file",
          file: { filename: data.fileName || "cv.pdf", file_data: data.fileDataUrl },
        };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [{ type: "text", text: "Parse CV berikut menjadi JSON." }, contentBlock],
          },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Terlalu banyak permintaan AI. Coba lagi sebentar lagi.");
    if (res.status === 402) throw new Error("Kredit AI habis. Tambahkan kredit untuk memakai mode AI.");
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Layanan AI gagal (${res.status}): ${text.slice(0, 200)}`);
    }

    const payload = await res.json();
    const raw: string = payload?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { parsedJson: null as string | null };
    try {
      const obj = JSON.parse(jsonMatch[0]);
      return { parsedJson: obj?.error ? null : (JSON.stringify(obj) as string | null) };
    } catch {
      return { parsedJson: null as string | null };
    }
  });
