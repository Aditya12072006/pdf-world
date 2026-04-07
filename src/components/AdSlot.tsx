import { cn } from "@/lib/utils";

type AdVariant = "leaderboard" | "sidebar" | "processing";

const variantClasses: Record<AdVariant, string> = {
  leaderboard: "h-24 w-full",
  sidebar: "h-[520px] w-full",
  processing: "h-28 w-full",
};

type Props = {
  variant: AdVariant;
  slotLabel: string;
  className?: string;
};

export const AdSlot = ({ variant, slotLabel, className }: Props) => {
  return (
    <aside
      aria-label={`Advertisement ${slotLabel}`}
      className={cn(
        "rounded-2xl border border-brand-100/70 bg-white/95 p-3 shadow-card",
        variantClasses[variant],
        className,
      )}
    >
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-brand-500/40 bg-brand-50/40 text-center">
        <p className="px-4 text-sm font-semibold text-brand-900/70">
          AdSense Slot: {slotLabel}
        </p>
      </div>
    </aside>
  );
};
