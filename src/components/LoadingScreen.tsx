export function LoadingScreen() {
  return (
    <div className="min-h-dvh w-full bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <span className="font-display text-4xl font-bold text-[#3A3A3A] tracking-tight">
        KOJO
      </span>
      <hr className="border-0 h-px w-16 bg-[#3A3A3A] mt-4" />
      <p className="text-[10px] font-normal uppercase tracking-[0.25em] text-[#3A3A3A] mt-4">
        Loading
      </p>
    </div>
  );
}
