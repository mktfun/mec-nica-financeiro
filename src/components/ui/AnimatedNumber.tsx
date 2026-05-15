import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: "currency" | "number" | "compact";
  className?: string;
}

export function AnimatedNumber({ value, format = "currency", className }: AnimatedNumberProps) {
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  const displayValue = useTransform(springValue, (current) => {
    if (format === "currency") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(current);
    }
    if (format === "compact") {
      return new Intl.NumberFormat("pt-BR", {
        notation: "compact",
        compactDisplay: "short",
      }).format(current);
    }
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(current);
  });

  return <motion.span className={className}>{displayValue}</motion.span>;
}
