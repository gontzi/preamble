'use server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { Octokit } from 'octokit';
import { auth } from '@/auth';

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    language: string | null;
    updated_at: string;
}

export async function getUserRepos(page = 1, perPage = 8): Promise<GitHubRepo[]> {
    const session: any = await auth();

    if (!session?.accessToken) {
        throw new Error('Unauthorized: No access token found');
    }

    const octokit = new Octokit({ auth: session.accessToken });

    try {
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: 'updated',
            direction: 'desc',
            per_page: perPage,
            page: page,
            type: 'all',
        });

        return data.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            updated_at: repo.updated_at,
        }));
    } catch (error: any) {
        console.error('Error fetching user repos:', error);
        throw new Error(`Failed to fetch repositories: ${error.message}`);
    }
}
