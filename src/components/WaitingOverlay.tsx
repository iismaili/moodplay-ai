interface WaitingOverlayProps {
  message: string;
}

export function WaitingOverlay({ message }: WaitingOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 p-6 text-center" role="status">
      <div>
        <p className="text-sm tracking-[0.18em] text-sky-300 uppercase">Yeni ziyaretçi bekleniyor</p>
        <p className="mt-3 text-4xl font-semibold text-balance text-white sm:text-5xl">{message}</p>
      </div>
    </div>
  );
}
