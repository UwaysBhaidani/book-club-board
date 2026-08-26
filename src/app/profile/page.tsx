import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditDisplayNameForm from "@/components/EditDisplayNameForm";
import EditAvatarForm from "@/components/EditAvatarForm";
import SignOutButton from "@/components/SignOutButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Profile</h1>
      <EditAvatarForm userId={user.id} currentAvatarUrl={profile?.avatar_url ?? null} />
      <div className="mt-6 border-t border-border pt-6">
        <EditDisplayNameForm userId={user.id} currentName={profile?.display_name ?? ""} />
      </div>
      <div className="mt-6 border-t border-border pt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
