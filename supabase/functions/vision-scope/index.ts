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
          { role: "system", content: `Ты — бизнес-аналитик по методологии Карла Вигерса. Составь «Документ концепции и границ» на русском языке. После заголовка ОБЯЗАТЕЛЬНО первым разделом укажи:
Участники:
- [имя или роль каждого участника из транскрипции]
Если участников невозможно определить — напиши: Участники: не определены.

Структура Вигерса:\n\n**1. Бизнес-требования**\n   1.1. Предпосылки (Background)\n   1.2. Бизнес-возможность (Business Opportunity)\n   1.3. Бизнес-цели (Business Objectives)\n   1.4. Метрики успеха (Success Metrics)\n   1.5. Концепция продукта (Vision Statement)\n   1.6. Бизнес-риски (Business Risks)\n\n**2. Масштаб и ограничения проекта**\n   2.1. Основные функциональности (Major Features)\n   2.2. Границы проекта (Scope of Initial Release)\n   2.3. Границы последующих релизов\n   2.4. Ограничения и исключения\n\n**3. Бизнес-контекст**\n   3.1. Профили заинтересованных сторон\n   3.2. Приоритеты проекта\n   3.3. Операционная среда\n\nНезаполнимые разделы — «Требуется уточнение».` },
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
