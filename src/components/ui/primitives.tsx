import * as React from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export type ButtonVariant = "primary" | "secondary" | "dark" | "coral";
export type ButtonSize = "sm" | "md";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-yellow text-ms-black"
      : variant === "secondary"
        ? "bg-cream text-ms-black"
        : variant === "dark"
          ? "bg-ms-black text-cream"
          : "bg-coral text-ms-black";

  const sizeClass =
    size === "sm"
      ? "px-3 py-1.5 text-sm"
      : "px-4 py-2 text-[0.95rem]";

  return (
    <button
      type={type ?? "button"}
      className={cx(
        "ms-btn inline-flex items-center justify-center gap-2 rounded-md font-semibold",
        "select-none whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ms-black focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        variantClass,
        sizeClass,
        className,
      )}
      {...props}
    />
  );
}

export type LabelBadgeLabel = "main" | "testing" | "experimental" | "archived";
export type LabelBadgeProps = {
  label: LabelBadgeLabel;
  className?: string;
};

export function LabelBadge({ label, className }: LabelBadgeProps) {
  const bg =
    label === "main"
      ? "var(--green)"
      : label === "testing"
        ? "var(--yellow)"
        : label === "experimental"
          ? "var(--purple)"
          : "#ddd";

  return (
    <span
      className={cx(
        "ms-mono inline-flex items-center rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{
        background: bg,
        border: "2px solid var(--black)",
        color: "var(--black)",
      }}
    >
      {label}
    </span>
  );
}

export type PriorityLevel = "blocker" | "critical" | "high" | "medium" | "low";
export type PriorityDotProps = {
  priority: PriorityLevel;
  className?: string;
};

export function PriorityDot({ priority, className }: PriorityDotProps) {
  const color =
    priority === "blocker"
      ? "#ff0000"
      : priority === "critical"
        ? "var(--coral)"
        : priority === "high"
          ? "#ff9500"
          : priority === "medium"
            ? "var(--yellow)"
            : "var(--green)";

  return (
    <span
      aria-label={`Priority ${priority}`}
      title={`Priority: ${priority}`}
      className={cx("inline-block h-3 w-3 rounded-full", className)}
      style={{ background: color, border: "2px solid var(--black)" }}
    />
  );
}

export type Status = "open" | "in_progress" | "qa" | "resolved";
export type StatusPillProps = {
  status: Status;
  className?: string;
};

export function StatusPill({ status, className }: StatusPillProps) {
  const palette =
    status === "open"
      ? { bg: "#ffffff", fg: "var(--black)" }
      : status === "in_progress"
        ? { bg: "var(--blue)", fg: "#ffffff" }
        : status === "qa"
          ? { bg: "var(--purple)", fg: "#ffffff" }
          : { bg: "var(--green)", fg: "var(--black)" };

  const label =
    status === "in_progress" ? "in progress" : status.replace("_", " ");

  return (
    <span
      className={cx(
        "ms-mono inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: "2px solid var(--black)",
      }}
    >
      {label}
    </span>
  );
}

export type Sentiment = "positive" | "neutral" | "negative";
export type SentimentBadgeProps = {
  sentiment: Sentiment;
  className?: string;
};

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  const palette =
    sentiment === "positive"
      ? { bg: "var(--green)", fg: "var(--black)" }
      : sentiment === "neutral"
        ? { bg: "#eee", fg: "#555" }
        : { bg: "var(--coral)", fg: "#ffffff" };

  return (
    <span
      className={cx(
        "ms-mono inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: "2px solid var(--black)",
      }}
    >
      {sentiment}
    </span>
  );
}

export type StarDisplayProps = {
  rating: 1 | 2 | 3 | 4 | 5;
  className?: string;
};

