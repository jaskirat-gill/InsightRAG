import { useRef } from 'react'
import { useScroll, useTransform, type MotionValue } from 'motion/react'

export function useParallax(speed = 0.5): {
  ref: React.RefObject<HTMLDivElement | null>
  y: MotionValue<number>
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, -200 * speed])
  return { ref, y }
}

export function useScrollFade(range: [number, number] = [0.6, 1]): {
  ref: React.RefObject<HTMLDivElement | null>
  opacity: MotionValue<number>
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const opacity = useTransform(scrollYProgress, range, [1, 0])
  return { ref, opacity }
}

export function useScrollScale(from = 0.95, to = 1): {
  ref: React.RefObject<HTMLDivElement | null>
  scale: MotionValue<number>
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const scale = useTransform(scrollYProgress, [0, 0.5], [from, to])
  return { ref, scale }
}
