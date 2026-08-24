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

  const { sectionId, sectionTitle, bookTitle } = await request.json();

  if (!sectionId || !sectionTitle || !bookTitle) {
    return NextResponse.json({ error: "Missing sectionId, sectionTitle, or bookTitle" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let questions: string[] = [];
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
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: `You are helping a book club prepare discussion questions.
Book: "${bookTitle}"
Section: "${sectionTitle}"

Write 5 thoughtful, spoiler-appropriate discussion questions for a group discussing this section of the book. Avoid generic questions ("What did you think?"). Focus on themes, character choices, craft, and moments specific to this section.

Respond with ONLY a JSON array of 5 strings, no other text.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return NextResponse.json({ error: `AI request failed: ${text}` }, { status: 502 });
    }

    const data = await aiRes.json();
    const text = data?.content?.[0]?.text ?? "[]";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    questions = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    if (!Array.isArray(questions)) throw new Error("Unexpected AI response shape");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 502 }
    );
  }

  const { error: updateError } = await supabase
    .from("chapter_sections")
    .update({ suggested_questions: questions })
    .eq("id", sectionId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: questions.length });
}
