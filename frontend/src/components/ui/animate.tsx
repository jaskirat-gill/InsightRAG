import * as React from "react"
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react"

import { cn } from "@/lib/utils"

const defaultTransition: Transition = {
  duration: 0.45,
  ease: [0.22, 1, 0.36, 1],
}

type SlideDirection = "up" | "down" | "left" | "right"

interface MotionProviderProps {
  children: React.ReactNode
}

function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

interface EffectProps extends Omit<React.ComponentPropsWithoutRef<typeof m.div>, "children"> {
  children: React.ReactNode
  delay?: number
  duration?: number
  blur?: boolean
  slide?: SlideDirection
  zoom?: boolean
  once?: boolean
}

const Effect = React.forwardRef<HTMLDivElement, EffectProps>(
  (
    {
      children,
      className,
      delay = 0,
      duration,
      blur = false,
      slide,
      zoom = false,
      once = true,
      ...props
    },
    ref,
  ) => {
    const reduceMotion = useReducedMotion()
    const localRef = React.useRef<HTMLDivElement | null>(null)
    const isInView = useInView(localRef, { once, amount: 0.2 })

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        localRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) ref.current = node
      },
      [ref],
    )

    const initial: Record<string, string | number> = {}
    if (blur && !reduceMotion) initial.filter = "blur(10px)"
    if (slide && !reduceMotion) {
      if (slide === "up") initial.y = 20
      if (slide === "down") initial.y = -20
      if (slide === "left") initial.x = 20
      if (slide === "right") initial.x = -20
    }
    if (zoom && !reduceMotion) initial.scale = 0.96
    if (!reduceMotion) initial.opacity = 0

    const animate: Record<string, string | number> = reduceMotion
      ? { opacity: 1 }
      : {
          opacity: isInView ? 1 : 0,
          x: isInView ? 0 : initial.x ?? 0,
          y: isInView ? 0 : initial.y ?? 0,
          scale: isInView ? 1 : initial.scale ?? 1,
          filter: isInView ? "blur(0px)" : initial.filter ?? "blur(0px)",
        }

    return (
      <m.div
        ref={setRefs}
        className={className}
        initial={reduceMotion ? false : initial}
        animate={animate}
        transition={{
          ...defaultTransition,
          duration: duration ?? defaultTransition.duration,
          delay,
        }}
        {...props}
      >
        {children}
      </m.div>
    )
  },
)
Effect.displayName = "Effect"

interface EffectsProps extends Omit<React.ComponentPropsWithoutRef<typeof m.div>, "children"> {
  children: React.ReactNode
  stagger?: number
}

function Effects({ children, className, stagger = 0.08, ...props }: EffectsProps) {
  const reduceMotion = useReducedMotion()
  const variants: Variants = {
    hidden: {},
    show: {
      transition: reduceMotion ? undefined : { staggerChildren: stagger },
    },
  }

  return (
    <m.div
      className={className}
      variants={variants}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </m.div>
  )
}

interface AnimatedPageProps extends Omit<EffectProps, "children"> {
  children: React.ReactNode
  pageKey: string
}

function AnimatedPage({ children, className, pageKey, ...props }: AnimatedPageProps) {
  return (
    <Effect
      key={pageKey}
      className={cn("w-full", className)}
      slide="up"
      blur
      duration={0.35}
      {...props}
    >
      {children}
    </Effect>
  )
}

export { AnimatedPage, Effect, Effects, MotionProvider }
