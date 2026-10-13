import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import BackButton from "@/components/BackButton";

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, phone, state, date_of_birth")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-[480px] mx-auto py-12 pb-20">
      <BackButton href="/dashboard" label="Back to dashboard" />
      <h1 className="hero-title-sm font-display font-bold mb-1.5">Profile</h1>
      <p className="text-paperDim text-sm mb-8">{user.email}</p>
      <ProfileForm
        userId={user.id}
        initial={{
          fullName: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          state: profile?.state ?? "",
          dob: profile?.date_of_birth ?? ""
        }}
      />
    </div>
  );
}