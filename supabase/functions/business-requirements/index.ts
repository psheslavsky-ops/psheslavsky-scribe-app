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
          { role: "system", content: `Ты — бизнес-аналитик. Составь документ бизнес-требований на русском языке. Заголовок: «Документ бизнес-требований». Структура:\n\n1. **Название проекта** — определи из контекста\n2. **Бизнес-контекст** — текущая ситуация и предпосылки\n3. **Бизнес-цели** — что хочет достичь бизнес\n4. **Бизнес-требования** — список BR-001, BR-002... каждое с описанием, приоритетом (Высокий/Средний/Низкий) и обоснованием\n5. **Заинтересованные стороны** — кто заинтересован\n6. **Ограничения и допущения**\n7. **Критерии успеха**\n8. **Риски**\n\nЕсли раздел невозможно заполнить — пропусти его.` },
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
