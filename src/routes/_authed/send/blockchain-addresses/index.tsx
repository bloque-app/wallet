import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/_authed/send/blockchain-addresses/')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          to="/send"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Direcciones blockchain
        </h1>
      </div>

      <div className="rounded-2xl border border-border/75 bg-card/80 p-4">
        <p className="text-sm text-muted-foreground">
          Esta funcionalidad estara disponible pronto.
        </p>
      </div>
    </div>
  );
}
