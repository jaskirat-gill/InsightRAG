import { useState } from 'react'
import { Effect } from '@/components/ui/animate'
import { ExternalLink, Copy, Check, Globe } from 'lucide-react'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/[0.08] dark:hover:text-white/60"
      aria-label="Copy"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-500">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  )
}

export default function LiveDemoSection() {
  return (
    <section
      id="live-demo"
      className="relative overflow-hidden bg-slate-50 py-16 dark:bg-[#0a1628] lg:py-24"
    >
      <div className="mx-auto max-w-3xl px-6">
        <Effect slide="up" blur className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:text-emerald-300">
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            Live Demo
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-4xl">
            Try it right now
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            We have a live deployment you can explore — no installation needed. Log in with the demo
            account below and click around.
          </p>
        </Effect>

        <Effect slide="up" blur>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none">
            {/* Header */}
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Deployed Demo
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Hosted on our team server — always up to date with the latest build.
                  </p>
                </div>
                <a
                  href="https://cpsc319.jaskiratgill.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-sky-700 sm:inline-flex"
                >
                  Open Demo
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-5 p-6">
              {/* URL */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Demo URL
                </span>
                <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <a
                    href="https://cpsc319.jaskiratgill.ca"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-sky-600 underline decoration-sky-600/30 hover:decoration-sky-600 dark:text-sky-400 dark:decoration-sky-400/30"
                  >
                    https://cpsc319.jaskiratgill.ca
                  </a>
                  <CopyButton text="https://cpsc319.jaskiratgill.ca" />
                </div>
              </div>

              {/* Credentials */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                  Demo Login Credentials
                </span>
                <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/[0.06]">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-white/30">Email</span>
                      <p className="font-mono text-sm text-slate-800 dark:text-white/80">
                        demo@test.com
                      </p>
                    </div>
                    <CopyButton text="demo@test.com" />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-white/30">Password</span>
                      <p className="font-mono text-sm text-slate-800 dark:text-white/80">
                        Demo1234!
                      </p>
                    </div>
                    <CopyButton text="Demo1234!" />
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                  How to explore
                </span>
                <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                  <li>
                    Open{' '}
                    <a
                      href="https://cpsc319.jaskiratgill.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 underline dark:text-sky-400"
                    >
                      cpsc319.jaskiratgill.ca
                    </a>{' '}
                    in your browser
                  </li>
                  <li>
                    Enter the email and password above, then click <strong>Sign In</strong>
                  </li>
                  <li>
                    Browse <strong>Knowledge Bases</strong> to see example document collections
                  </li>
                  <li>
                    Click into a KB to see document health, chunks, and retrieval analytics
                  </li>
                  <li>
                    Open <strong>Settings &rarr; General</strong> to see your session tokens (used
                    for MCP)
                  </li>
                  <li>
                    Check out <strong>Settings &rarr; Plugins</strong> to see how sync plugins are
                    configured
                  </li>
                </ol>
              </div>

              {/* Warning */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-400/20 dark:bg-amber-400/5">
                <p className="text-xs text-amber-700 dark:text-amber-400/80">
                  This is a shared demo environment. Please don't delete existing data or change
                  passwords. The demo account has developer-level access (read-only for most
                  resources).
                </p>
              </div>

              {/* Mobile CTA */}
              <a
                href="https://cpsc319.jaskiratgill.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-sky-700 sm:hidden"
              >
                Open Demo
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Effect>
      </div>
    </section>
  )
}
