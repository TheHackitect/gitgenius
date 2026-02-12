// GitGenius Types

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  size: number;
  pushed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContributionData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalContributions: number;
  startDate: string | null;
  endDate: string | null;
}

export interface AutomationSettings {
  isEnabled: boolean;
  scheduleType: 'smart' | 'fixed' | 'random' | 'weekdays_only';
  cronExpression?: string;
  timezone: string;
  minCommitsPerDay: number;
  maxCommitsPerDay: number;
  preferredHoursStart: number;
  preferredHoursEnd: number;
  commitTypes: CommitType[];
  commitMessageStyle: 'conventional' | 'casual' | 'technical';
  skipWeekends: boolean;
  skipHolidays: boolean;
  variabilityFactor: number;
  skipProbability: number;
}

export type CommitType = 
  | 'readme_update'
  | 'config_tweak'
  | 'doc_improvement'
  | 'code_comment'
  | 'dependency_update'
  | 'typo_fix'
  | 'formatting'
  | 'test_addition';

export interface CommitTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  filePatterns: string[];
  contentTemplate: string;
  messageTemplate: string;
}

export interface DashboardStats {
  totalAccounts: number;
  totalRepositories: number;
  totalCommits: number;
  automatedCommits: number;
  currentStreak: number;
  longestStreak: number;
  contributionsToday: number;
  contributionsThisWeek: number;
  contributionsThisMonth: number;
  activeAutomations: number;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  category: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface JobStatus {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  field: keyof T;
  direction: SortDirection;
}

export interface FilterConfig {
  [key: string]: string | number | boolean | string[] | undefined;
}
