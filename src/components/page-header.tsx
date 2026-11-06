import { BackButton } from '~/components/back-button';

/** A page title with its back button at the top, before any content. */
export function PageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {onBack && <BackButton onClick={onBack} />}
      <h1 className="text-2xl font-bold tracking-[-0.025em] text-foreground">
        {title}
      </h1>
    </div>
  );
}
