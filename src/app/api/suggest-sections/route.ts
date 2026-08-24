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

  const { bookTitle, author, pageCount, pagesPerWeek } = await request.json();

  if (!bookTitle || !pageCount || !pagesPerWeek) {
    return NextResponse.json(
      { error: "Missing bookTitle, pageCount, or pagesPerWeek" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  let sections: string[] = [];
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
            content: `You are helping a book club plan a reading schedule.
Book: "${bookTitle}"${author ? ` by ${author}` : ""}
Total length: ${pageCount} pages
Target pace: about ${pagesPerWeek} pages per week

Divide the ENTIRE book into weekly reading sections using chapter numbers only, ending exactly at the book's real final chapter. Never mention page numbers in your output — many readers use e-readers, where page counts are meaningless.

First, recall the actual total number of chapters in this specific book if you know it with confidence. If you're not fully certain, reason from the page count and typical chapter length for a book like this (use the page count only for this internal estimate, not for the output) to make your best estimate — but you must commit to a specific final chapter number. Never use a vague placeholder like "end", and never invent a chapter number beyond what you believe is the real total.

Respond with one short sentence stating the total chapter count you're using, then on a new line output ONLY a JSON array of section title strings using chapter ranges, e.g. ["Chapters 1-6", "Chapters 7-14", "Chapters 15-20"].`,
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
    sections = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    if (!Array.isArray(sections)) throw new Error("Unexpected AI response shape");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 502 }
    );
  }

  return NextResponse.json({ sections });
}
