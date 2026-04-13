import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Camera,
  KeyRound,
  LoaderCircle,
  QrCode,
  Settings2,
  X,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { cn } from '~/lib/utils';
import { type DecodedBrebQr, decodeBrebQr } from './-lib/breb';

export const Route = createFileRoute('/_authed/send/breb-keys/')({
  component: RouteComponent,
});

type ScannerView = 'menu' | 'scanner' | 'decoding';

const options = [
  {
    title: 'Registrar llave',
    description: 'Asocia una llave a tu cuenta',
    to: '/send/breb-keys/register-key',
    icon: KeyRound,
  },
  {
    title: 'Tus llaves',
    description: 'Gestiona tus llaves registradas',
    to: '/send/breb-keys/manage-keys',
    icon: Settings2,
  },
  {
    title: 'Pagar o transferir',
    description: 'Ingresa la llave o escanea el QR',
    to: '/send/breb-keys/pay-transfer',
    icon: QrCode,
  },
] as const;

function RouteComponent() {
  const navigate = useNavigate();
  const [payDrawerOpen, setPayDrawerOpen] = useState(false);
  const [scannerView, setScannerView] = useState<ScannerView>('menu');
  const [pendingQrValue, setPendingQrValue] = useState('');
  const scannerId = useId().replace(/:/g, '-');
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  const handledScanRef = useRef(false);

  useEffect(() => {
    if (scannerView !== 'scanner') {
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (cancelled) return;

        const scanner = new Html5Qrcode(scannerId);
        scannerRef.current = scanner;
        handledScanRef.current = false;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
          },
          (decodedText: string) => {
            if (handledScanRef.current) return;

            handledScanRef.current = true;
            setPendingQrValue(decodedText);
            setScannerView('decoding');

            void scanner
              .stop()
              .catch(() => undefined)
              .then(() => {
                scanner.clear();
              })
              .finally(() => {
                scannerRef.current = null;
              });
          },
          () => undefined,
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'No se pudo abrir la cámara.',
        );
        setScannerView('menu');
      }
    };

    void startScanner();

    return () => {
      cancelled = true;

      if (scannerRef.current) {
        const currentScanner = scannerRef.current;
        scannerRef.current = null;

        void currentScanner
          .stop()
          .catch(() => undefined)
          .then(() => {
            currentScanner.clear();
          });
      }
    };
  }, [scannerId, scannerView]);

  useEffect(() => {
    if (scannerView !== 'decoding' || !pendingQrValue) {
      return;
    }

    let cancelled = false;

    const handleDecodedQr = async () => {
      try {
        const decoded = await decodeBrebQr(pendingQrValue);

        if (cancelled) return;

        const normalizedKey = cleanSearchValue(
          decoded.key?.keyValue ?? decoded.resolution?.key?.keyValue ?? '',
        );
        const amount = cleanSearchValue(toMajorAmount(decoded.amount));
        const owner = (decoded.resolution?.owner ?? {}) as {
          businessName?: string | null;
          business_name?: string | null;
          name?: string | null;
          firstName?: string | null;
          secondName?: string | null;
          firstLastName?: string | null;
          secondLastName?: string | null;
          first_name?: string | null;
          second_name?: string | null;
          first_last_name?: string | null;
          second_last_name?: string | null;
        };
        const recipientBusinessName = cleanSearchValue(
          owner.businessName ?? owner.business_name ?? '',
        );
        const recipientOwnerName = cleanSearchValue(
          owner.name ??
            [
              owner.firstName ?? owner.first_name,
              owner.secondName ?? owner.second_name,
              owner.firstLastName ?? owner.first_last_name,
              owner.secondLastName ?? owner.second_last_name,
            ]
              .filter((value): value is string => !!value?.trim())
              .join(' ')
              .trim(),
        );
        const recipientParticipantName = cleanSearchValue(
          decoded.resolution?.participant?.name ?? '',
        );
        const recipientName =
          recipientBusinessName ||
          recipientOwnerName ||
          recipientParticipantName;

        setPayDrawerOpen(false);
        setPendingQrValue('');
        setScannerView('menu');

        void navigate({
          to: '/send/breb-keys/pay-transfer-qr',
          search: {
            key: normalizedKey,
            amount,
            qrType: normalizeQrType(decoded),
            resolutionId: decoded.resolutionId ?? '',
            recipientName,
            recipientOwnerName,
            recipientBusinessName,
            recipientParticipantName,
            merchantName: cleanSearchValue(
              decoded.merchant?.merchantName ?? '',
            ),
            qrCodeReference: decoded.qrCodeReference ?? '',
          },
        });
      } catch (error) {
        if (cancelled) return;

        toast.error(
          error instanceof Error
            ? error.message
            : 'No se pudo leer el QR BRE-B.',
        );
        setPendingQrValue('');
        setScannerView('scanner');
        handledScanRef.current = false;
      }
    };

    void handleDecodedQr();

    return () => {
      cancelled = true;
    };
  }, [navigate, pendingQrValue, scannerView]);

  const closeScanner = () => {
    setPendingQrValue('');
    handledScanRef.current = false;
    setScannerView('menu');
  };

  const handlePayTransferClick = () => {
    (
      window as Window & {
        __skipDrawerHistoryOnce?: boolean;
      }
    ).__skipDrawerHistoryOnce = true;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Link
          to="/send"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Llaves BRE-B
          </h1>
          <p className="text-xs text-muted-foreground">
            Envia a cualquier banco colombiano al instante
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        {options.map((option) => {
          const Icon = option.icon;
          if (option.to === '/send/breb-keys/pay-transfer') {
            return (
              <button
                key={option.to}
                type="button"
                onClick={() => setPayDrawerOpen(true)}
                className="text-left"
              >
                <div className="flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all hover:bg-muted/70">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-foreground">
                      {option.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          }

          return (
            <Link key={option.to} to={option.to}>
              <div
                className={cn(
                  'flex items-start gap-3 rounded-2xl border border-border/75 bg-card/80 p-4 transition-all hover:bg-muted/70',
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-background/85">
                  <Icon className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground">
                    {option.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <Drawer open={payDrawerOpen} onOpenChange={setPayDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Pagar o transferir</DrawerTitle>
            <DrawerDescription>
              Elige cómo quieres iniciar la transferencia.
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-3 px-5 pb-5">
            <DrawerClose asChild>
              <Link
                to="/send/breb-keys/pay-transfer"
                onClick={handlePayTransferClick}
                className="flex w-full flex-col items-start rounded-2xl border border-border/80 bg-card/80 p-4 text-left transition-all hover:bg-muted/70"
              >
                <span className="text-sm font-medium text-foreground">
                  Ingresar llave
                </span>
                <span className="text-xs text-muted-foreground">
                  Escribe la llave BRE-B del destinatario.
                </span>
              </Link>
            </DrawerClose>

            <button
              type="button"
              onClick={() => {
                setPayDrawerOpen(false);
                setScannerView('scanner');
              }}
              className="flex w-full flex-col items-start rounded-2xl border border-border/80 bg-card/80 p-4 text-left transition-all hover:bg-muted/70"
            >
              <span className="text-sm font-medium text-foreground">
                Escanear codigo QR
              </span>
              <span className="text-xs text-muted-foreground">
                Usa la cámara para leer un QR BRE-B.
              </span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {scannerView === 'scanner' ? (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Escanear codigo QR
                </p>
                <p className="text-xs text-muted-foreground">
                  Alinea el QR BRE-B dentro del recuadro.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-2xl"
                onClick={closeScanner}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-border/75 bg-card/80">
                <Camera className="h-6 w-6 text-foreground" />
              </div>
              <div
                id={scannerId}
                className="w-full max-w-sm overflow-hidden rounded-3xl border border-border/80 bg-card/70"
              />
              <p className="max-w-sm text-center text-xs text-muted-foreground">
                Si la cámara tarda en abrir, revisa los permisos del navegador.
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full max-w-sm rounded-2xl"
                onClick={closeScanner}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {scannerView === 'decoding' ? (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-border/75 bg-card/80">
              <LoaderCircle className="h-6 w-6 animate-spin text-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Procesando QR BRE-B
              </p>
              <p className="text-xs text-muted-foreground">
                Validando la información del destinatario.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizeQrType(decoded: DecodedBrebQr) {
  return String(decoded.type ?? '')
    .trim()
    .toLowerCase();
}

function toMajorAmount(rawAmount?: DecodedBrebQr['amount']) {
  const amountValue = rawAmount?.value ?? null;

  if (!amountValue) {
    return '';
  }

  const parsed = Number.parseFloat(amountValue);

  if (Number.isNaN(parsed)) {
    return '';
  }

  return String(Math.trunc(parsed));
}

function cleanSearchValue(value: string) {
  return value.trim().replace(/^"+|"+$/g, '');
}
