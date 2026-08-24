import BookLoader from "@/components/BookLoader";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-accent-ink">
      <BookLoader className="h-8 w-9" />
    </div>
  );
}
