import { LoginForm } from "@/app/login/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    redirect?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const mode = getAuthMode(params.mode);
  const redirectPath = getSafeRedirectPath(params.redirect);

  return <LoginForm initialMode={mode} redirectPath={redirectPath} />;
}

function getAuthMode(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue === "signup" ? "signup" : "login";
}

function getSafeRedirectPath(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue?.startsWith("/") || rawValue.startsWith("//")) {
    return "/home";
  }

  return rawValue;
}
