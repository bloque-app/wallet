import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '~/components/ui/drawer';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useCreateVirtualAccount } from '~/hooks/accounts/use-virtual-account';

export function CreateAccountDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const createMutation = useCreateVirtualAccount();

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(
        name.trim() ? { name: name.trim() } : {},
      );
      onOpenChange(false);
      setName('');
      toast.success('Cuenta creada correctamente');
    } catch {
      toast.error('No se pudo crear la cuenta. Intenta de nuevo.');
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!createMutation.isPending) onOpenChange(next);
      }}
    >
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="text-lg font-bold tracking-[-0.02em]">
            Crear Nueva Cuenta
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-5 pb-2">
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="new-account-name"
              className="text-sm font-medium text-foreground"
            >
              Nombre (opcional)
            </Label>
            <Input
              id="new-account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
              placeholder="Ahorros, Negocio..."
              maxLength={40}
              disabled={createMutation.isPending}
              className="h-12 rounded-xl"
            />
          </div>
        </div>
        <DrawerFooter>
          <Button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="h-12 w-full rounded-xl text-sm font-medium"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
