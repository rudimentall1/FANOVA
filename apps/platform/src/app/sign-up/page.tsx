import { SignUpForm } from "@/components/auth/auth-ui";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const params = await searchParams;
  const requested = params.callbackURL ?? "/dashboard";
  const callbackURL = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/dashboard";
  return <SignUpForm callbackURL={callbackURL} />;
}