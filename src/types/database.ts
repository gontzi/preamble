export interface User {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    generation_count: number;
    created_at: string;
}

export interface GeneratedDoc {
    id: string;
    user_id: string;
    repo_name: string;
    content: string;
    metadata: Record<string, any>;
    created_at: string;
}

export type HistoryItem = GeneratedDoc;
