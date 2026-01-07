import JSZip from 'jszip';

const IGNORED_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'venv',
  'env',
  '__pycache__',
  'target',
  'out',
];

const IGNORED_FILES = [
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'favicon.ico',
];

const ALLOWED_EXTENSIONS = [
  '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.php', '.c', '.cpp', '.h', '.hpp',
  '.java', '.kt', '.swift', '.m', '.mm', '.sql', '.sh', '.bash', '.zsh', '.json', '.md', '.css',
  '.scss', '.less', '.html', '.yaml', '.yml', '.env', '.toml', '.config.js', '.config.ts',
];

export async function processZipContent(data: Buffer | ArrayBuffer | Blob | Uint8Array): Promise<string> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(data);
  let concatenatedContext = '';

  const files = Object.keys(contents.files);

  for (const filePath of files) {
    const fileEntry = contents.files[filePath];

    // Skip directories
    if (fileEntry.dir) continue;

    // Check if file is in an ignored directory
    if (IGNORED_DIRS.some(dir => filePath.split('/').includes(dir))) continue;

    // Check if file is ignored
    if (IGNORED_FILES.some(ignored => filePath.endsWith(ignored))) continue;

    // Check extension
    const extension = filePath.slice(filePath.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) continue;

    // Read content
    const content = await fileEntry.async('string');

    // Simple check to skip likely binary files if they somehow passed the extension check
    if (content.includes('\u0000')) continue;

    concatenatedContext += `File: ${filePath}\nContent:\n${content}\n\n---\n\n`;
  }

  return concatenatedContext;
}

export async function processZipFile(file: File): Promise<string> {
  return processZipContent(file);
}
