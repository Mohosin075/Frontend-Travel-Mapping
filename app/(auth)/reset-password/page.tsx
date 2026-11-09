import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import loginImage from "@/public/auth/login.png";

export default async function page({ searchParams }: { searchParams: Promise<{ flow?: string }> }) {
  const { flow } = await searchParams;
  const isSettingPassword = flow === "setup" || flow === "invite";
  return (
    <AuthLayout
      titleKey={isSettingPassword ? "auth.layout_setup_title" : "auth.layout_reset_title"}
      descriptionKey={isSettingPassword ? "auth.layout_setup_desc" : "auth.layout_reset_desc"}
      image={loginImage}
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
