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
            content: `Ты — опытный бизнес-аналитик и психолог. Составь документ «Резюме встречи» на русском языке. Документ должен начинаться строго с заголовка «Резюме встречи» без каких-либо вводных фраз. Структура:

1. **Цели встречи** — определи цели встречи из контекста обсуждения

2. **Краткое содержание** — основные темы, обсуждённые вопросы, ключевые моменты (3-5 абзацев)

3. **Результаты встречи** — конкретные итоги, решения, договорённости

4. **Психологический контекст**
   4.1. **Психологические портреты участников** — для каждого участника определи:
     - Тип личности и стиль коммуникации
     - Роль в групповой динамике (лидер, генератор идей, критик, медиатор и т.д.)
     - Эмоциональное состояние во время встречи
     - Мотивация и интересы
   
   4.2. **Рекомендации психолога по взаимодействию** — для каждого участника:
     - Как лучше выстраивать коммуникацию
     - Что стоит учитывать при взаимодействии
     - Потенциальные конфликтные точки и как их избегать
     - Рекомендации по мотивации

5. **Рекомендации для достижения целей встречи** — конкретные шаги и советы, учитывающие психологические особенности участников, для достижения обозначенных целей

Если какой-то раздел невозможно заполнить — пропусти его. Пиши профессионально, структурированно и по делу.`,
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
    console.error("meeting-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
