import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { displayName, email, password, inviteCode } = await request.json();

  if (!displayName || !email || !password || !inviteCode) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const expectedCode = process.env.INVITE_CODE;
  if (!expectedCode) {
    return NextResponse.json(
      { error: "This site isn't fully set up yet: INVITE_CODE is missing on the server." },
      { status: 500 }
    );
  }

  if (inviteCode.trim() !== expectedCode) {
    return NextResponse.json({ error: "That invite code isn't right." }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "This site isn't fully set up yet: SUPABASE_SERVICE_ROLE_KEY is missing on the server." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
