import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript } = await req.json();
    if (!transcript) return new Response(JSON.stringify({ error: "No transcript provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        messages: [
          { role: "system", content: `Ты — ассистент для создания протоколов встреч. На основе транскрипции создай структурированный протокол встречи на русском языке. Документ должен начинаться строго с заголовка «Протокол встречи» без каких-либо вводных фраз. Структура:\n\n1. **Краткое резюме** — основные темы (2-3 предложения)\n2. **Участники** — список участников\n3. **Ключевые темы обсуждения** — пронумерованный список\n4. **Принятые решения** — конкретные решения\n5. **Задачи и поручения** — что нужно сделать, кому\n6. **Следующие шаги** — планы на будущее\n\nЕсли раздел невозможно заполнить — пропусти его.` },
          { role: "user", content: `Вот транскрипция встречи:\n\n${transcript}` }
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      return new Response(JSON.stringify({ error: `Groq error: ${t}` }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
