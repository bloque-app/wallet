import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useVerification } from '~/hooks/kyc/use-verification';

export const Route = createFileRoute('/_authed/kyc/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { history } = useRouter();
  const { url, status, isBootstrapping, isError, hasUser } = useVerification();

  if (!hasUser) {
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

  if (isBootstrapping) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Iniciando verificación KYC...
        </p>
      </div>
    );
  }

  if (status === 'approved') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Tu identidad ya fue verificada.
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

  if (isError || !url) {
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
        src={url}
        title="Verificación KYC"
        className="h-full w-full border-0"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
        <button
          type="button"
          onClick={() => history.back()}
          className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/85 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </button>
      </div>
    </div>
  );
}
