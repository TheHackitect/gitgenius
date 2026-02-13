import { prisma } from './prisma';
import { GitHubService } from './github';
import { CommitType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { notifyJobCompleted, notifyJobFailed } from './notifications';

// Commit message templates
const COMMIT_MESSAGES = {
  conventional: {
    readme_update: [
      'docs: update README with additional information',
      'docs: improve documentation clarity',
      'docs: add new section to README',
      'docs(readme): enhance project description',
      'docs: update installation instructions',
    ],
    config_tweak: [
      'chore: update configuration settings',
      'chore(config): optimize settings',
      'build: adjust build configuration',
      'chore: improve project configuration',
    ],
    doc_improvement: [
      'docs: enhance documentation',
      'docs: add usage examples',
      'docs: clarify instructions',
      'docs: update API documentation',
    ],
    code_comment: [
      'refactor: improve code comments',
      'docs: add inline documentation',
      'style: enhance code readability',
    ],
    dependency_update: [
      'chore(deps): update dependencies',
      'build: upgrade packages',
      'chore: bump dependency versions',
    ],
    typo_fix: [
      'fix: correct typo',
      'docs: fix spelling error',
      'fix(typo): correct spelling mistake',
    ],
    formatting: [
      'style: improve code formatting',
      'style: apply consistent formatting',
      'chore: format codebase',
    ],
    test_addition: [
      'test: add new test case',
      'test: improve test coverage',
      'test: add unit tests',
    ],
  },
  casual: {
    readme_update: [
      'Updated README',
      'Improved documentation',
      'Added more info to readme',
      'Better docs',
    ],
    config_tweak: [
      'Updated config',
      'Tweaked settings',
      'Config improvements',
    ],
    doc_improvement: [
      'Better docs',
      'Documentation update',
      'Added examples',
    ],
    code_comment: [
      'Added comments',
      'Better code comments',
      'Improved readability',
    ],
    dependency_update: [
      'Updated deps',
      'Dependency updates',
      'Bumped versions',
    ],
    typo_fix: [
      'Fixed typo',
      'Spelling fix',
      'Corrected typo',
    ],
    formatting: [
      'Code formatting',
      'Cleaned up code',
      'Better formatting',
    ],
    test_addition: [
      'Added tests',
      'More tests',
      'Test improvements',
    ],
  },
  technical: {
    readme_update: [
      '[README] Add technical specifications',
      '[DOCS] Update architecture documentation',
      '[README] Enhance setup instructions',
    ],
    config_tweak: [
      '[CONFIG] Optimize build parameters',
      '[BUILD] Update compiler settings',
      '[CONFIG] Adjust runtime configuration',
    ],
    doc_improvement: [
      '[DOCS] Add API reference',
      '[DOCS] Update technical documentation',
      '[DOCS] Add implementation details',
    ],
    code_comment: [
      '[REFACTOR] Add JSDoc comments',
      '[CODE] Improve inline documentation',
      '[DOCS] Add function descriptions',
    ],
    dependency_update: [
      '[DEPS] Update to latest versions',
      '[BUILD] Upgrade dependencies',
      '[DEPS] Security patch updates',
    ],
    typo_fix: [
      '[FIX] Correct documentation typo',
      '[DOCS] Fix spelling in comments',
      '[FIX] Typo correction',
    ],
    formatting: [
      '[STYLE] Apply linting rules',
      '[FORMAT] Standardize code style',
      '[STYLE] Code formatting update',
    ],
    test_addition: [
      '[TEST] Add integration tests',
      '[TEST] Increase coverage',
      '[TEST] Add edge case tests',
    ],
  },
};

// File content generators
const CONTENT_GENERATORS = {
  readme_update: (existingContent: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const additions = [
      `\n\n## Latest Updates\n\nLast updated: ${timestamp}\n`,
      `\n\n---\n_Documentation maintained with care._\n`,
      `\n\n### Notes\n\nThis project is actively maintained.\n`,
      `\n\n## Contributing\n\nContributions are welcome!\n`,
    ];
    const randomAddition = additions[Math.floor(Math.random() * additions.length)];
    
    // If content already has the addition pattern, modify slightly
    if (existingContent.includes('Last updated:')) {
      return existingContent.replace(/Last updated: \d{4}-\d{2}-\d{2}/, `Last updated: ${timestamp}`);
    }
    
    return existingContent + randomAddition;
  },
  
  config_tweak: (existingContent: string, filename: string) => {
    // For JSON files
    if (filename.endsWith('.json')) {
      try {
        const config = JSON.parse(existingContent);
        config._lastUpdated = new Date().toISOString();
        return JSON.stringify(config, null, 2);
      } catch {
        return existingContent;
      }
    }
    return existingContent;
  },
  
  doc_improvement: (existingContent: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    return existingContent + `\n\n<!-- Documentation updated: ${timestamp} -->\n`;
  },
};

export interface CommitGeneratorOptions {
  commitType: CommitType;
  messageStyle: 'conventional' | 'casual' | 'technical';
  repository: {
    owner: string;
    repo: string;
    defaultBranch: string;
  };
}

export class CommitGenerator {
  private githubService: GitHubService;

  constructor(githubService: GitHubService) {
    this.githubService = githubService;
  }

  private getRandomMessage(commitType: CommitType, style: 'conventional' | 'casual' | 'technical'): string {
    const messages = COMMIT_MESSAGES[style][commitType];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  async generateCommit(options: CommitGeneratorOptions): Promise<{
    success: boolean;
    sha?: string;
    message?: string;
    error?: string;
  }> {
    try {
      const { commitType, messageStyle, repository } = options;
      const message = this.getRandomMessage(commitType, messageStyle);

      // Target files based on commit type
      const targetFiles = this.getTargetFiles(commitType);
      
      for (const targetPath of targetFiles) {
        try {
          // Try to get existing file
          const existing = await this.githubService.getFileContent(
            repository.owner,
            repository.repo,
            targetPath,
            repository.defaultBranch
          );

          // Generate new content
          const newContent = this.generateContent(commitType, existing.content, targetPath);

          if (newContent === existing.content) {
            // No changes needed, try another approach
            continue;
          }

          // Update the file
          const result = await this.githubService.createOrUpdateFile({
            owner: repository.owner,
            repo: repository.repo,
            path: targetPath,
            message,
            content: newContent,
            sha: existing.sha,
            branch: repository.defaultBranch,
          });

          return {
            success: true,
            sha: result.commit.sha,
            message,
          };
        } catch (error) {
          // File doesn't exist, try creating it
          if (targetPath === 'CONTRIBUTING.md' || targetPath === '.gitgenius') {
            const newContent = this.getNewFileContent(targetPath);
            
            const result = await this.githubService.createOrUpdateFile({
              owner: repository.owner,
              repo: repository.repo,
              path: targetPath,
              message,
              content: newContent,
              branch: repository.defaultBranch,
            });

            return {
              success: true,
              sha: result.commit.sha,
              message,
            };
          }
        }
      }

      // Fallback: Create a .gitgenius marker file
      const markerContent = this.generateMarkerContent();
      const markerMessage = 'chore: update project metadata';

      try {
        const existing = await this.githubService.getFileContent(
          repository.owner,
          repository.repo,
          '.gitgenius',
          repository.defaultBranch
        );

        const result = await this.githubService.createOrUpdateFile({
          owner: repository.owner,
          repo: repository.repo,
          path: '.gitgenius',
          message: markerMessage,
          content: markerContent,
          sha: existing.sha,
          branch: repository.defaultBranch,
        });

        return {
          success: true,
          sha: result.commit.sha,
          message: markerMessage,
        };
      } catch {
        const result = await this.githubService.createOrUpdateFile({
          owner: repository.owner,
          repo: repository.repo,
          path: '.gitgenius',
          message: markerMessage,
          content: markerContent,
          branch: repository.defaultBranch,
        });

        return {
          success: true,
          sha: result.commit.sha,
          message: markerMessage,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private getTargetFiles(commitType: CommitType): string[] {
    const fileMap: Record<CommitType, string[]> = {
      readme_update: ['README.md', 'readme.md', 'Readme.md'],
      config_tweak: ['.gitgenius', 'package.json'],
      doc_improvement: ['docs/README.md', 'CONTRIBUTING.md', 'CHANGELOG.md'],
      code_comment: ['.gitgenius'],
      dependency_update: ['.gitgenius'],
      typo_fix: ['README.md', '.gitgenius'],
      formatting: ['.gitgenius'],
      test_addition: ['.gitgenius'],
    };

    return fileMap[commitType] || ['.gitgenius'];
  }

  private generateContent(commitType: CommitType, existingContent: string, filename: string): string {
    const generator = CONTENT_GENERATORS[commitType as keyof typeof CONTENT_GENERATORS];
    if (generator) {
      return generator(existingContent, filename);
    }
    return existingContent;
  }

  private getNewFileContent(filename: string): string {
    if (filename === 'CONTRIBUTING.md') {
      return `# Contributing

Thank you for your interest in contributing!

## How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Code of Conduct

Please be respectful and constructive in all interactions.
`;
    }

    if (filename === '.gitgenius') {
      return this.generateMarkerContent();
    }

    return '';
  }

  private generateMarkerContent(): string {
    return JSON.stringify({
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      id: uuidv4(),
      meta: {
        generator: 'GitGenius',
        timestamp: Date.now(),
      }
    }, null, 2);
  }
}

export async function executeAutomationJob(jobId: string): Promise<void> {
  const job = await prisma.automationJob.findUnique({
    where: { id: jobId },
    include: {
      githubAccount: {
        include: {
          user: true,
          repositories: {
            where: {
              isAutomationEnabled: true,
              isArchived: false,
            },
            orderBy: {
              automationPriority: 'desc',
            },
          },
        },
      },
    },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  // Update job status
  await prisma.automationJob.update({
    where: { id: jobId },
    data: {
      status: 'running',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  try {
    const githubService = await GitHubService.fromGitHubAccountId(job.githubAccountId);
    const generator = new CommitGenerator(githubService);

    // Pick a random enabled repository
    const repos = job.githubAccount.repositories;
    if (repos.length === 0) {
      throw new Error('No repositories enabled for automation');
    }

    const repo = repos[Math.floor(Math.random() * repos.length)];
    const [owner, repoName] = repo.fullName.split('/');

    // Get automation config
    const config = await prisma.automationConfig.findFirst({
      where: {
        githubAccountId: job.githubAccountId,
        isEnabled: true,
      },
    });

    const commitTypes = (config?.commitTypes as CommitType[]) || ['readme_update'];
    const commitType = commitTypes[Math.floor(Math.random() * commitTypes.length)];
    const messageStyle = (config?.commitMessageStyle as 'conventional' | 'casual' | 'technical') || 'conventional';

    // Generate commit
    const result = await generator.generateCommit({
      commitType,
      messageStyle,
      repository: {
        owner,
        repo: repoName,
        defaultBranch: repo.defaultBranch,
      },
    });

    if (result.success) {
      // Record the commit
      await prisma.commitRecord.create({
        data: {
          githubAccountId: job.githubAccountId,
          repositoryId: repo.id,
          sha: result.sha!,
          message: result.message!,
          branch: repo.defaultBranch,
          isAutomated: true,
          automationJobId: jobId,
          committedAt: new Date(),
          pushedAt: new Date(),
        },
      });

      // Update job as completed
      await prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: {
            sha: result.sha,
            message: result.message,
            repository: repo.fullName,
          },
        },
      });

      // Send notification
      await notifyJobCompleted(
        job.githubAccount.userId,
        jobId,
        repo.fullName,
        1
      );

      // Update account stats
      await prisma.gitHubAccount.update({
        where: { id: job.githubAccountId },
        data: {
          lastCommitAt: new Date(),
          totalCommits: { increment: 1 },
        },
      });

      // Update contribution day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.contributionDay.upsert({
        where: {
          githubAccountId_date: {
            githubAccountId: job.githubAccountId,
            date: today,
          },
        },
        create: {
          githubAccountId: job.githubAccountId,
          date: today,
          contributionCount: 1,
          commits: 1,
          level: 1,
        },
        update: {
          contributionCount: { increment: 1 },
          commits: { increment: 1 },
        },
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isFinalFailure = job.attempts >= job.maxAttempts;
    
    // Update job as failed
    await prisma.automationJob.update({
      where: { id: jobId },
      data: {
        status: isFinalFailure ? 'failed' : 'pending',
        lastError: errorMessage,
      },
    });

    // Send failure notification only on final failure
    if (isFinalFailure) {
      await notifyJobFailed(
        job.githubAccount.userId,
        jobId,
        job.githubAccount.username,
        errorMessage
      );
    }

    throw error;
  }
}
