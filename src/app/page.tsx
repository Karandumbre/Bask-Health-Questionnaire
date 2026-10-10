import { ROUTES } from "@/lib/constants/application";
import { redirect } from "next/navigation";
import { createClient, getServerVerifiedUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const user = await getServerVerifiedUser(supabase);

  if (user) {
    redirect(ROUTES.adminForms);
  }

  redirect(ROUTES.adminLogin);
}
