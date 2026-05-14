import { useEffect, useRef, useState } from "react";

export function CountUp({
  value,
  format,
  duration = 600,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = false;
    const start = performance.now();
    const from = 0;
    const to = value;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{format(n)}</span>;
}
