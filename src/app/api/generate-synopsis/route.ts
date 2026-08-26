import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { title, author, rawDescription } = await request.json();

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Write a short synopsis of the book "${title}"${author ? ` by ${author}` : ""} for a book club's proposed-reads list.

Requirements:
- 2-3 sentences, roughly 40-60 words.
- Spoiler-free: no plot twists, no ending, no character deaths.
- Engaging back-cover tone, not a dry summary.
- Plain text only, no markdown formatting, no quotation marks around it.
${rawDescription ? `\nHere is a rough existing description you can use as reference (clean it up, don't just copy it verbatim):\n${rawDescription}` : ""}

Respond with ONLY the synopsis text, nothing else.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return NextResponse.json({ error: `AI request failed: ${text}` }, { status: 502 });
    }

    const data = await aiRes.json();
    const synopsis = (data?.content?.[0]?.text ?? "").trim();
    if (!synopsis) throw new Error("Empty AI response");

    return NextResponse.json({ synopsis });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 502 }
    );
  }
}
