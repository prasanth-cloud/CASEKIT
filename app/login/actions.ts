"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "/home");

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Email and password are required.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Unable to sign in.")}`);
  }

  const profile = {
    id: data.user.id,
    email: data.user.email ?? null,
    name: (data.user.user_metadata?.name as string | undefined) ?? null,
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
  if (profileError) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Signed in, but the workspace profile could not be initialized.")}`);
  }

  redirect(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/home");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
