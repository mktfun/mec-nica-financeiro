import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDefaultDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  // Se "ontem" caiu no Domingo (0), volta mais um dia para Sábado (6)
  if (d.getDay() === 0) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
