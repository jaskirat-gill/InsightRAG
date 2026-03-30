import { Database, Cloud, Activity, MessageSquare } from 'lucide-react'
import { m, useReducedMotion } from 'motion/react'
import { Effect, Effects } from '@/components/ui/animate'

const features = [
  {
    icon: Database,
    title: 'Knowledge Base Management',
    description:
      'Create, organize, and manage document collections with an intuitive interface. Import from multiple sources and keep everything structured.',
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description:
      'Automatically sync documents from your cloud storage providers. Changes are detected and ingested in real time.',
  },
  {
    icon: Activity,
    title: 'Document Health Monitoring',
    description:
      'Track ingestion status, monitor document health metrics, and get alerts when something needs attention.',
  },
  {
    icon: MessageSquare,
    title: 'RAG-Powered Chat',
    description:
      'Query your knowledge bases with natural language. Powered by OpenWebUI with streaming responses and MCP tool integration.',
  },
]

export default function FeaturesSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#060d1b] py-24 lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18%] h-[560px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/18 via-blue-600/10 to-transparent blur-[120px]" />
        <div className="absolute right-[-8%] top-[18%] h-[360px] w-[360px] rounded-full bg-gradient-to-l from-cyan-400/12 via-teal-500/6 to-transparent blur-[100px]" />
        <div className="absolute bottom-[-12%] left-[-8%] h-[420px] w-[520px] rounded-full bg-gradient-to-tr from-blue-700/12 via-indigo-500/6 to-transparent blur-[110px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="mx-auto max-w-6xl px-6">
        <Effects className="space-y-4 text-center">
          <Effect slide="up" blur>
            <div className="mx-auto inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/5 px-4 py-1.5 text-sm font-medium text-sky-300">
              Features
            </div>
          </Effect>
          <m.div
            initial={reduceMotion ? false : { opacity: 0, x: 120, filter: 'blur(12px)' }}
            whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ duration: 0.8, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Everything you need
            </h2>
          </m.div>
          <m.div
            initial={reduceMotion ? false : { opacity: 0, x: 80, filter: 'blur(10px)' }}
            whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.7 }}
            transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-400">
              A complete toolkit for managing, monitoring, and querying your organization's
              knowledge.
            </p>
          </m.div>
        </Effects>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <m.div
              key={feature.title}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      x: 140 + i * 20,
                      y: -180 - i * 18,
                      rotate: 8 + i * 2,
                      scale: 0.88,
                    }
              }
              whileInView={
                reduceMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      x: 0,
                      y: 0,
                      rotate: [8 + i * 2, -5, 2, 0],
                      scale: 1,
                    }
              }
              viewport={{ once: true, amount: 0.25 }}
              transition={
                reduceMotion
                  ? { duration: 0.2, delay: 0.04 * i }
                  : {
                      delay: 0.2 + i * 0.1,
                      duration: 1,
                      ease: [0.16, 1, 0.3, 1],
                      rotate: {
                        delay: 0.2 + i * 0.1,
                        duration: 1.15,
                        times: [0, 0.58, 0.8, 1],
                        ease: ['easeOut', 'easeOut', 'easeOut'],
                      },
                    }
              }
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group rounded-3xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur transition-colors hover:border-sky-400/30 hover:bg-sky-400/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-400/10 text-sky-400 transition-colors group-hover:bg-sky-400/20">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {feature.description}
              </p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
