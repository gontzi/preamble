import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
});

const playfair = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-serif',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://preamble.pages.dev'),
    title: 'PREAMBLE by Gontzi',
    description: 'Turn your code into Swiss-style documentation. AI-aware architecture analysis for Libraries, Apps, and CLIs.',
    icons: {
        icon: '/isotipo-favicon.png',
    },
    openGraph: {
        type: 'website',
        url: '/',
        title: 'Preamble | Engineering Documentation Automatically',
        description: 'Turn your code into Swiss-style documentation. AI-aware architecture analysis for Libraries, Apps, and CLIs.',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'Preamble - Engineering Documentation Automatically',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Preamble | Engineering Documentation Automatically',
        description: 'Turn your code into Swiss-style documentation. AI-aware architecture analysis for Libraries, Apps, and CLIs.',
        images: ['/og-image.png'],
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${jetbrainsMono.variable} ${playfair.variable} font-sans antialiased bg-white text-black`}>
                <Providers>
                    {children}
                </Providers>
            </body>
        </html>
    );
}
