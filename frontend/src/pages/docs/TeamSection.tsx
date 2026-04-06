import { m, useReducedMotion } from 'motion/react'
import { Effect } from '@/components/ui/animate'
import { Github } from 'lucide-react'

const team = [
  { name: 'Sherry Xia', github: 'Sherry-Rui-Xia', initials: 'SX' },
  { name: 'Jaskirat Gill', github: 'jaskirat-gill', initials: 'JG' },
  { name: 'Shibo Ai', github: 'AiShibo', initials: 'SA' },
  { name: 'Crystal Zhao', github: 'czhao1125', initials: 'CZ' },
]

const colors = [
  'from-sky-400 to-blue-500',
  'from-blue-400 to-indigo-500',
  'from-cyan-400 to-sky-500',
  'from-teal-400 to-cyan-500',
]

export default function TeamSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section
      id="team"
      className="relative overflow-hidden bg-white py-24 dark:bg-[#060d1b] lg:py-32"
    >
      <div className="pointer-events-none absolute inset-0 hidden dark:block">
        <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[500px] rounded-full bg-gradient-to-tr from-blue-700/10 via-indigo-500/5 to-transparent blur-[100px]" />
      </div>

      <div className="mx-auto max-w-4xl px-6">
        <Effect slide="up" blur className="mb-16 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            Our Team
          </div>
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white sm:text-5xl">
            Built by
          </h2>
        </Effect>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {team.map((member, i) => (
            <m.a
              key={member.github}
              href={`https://github.com/${member.github}`}
              target="_blank"
              rel="noopener noreferrer"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{
                delay: 0.1 + i * 0.08,
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-colors hover:border-sky-300 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-sky-400/30 dark:hover:bg-sky-400/5"
            >
              {/* Avatar */}
              <div
                className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors[i]} text-lg font-bold text-white shadow-lg`}
              >
                {member.initials}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {member.name}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                  <Github className="h-4 w-4" />
                  @{member.github}
                </div>
              </div>
            </m.a>
          ))}
        </div>
      </div>
    </section>
  )
}
