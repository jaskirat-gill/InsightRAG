import { Database, Cloud, Activity, MessageSquare } from 'lucide-react'
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
  return (
    <section
      id="features"
      className="relative bg-[#0d1f3c] py-24 lg:py-32"
    >
      <div className="mx-auto max-w-6xl px-6">
        <Effects className="space-y-4 text-center">
          <Effect slide="up" blur>
            <div className="mx-auto inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/5 px-4 py-1.5 text-sm font-medium text-sky-300">
              Features
            </div>
          </Effect>
          <Effect slide="up" blur delay={0.05}>
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Everything you need
            </h2>
          </Effect>
          <Effect slide="up" blur delay={0.1}>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-400">
              A complete toolkit for managing, monitoring, and querying your organization's
              knowledge.
            </p>
          </Effect>
        </Effects>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <Effect
              key={feature.title}
              slide="up"
              delay={0.1 + i * 0.08}
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
            </Effect>
          ))}
        </div>
      </div>
    </section>
  )
}
