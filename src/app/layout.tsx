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
    title: 'PREAMBLE by Gontzi',
    description: 'Precision engineering for technical documentation in a swiss editorial style.',
    icons: {
        icon: '/isotipo-favicon.png',
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
