import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("status", "previous")
    .order("finished_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-stone-800">Previous Reads</h1>
      <p className="mb-6 text-sm text-stone-500">
        Every book the club has finished, with its discussion board preserved.
      </p>

      {(!books || books.length === 0) && (
        <p className="text-sm text-stone-400">No finished books yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {books?.map((b) => (
          <Link
            key={b.id}
            href={`/archive/${b.id}`}
            className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-300"
          >
            <h2 className="text-lg font-medium text-stone-800">{b.title}</h2>
            {b.author && <p className="text-sm text-stone-500">by {b.author}</p>}
            {b.finished_at && (
              <p className="mt-1 text-xs text-stone-400">Finished {b.finished_at}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
