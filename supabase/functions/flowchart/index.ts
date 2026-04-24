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
          { role: "system", content: `Ты — бизнес-аналитик. Создай блок-схему в формате draw.io XML.\n\nТРЕБОВАНИЯ:\n1. ТОЛЬКО валидный XML без markdown, без пояснений\n2. Начинается ТОЧНО с: <?xml version="1.0" encoding="UTF-8"?>\n3. Заканчивается ТОЧНО: </mxfile>\n4. Каждый mxCell ОБЯЗАТЕЛЬНО: parent="1" (кроме id="0" и id="1")\n5. Цвета: бизнес-требования fillColor=#dae8fc, функциональные fillColor=#d5e8d4, решения rhombus;fillColor=#fff2cc\n\nШаблон структуры:\n<?xml version="1.0" encoding="UTF-8"?>\n<mxfile><diagram name="Блок-схема"><mxGraphModel><root>\n<mxCell id="0"/><mxCell id="1" parent="0"/>\n<mxCell id="2" value="LABEL" style="rounded=0;whiteSpace=wrap;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry x="100" y="80" width="200" height="60" as="geometry"/></mxCell>\n</root></mxGraphModel></diagram></mxfile>` },
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
