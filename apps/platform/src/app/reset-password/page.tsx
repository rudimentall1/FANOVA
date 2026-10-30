import { ResetPasswordForm } from "@/components/auth/auth-ui";

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordForm token={params.token} invalidToken={Boolean(params.error)} />;
}