import { useRef, useEffect, useState } from 'react'
import { useInView } from 'motion/react'
import { Effect } from '@/components/ui/animate'

const stats = [
  { value: 10000, suffix: '+', label: 'Documents Processed', prefix: '' },
  { value: 99.9, suffix: '%', label: 'Uptime Reliability', prefix: '' },
  { value: 5, suffix: 'x', label: 'Faster Retrieval', prefix: '' },
  { value: 50, suffix: '+', label: 'Storage Integrations', prefix: '' },
]

function AnimatedCounter({
  value,
  suffix,
  prefix,
  inView,
}: {
  value: number
  suffix: string
  prefix: string
  inView: boolean
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const end = value
    const duration = 1500
    const startTime = performance.now()
    const isFloat = !Number.isInteger(value)

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = start + (end - start) * eased
      setDisplay(isFloat ? parseFloat(current.toFixed(1)) : Math.round(current))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, value])

  return (
    <span>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  )
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <section
      ref={ref}
      id="stats"
      className="sticky top-0 z-10 bg-gradient-to-br from-sky-50 via-white to-sky-50 py-24 dark:from-slate-900 dark:via-[hsl(240,6%,10%)] dark:to-slate-900"
    >
      <div className="mx-auto max-w-5xl px-6">
        <Effect slide="up" blur className="mb-16 text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl dark:text-white">
            Built for scale
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
            Trusted by teams to manage knowledge at any scale.
          </p>
        </Effect>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Effect key={stat.label} slide="up" delay={0.1 + i * 0.1}>
              <div className="text-center">
                <div className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl dark:text-white">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                    inView={inView}
                  />
                </div>
                <div className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </div>
              </div>
            </Effect>
          ))}
        </div>
      </div>
    </section>
  )
}
