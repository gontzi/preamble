'use client';

import { useState, useRef, useEffect } from 'react';
import { Session } from 'next-auth';
import { cn } from '@/lib/utils';
import { RepoPicker } from '@/components/repo-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Wand2, Github, FileArchive, UploadCloud, ArrowRight } from 'lucide-react';
import { signIn } from 'next-auth/react';

type ViewMode = 'index' | 'remote' | 'local';

interface SourceSelectorProps {
    session: Session | null;
    isGenerating: boolean;
    onUrlSubmit: (url: string) => void;
    onZipSubmit: (file: File) => void;
    processingUrl?: string;
}

export function SourceSelector({
    session,
    isGenerating,
    onUrlSubmit,
    onZipSubmit,
    processingUrl
}: SourceSelectorProps) {
    const [view, setView] = useState<ViewMode>(session ? 'index' : 'remote');
    const [urlInput, setUrlInput] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Update view if session changes (e.g. after login)
    useEffect(() => {
        if (session && view === 'remote') {
            setView('index');
        }
    }, [session]);

    // --- TABS COMPONENT ---
    const TabButton = ({ mode, label }: { mode: ViewMode, label: string }) => (
        <button
            onClick={() => setView(mode)}
            className={cn(
                "font-mono text-xs uppercase tracking-widest pb-2 transition-all duration-300",
                view === mode
                    ? "text-black border-b-2 border-[#FF3333]"
                    : "text-neutral-400 hover:text-black border-b-2 border-transparent"
            )}
        >
            {label}
        </button>
    );

    // --- DRAG & DROP LOGIC ---
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type === "application/zip" || file.name.endsWith(".zip")) {
                onZipSubmit(file);
            } else {
                alert("Please upload a valid .zip file");
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onZipSubmit(e.target.files[0]);
        }
    };

    return (
        <div className="space-y-12">
            {/* TABS HEADER */}
            <div className="flex items-center gap-12 border-b border-neutral-100 pb-px">
                {session && <TabButton mode="index" label="[ INDEX ]" />}
                <TabButton mode="remote" label="[ REMOTE ]" />
                <TabButton mode="local" label="[ LOCAL ]" />
            </div>

            {/* CONTENT AREA */}
            <div className="min-h-[300px]">
                {/* 1. INDEX VIEW (Repo Picker) */}
                {view === 'index' && session && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <RepoPicker
                            onSelect={onUrlSubmit}
                            isGenerating={isGenerating}
                            selectedUrl={processingUrl}
                        />
                    </div>
                )}

                {/* 2. REMOTE VIEW (URL Input) */}
                {view === 'remote' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8 max-w-2xl">
                        {!session && (
                            <div className="p-6 bg-neutral-50 border border-neutral-200 mb-8">
                                <h3 className="font-serif text-xl mb-2">Connect your account</h3>
                                <p className="text-sm text-neutral-500 mb-6">
                                    Sign in with GitHub to access your private repositories and history directly.
                                </p>
                                <Button
                                    onClick={() => signIn('github')}
                                    variant="outline"
                                    className="w-full bg-white"
                                >
                                    <Github className="w-4 h-4 mr-2" />
                                    Authenticate with GitHub
                                </Button>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <span className="font-mono text-neutral-300 text-lg">HTTPS://</span>
                                </div>
                                <Input
                                    autoFocus
                                    type="text"
                                    placeholder="github.com/user/repo"
                                    value={urlInput}
                                    onChange={(e) => {
                                        // Simple stripping of https:// if pasted
                                        const val = e.target.value.replace(/^https?:\/\//, '');
                                        setUrlInput(val);
                                    }}
                                    className="pl-28 py-8 text-xl font-mono border-neutral-200 focus:border-black transition-all"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Github className="text-neutral-200 group-focus-within:text-black transition-colors" size={24} />
                                </div>
                            </div>

                            <Button
                                onClick={() => onUrlSubmit(`https://${urlInput}`)}
                                disabled={isGenerating || !urlInput.includes('/')}
                                className="w-full h-14 text-sm font-mono tracking-widest bg-black text-white hover:bg-neutral-800"
                            >
                                {isGenerating ? (
                                    <span className="animate-pulse">PROCESSING...</span>
                                ) : (
                                    <>
                                        <Wand2 size={16} className="mr-3" />
                                        SYNTHESIZE SPECS
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* 3. LOCAL VIEW (Zip Upload) */}
                {view === 'local' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "relative h-80 w-full border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-6",
                                dragActive
                                    ? "border-[#FF3333] bg-red-50/10 scale-[1.02]"
                                    : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                            )}
                        >
                            <div className={cn(
                                "p-6 rounded-full transition-colors duration-300",
                                dragActive ? "bg-[#FF3333] text-white" : "bg-neutral-100 text-neutral-400"
                            )}>
                                {dragActive ? <ArrowRight size={32} /> : <FileArchive size={32} />}
                            </div>

                            <div className="text-center space-y-2 pointer-events-none">
                                <p className="font-serif text-2xl text-neutral-900">
                                    {dragActive ? "Drop to analyze" : "Drop project archive"}
                                </p>
                                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                                    .ZIP FILES ONLY (MAX 50MB)
                                </p>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".zip"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
