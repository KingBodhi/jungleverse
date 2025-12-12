"use server";

import { revalidatePath } from "next/cache";
import { userPreferenceSchema } from "@/lib/validators/users";
import { updateUserPreferences } from "@/lib/services/users";

export async function updatePreferencesAction(values: unknown) {
  const parsed = userPreferenceSchema.parse(values);
  await updateUserPreferences(parsed);
  revalidatePath("/dashboard");
  return { success: true } as const;
}
