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
            content: `Ты — опытный бизнес-аналитик. На основе транскрипции встречи создай блок-схему в формате draw.io XML (.drawio). 

Блок-схема должна отражать:
1. Бизнес-требования (прямоугольники с закруглёнными углами, цвет #dae8fc)
2. Функциональные требования, вытекающие из бизнес-требований (прямоугольники, цвет #d5e8d4)
3. Концепцию и границы проекта (ромбы для решений, цвет #fff2cc)
4. Связи между элементами (стрелки)

Верни ТОЛЬКО валидный XML в формате .drawio без каких-либо пояснений, комментариев или markdown-обёртки. Ответ должен начинаться с <?xml и ОБЯЗАТЕЛЬНО заканчиваться закрывающим тегом </mxfile>. КРИТИЧЕСКИ ВАЖНО: XML должен быть полным и валидным — все теги должны быть закрыты: </root>, </mxGraphModel>, </diagram>, </mxfile>. Неполный XML сделает файл нечитаемым.

Пример структуры:
<?xml version="1.0" encoding="UTF-8"?>
<mxfile>
  <diagram name="Блок-схема требований">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <!-- Бизнес-требования -->
        <mxCell id="2" value="BR-001: Требование" style="rounded=1;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="100" y="100" width="200" height="60" as="geometry"/>
        </mxCell>
        <!-- Функциональные требования -->
        <mxCell id="3" value="FR-001: Требование" style="rounded=0;whiteSpace=wrap;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
          <mxGeometry x="100" y="200" width="200" height="60" as="geometry"/>
        </mxCell>
        <!-- Связь -->
        <mxCell id="4" style="edgeStyle=orthogonalEdgeStyle;" edge="1" source="2" target="3" parent="1"/>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

Размещай элементы аккуратно, чтобы блок-схема была читаемой. Используй автоматическое расположение сверху вниз.`,
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
    console.error("flowchart error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
