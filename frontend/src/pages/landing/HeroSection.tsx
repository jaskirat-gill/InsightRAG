import { useRef, useEffect, useState } from 'react'
import { m, useScroll, useTransform } from 'motion/react'
import { ArrowRight, ArrowUpRight, ChevronDown, Database, Search, MessageSquare, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* ── shooting stars ── */
interface Star {
  id: number
  x: number
  y: number
  angle: number
  speed: number
  length: number
  delay: number
  opacity: number
}

function ShootingStars() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    let id = 0
    const spawn = () => {
      const star: Star = {
        id: id++,
        x: Math.random() * 120 - 10,
        y: Math.random() * 40 - 10,
        angle: 25 + Math.random() * 30,
        speed: 1.2 + Math.random() * 1.5,
        length: 60 + Math.random() * 100,
        delay: 0,
        opacity: 0.3 + Math.random() * 0.5,
      }
      setStars((prev) => [...prev.slice(-12), star])
    }
    spawn()
    const interval = setInterval(spawn, 800 + Math.random() * 1200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => {
        const rad = (s.angle * Math.PI) / 180
        const dx = Math.cos(rad) * 120
        const dy = Math.sin(rad) * 120
        return (
          <m.div
            key={s.id}
            className="absolute"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: s.length,
              height: 1.5,
              background: `linear-gradient(90deg, rgba(125,211,252,${s.opacity}), transparent)`,
              transformOrigin: '0 50%',
              rotate: `${s.angle}deg`,
            }}
            initial={{ opacity: 0, x: 0, y: 0, scaleX: 0 }}
            animate={{
              opacity: [0, s.opacity, 0],
              x: [0, dx * s.speed],
              y: [0, dy * s.speed],
              scaleX: [0, 1, 0.5],
            }}
            transition={{ duration: s.speed, ease: 'easeOut' }}
            onAnimationComplete={() =>
              setStars((prev) => prev.filter((star) => star.id !== s.id))
            }
          />
        )
      })}
    </div>
  )
}

/* ── floating particles ── */
function Particles() {
  const dots = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 3,
  }))

  return (
    <div className="pointer-events-none absolute inset-0">
      {dots.map((d) => (
        <m.div
          key={d.id}
          className="absolute rounded-full bg-sky-300"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [0, -20, -40],
          }}
          transition={{
            duration: d.duration,
            repeat: Infinity,
            delay: d.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

/* ── floating label node ── */
function FloatingNode({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  )
}

/* ── marquee ── */
const marqueeWords = [
  'Knowledge Bases',
  'RAG Search',
  'Cloud Sync',
  'Document Health',
  'MCP Tools',
  'Streaming Chat',
  'Smart Retrieval',
  'Auto Ingestion',
]

function Marquee() {
  const items = [...marqueeWords, ...marqueeWords]
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden border-t border-white/5 bg-black/30 py-4 backdrop-blur-sm">
      <m.div
        className="flex w-max gap-6"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-sky-400/20 bg-sky-400/5 px-5 py-2 text-sm font-medium text-sky-300/70"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400/50" />
            {word}
          </span>
        ))}
      </m.div>
    </div>
  )
}

