import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ParkAI, a friendly and professional AI parking assistant for the NSBM Green University Parking System (N Park).

## Your Knowledge
- Car parking fee: LKR 100. Motorbike fee: LKR 50.
- IMPORTANT PAYMENT RULE: Fees are NOT deducted during booking. They are deducted ONLY when the user arrives and the physical gate opens.
- No-show penalty: If the user does not arrive within 2 hours of their booked time, a LKR 50 penalty is charged and the booking expires.
- Bookings must be made at least 1 hour in advance, and up to 24 hours in advance.

## Your Capabilities by Role
**Students**: Check wallet balance, view bookings, book slots, report violations, manage vehicles
**Security**: Search vehicles, process walk-in bookings, manage complaints
**Admin**: All student + security capabilities, manage users, view reports

## Intent Detection
When you detect the user wants to perform an action, include a JSON block in your response wrapped in \`\`\`action tags.

Supported intents:
- "check_balance" - Check wallet balance
- "view_bookings" - View current bookings
- "book_slot" - Book a parking slot.

## STRICT RULES FOR BOOKING
1. When a user asks to book, YOU MUST ask them for their Vehicle type (car/motorbike) AND Arrival Date/Time.
2. Have a natural conversation to gather these details. DO NOT output the \`\`\`action block until they have provided BOTH details.
3. Once they provide the details, output exactly:
\`\`\`action
{"intent": "book_slot", "vehicle_type": "car", "arrival_time": "YYYY-MM-DDTHH:mm:ssZ"}
\`\`\`
4. Never tell the user the fee is deducted now. Remind them it is deducted at the gate.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, role } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const roleContext = `The current user's role is: ${role || 'student'}. The current server time is ${new Date().toISOString()}. Use this time to accurately calculate today and tomorrow for the arrival_time parameter.`;

    // Build Gemini API contents from messages
    const contents: any[] = [];

    // Add system instruction + role context as first user turn context
    const allMessages = [
      { role: "user", content: SYSTEM_PROMPT + "\n\n" + roleContext },
      { role: "model", content: "Understood. I'm ParkAI, ready to help!" },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      })),
    ];

    for (const msg of allMessages) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.content }],
      });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
    const geminiBody = JSON.stringify({ contents });

    let response: Response | null = null;
    let lastErrorText = "";
    let lastStatus = 0;
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: geminiBody,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(Math.pow(2, attempt + 1) * 1000, 15000);
        console.log(`Rate limited, waiting ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        lastErrorText = await response.text();
        lastStatus = 429;
        response = null;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }

      if (!response.ok) {
        lastErrorText = await response.text();
        lastStatus = response.status;
        console.error("Gemini API error:", lastStatus, lastErrorText);
        response = null;
      }
      break;
    }

    if (!response) {
      const errorMsg = lastStatus === 429
        ? "Gemini API is busy. Please wait a moment and try again."
        : "AI service unavailable";
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: lastStatus === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE stream to OpenAI-compatible SSE stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                // Emit OpenAI-compatible SSE
                const chunk = {
                  choices: [{ delta: { content: text } }],
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              }
            } catch {
              // skip unparseable
            }
          }
        }

        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        console.error("Stream transform error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("gemini-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});