import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ text = 'Carregando...', size = 'md' }: LoadingSpinnerProps) {
  const containerSize = size === 'sm' ? 24 : size === 'md' ? 40 : 56;
  const dotSize = size === 'sm' ? 6 : size === 'md' ? 10 : 14;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        style={{ height: containerSize }} 
        className="flex items-center justify-center gap-2 relative"
      >
        {/* Glow backdrop for liquid glass effect */}
        <div className="absolute inset-0 bg-[var(--color-primary)] opacity-10 blur-xl rounded-full pointer-events-none" />
        
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            style={{ width: dotSize, height: dotSize }}
            className="rounded-full bg-[var(--color-primary)]/80 backdrop-blur-md shadow-[0_0_12px_rgba(var(--color-primary),0.5)] border border-white/10"
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.4, 1, 0.4] 
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.2,
            }}
          />
        ))}
      </div>

      {text && (
        <motion.p
          className="text-sm text-[var(--text-secondary)] font-medium tracking-wide"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
