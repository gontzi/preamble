'use client';

import { useState, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, FileArchive, Terminal as TerminalIcon, Download, Copy, Check, Sparkles, Wand2, ChevronRight, ArrowLeft } from 'lucide-react';
import { processZipFile } from '@/lib/zip-processor';
import { generateDocs, processGithubUrl } from '@/app/actions/generate';
import { TerminalLoader } from '@/components/terminal-loader';
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
                Analyze your source code with maximum precision using Gemini 1.5 Flash.
                Upload a ZIP or connect your GitHub.
              </p>
              <div className="h-2 w-full bg-black" />
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            {session ? (
              <div className="space-y-32">
                {/* 1. Repository Index */}
                <section>
                  <h2 className="font-mono text-xs uppercase tracking-widest mb-4 border-b border-black pb-2">
                    Index of / User-Repos
                  </h2>
                  <RepoPicker
                    onSelect={(url) => handleGithubGenerate(url)}
                    isGenerating={isGenerating}
                    selectedUrl={processingUrl}
                  />
                </section>

                {/* 2. Manual URL Input */}
                <section className="space-y-12">
                  <h2 className="font-mono text-xs uppercase tracking-widest mb-4 border-b border-black pb-2 text-black/30">
                    Manual Repository Analysis
                  </h2>
                  <div className="space-y-8">
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="HTTPS://GITHUB.COM/USER/REPO"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        className="py-6 text-2xl uppercase tracking-tighter"
                      />
                      <Github className="absolute right-0 top-1/2 -translate-y-1/2 text-black/20" size={24} />
                    </div>
                    <Button
                      onClick={() => handleGithubGenerate()}
                      disabled={isGenerating || !githubUrl}
                      className="w-full h-16 text-sm"
                    >
                      <Wand2 size={18} className="mr-3" />
                      SYNTHESIZE FROM URL
                    </Button>
                  </div>
                </section>

                {/* 3. ZIP Upload */}
                <section className="pt-20">
                  <h2 className="font-mono text-xs uppercase tracking-widest mb-4 border-b border-black pb-2 text-black/30">
                    Archive Processing
                  </h2>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-black hover:bg-gray-50 py-24 flex flex-col items-center justify-center gap-6 cursor-pointer transition-colors"
                  >
                    <div className="p-6 border border-black">
                      <FileArchive className="text-black" size={40} />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-serif text-2xl uppercase">Drop project archive</p>
                      <p className="text-[10px] font-mono tracking-widest text-black/40">OR CLICK TO BROWSE FILESYSTEM</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip"
                      onChange={handleZipUpload}
                      className="hidden"
                    />
                  </div>
                </section>

                {/* 4. History */}
                <section id="history-section" className="pt-20 scroll-mt-20">
                  <HistoryList onSelect={setResult} />
                </section>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex border border-black mb-12">
                  <button
                    onClick={() => setMode('github')}
                    className={`flex-1 py-4 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${mode === 'github' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
                      }`}
                  >
                    GitHub Analysis
                  </button>
                  <button
                    onClick={() => setMode('zip')}
                    className={`flex-1 py-4 border-l border-black font-mono text-xs uppercase tracking-[0.2em] transition-colors ${mode === 'zip' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'
                      }`}
                  >
                    Local Archivist
                  </button>
                </div>

                <div className="pb-12">
                  {mode === 'github' ? (
                    <div className="space-y-8">
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="HTTPS://GITHUB.COM/USER/REPO"
                          value={githubUrl}
                          onChange={(e) => setGithubUrl(e.target.value)}
                          className="py-6 text-2xl uppercase tracking-tighter"
                        />
                        <Github className="absolute right-0 top-1/2 -translate-y-1/2 text-black/20" size={24} />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => signIn('github')}
                        className="w-full h-16 text-sm"
                      >
                        <Github size={18} className="mr-3" />
                        AUTHENTICATE WITH GITHUB
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-black hover:bg-gray-50 py-24 flex flex-col items-center justify-center gap-6 cursor-pointer transition-colors"
                    >
                      <div className="p-6 border border-black">
                        <FileArchive className="text-black" size={40} />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="font-serif text-2xl uppercase">Drop project archive</p>
                        <p className="text-[10px] font-mono tracking-widest text-black/40">OR CLICK TO BROWSE FILESYSTEM</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip"
                        onChange={handleZipUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <AnimatePresence>
            {isGenerating && <TerminalLoader logs={logs} />}
          </AnimatePresence>
          <Footer />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] mt-16 overflow-hidden border-t border-black">
          {/* Left: Raw Markdown / Code */}
          <div className="flex-1 border-r border-black bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-black bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3 text-black text-[10px] font-mono tracking-[0.2em] uppercase font-bold">
                <TerminalIcon size={14} className="text-[#FF3333]" strokeWidth={1.5} />
                Output Stream / README.md
              </div>
              <div className="flex gap-2">
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
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8 font-mono text-[13px] selection:bg-black selection:text-white">
              <SyntaxHighlighter
                language="markdown"
                style={vscDarkPlus}
                customStyle={{ background: 'transparent', padding: 0 }}
              >

                {result || ''}
              </SyntaxHighlighter>
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

          <Button
            onClick={() => setResult(null)}
            className="fixed bottom-12 right-12 w-16 h-16 shadow-none border-2 border-black"
            title="Start over"
          >
            <Wand2 size={24} />
          </Button>
        </div>
      )}
    </main>
  );
}
