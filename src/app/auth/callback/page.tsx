import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";

type AuthCallbackPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    error_description?: string | string[];
    redirect?: string | string[];
  }>;
};

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const params = await searchParams;

  return (
    <AuthCallbackClient
      initialError={getOAuthError(params.error, params.error_description)}
      redirectPath={getSafeRedirectPath(params.redirect)}
    />
  );
}

function getOAuthError(
  error: string | string[] | undefined,
  errorDescription: string | string[] | undefined,
) {
  const description = Array.isArray(errorDescription)
    ? errorDescription[0]
    : errorDescription;
  const rawError = Array.isArray(error) ? error[0] : error;

  return description ?? rawError ?? null;
}

function getSafeRedirectPath(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue?.startsWith("/") || rawValue.startsWith("//")) {
    return "/home";
  }

  return rawValue;
}
