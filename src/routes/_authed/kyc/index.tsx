import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAuth } from '~/contexts/auth/auth-context';
import { bloque } from '~/lib/bloque';

export const Route = createFileRoute('/_authed/kyc/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { history } = useRouter();

  const { user } = useAuth();
  const startedForUrnRef = useRef<string | null>(null);
  const verificationQuery = useQuery({
    queryKey: ['kyc-verification', user?.urn],
    enabled: !!user?.urn,
    retry: false,
    queryFn: async () =>
      bloque.compliance.kyc.getVerification({ urn: user.urn }),
  });
  const startVerification = useMutation({
    mutationFn: async (urn: string) =>
      bloque.compliance.kyc.startVerification({ urn }),
  });
  const shouldStartVerification =
    (verificationQuery.isSuccess && !verificationQuery.data?.url) ||
    (verificationQuery.isError && isNotFoundError(verificationQuery.error));

  useEffect(() => {
    if (!user?.urn) return;
    if (!shouldStartVerification) return;
    if (startedForUrnRef.current === user.urn) return;
    startedForUrnRef.current = user.urn;
    startVerification.mutate(user.urn);
  }, [user?.urn, shouldStartVerification, startVerification.mutate]);

  if (!user?.urn) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No encontramos la URN del usuario para iniciar KYC.
        </p>
        <Link
          to="/"
          replace
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  const verificationUrl =
    verificationQuery.data?.url ?? startVerification.data?.url ?? null;
  const hasUnhandledGetError =
    verificationQuery.isError && !isNotFoundError(verificationQuery.error);

  if (
    verificationQuery.isPending ||
    (shouldStartVerification &&
      (startVerification.isPending || !verificationUrl))
  ) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Iniciando verificación KYC...
        </p>
      </div>
    );
  }

  if (hasUnhandledGetError || startVerification.isError || !verificationUrl) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No fue posible iniciar la verificación en este momento.
        </p>
        <Link
          to="/"
          replace
          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      <iframe
        src={verificationUrl}
        title="Verificación KYC"
        className="h-full w-full border-0"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
        <button
          type="button"
          onClick={() => history.back()}
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/85 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
      </div>
    </div>
  );
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (
    'status' in error &&
    typeof (error as { status?: unknown }).status === 'number' &&
    (error as { status: number }).status === 404
  );
}
