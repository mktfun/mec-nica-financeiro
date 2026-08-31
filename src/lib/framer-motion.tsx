import React, { forwardRef, useEffect, useState, useRef, useSyncExternalStore } from 'react';

export type Variants = Record<string, any>;

class MotionValue<T = any> {
  protected value: T;
  protected listeners = new Set<(val: T) => void>();

  constructor(initial: T) {
    this.value = initial;
  }

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
    this.listeners.forEach((fn) => fn(this.value));
  }

  on(event: 'change', callback: (val: T) => void): () => void {
    if (event === 'change') {
      this.listeners.add(callback);
      return () => {
        this.listeners.delete(callback);
      };
    }
    return () => {};
  }

  onChange(callback: (val: T) => void): () => void {
    return this.on('change', callback);
  }

  subscribe(callback: () => void): () => void {
    const cb = () => callback();
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}

class SpringMotionValue extends MotionValue<number> {
  private target: number;
  private animFrameId: number | null = null;

  constructor(initial: number) {
    super(initial);
    this.target = initial;
  }

  set(next: number): void {
    this.target = next;
    const start = this.value;
    const diff = this.target - start;

    if (Math.abs(diff) < 0.001) {
      super.set(this.target);
      return;
    }

    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
    }

    const duration = 400;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * ease;
      super.set(current);

      if (progress < 1 && typeof requestAnimationFrame !== 'undefined') {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        super.set(this.target);
        this.animFrameId = null;
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animFrameId = requestAnimationFrame(tick);
    } else {
      super.set(next);
    }
  }

  destroy(): void {
    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
    }
  }
}

export function useMotionValue<T>(initial: T): MotionValue<T> {
  const ref = useRef<MotionValue<T> | null>(null);
  if (!ref.current) {
    ref.current = new MotionValue<T>(initial);
  }
  return ref.current;
}

export function useSpring(source: number | MotionValue<number>, _config?: any) {
  const initial = typeof source === 'number' ? source : source?.get?.() ?? 0;
  const ref = useRef<SpringMotionValue | null>(null);
  if (!ref.current) {
    ref.current = new SpringMotionValue(initial);
  }

  useEffect(() => {
    if (typeof source === 'object' && source && 'on' in source) {
      return source.on('change', (v: number) => {
        ref.current?.set(v);
      });
    }
  }, [source]);

  useEffect(() => {
    return () => {
      ref.current?.destroy();
    };
  }, []);

  return ref.current;
}

export function useTransform<T, R>(
  value: MotionValue<T> | number,
  transformOrInput: ((val: T) => R) | number[],
  output?: R[]
): MotionValue<R> {
  const compute = (inputVal: any): R => {
    if (typeof transformOrInput === 'function') {
      return transformOrInput(inputVal);
    }
    if (Array.isArray(transformOrInput) && Array.isArray(output)) {
      const inRange = transformOrInput;
      const outRange = output;
      if (inRange.length < 2 || outRange.length < 2) return outRange[0];
      if (inputVal <= inRange[0]) return outRange[0];
      if (inputVal >= inRange[inRange.length - 1]) return outRange[outRange.length - 1];

      for (let i = 0; i < inRange.length - 1; i++) {
        if (inputVal >= inRange[i] && inputVal <= inRange[i + 1]) {
          const t = (inputVal - inRange[i]) / (inRange[i + 1] - inRange[i]);
          if (typeof outRange[i] === 'number' && typeof outRange[i + 1] === 'number') {
            return ((outRange[i] as number) + t * ((outRange[i + 1] as number) - (outRange[i] as number))) as unknown as R;
          }
          return t > 0.5 ? outRange[i + 1] : outRange[i];
        }
      }
    }
    return inputVal as unknown as R;
  };

  const initialSource = typeof value === 'number' ? value : value?.get?.() ?? 0;
  const derived = useMotionValue<R>(compute(initialSource));

  useEffect(() => {
    if (typeof value === 'object' && value && 'on' in value) {
      return value.on('change', (val: T) => {
        derived.set(compute(val));
      });
    } else {
      derived.set(compute(value as any));
    }
  }, [value, transformOrInput, output, derived]);

  return derived;
}

function MotionChildRenderer({ child }: { child: any }) {
  const value = useSyncExternalStore(
    (onStoreChange) => child.subscribe(onStoreChange),
    () => child.get(),
    () => child.get()
  );
  return <>{value}</>;
}

function renderChildren(children: any): any {
  if (children && typeof children === 'object' && 'get' in children && 'subscribe' in children) {
    return <MotionChildRenderer child={children} />;
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => (
      <React.Fragment key={i}>{renderChildren(c)}</React.Fragment>
    ));
  }
  return children;
}

const componentCache = new Map<string, React.ForwardRefExoticComponent<any>>();

const createMotionComponent = (Tag: string) => {
  if (componentCache.has(Tag)) {
    return componentCache.get(Tag)!;
  }

  const Comp = forwardRef<any, any>(
    (
      {
        initial,
        animate,
        exit,
        transition,
        whileHover,
        whileTap,
        layout,
        layoutId,
        variants,
        children,
        ...props
      },
      ref
    ) => {
      const rendered = renderChildren(children);
      return React.createElement(Tag, { ref, ...props }, rendered);
    }
  );
  Comp.displayName = `motion.${Tag}`;
  componentCache.set(Tag, Comp);
  return Comp;
};

export const motion: any = new Proxy({}, {
  get: (_target, prop: string | symbol) => {
    if (typeof prop === 'symbol' || typeof prop !== 'string') {
      return undefined;
    }
    if (prop === 'then') return undefined;
    return createMotionComponent(prop);
  },
});

export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

export default {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
  useMotionValue,
};
