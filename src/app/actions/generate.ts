'use server';

import OpenAI from 'openai';
import { Octokit } from 'octokit';
import { auth } from '@/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function generateDocs(context: string, repoName?: string): Promise<{ content: string; savedToDb: boolean }> {
    const supabase = getSupabaseAdmin();
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

        const prompt = `
            You are an expert technical writer designated to create high-end documentation in a "Swiss Editorial" style.

            **LANGUAGE DETECTION PROTOCOL:**
            1.  **Analyze** the provided source code context (comments, variable names, commit messages if available, and string literals) to **detect the primary natural language** used by the developers (e.g., Spanish, English, French, Portuguese, etc.).
            2.  **Generate** the README.md content **strictly in that detected language**.
            3.  **Fallback:** If the language is ambiguous, mixed, or purely technical (no natural language comments), **default to English**.

            **CONTENT GUIDELINES:**
            -   **Title:** Catchy, minimal, and professional.
            -   **Value Proposition:** concise and clear explanation of what the project does.
            -   **Tech Stack:** List key technologies.
            -   **Installation & Usage:** Step-by-step guides.
            -   **Structure:** Brief overview of the project structure.

            **STYLE RULES:**
            -   Use **Pure Markdown**.
            -   **Swiss Style:** Minimalist, clean, direct, and highly professional. Avoid emojis unless strictly necessary for the brand.

            **OUTPUT FORMAT:**
            -   Return **ONLY** the raw Markdown content.
            -   Do **NOT** wrap the output in code blocks (markdown).
            -   Do **NOT** include conversational text ("Here is the readme...").

            CODE CONTEXT:
            ${safeContext}
        `;

        console.log('🚀 Enviando prompt a Groq (Llama 3 70B)...');

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
        });

        const text = completion.choices[0]?.message?.content;

        if (!text) {
            throw new Error("La IA devolvió una respuesta vacía.");
        }

        console.log('✅ Documentación generada con éxito.');

        let savedToDb = false;
        const session: any = await auth();

        if (session?.user?.email && repoName) {
            console.log('💾 Guardando en Supabase para:', session.user.email);
            const { error } = await supabase.from('generated_docs').insert({
                user_email: session.user.email,
                repo_name: repoName,
                content: text,
            });

            if (error) {
                console.error('❌ Error guardando en DB:', error);
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
