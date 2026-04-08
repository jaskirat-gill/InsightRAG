import { Effect } from '@/components/ui/animate'
import { FileText, Layers, FileSpreadsheet, Presentation, Code, Image } from 'lucide-react'

const formatCategories = [
  {
    icon: FileText,
    label: 'Documents',
    color: 'sky',
    items: [
      { name: 'PDF', exts: '.pdf' },
      { name: 'Word', exts: '.docx .doc' },
      { name: 'OpenDocument', exts: '.odt' },
      { name: 'Rich Text', exts: '.rtf' },
      { name: 'EPUB', exts: '.epub' },
    ],
  },
  {
    icon: FileSpreadsheet,
    label: 'Spreadsheets',
    color: 'emerald',
    items: [
      { name: 'Excel', exts: '.xlsx .xls' },
      { name: 'CSV', exts: '.csv' },
      { name: 'TSV', exts: '.tsv' },
    ],
  },
  {
    icon: Presentation,
    label: 'Presentations',
    color: 'amber',
    items: [
      { name: 'PowerPoint', exts: '.pptx .ppt' },
    ],
  },
  {
    icon: Code,
    label: 'Text & Markup',
    color: 'violet',
    items: [
      { name: 'Plain Text', exts: '.txt' },
      { name: 'Markdown', exts: '.md' },
      { name: 'HTML', exts: '.html .htm' },
      { name: 'JSON', exts: '.json' },
      { name: 'XML', exts: '.xml' },
      { name: 'YAML', exts: '.yaml .yml' },
    ],
  },
  {
    icon: Image,
    label: 'Images (OCR)',
    color: 'rose',
    items: [
      { name: 'PNG', exts: '.png' },
      { name: 'JPEG', exts: '.jpeg .jpg' },
      { name: 'Bitmap', exts: '.bmp' },
      { name: 'TIFF', exts: '.tiff .tif' },
      { name: 'HEIC', exts: '.heic' },
    ],
  },
]

const colorMap: Record<string, { icon: string; bg: string; border: string }> = {
  sky:     { icon: 'text-sky-600 dark:text-sky-400',     bg: 'bg-sky-50 dark:bg-sky-400/10',         border: 'border-sky-200 dark:border-sky-400/20' },
  emerald: { icon: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-400/10', border: 'border-emerald-200 dark:border-emerald-400/20' },
  amber:   { icon: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-400/10',     border: 'border-amber-200 dark:border-amber-400/20' },
  violet:  { icon: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-400/10',   border: 'border-violet-200 dark:border-violet-400/20' },
  rose:    { icon: 'text-rose-600 dark:text-rose-400',     bg: 'bg-rose-50 dark:bg-rose-400/10',       border: 'border-rose-200 dark:border-rose-400/20' },
}

const strategies = [
  { name: 'Semantic', description: 'Splits by sentence boundaries for narrative text' },
  { name: 'Auto', description: 'General-purpose PDF parsing, good default for most documents' },
  { name: 'Table Heavy', description: 'Preserves table structure in dense tabular PDFs' },
  { name: 'Multi-column', description: 'Handles newsletters, journals, and multi-column layouts' },
  { name: 'DataViz Heavy', description: 'Extracts charts and images from visual-heavy PDFs' },
  { name: 'Section Aware', description: 'Splits at headings, never mid-section' },
  { name: 'Table Preserving', description: 'Keeps each table intact for spreadsheets and CSVs' },
  { name: 'Slide Per Chunk', description: 'One chunk per slide for presentations' },
]

export default function DocsFeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-slate-50 py-16 dark:bg-[#0a1628] lg:py-24"
    >
      <div className="mx-auto max-w-5xl px-6">
        <Effect slide="up" blur className="mb-10 text-center">
          <div className="mx-auto mb-4 inline-flex items-center rounded-full border border-violet-300/30 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/5 dark:text-violet-300">
            Features
          </div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white sm:text-4xl">
            What InsightRAG supports
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">
            Process a wide range of document types with intelligent, format-aware chunking strategies.
          </p>
        </Effect>

        <div className="space-y-6">
          {/* Document Formats Card */}
          <Effect slide="up" blur>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">27+</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Document Formats
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {formatCategories.map((cat) => {
                  const colors = colorMap[cat.color]
                  return (
                    <div
                      key={cat.label}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border ${colors.border} ${colors.bg} ${colors.icon}`}
                        >
                          <cat.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-white/80">
                          {cat.label}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {cat.items.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {item.name}
                            </span>
                            <div className="flex gap-1">
                              {item.exts.split(' ').map((ext) => (
                                <span
                                  key={ext}
                                  className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400"
                                >
                                  {ext}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Effect>

          {/* Strategies Card */}
          <Effect slide="up" blur>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-400">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">8</p>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Processing Strategies
                  </p>
                </div>
              </div>

              <table className="mt-5 w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/[0.08]">
                    <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Strategy
                    </th>
                    <th className="pb-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {strategies.map((s) => (
                    <tr
                      key={s.name}
                      className="border-b border-slate-100 last:border-0 dark:border-white/[0.04]"
                    >
                      <td className="whitespace-nowrap py-2.5 pr-4 font-medium text-slate-800 dark:text-white/90">
                        {s.name}
                      </td>
                      <td className="py-2.5 text-slate-500 dark:text-slate-400">
                        {s.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Effect>
        </div>
      </div>
    </section>
  )
}
