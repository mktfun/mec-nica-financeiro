import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  position?: "center" | "right";
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
  full: "max-w-[95vw]",
};

export function Modal({ isOpen, onClose, title, children, footer, position = "center", size = "md" }: ModalProps) {
  const isSheet = position === "right";
  const maxWidthClass = sizeClasses[size] || "max-w-lg";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-[var(--bg-canvas)]/80 backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Container */}
          <motion.div
            initial={isSheet ? { x: "100%", opacity: 0.5 } : { scale: 0.95, opacity: 0, y: 20 }}
            animate={isSheet ? { x: 0, opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={isSheet ? { x: "100%", opacity: 0.5 } : { scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`pointer-events-auto bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden ${
              isSheet
                ? "absolute top-0 right-0 h-full w-full max-w-md rounded-l-[var(--radius-xl)]"
                : `relative w-full ${maxWidthClass} rounded-[var(--radius-xl)] max-h-[85vh] m-4`
            }`}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h2 className="font-display font-semibold text-lg">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-surface-hover)] transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
