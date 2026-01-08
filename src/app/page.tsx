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
    // Actually current layout hides inputs when result is shown?
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

          // Hacky way to refresh history list without context/events since it's local storage
          // Component will re-render if we force it or if we signal update?
          // For now, next page load or polling will fix it. 
          // BUT HistoryList reads on mount/session change.
          // We might need to force a refresh on HistoryList. 
          // Since this component owns HistoryList, we can use a key or callback.
          // However user moved HistoryList logic inside component.
          // Let's rely on standard re-render behavior or page reload if forced.
          // Ideally we'd use a context or lifting state, but to keep it simple with current setup:
          window.location.reload(); // Simplest way to ensure Guest list updates immediately or we leave it stale until refresh
          // Actually, let's avoid reload. The HistoryList doesn't listen to LS changes.
          // We'll skip forcing list update for guest for now, "Saved" feedback is enough.
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
        // RESULT VIEW
        <div className="flex flex-col lg:flex-row h-[calc(100dvh-64px)] mt-16 overflow-hidden border-t border-black">
          {/* Left: Raw Markdown / Code */}
          <div className="flex-1 border-r border-black bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-black bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-black text-[10px] font-mono tracking-[0.2em] uppercase font-bold">
                <TerminalIcon size={14} className="text-[#FF3333]" strokeWidth={1.5} />
                {currentDocId ? 'EDIT MODE' : 'Output Stream'} / README.md
              </div>
              <div className="flex gap-2">
                {currentDocId ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResult(null);
                        setCurrentDocId(null);
                      }}
                      className="h-8 text-[10px] font-mono uppercase"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className={isSaving ? "bg-gray-400" : "bg-[#FF3333] hover:bg-red-600"}
                    >
                      {saveFeedback || "SAVE CHANGES"}
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <CopyButton text={result || ''} className="h-8 w-20" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={downloadMd}
                      className="h-8 w-8"
                      title="Download .md"
                    >
                      <Download size={14} strokeWidth={1.5} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0 font-mono text-[13px] selection:bg-black selection:text-white relative">
              {/* EDITABLE TEXTAREA OVERLAY OR REPLACEMENT */}
              <textarea
                value={result || ''}
                onChange={(e) => setResult(e.target.value)}
                className="w-full h-full p-8 resize-none focus:outline-none focus:ring-0 font-mono text-[13px] bg-transparent leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 bg-white overflow-auto p-12 lg:p-20 selection:bg-[#FF3333] selection:text-white">
            <div className="max-w-3xl mx-auto prose prose-neutral font-serif">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="border border-black bg-gray-50 p-4 font-mono text-xs my-6">
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ background: 'transparent', padding: 0 }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-gray-100 px-1 py-0.5 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                  h1: ({ children }) => <h1 className="text-5xl font-serif font-normal border-b border-black pb-4 mb-8">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-3xl font-serif font-normal mt-12 mb-6">{children}</h2>,
                  p: ({ children }) => <p className="leading-relaxed mb-6">{children}</p>,
                }}
              >
                {result}
              </ReactMarkdown>
            </div>
          </div>

          {/* Floating actions / Start Over */}
          {!currentDocId && (
            <Button
              onClick={() => setResult(null)}
              className="fixed bottom-12 right-12 w-16 h-16 shadow-none border-2 border-black"
              title="Start over"
            >
              <Wand2 size={24} />
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
