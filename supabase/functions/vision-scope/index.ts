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
            content: `Ты — опытный бизнес-аналитик, специалист по методологии Карла Вигерса (Karl Wiegers). Составь документ «Концепция и границы» (Vision and Scope Document) на русском языке. Документ должен начинаться строго с заголовка «Документ концепции и границ» без каких-либо вводных фраз, пояснений об источнике данных или упоминаний транскрипции. Сразу переходи к содержанию, следуя структуре Вигерса:

1. **Бизнес-требования**
   1.1. Предпосылки (Background) — контекст и причины создания продукта
   1.2. Бизнес-возможность (Business Opportunity) — какую возможность или проблему решает продукт
   1.3. Бизнес-цели (Business Objectives) — измеримые цели бизнеса
   1.4. Метрики успеха (Success Metrics) — как будет измеряться успех
   1.5. Концепция продукта (Vision Statement) — краткое описание видения продукта
   1.6. Бизнес-риски (Business Risks) — риски для бизнеса

2. **Масштаб и ограничения проекта**
   2.1. Основные функциональности (Major Features) — список ключевых функций
   2.2. Границы проекта (Scope of Initial Release) — что входит в первый релиз
   2.3. Границы последующих релизов (Scope of Subsequent Releases) — что планируется позже
   2.4. Ограничения и исключения (Limitations and Exclusions) — что НЕ входит в проект

3. **Бизнес-контекст**
   3.1. Профили заинтересованных сторон (Stakeholder Profiles) — кто заинтересован и какова их роль
   3.2. Приоритеты проекта (Project Priorities) — компромиссы между объёмом, сроками, качеством и стоимостью
   3.3. Операционная среда (Operating Environment) — технические и организационные условия

Если какой-то раздел невозможно заполнить на основе транскрипции, укажи «Требуется уточнение» и сформулируй вопросы для уточнения. Пиши профессионально и структурированно.`,
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
    console.error("vision-scope error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
