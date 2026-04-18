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
            content: `Ты — опытный бизнес-аналитик, специалист по методологии Карла Вигерса (Karl Wiegers). Составь документ «Варианты использования» (Use Cases) на русском языке. Документ должен начинаться строго с заголовка «Варианты использования» без каких-либо вводных фраз.

Для каждого варианта использования используй формат по Вигерсу:

**UC-XXX: [Название]**
- **Актор (Actor):** [кто инициирует]
- **Предусловия (Preconditions):** [что должно быть выполнено до начала]
- **Постусловия (Postconditions):** [результат успешного выполнения]
- **Основной поток (Main Flow):**
  1. [Шаг 1]
  2. [Шаг 2]
  ...
- **Альтернативные потоки (Alternative Flows):**
  - [Альтернатива A]: [описание]
- **Исключительные потоки (Exception Flows):**
  - [Исключение 1]: [описание]
- **Бизнес-правила:** [связанные правила]
- **Приоритет:** Высокий / Средний / Низкий

В конце документа добавь:
- **Диаграмму акторов** — текстовое описание всех акторов и их связей с вариантами использования
- **Матрицу трассируемости** — связь вариантов использования с бизнес-требованиями

Выяви ВСЕ возможные варианты использования из транскрипции. Пиши профессионально и структурированно.`,
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
    console.error("use-cases error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
