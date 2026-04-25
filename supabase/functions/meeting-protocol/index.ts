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
          { role: "system", content: `Ты — бизнес-аналитик, создающий детальные протоколы встреч. На основе транскрипции создай протокол строго по следующему шаблону. Используй только обычный текст — без символов *, #, без markdown-разметки.

СТРОГИЙ ШАБЛОН (соблюдай структуру точно):

Протокол встречи

Участники: [имя/роль 1], [имя/роль 2], [имя/роль N]. Если не определены — написать "не определены".

Краткое резюме
[2-4 предложения: о чём была встреча, какие ключевые вопросы рассматривались, каков общий итог]

Ключевые темы обсуждения

1. [Название темы 1]
   Решили: [МАКСИМАЛЬНО ДЕТАЛЬНОЕ описание принятого решения — все нюансы, условия, оговорки, исключения, сроки, ответственные, способы реализации. Не менее 3-5 предложений на каждое решение. Отразить все детали которые обсуждались.]

2. [Название темы 2]
   Решили: [аналогично — максимальная детализация]

3. [Название темы N]
   Решили: [аналогично — максимальная детализация]

ВАЖНЫЕ ТРЕБОВАНИЯ:
- Каждое решение должно быть максимально детализировано — все нюансы, условия, исключения
- Если по теме нет чёткого решения — написать "Решили: вопрос требует дополнительного обсуждения" и указать причину
- Не сокращать и не упрощать — лучше написать больше
- Не использовать символы *, #, маркированные списки
- Нумерация тем: 1. 2. 3. и т.д.` },
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
