'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { Separator } from '~/components/ui/separator';
import {
  formatKSM,
  formatPolygonAddress,
  type PolygonAccount,
} from '~/lib/mock-data';

interface PolygonAccountsDrawerProps {
  open: boolean;
  onClose: () => void;
  accounts: PolygonAccount[];
  onAddAccount: (label: string) => void;
  onRemoveAccount: (id: string) => void;
}

export function PolygonAccountsDrawer({
  open,
  onClose,
  accounts,
  onAddAccount,
  onRemoveAccount,
}: PolygonAccountsDrawerProps) {
  const handleAddAccount = () => {
    const label = window.prompt('Nombre de la nueva cuenta Polygon', '');
    if (!label) return;
    onAddAccount(label);
  };

  return (
    <Drawer open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-bold text-foreground">
              Cuentas Polygon
            </DrawerTitle>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription>
            Administra tus cuentas con saldo en KSM.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-5 pb-2">
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border/85 bg-card/75">
            {accounts.map((account, index) => (
              <div key={account.id}>
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {account.label}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {formatPolygonAddress(account.address)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatKSM(account.balance)}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveAccount(account.id)}
                      className="rounded-xl border border-transparent p-1 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      aria-label={`Eliminar ${account.label}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                {index < accounts.length - 1 && <Separator />}
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No tienes cuentas Polygon creadas.
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          <Button
            onClick={handleAddAccount}
            className="h-12 w-full gap-2 rounded-2xl text-sm"
          >
            <Plus className="h-4 w-4" />
            Add account
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
