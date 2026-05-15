import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

let isFirstLoad = true;
if (typeof window !== "undefined") {
  isFirstLoad = !sessionStorage.getItem("animated_number_init");
}

interface AnimatedNumberProps {
  value: number;
  format?: "currency" | "number" | "compact";
  className?: string;
}

export function AnimatedNumber({ value, format = "currency", className }: AnimatedNumberProps) {
  const [initialValue] = useState(() => (isFirstLoad ? 0 : value));

  const springValue = useSpring(initialValue, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    if (isFirstLoad) {
      sessionStorage.setItem("animated_number_init", "true");
      isFirstLoad = false;
    }
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
