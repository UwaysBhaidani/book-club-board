import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "The Book Club",
  description: "Our book club discussion board",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();
    displayName = profile?.display_name ?? null;
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 font-sans">
        <NavBar displayName={displayName} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

