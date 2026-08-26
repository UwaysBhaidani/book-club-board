import Link from "next/link";
import { CoverThumb } from "./BookSearchPicker";

export default function BookTile({
  href,
  coverUrl,
  title,
  author,
  meta,
}: {
  href: string;
  coverUrl: string | null;
  title: string;
  author: string | null;
  meta?: string | null;
}) {
  return (
    <Link href={href} className="group flex flex-col gap-2">
      <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-card border border-border bg-accent-soft shadow-sm transition group-hover:border-accent-ink">
        <CoverThumb url={coverUrl} />
      </div>
      <div>
        <p className="truncate font-display text-sm text-ink">{title}</p>
        {author && <p className="truncate text-xs text-ink-soft">{author}</p>}
        {meta && <p className="mt-0.5 text-xs text-ink-faint">{meta}</p>}
      </div>
    </Link>
  );
}
