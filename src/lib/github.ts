import { Octokit } from '@octokit/rest';
import { prisma } from './prisma';
import { GitHubUser, GitHubRepository, ContributionData } from '@/types';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-gcm';

export function encryptToken(token: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export class GitHubService {
  private octokit: Octokit;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  static async fromGitHubAccountId(githubAccountId: string): Promise<GitHubService> {
    const account = await prisma.gitHubAccount.findUnique({
      where: { id: githubAccountId },
    });

    if (!account) {
      throw new Error('GitHub account not found');
    }

    const decryptedToken = decryptToken(account.accessToken);
    return new GitHubService(decryptedToken);
  }

  async getAuthenticatedUser(): Promise<GitHubUser> {
    const { data } = await this.octokit.users.getAuthenticated();
    return data as GitHubUser;
  }

  async getUserRepositories(options?: {
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    per_page?: number;
    page?: number;
    fetchAll?: boolean;
  }): Promise<GitHubRepository[]> {
    const perPage = options?.per_page || 100;
    const type = options?.type || 'owner';
    const sort = options?.sort || 'updated';
    
    // If fetchAll is true, paginate through all pages
    if (options?.fetchAll) {
      const allRepos: GitHubRepository[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const { data } = await this.octokit.repos.listForAuthenticatedUser({
          type,
          sort,
          per_page: perPage,
          page,
        });
        
        allRepos.push(...(data as GitHubRepository[]));
        
        // If we got less than per_page results, we've reached the end
        if (data.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      return allRepos;
    }
    
    // Single page fetch (original behavior)
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      type,
      sort,
      per_page: perPage,
      page: options?.page || 1,
    });
    return data as GitHubRepository[];
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await this.octokit.repos.get({
      owner,
      repo,
    });
    return data as GitHubRepository;
  }

  async createRepository(options: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  }): Promise<GitHubRepository> {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name: options.name,
      description: options.description,
      private: options.private ?? true,
      auto_init: options.auto_init ?? true,
    });
    return data as GitHubRepository;
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<{
    content: string;
    sha: string;
    size: number;
  }> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error('Path is not a file');
    }

    return {
      content: Buffer.from(data.content, 'base64').toString('utf8'),
      sha: data.sha,
      size: data.size,
    };
  }

  async createOrUpdateFile(options: {
    owner: string;
    repo: string;
    path: string;
    message: string;
    content: string;
    sha?: string; // Required for updates
    branch?: string;
  }): Promise<{ sha: string; commit: { sha: string } }> {
    const { data } = await this.octokit.repos.createOrUpdateFileContents({
      owner: options.owner,
      repo: options.repo,
      path: options.path,
      message: options.message,
      content: Buffer.from(options.content).toString('base64'),
      sha: options.sha,
      branch: options.branch,
    });

    return {
      sha: data.content?.sha || '',
      commit: { sha: data.commit?.sha || '' },
    };
  }

  async deleteFile(options: {
    owner: string;
    repo: string;
    path: string;
    message: string;
    sha: string;
    branch?: string;
  }): Promise<void> {
    await this.octokit.repos.deleteFile({
      owner: options.owner,
      repo: options.repo,
      path: options.path,
      message: options.message,
      sha: options.sha,
      branch: options.branch,
    });
  }

  async getCommits(owner: string, repo: string, options?: {
    sha?: string;
    per_page?: number;
    page?: number;
    since?: string;
    until?: string;
  }): Promise<Array<{
    sha: string;
    message: string;
    date: string;
    author: string;
    additions: number;
    deletions: number;
  }>> {
    const { data } = await this.octokit.repos.listCommits({
      owner,
      repo,
      sha: options?.sha,
      per_page: options?.per_page || 30,
      page: options?.page || 1,
      since: options?.since,
      until: options?.until,
    });

    return data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      date: commit.commit.author?.date || '',
      author: commit.commit.author?.name || 'Unknown',
      additions: 0, // Would need separate API call
      deletions: 0,
    }));
  }

  async getBranches(owner: string, repo: string): Promise<Array<{
    name: string;
    protected: boolean;
  }>> {
    const { data } = await this.octokit.repos.listBranches({
      owner,
      repo,
    });

    return data.map(branch => ({
      name: branch.name,
      protected: branch.protected,
    }));
  }

  async createBranch(owner: string, repo: string, branchName: string, fromBranch: string): Promise<void> {
    // Get the SHA of the source branch
    const { data: refData } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${fromBranch}`,
    });

    // Create the new branch
    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha,
    });
  }

  async getContributionData(username: string): Promise<ContributionData[]> {
    // GitHub's GraphQL API is needed for contribution data
    // For now, we'll use a simplified approach with commit history
    // In production, you'd want to use the GraphQL API
    
    const contributions: ContributionData[] = [];
    const today = new Date();
    
    // Generate last 365 days
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      contributions.push({
        date: date.toISOString().split('T')[0],
        count: 0,
        level: 0,
      });
    }

    return contributions;
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  async getRateLimitStatus(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }> {
    const { data } = await this.octokit.rateLimit.get();
    
    return {
      limit: data.rate.limit,
      remaining: data.rate.remaining,
      reset: new Date(data.rate.reset * 1000),
    };
  }
}

export async function syncGitHubAccountData(githubAccountId: string): Promise<void> {
  const service = await GitHubService.fromGitHubAccountId(githubAccountId);
  const user = await service.getAuthenticatedUser();
  const repos = await service.getUserRepositories({ fetchAll: true });

  // Update account info
  await prisma.gitHubAccount.update({
    where: { id: githubAccountId },
    data: {
      username: user.login,
      displayName: user.name,
      email: user.email,
      avatarUrl: user.avatar_url,
      profileUrl: user.html_url,
      totalRepos: user.public_repos,
      lastSyncAt: new Date(),
    },
  });

  // Sync repositories
  for (const repo of repos) {
    await prisma.repository.upsert({
      where: {
        githubAccountId_githubRepoId: {
          githubAccountId,
          githubRepoId: repo.id.toString(),
        },
      },
      create: {
        githubAccountId,
        githubRepoId: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        sshUrl: repo.ssh_url,
        isPrivate: repo.private,
        isFork: repo.fork,
        isArchived: repo.archived,
        defaultBranch: repo.default_branch,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        openIssues: repo.open_issues_count,
        size: repo.size,
        lastPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        repoCreatedAt: new Date(repo.created_at),
        repoUpdatedAt: new Date(repo.updated_at),
      },
      update: {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        isPrivate: repo.private,
        isFork: repo.fork,
        isArchived: repo.archived,
        defaultBranch: repo.default_branch,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        openIssues: repo.open_issues_count,
        size: repo.size,
        lastPushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
        repoUpdatedAt: new Date(repo.updated_at),
      },
    });
  }
}
