import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '~/components/ui/select';
import { formatCOP } from '~/lib/formatters';
import type { BrebSourceAccount } from '../-lib/use-breb-source-accounts';

function getAccountLabel(account: BrebSourceAccount) {
  return account.key || account.displayName || 'Llave BRE-B';
}

function formatAccountBalance(account: BrebSourceAccount, precision: number) {
  const parsed = Number.parseInt(account.balance, 10);
  const amount = Number.isNaN(parsed) ? 0 : parsed / 10 ** precision;
  return formatCOP(amount);
}

export function BrebSourceAccountSelect({
  accounts,
  precision,
  value,
  onChange,
}: {
  accounts: BrebSourceAccount[];
  precision: number;
  value: string | null;
  onChange: (urn: string) => void;
}) {
  const selectedAccount = accounts.find((account) => account.urn === value);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="breb-source-account">Enviar desde</Label>
      <Select
        value={value ?? undefined}
        onValueChange={(next) => {
          if (next) onChange(next);
        }}
      >
        <SelectTrigger id="breb-source-account" className="h-12 rounded-2xl">
          {selectedAccount ? (
            <span>
              {getAccountLabel(selectedAccount)} ·{' '}
              {formatAccountBalance(selectedAccount, precision)}
            </span>
          ) : (
            <span className="text-muted-foreground">
              Selecciona una llave BRE-B
            </span>
          )}
        </SelectTrigger>
        <SelectContent>
          {accounts.map((account) => (
            <SelectItem key={account.urn} value={account.urn}>
              {getAccountLabel(account)} ·{' '}
              {formatAccountBalance(account, precision)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
