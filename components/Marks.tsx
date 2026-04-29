type MarkProps = {
  className?: string;
};

export function HeartMark({ filled = false, className }: MarkProps & { filled?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={filled ? "currentColor" : "none"}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 20.2s-7.1-4.4-8.6-9.1C2.3 7.7 4.2 4.6 7.4 4.6c1.8 0 3.3 1 4.1 2.4.8-1.4 2.3-2.4 4.1-2.4 3.2 0 5.1 3.1 4 6.5-1.5 4.7-7.6 9.1-7.6 9.1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CircleMark({ className }: MarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M18.3 10.7a6.5 6.5 0 0 0-11.6-2.4M5.7 13.3a6.5 6.5 0 0 0 11.6 2.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M17.7 10.7h-3.1V7.6M6.3 13.3h3.1v3.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ArrowMark({ className }: MarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M8 16 16 8m-6.2 0H16v6.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function DislikeMark({ className }: MarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M12 6.5v10.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M8.3 13.3 12 16.9l3.7-3.6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function LedgerMark({ className }: MarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M6.5 8.2c3.5-.4 7-.4 11 0M6.5 12c3.7-.3 7.3-.3 11 0M6.5 15.8c3.5.4 7.1.4 11 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
