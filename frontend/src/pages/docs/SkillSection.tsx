import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Effect } from '@/components/ui/animate'

const skillMarkdown = `# InsightRAG MCP Skill

## Purpose
Use InsightRAG MCP tools to discover and search accessible knowledge bases.

## When to Use
- The user wants to search indexed documents
- The user asks what is stored in a knowledge base
- The user needs a document inventory for a knowledge base

## Default Workflow
1. Call \`get_available_collections\` first to discover accessible knowledge bases and KB IDs.
2. If a specific KB is known, call \`search_knowledge_base\` with \`kb_id\`.
3. Start with short keyword queries, not long natural-language questions.
4. If no results are returned, lower \`score_threshold\` from \`0.5\` to \`0.3\`, then \`0.2\`.
5. Use \`list_kb_resources\` only when document-level inventory is needed.

## Query Strategy
- Prefer short keyword queries first, such as \`"deployment config"\` or \`"auth token"\`.
- Refine only after you get initial results.
- Use broader search without \`kb_id\` when KB selection is unnecessary.

## Tool Rules

### get_available_collections
- Default first step
- Returns accessible KB IDs, KB names, document counts, and chunk counts

### search_knowledge_base
- Main retrieval tool
- Parameters:
  - \`query\` (required)
  - \`kb_id\` (optional)
  - \`top_k\` (default \`5\`)
  - \`score_threshold\` (default \`0.5\`)

### list_kb_resources
- Use only when you need full document inventory and processing status

## Auth
- HTTP mode: requires \`Authorization: Bearer <access_token>\`
- STDIO mode: local development only; authentication may be skipped

## Error Handling
- Tool errors may be returned inline as \`{"error": "message"}\` or \`[{"error": "message"}]\`
- Transport or host-level failures may appear outside the tool payload

## Examples
- \`get_available_collections()\`
- \`search_knowledge_base(query="auth config", kb_id="<uuid>")\`
- \`search_knowledge_base(query="migration", score_threshold=0.3)\`
`

function CopyBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-slate-950 shadow-sm dark:border-white/[0.08] dark:bg-[#020817]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Copy-paste `skill.md`</p>
          <p className="text-xs text-slate-400">Ready for Claude Code or OpenWebUI</p>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Copy skill markdown"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 font-mono text-sm leading-relaxed text-sky-200">
        {children}
      </pre>
    </div>
  )
}

export default function SkillSection() {
  return (
    <section
      id="skill-md"
      className="relative overflow-hidden border-t border-slate-100 bg-slate-50 py-16 dark:border-white/[0.04] dark:bg-[#0a1628] lg:py-24"
    >
      <div className="mx-auto max-w-4xl px-6">
        <Effect slide="up" blur className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-sky-300/30 bg-sky-50 px-4 py-1.5 text-sm font-medium text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/5 dark:text-sky-300">
            Skill.md
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-4xl">
            Import-ready MCP skill
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Copy this compact version into Claude Code, OpenWebUI, or any prompt-based tool setup
            that accepts a reusable skill or instruction file.
          </p>
        </Effect>

        <Effect slide="up" blur delay={0.05} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300">
            Keep this version short and operational. Store deeper explanations, architecture notes,
            and environment-specific setup elsewhere in the docs.
          </div>
          <CopyBlock>{skillMarkdown}</CopyBlock>
        </Effect>
      </div>
    </section>
  )
}