export function StarDisplay({ rating, className }: StarDisplayProps) {
  return (
    <span className={cx("inline-flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const filled = idx < rating;
        return (
          <span
            key={idx}
            aria-hidden="true"
            className="text-[18px] leading-none"
            style={
              filled
                ? {
                    color: "var(--amber)",
                    WebkitTextStroke: "1px var(--black)",
                  }
                : {
                    color: "#ddd",
                  }
            }
          >
            ★
          </span>
        );
      })}
      <span className="sr-only">{`Rating: ${rating} out of 5`}</span>
    </span>
  );
}

export type TagChipType = "platform" | "category";
export type TagChipProps = {
  type: TagChipType;
  label: string;
  className?: string;
};

export function TagChip({ type, label, className }: TagChipProps) {
  const palette =
    type === "platform"
      ? { bg: "var(--blue)", fg: "#ffffff" }
      : { bg: "var(--purple)", fg: "#ffffff" };

  return (
    <span
      className={cx(
        "ms-mono inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{
        background: palette.bg,
        color: palette.fg,
        border: "2px solid var(--black)",
      }}
    >
      {label}
    </span>
  );
}

export type MonoBadgeProps = {
  label: string;
  className?: string;
};

export function MonoBadge({ label, className }: MonoBadgeProps) {
  return (
    <span
      className={cx(
        "ms-mono inline-flex items-center rounded px-2 py-1 text-[12px] font-semibold uppercase tracking-wide",
        className,
      )}
      style={{
        background: "#ffffff",
        border: "2px solid var(--black)",
        color: "var(--black)",
      }}
    >
      {label}
    </span>
  );
}

export type AIBadgeProps = {
  label?: string;
  className?: string;
};

export function AIBadge({ label = "AI", className }: AIBadgeProps) {
  return (
    <span
      className={cx(
        "ms-mono inline-flex items-center gap-2 rounded px-2 py-1 text-[12px] font-semibold uppercase tracking-wide",
        "transition-[transform,box-shadow] duration-150",
        className,
      )}
      style={{
        background: "var(--black)",
        color: "var(--yellow)",
        border: "2px solid var(--black)",
        boxShadow: "var(--shadow)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLSpanElement).style.boxShadow = "var(--shadow-lg)";
        (e.currentTarget as HTMLSpanElement).style.transform = "translate(-1px, -1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLSpanElement).style.boxShadow = "var(--shadow)";
        (e.currentTarget as HTMLSpanElement).style.transform = "translate(0px, 0px)";
      }}
    >
      <span aria-hidden="true">🧠</span>
      {label}
    </span>
  );
}

export type AIOutputBoxProps = {
  children: React.ReactNode;
  className?: string;
};

export function AIOutputBox({ children, className }: AIOutputBoxProps) {
  return (
    <section
      className={cx("ms-mono rounded-md p-4", className)}
      style={{
        background: "var(--black)",
        color: "var(--green)",
        border: "var(--border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div className="mb-2 text-[12px] font-semibold tracking-wide">
        ▸ AI OUTPUT
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export type SentimentBarProps = {
  positive: number;
  neutral: number;
  negative: number;
  className?: string;
};

export function SentimentBar({
  positive,
  neutral,
  negative,
  className,
}: SentimentBarProps) {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const p = safe(positive);
  const u = safe(neutral);
  const n = safe(negative);
  const total = p + u + n;
  const denom = total === 0 ? 1 : total;

  return (
    <div className={cx("w-full", className)}>
      <div
        className="flex h-4 w-full overflow-hidden rounded"
        style={{ border: "2px solid var(--black)", boxShadow: "var(--shadow)" }}
        role="img"
        aria-label={`Sentiment: ${Math.round((p / denom) * 100)}% positive, ${Math.round(
          (u / denom) * 100,
        )}% neutral, ${Math.round((n / denom) * 100)}% negative`}
      >
        <div style={{ flexGrow: p, background: "var(--green)" }} />
        <div style={{ flexGrow: u, background: "#eee" }} />
        <div style={{ flexGrow: n, background: "var(--coral)" }} />
      </div>
    </div>
  );
}

