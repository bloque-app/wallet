export type ShareableAlias = {
  alias: string;
  status: string;
  is_primary: boolean;
};

export function selectShareableAlias(aliases: ShareableAlias[]) {
  const activeAliases = aliases.filter((alias) => alias.status === 'active');
  return (
    activeAliases.find((alias) => alias.is_primary)?.alias ??
    activeAliases[0]?.alias ??
    ''
  );
}
