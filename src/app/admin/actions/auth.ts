"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate, createSession, destroySession, logActivity } from "@/lib/auth";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details" };

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return { error: "Those credentials do not match an active account." };

  await createSession(user);
  await logActivity(user.id, "login", "User", user.id, `${user.name} signed in`);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
