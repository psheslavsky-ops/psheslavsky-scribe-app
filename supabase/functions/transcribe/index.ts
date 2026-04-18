import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_FILE_SIZE   = 25 * 1024 * 1024; // 25 MB — Groq hard limit
const GROQ_TIMEOUT_MS = 100_000;           // 100s — Groq timeout per request

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const languageCode = (formData.get("language_code") as string) || "";

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: `Файл слишком большой (${(audioFile.size / 1024 / 1024).toFixed(1)} МБ). Максимум 25 МБ.`,
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mimeToExt: Record<string, string> = {
      "audio/mpeg": "mp3", "audio/mp3": "mp3",
      "audio/wav": "wav",  "audio/x-wav": "wav", "audio/wave": "wav",
      "audio/mp4": "mp4",  "audio/x-m4a": "m4a", "audio/m4a": "m4a",
      "audio/ogg": "ogg",  "audio/opus": "opus",  "audio/webm": "webm",
      "audio/flac": "flac","audio/x-flac": "flac",
      "video/mp4": "mp4",  "video/webm": "webm",  "video/ogg": "ogg",
    };

    const mime        = audioFile.type || "";
    const ext         = mimeToExt[mime] || "mp3";
    const safeFileName = `audio.${ext}`;

    const fileBytes = await audioFile.arrayBuffer();
    const cleanFile = new File([fileBytes], safeFileName, { type: mime || `audio/${ext}` });

    const apiFormData = new FormData();
    apiFormData.append("file", cleanFile);
    apiFormData.append("model", "whisper-large-v3-turbo");
    apiFormData.append("response_format", "verbose_json");
    if (languageCode) {
      apiFormData.append("language", languageCode);
    }

    // FIX: add timeout to Groq request so Edge Function doesn't silently hang
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: apiFormData,
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Groq API timeout — аудио слишком длинное для одного запроса. Попробуйте разбить файл на части." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);

      // Return retryable status codes back to the client
      const retryableStatus = [429, 500, 502, 503, 504].includes(response.status)
        ? response.status
        : 500;

      return new Response(
        JSON.stringify({ error: `Transcription failed [${response.status}]: ${errorText}` }),
        { status: retryableStatus, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqResult = await response.json();

    const words = (groqResult.segments || []).map((segment: any) => ({
      text:    segment.text?.trim() || "",
      start:   segment.start || 0,
      end:     segment.end || 0,
      type:    "word",
      speaker: `speaker_${segment.speaker || 0}`,
    }));

    return new Response(
      JSON.stringify({
        text:          groqResult.text || "",
        words,
        language_code: groqResult.language || languageCode || "unknown",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (e) {
    console.error("transcribe error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
