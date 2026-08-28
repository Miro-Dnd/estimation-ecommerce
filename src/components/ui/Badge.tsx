import { cn } from "@/lib/utils";

export function Badge({
  children,
  color,
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        !color && "bg-slate-100 text-slate-700",
        className
      )}
      style={
        color
          ? { backgroundColor: `${color}1a`, color }
          : undefined
      }
    >
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {children}
    </span>
  );
}
