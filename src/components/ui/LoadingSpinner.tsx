import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ text = 'Carregando...', size = 'md' }: LoadingSpinnerProps) {
  const dotSize = size === 'sm' ? 8 : size === 'md' ? 10 : 14;
  const containerSize = size === 'sm' ? 40 : size === 'md' ? 56 : 72;
  const radius = containerSize / 2 - dotSize / 2 - 4;

  const dots = [0, 1, 2, 3, 4, 5];
  const colors = [
    'var(--color-primary)',
    'var(--color-accent-teal)',
    'var(--color-success)',
    'var(--color-primary)',
    'var(--color-accent-teal)',
    'var(--color-success)',
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative" style={{ width: containerSize, height: containerSize }}>
        {/* Outer ring glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'var(--color-primary)',
            borderRightColor: 'var(--color-accent-teal)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Orbiting dots */}
        {dots.map((i) => {
          const angle = (i / dots.length) * 360;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: dotSize,
                height: dotSize,
                backgroundColor: colors[i],
                left: '50%',
                top: '50%',
                marginLeft: -dotSize / 2,
                marginTop: -dotSize / 2,
              }}
              animate={{
                x: [
                  Math.cos((angle * Math.PI) / 180) * radius,
                  Math.cos(((angle + 360) * Math.PI) / 180) * radius,
                ],
                y: [
                  Math.sin((angle * Math.PI) / 180) * radius,
                  Math.sin(((angle + 360) * Math.PI) / 180) * radius,
                ],
                scale: [0.6, 1, 0.6],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.15,
              }}
            />
          );
        })}

        {/* Center pulse */}
        <motion.div
          className="absolute rounded-full bg-[var(--color-primary)]"
          style={{
            width: dotSize * 1.2,
            height: dotSize * 1.2,
            left: '50%',
            top: '50%',
            marginLeft: -(dotSize * 1.2) / 2,
            marginTop: -(dotSize * 1.2) / 2,
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {text && (
        <motion.p
          className="text-sm text-[var(--text-tertiary)] font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}