/* ── hero ── */
export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [0, -120])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#060d1b]"
    >
      {/* Multi-colour aurora blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/25 via-blue-600/15 to-transparent blur-[120px]" />
        <div className="absolute right-[-5%] top-[15%] h-[500px] w-[500px] rounded-full bg-gradient-to-l from-cyan-400/15 via-teal-500/8 to-transparent blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] h-[500px] w-[600px] rounded-full bg-gradient-to-tr from-blue-700/15 via-indigo-500/8 to-transparent blur-[100px]" />
        <div className="absolute bottom-[20%] right-[20%] h-[350px] w-[350px] rounded-full bg-gradient-to-tl from-sky-400/8 via-white/[0.02] to-transparent blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* Shooting stars & particles */}
      <ShootingStars />
      <Particles />

      {/* Floating nodes */}
      <div className="pointer-events-none absolute inset-0">
        <FloatingNode className="absolute left-[8%] top-[18%] hidden lg:block" delay={0.6}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/5 backdrop-blur-sm">
              <Database className="h-4 w-4 text-sky-400/70" />
            </div>
            <div>
              <div className="text-sm font-medium text-white/70">Knowledge Base</div>
              <div className="text-xs text-white/30">142 documents</div>
            </div>
          </div>
        </FloatingNode>

        <FloatingNode className="absolute right-[10%] top-[22%] hidden lg:block" delay={0.8}>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-right text-sm font-medium text-white/70">Cloud Sync</div>
              <div className="text-right text-xs text-white/30">Real-time</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/5 backdrop-blur-sm">
              <Cloud className="h-4 w-4 text-sky-300/70" />
            </div>
          </div>
        </FloatingNode>

        <FloatingNode className="absolute bottom-[25%] left-[12%] hidden lg:block" delay={1.0}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/5 backdrop-blur-sm">
              <Search className="h-4 w-4 text-sky-300/70" />
            </div>
            <div>
              <div className="text-sm font-medium text-white/70">RAG Search</div>
              <div className="text-xs text-white/30">5x faster</div>
            </div>
          </div>
        </FloatingNode>

        <FloatingNode className="absolute bottom-[22%] right-[8%] hidden lg:block" delay={1.2}>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-right text-sm font-medium text-white/70">MCP Chat</div>
              <div className="text-right text-xs text-white/30">Streaming</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/5 backdrop-blur-sm">
              <MessageSquare className="h-4 w-4 text-sky-400/70" />
            </div>
          </div>
        </FloatingNode>

        {/* Curved lines */}
        <svg className="absolute left-[6%] top-[16%] hidden h-[70%] w-[88%] lg:block" viewBox="0 0 1000 600" fill="none">
          <path d="M 80 120 Q 200 80 320 200 Q 440 320 500 300" stroke="url(#l1)" strokeWidth="0.5" opacity="0.3" />
          <path d="M 920 140 Q 800 100 680 220 Q 560 340 500 300" stroke="url(#l2)" strokeWidth="0.5" opacity="0.3" />
          <path d="M 120 480 Q 240 440 360 380 Q 440 340 500 300" stroke="url(#l3)" strokeWidth="0.5" opacity="0.2" />
          <path d="M 880 460 Q 760 420 640 370 Q 560 340 500 300" stroke="url(#l4)" strokeWidth="0.5" opacity="0.2" />
          <defs>
            <linearGradient id="l1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(56,189,248,0.6)" /><stop offset="100%" stopColor="rgba(56,189,248,0)" /></linearGradient>
            <linearGradient id="l2" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stopColor="rgba(96,165,250,0.6)" /><stop offset="100%" stopColor="rgba(96,165,250,0)" /></linearGradient>
            <linearGradient id="l3" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(125,211,252,0.4)" /><stop offset="100%" stopColor="rgba(125,211,252,0)" /></linearGradient>
            <linearGradient id="l4" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stopColor="rgba(147,197,253,0.4)" /><stop offset="100%" stopColor="rgba(147,197,253,0)" /></linearGradient>
          </defs>
        </svg>
      </div>

      {/* ── Center content with POP-UP animation ── */}
      <m.div
        style={{ y, opacity }}
        className="relative z-10 mx-auto max-w-5xl px-6 text-center"
      >
        <div className="space-y-7">
          {/* Badge — fade in */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-5 backdrop-blur-md">
              <img src="/logo-icon.png" alt="InsightRAG" className="h-8 w-8 rounded-full object-cover" />
              <span className="text-sm font-medium text-white/80">InsightRAG Workspace</span>
              <ArrowRight className="h-3.5 w-3.5 text-white/40" />
            </div>
          </m.div>

          {/* Heading — POP UP from center (scale + opacity) */}
          <m.h1
            className="mx-auto max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl"
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            Your team knowledge,{' '}
            <m.span
              className="inline-block bg-gradient-to-r from-sky-400 via-blue-300 to-sky-500 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.6, filter: 'blur(16px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              unified and searchable
            </m.span>
          </m.h1>

          {/* Subtitle — slide from right */}
          <m.p
            className="mx-auto max-w-2xl text-lg leading-8 text-slate-400"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            Connect your storage, sync documents automatically, monitor ingestion health, and
            query everything through a RAG-powered chat — all from one calm workspace.
          </m.p>

          {/* Buttons — pop up */}
          <m.div
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button
              asChild
              className="h-12 rounded-2xl border border-white/10 bg-white px-8 text-base font-medium text-slate-950 shadow-[0_0_30px_-5px_rgba(56,189,248,0.3)] transition-all hover:bg-sky-50 hover:shadow-[0_0_40px_-5px_rgba(56,189,248,0.5)]"
            >
              <a href="/">
                Get Started
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button
              onClick={scrollToFeatures}
              className="h-12 rounded-2xl border border-white/15 bg-white/5 px-8 text-base font-medium text-white/90 backdrop-blur-sm transition-all hover:border-white/25 hover:bg-white/10"
            >
              Discover More
            </Button>
          </m.div>
        </div>
      </m.div>

      {/* Bottom-left scroll indicator */}
      <m.div
        className="absolute bottom-16 left-8 z-20 flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        <m.div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/20 bg-sky-400/5"
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-4 w-4 text-sky-400/50" />
        </m.div>
        <span className="text-xs font-medium tracking-wider text-white/30">SCROLL DOWN</span>
      </m.div>

      <Marquee />
    </section>
  )
}
