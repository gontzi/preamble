'use server';

import OpenAI from 'openai';
import { Octokit } from 'octokit';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { SupabaseService } from '@/lib/supabaseService';

export async function generateDocs(context: string, repoName?: string): Promise<{ content: string; savedToDb: boolean }> {
    console.log('🏁 Iniciando proceso de generación de IA con Groq/Llama3...');

    // Truncar contexto para evitar errores de payload y mejorar latencia
    // Llama 3 70B en Groq Free Tier tiene un límite estricto de TPM (aprox 6k-12k según carga).
    // Reducimos agresivamente a ~25,000 caracteres (~6k tokens) para asegurar que pase.
    const safeContext = context.substring(0, 25000);
    console.log('📝 Contexto optimizado (caracteres):', safeContext.length);

    if (!safeContext || safeContext.length < 100) {
        console.error('❌ Error: Contexto demasiado corto o vacío.');
        throw new Error("No se pudo leer suficiente código del repositorio.");
    }

    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("Configuración faltante: GROQ_API_KEY.");
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
        });

        const systemPrompt = `You are an expert technical writer designated to create high-end documentation in a "Swiss Editorial" style.

        **CORE MISSION:**
        Analyze the provided code context and generate a README.md that is professional, minimalist, and perfectly tailored to the project type.

        **1. CLASSIFICATION & STRUCTURE:**
        - **Auto-Detect Project Type:** Analyze the files to classify the project as:
            - **Library**: Focus on API Reference, Installation, and Usage.
            - **Web App**: Focus on Setup, Deployment, and Tech Stack.
            - **CLI**: Focus on Commands, Installation, and Options.
            - **Script**: Focus on Requirements and Usage.
        - Adapt the sections based on this classification.

        **2. TECHNICAL BADGES:**
        - Detect the tech stack (languages, frameworks, tools) from the code.
        - Generate Shields.io badges at the very top of the README using style=flat-square.
        - Example: ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react)

        **3. LANGUAGE DETECTION:**
        - Detect the primary natural language used in code comments and strings.
        - Write the entire README in that language.

        **4. OUTPUT RESTRICTIONS:**
        - Return ONLY pure Markdown.
        - No "Here is your README" or any other conversational text.
        - No markdown code block wraps (e.g., \`\`\`markdown ... \`\`\`).
        - Use a minimalist, professional "Swiss" tone. Avoid excessive emojis.

        **5. ATTRIBUTION:**
        - ALWAYS end the README with the following badge:
        [![Made with Preamble](https://img.shields.io/badge/Made_by-PREAMBLE-FF0000?style=flat-square)](https://preamble.pages.dev)`;

        console.log('🚀 Enviando prompt a Groq (Llama 3 70B)...');

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Project Name: ${repoName || 'Unknown Project'}\n\nCODE CONTEXT:\n${safeContext}` }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
        });

        let text = completion.choices[0]?.message?.content?.trim();

        if (!text) {
            throw new Error("La IA devolvió una respuesta vacía.");
        }

        // Implementación del Viral Loop (Footer Badge) persistente
        const footerBadge = '[![Made with Preamble](https://img.shields.io/badge/Made_by-PREAMBLE-FF0000?style=flat-square)](https://preamble.pages.dev)';
        if (!text.includes('https://preamble.pages.dev')) {
            text = text + '\n\n' + footerBadge;
        }

        console.log('✅ Documentación generada con éxito.');
        let savedToDb = false;
        const session: any = await auth();

        if (session?.user?.id && repoName) {
            console.log('💾 Guardando en Supabase para:', session.user.email);

            // Intentar detectar stack básico para metadata
            const metadata = {
                platform: repoName.includes('/') ? 'github' : 'zip',
                generated_at: new Date().toISOString(),
                model: "llama-3.3-70b-versatile"
            };

            const { error: saveError } = await SupabaseService.saveDocument(repoName, text, metadata);

            if (saveError) {
                console.error('❌ Error guardando en DB:', saveError);
            } else {
                savedToDb = true;
                console.log('✅ Guardado en DB correctamente.');
            }
        }

        return { content: text, savedToDb };
    } catch (error: any) {
        console.error('❌ Error CRÍTICO en Groq:', error);
        throw new Error(`Fallo en IA: ${error.message || 'Error desconocido'}`);
    }
}

export async function processGithubUrl(url: string): Promise<string> {
    console.log('🏁 Iniciando procesamiento de repo:', url);

    const session: any = await auth();
    const token = session?.accessToken || process.env.GITHUB_TOKEN;

    console.log('📦 GitHub Auth:', session?.accessToken ? 'OK (User Session)' : (process.env.GITHUB_TOKEN ? 'OK (Global Token)' : 'MISSING'));

    const octokit = new Octokit({ auth: token });

    // Parse GitHub URL
    const match = url.replace(/\/$/, '').match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        console.error('❌ Error: URL de GitHub inválida:', url);
        throw new Error('Estructura de URL de GitHub inválida. Usa el formato: https://github.com/usuario/repo');
    }

    const [_, owner, repo] = match;

    try {
        console.log(`🔍 Obteniendo información de ${owner} / ${repo}...`);
        const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
        const defaultBranch = repoInfo.default_branch;
        console.log('🌿 Rama por defecto:', defaultBranch);

        console.log('📂 Obteniendo árbol de archivos recursivo...');
        const { data: treeData } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: defaultBranch,
            recursive: 'true',
        });

        const fileList = treeData.tree.filter(item => item.type === 'blob');
        console.log('📂 Archivos totales encontrados en git:', fileList.length);

        const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.vscode', '.idea', 'vendor', '__pycache__'];
        const IGNORED_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];
        const ALLOWED_EXTENSIONS = [
            '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.php', '.c', '.cpp', '.h', '.hpp',
            '.java', '.kt', '.swift', '.m', '.mm', '.sql', '.sh', '.bash', '.zsh', '.json', '.md', '.css',
            '.html', '.yml', '.yaml', '.toml', '.env'
        ];

        const filesToProcess = fileList
            .filter(item => {
                const parts = item.path?.split('/') || [];
                const filename = parts[parts.length - 1];
                return !IGNORED_DIRS.some(dir => parts.includes(dir)) &&
                    !IGNORED_FILES.includes(filename) &&
                    ALLOWED_EXTENSIONS.some(ext => item.path?.endsWith(ext));
            })
            .slice(0, 40); // Reducido a 40 archivos prioritarios

        console.log('📄 Archivos filtrados para procesamiento:', filesToProcess.length);

        let concatenatedContext = 'File Tree:\n' + filesToProcess.map(f => f.path).join('\n') + '\n\n---\n\n';

        for (const file of filesToProcess) {
            if (!file.path) continue;

            try {
                const { data: contentData } = await octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: file.path,
                });

                if ('content' in contentData && typeof contentData.content === 'string') {
                    const rawContent = Buffer.from(contentData.content, 'base64').toString('utf-8');
                    // "Compilar" contenido: eliminar líneas vacías excesivas y truncar archivos grandes
                    const compactContent = rawContent
                        .split('\n')
                        .filter(line => line.trim().length > 0) // Quitar líneas vacías
                        .join('\n')
                        .substring(0, 2000); // Max 2k caracteres por archivo

                    concatenatedContext += `File: ${file.path}\nContent: \n${compactContent}\n${rawContent.length > 2000 ? '...[TRUNCATED]' : ''}\n\n-- -\n\n`;
                }
            } catch (e) {
                console.warn(`⚠️ Saltando archivo ${file.path} por error de lectura.`);
            }
        }

        console.log('📝 Contexto total generado (caracteres):', concatenatedContext.length);

        if (concatenatedContext.length < 100) {
            console.error('❌ Error: Contexto insuficiente tras el filtrado.');
            throw new Error("No se pudo leer código del repositorio. Verifica que no esté vacío o que los archivos sean de texto soportado.");
        }

        return concatenatedContext;
    } catch (error: any) {
        console.error('❌ Error procesando repositorio GitHub:', error);
        throw new Error(`Error al procesar el repositorio de GitHub: ${error.message}`);
    }
}
