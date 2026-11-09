import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import loginImage from "@/public/auth/login.png";

export default function SetPasswordPage() {
  return <AuthLayout titleKey="auth.layout_setup_title" descriptionKey="auth.layout_setup_desc" image={loginImage}>
    <ForgotPasswordForm mode="setup" />
  </AuthLayout>;
}
