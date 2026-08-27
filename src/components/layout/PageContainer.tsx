import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PageContainerVariant = 'finance' | 'dense' | 'contained' | 'fluid';

export interface PageContainerProps {
  variant?: PageContainerVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<PageContainerVariant, string> = {
  // Telas densas de conciliação diária, extratos e dashboards analíticos (1600px / 1800px no 2xl)
  finance: 'max-w-[1600px] 2xl:max-w-[1800px] mx-auto w-full px-4 md:px-6 2xl:px-8',
  // Telas operacionais e listas padrão
  dense: 'max-w-[1400px] mx-auto w-full px-4 md:px-6',
  // Formulários, configurações de conta, autenticação
  contained: 'max-w-[1000px] mx-auto w-full px-4 md:px-6',
  // Visualizações panorâmicas irrestritas com padding seguro
  fluid: 'w-full px-4 md:px-6 2xl:px-8',
};

export function PageContainer({
  variant = 'finance',
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('w-full pb-16 flex flex-col gap-6 transition-all duration-200', variantStyles[variant], className)}>
      {children}
    </div>
  );
}
