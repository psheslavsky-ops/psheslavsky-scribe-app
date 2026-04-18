import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: "No transcript provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `Ты — бизнес-аналитик. Составь документ бизнес-требований на русском языке. Документ должен начинаться строго с заголовка «Документ бизнес-требований» без каких-либо вводных фраз, пояснений об источнике данных или упоминаний транскрипции. Сразу переходи к содержанию. Структура:

1. **Название проекта/инициативы** — определи из контекста
2. **Дата и участники** — если можно определить
3. **Бизнес-контекст** — краткое описание текущей ситуации и предпосылок
4. **Бизнес-цели** — что бизнес хочет достичь
5. **Бизнес-требования** — пронумерованный список (BR-001, BR-002 и т.д.), каждое с:
   - Описание требования
   - Приоритет (Высокий / Средний / Низкий)
   - Обоснование
6. **Заинтересованные стороны** — кто заинтересован и каковы их ожидания
7. **Ограничения и допущения** — известные ограничения и предположения
8. **Критерии успеха** — как будет измеряться успех
9. **Риски** — потенциальные риски реализации

Пиши чётко и структурированно. Если раздел невозможно заполнить — пропусти его.`,
          },
          {
            role: "user",
            content: `Вот транскрипция встречи:\n\n${transcript}`,
          },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит запросов. Попробуйте позже." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Необходимо пополнить баланс." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("business-requirements error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
