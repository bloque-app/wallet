type SpinnerProps = {
  message?: string | null;
};

export function Spinner({ message }: SpinnerProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background">
      <div className="flex items-center gap-1">
        <img src="/thinking.gif" alt="Animación" className="w-8 h-8" />
        <span className="bg-gradient-to-r from-white to-[#4D4D4D] bg-clip-text text-transparent font-bold text-sm">
          {message ?? 'Cargando...'}
        </span>
      </div>
    </div>
  );
}
