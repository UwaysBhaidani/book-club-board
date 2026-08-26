"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";

const MAX_BYTES = 3 * 1024 * 1024;

export default function EditAvatarForm({
  userId,
  currentAvatarUrl,
}: {
  userId: string;
  currentAvatarUrl: string | null;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 3MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setUploading(false);
      setError("Couldn't upload that image — try again.");
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    setUploading(false);
    if (updateError) {
      setError("Couldn't save your new picture — try again.");
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    setUploading(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);
    setUploading(false);
    if (updateError) {
      setError("Couldn't remove your picture — try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-ink-soft">Profile picture</span>
      <div className="flex items-center gap-3">
        <Avatar avatarUrl={currentAvatarUrl} seed={userId} size={56} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-pill border border-border px-4 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Change picture"}
          </button>
          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="rounded-pill border border-border px-4 py-1.5 text-sm text-ink-soft hover:border-accent hover:text-accent-ink disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-xs text-accent-ink">{error}</p>}
    </div>
  );
}
