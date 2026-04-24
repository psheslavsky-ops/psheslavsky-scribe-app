import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { transcript } = await req.json();
    if (!transcript) return new Response(JSON.stringify({ error: "No transcript" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) return new Response(JSON.stringify({ error: "GROQ_API_KEY not set" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", stream: true,
        messages: [
          { role: "system", content: `Ты — опытный бизнес-аналитик и психолог. Составь «Резюме встречи» на русском языке. После заголовка ОБЯЗАТЕЛЬНО первым разделом добавь:\nУчастники:\n- [имя или роль каждого участника из транскрипции]\nЕсли участников невозможно определить — напиши: Участники: не определены.\n\nСтруктура:\n\n1. **Цели встречи**\n2. **Краткое содержание** — основные темы (3-5 абзацев)\n3. **Результаты встречи** — итоги, решения, договорённости\n4. **Психологический контекст**\n   4.1. Психологические портреты участников — тип личности, роль в динамике, эмоциональное состояние, мотивация\n   4.2. Рекомендации по взаимодействию — как выстраивать коммуникацию, конфликтные точки, рекомендации по мотивации\n5. **Рекомендации для достижения целей**\n\nЕсли раздел невозможно заполнить — пропусти его.` },
          { role: "user", content: `Транскрипция встречи:\n\n${transcript}` }
        ],
      }),
    });
    if (!response.ok) { const t = await response.text(); return new Response(JSON.stringify({ error: t }), { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
