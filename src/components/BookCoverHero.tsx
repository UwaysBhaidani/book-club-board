import BookHero from "./BookHero";
import FinishBookButton from "./FinishBookButton";

export default function BookCoverHero({
  bookId,
  title,
  author,
  coverUrl,
  isAdmin,
}: {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  isAdmin: boolean;
}) {
  return (
    <BookHero title={title} author={author} coverUrl={coverUrl} eyebrow="Currently Reading">
      {isAdmin && (
        <div className="mt-2 flex flex-col items-center gap-2 sm:items-start">
          <FinishBookButton bookId={bookId} />
        </div>
      )}
    </BookHero>
  );
}
