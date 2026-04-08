import { Effect } from '@/components/ui/animate'
import { FileText, Layers } from 'lucide-react'

const formatGroups = [
  {
    label: 'Documents',
    formats: [
      { ext: '.pdf', name: 'PDF' },
      { ext: '.docx', name: 'Word 2007+' },
      { ext: '.doc', name: 'Word 97–2003' },
      { ext: '.odt', name: 'OpenDocument Text' },
      { ext: '.rtf', name: 'Rich Text' },
      { ext: '.epub', name: 'EPUB eBook' },
    ],
  },
  {
    label: 'Spreadsheets & Presentations',
    formats: [
      { ext: '.xlsx', name: 'Excel 2007+' },
      { ext: '.xls', name: 'Excel 97–2003' },
      { ext: '.csv', name: 'Comma-Separated Values' },
      { ext: '.tsv', name: 'Tab-Separated Values' },
      { ext: '.pptx', name: 'PowerPoint 2007+' },
      { ext: '.ppt', name: 'PowerPoint 97–2003' },
    ],
  },
  {
    label: 'Text & Markup',
    formats: [
      { ext: '.txt', name: 'Plain Text' },
      { ext: '.md', name: 'Markdown' },
      { ext: '.html', name: 'HTML' },
      { ext: '.htm', name: 'HTML (alt)' },
      { ext: '.json', name: 'JSON' },
      { ext: '.xml', name: 'XML' },
      { ext: '.yaml', name: 'YAML' },
      { ext: '.yml', name: 'YAML (alt)' },
    ],
  },
  {
    label: 'Images (OCR)',
    formats: [
      { ext: '.png', name: 'PNG' },
      { ext: '.jpeg', name: 'JPEG' },
      { ext: '.jpg', name: 'JPEG (alt)' },
      { ext: '.bmp', name: 'Bitmap' },
      { ext: '.tiff', name: 'TIFF' },
      { ext: '.tif', name: 'TIFF (alt)' },
      { ext: '.heic', name: 'HEIC' },
    ],
  },
]

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
              <div className="flex items-center gap-3">
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

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {formatGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                      {group.label}
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/[0.08]">
                          <th className="pb-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                            Format
                          </th>
                          <th className="pb-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-white/30">
                            Extension
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.formats.map((f) => (
                          <tr
                            key={f.ext}
                            className="border-b border-slate-100 last:border-0 dark:border-white/[0.04]"
                          >
                            <td className="py-1.5 text-slate-700 dark:text-slate-300">
                              {f.name}
                            </td>
                            <td className="py-1.5">
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-300">
                                {f.ext}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
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
