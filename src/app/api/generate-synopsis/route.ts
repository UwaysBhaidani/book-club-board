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

  const { title, author, rawDescription, pageCount } = await request.json();

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

  const needsPageCount = !pageCount;

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
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Write proposed-reads listing copy for the book "${title}"${author ? ` by ${author}` : ""} for a book club.

Requirements:
- "synopsis": 2-3 sentences, roughly 40-60 words. Spoiler-free (no plot twists, no ending, no character deaths). Engaging back-cover tone, not a dry summary. Plain text, no markdown, no surrounding quotation marks.
- "genre": a short slash-separated genre label, e.g. "Literary Fiction / Psychological Thriller" — 1-3 genres, no more.
- "discussion_appeal": ONE short sentence (under 20 words) that simply signals this book is rich for group discussion — e.g. that it's morally complicated, divisive, or leaves a lot to unpack — WITHOUT naming the specific themes, questions, or debates it raises. The club should discover those themselves; don't hand them the discussion topics. Spoiler-free. Plain text, no markdown, no surrounding quotation marks.
${rawDescription ? `\nHere is a rough existing description you can use as reference for the synopsis (clean it up, don't just copy it verbatim):\n${rawDescription}` : ""}
${needsPageCount ? `\nAlso estimate the page count of a typical print edition of this book (a single integer, your best approximate knowledge — it's fine to be approximate since editions vary).` : ""}

Respond with ONLY a JSON object of the form {"synopsis": "...", "genre": "...", "discussion_appeal": "..."${needsPageCount ? `, "page_count": <integer or null>` : ""}}, nothing else.`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return NextResponse.json({ error: `AI request failed: ${text}` }, { status: 502 });
    }

    const data = await aiRes.json();
    const text = data?.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    const synopsis = typeof parsed.synopsis === "string" ? parsed.synopsis.trim() : "";
    if (!synopsis) throw new Error("Empty AI response");

    const genre = typeof parsed.genre === "string" ? parsed.genre.trim() : null;
    const discussionAppeal =
      typeof parsed.discussion_appeal === "string" ? parsed.discussion_appeal.trim() : null;
    const generatedPageCount =
      needsPageCount && typeof parsed.page_count === "number" ? parsed.page_count : null;

    return NextResponse.json({
      synopsis,
      genre,
      discussion_appeal: discussionAppeal,
      page_count: generatedPageCount,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 502 }
    );
  }
}
