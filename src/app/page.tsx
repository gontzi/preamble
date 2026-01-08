'use client';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { useState, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, FileArchive, Terminal as TerminalIcon, Download, Copy, Check, Sparkles, Wand2, ChevronRight, ArrowLeft, Save, X } from 'lucide-react';
import { processZipFile } from '@/lib/zip-processor';
import { generateDocs, processGithubUrl } from '@/app/actions/generate';
import { updateHistoryItem, type HistoryItem } from '@/app/actions/history';
import { TerminalLoader } from '@/components/terminal-loader';
import { SourceSelector } from '@/components/source-selector';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { RepoPicker } from '@/components/repo-picker';
import { CopyButton } from '@/components/ui/copy-button';
import { HistoryList } from '@/components/history-list';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Mode = 'github' | 'zip' | 'picker';

export default function PreamblePage() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<Mode>(session ? 'picker' : 'github');
  const [githubUrl, setGithubUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Mode State
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const [processingUrl, setProcessingUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, message]);
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    generateFromZip(file);
  };

  const generateFromZip = async (file: File) => {
    setMode('zip');
    setCurrentDocId(null);
    setIsGenerating(true);
    setLogs([]);
    addLog(`Initializing local ZIP processing: ${file.name}`);

    try {
      addLog('Extracting files...');
      const context = await processZipFile(file);
      addLog(`Extracted context size: ${(context.length / 1024).toFixed(2)} KB`);

      addLog('Sending context to Gemini 1.5 Flash...');
      const { content } = await generateDocs(context, file.name);

      addLog('Documentation generated successfully.');
      setResult(content);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGithubGenerate = async (url?: string) => {
    const targetUrl = url || githubUrl;
    if (!targetUrl) return;

    setProcessingUrl(targetUrl);
    setCurrentDocId(null); // New generation clears edit mode
    setIsGenerating(true);
    setLogs([]);
    addLog(`Analyzing repository: ${targetUrl}`);

    try {
      addLog('Fetching repository structure via Octokit...');
      const context = await processGithubUrl(targetUrl);
      addLog(`Repository context successfully built. Bytes: ${context.length}`);

      const repoName = targetUrl.split('/').slice(-2).join('/');
      addLog('Refining documentation with AI...');
      const { content } = await generateDocs(context, repoName);

      addLog('Generation complete.');
      setResult(content);
    } catch (error: any) {
      addLog(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setProcessingUrl(undefined);
    }
  };

  // --- CRUD HANDLERS ---

  const handleEditHistory = (item: HistoryItem) => {
    setResult(item.content);
    setCurrentDocId(item.id);

    // Scroll to editor (if currently viewing output, it might be separate view, but here prompt assumes we are in editor or can see it)
    // "Al hacer clic en [EDIT]: Sube el contenido de ese historial al Editor Principal de la página (markdown state)."
    // "Hace scroll suave hacia arriba (al editor)."

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveChanges = async () => {
    if (!currentDocId || !result) return;

    setIsSaving(true);
    try {
      if (session?.user) {
        await updateHistoryItem(currentDocId, result);
      } else {
        const localDataRaw = localStorage.getItem('preamble_guest_history');
        if (localDataRaw) {
          const localData: HistoryItem[] = JSON.parse(localDataRaw);
          const updatedData = localData.map(item => {
            if (item.id === currentDocId) {
              return { ...item, content: result, created_at: new Date().toISOString() };
            }
            return item;
          });
          localStorage.setItem('preamble_guest_history', JSON.stringify(updatedData));
          window.location.reload();
        }
      }
      setSaveFeedback("SAVED!");
      setTimeout(() => setSaveFeedback(null), 2000);
    } catch (e) {
      console.error("Error saving:", e);
      setSaveFeedback("ERROR");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMd = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      <Header session={session} />

      {!result ? (
        <div className="max-w-7xl mx-auto pt-40 pb-20 px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20 pb-12 border-b-2 border-black">
            <div className="flex-1 space-y-6">
              <Badge variant="secondary" className="px-3 py-1">GENESIS v0.1.0</Badge>
              <h1 className="text-6xl md:text-8xl font-serif font-normal leading-[0.9] tracking-tighter">
                Engineering <br /> documentation <br />
                <span className="text-[#FF3333]">automatically.</span>
              </h1>
            </div>
            <div className="max-w-xs space-y-4">
              <p className="text-sm font-mono uppercase tracking-widest text-black/60 leading-relaxed">
                Analyze your source code with maximum precision using Groq.
                Upload a ZIP or connect your GitHub.
              </p>
              <div className="h-2 w-full bg-black" />
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* NEW: Unified Source Architecture */}
            <SourceSelector
              session={session}
              isGenerating={isGenerating}
              processingUrl={processingUrl}
              onUrlSubmit={handleGithubGenerate}
              onZipSubmit={generateFromZip}
            />

            {/* History Section maintained below */}
            <section id="history-section" className="pt-24 mt-24 border-t border-neutral-100 scroll-mt-20">
              <HistoryList onEdit={handleEditHistory} />
            </section>
          </div>

          <AnimatePresence>
            {isGenerating && <TerminalLoader logs={logs} />}
          </AnimatePresence>
          <Footer />
        </div>
      ) : (
        // RESULT VIEW - SWISS REDESIGN
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="flex flex-col h-[calc(100vh-64px)] bg-white mt-16 border-t border-black fixed inset-0 top-[64px] z-40"
        >
          {/* STICKY TOOLBAR */}
          <header className="h-12 border-b border-black flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest uppercase">
                <span className="w-2 h-2 bg-[#FF3333] rounded-full animate-pulse" />
                STATUS: GENERATED
              </div>
              <div className="hidden md:flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-neutral-500">
                <span>LANG: DETECTED</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {currentDocId ? (
                <>
                  <button
                    onClick={() => { setResult(null); setCurrentDocId(null); }}
                    className="text-[10px] font-mono font-bold tracking-widest uppercase hover:text-[#FF3333] transition-colors"
                  >
                    [ CANCEL ]
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="text-[10px] font-mono font-bold tracking-widest uppercase hover:text-[#FF3333] transition-colors disabled:opacity-50"
                  >
                    {saveFeedback ? `[ ${saveFeedback} ]` : `[ SAVE CHANGES ]`}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={copyToClipboard}
                    className="text-[10px] font-mono font-bold tracking-widest uppercase hover:text-[#FF3333] transition-colors flex items-center gap-2"
                  >
                    {copied ? '[ COPIED! ]' : '[ COPY MARKDOWN ]'}
                  </button>
                  <button
                    onClick={downloadMd}
                    className="text-[10px] font-mono font-bold tracking-widest uppercase hover:text-[#FF3333] transition-colors"
                  >
                    [ DOWNLOAD .MD ]
                  </button>
                  <div className="h-4 w-[1px] bg-black/20 mx-2" />
                  <button
                    onClick={() => setResult(null)}
                    className="text-[10px] font-mono font-bold tracking-widest uppercase hover:text-[#FF3333] transition-colors"
                  >
                    [ CLOSE ]
                  </button>
                </>
              )}
            </div>
          </header>

          {/* DUAL PANEL CONTENT */}
          <div className="flex-1 flex overflow-hidden">

            {/* LEFT: RAW EDITOR */}
            <div className="flex-1 border-r border-black bg-gray-50/50 relative group">
              <div className="absolute top-0 left-0 px-3 py-1 bg-black text-white text-[9px] font-mono tracking-widest uppercase z-10">
                RAW INPUT
              </div>
              <textarea
                value={result || ''}
                onChange={(e) => setResult(e.target.value)}
                className="w-full h-full p-8 md:p-12 resize-none focus:outline-none focus:bg-white transition-colors font-mono text-xs leading-relaxed text-neutral-800 custom-scrollbar"
                spellCheck={false}
              />
            </div>

            {/* RIGHT: PREVIEW */}
            <div className="flex-1 bg-white overflow-y-auto custom-scrollbar relative">
              <div className="absolute top-0 right-0 px-3 py-1 border-b border-l border-black bg-white text-[9px] font-mono tracking-widest uppercase z-10">
                PREVIEW
              </div>
              <div className="max-w-3xl mx-auto p-12 md:p-16">
                <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-serif prose-headings:font-normal prose-p:font-sans prose-p:leading-relaxed prose-code:font-mono prose-code:text-xs prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-none">
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <div className="border border-gray-200 bg-gray-50 p-0 font-mono text-xs my-6 not-prose">
                            <div className="px-3 py-1 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider flex justify-between">
                              <span>{match[1]}</span>
                              <span>:::</span>
                            </div>
                            <div className="p-4 overflow-x-auto">
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                customStyle={{ background: 'transparent', padding: 0, margin: 0 }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        ) : (
                          <code className="bg-gray-100 px-1.5 py-0.5 font-mono text-[0.9em] rounded-none text-black" {...props}>
                            {children}
                          </code>
                        );
                      },
                      h1: ({ children }) => <h1 className="text-4xl md:text-5xl border-b border-black pb-6 mb-8 mt-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2xl md:text-3xl mt-12 mb-6 text-black/90">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xl mt-8 mb-4 font-sans font-bold uppercase tracking-wide text-sm">{children}</h3>,
                      p: ({ children }) => <p className="text-neutral-600 mb-6">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-6 space-y-2 text-neutral-600 marker:text-black">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-6 space-y-2 text-neutral-600 marker:font-mono marker:text-black">{children}</ol>,
                      a: ({ href, children }) => <a href={href} className="text-[#FF3333] hover:text-black underline underline-offset-4 decoration-1 transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>,
                      blockquote: ({ children }) => <blockquote className="border-l-2 border-[#FF3333] pl-6 italic text-neutral-500 my-8 bg-gray-50 py-4 pr-4">{children}</blockquote>,
                    }}
                  >
                    {result || ''}
                  </ReactMarkdown>
                </article>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </main>
  );
}
