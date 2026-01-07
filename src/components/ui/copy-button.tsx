'use client';

import * as React from 'react';
import { Check, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
    text: string;
    className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
    const [hasCopied, setHasCopied] = React.useState(false);

    React.useEffect(() => {
        if (hasCopied) {
            const timeout = setTimeout(() => setHasCopied(false), 2000);
            return () => clearTimeout(timeout);
        }
    }, [hasCopied]);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setHasCopied(true);
    };

    return (
        <Button
            onClick={handleCopy}
            className={cn(
                "relative h-9 w-20 rounded-none border border-black transition-all bg-white text-black hover:bg-neutral-100",
                hasCopied && "bg-black text-white hover:bg-black border-black",
                className
            )}
            variant="ghost" // Using ghost to override default styles easily
            aria-label="Copy to clipboard"
        >
            <span className={cn("text-xs font-mono font-medium flex items-center gap-2", hasCopied ? "text-white" : "text-black")}>
                {hasCopied ? (
                    <>COPIED</>
                ) : (
                    <>COPY</>
                )}
            </span>
        </Button>
    );
}
