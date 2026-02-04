// ============================================================================
// Analytics Types
// ============================================================================

export type DeviceType = "desktop" | "tablet" | "mobile";

export type BrowserType = "Chrome" | "Firefox" | "Safari" | "Edge" | "Opera" | "Other";

export type OSType = "Windows" | "macOS" | "iOS" | "Android" | "Linux" | "Other";

// ============================================================================
// Form Visit Interface
// ============================================================================
export interface FormVisit {
  id: string;
  formId: string;

  // Anonymous tracking
  visitorHash: string;
  sessionId: string;

  // Source attribution
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;

  // Device metadata
  deviceType: DeviceType | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;

  // Geolocation
  country: string | null;
  countryName: string | null;
  city: string | null;
  region: string | null;

  // Timing
  visitStartedAt: Date;
  visitEndedAt: Date | null;
  durationMs: number | null;

  // Interaction
  didStartForm: boolean;
  didSubmit: boolean;
  submissionId: string | null;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Form Question Progress Interface
// ============================================================================
export interface FormQuestionProgress {
  id: string;
  formId: string;
  visitId: string;
  visitorHash: string;

  questionId: string;
  questionType: string | null;
  questionIndex: number;

  viewedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  wasLastQuestion: boolean;

  createdAt: Date;
}

// ============================================================================
// Form Analytics Daily Interface
// ============================================================================
export interface FormAnalyticsDaily {
  id: string;
  formId: string;
  date: string; // 'YYYY-MM-DD'

  // Core metrics
  totalVisits: number;
  uniqueVisitors: number;
  totalSubmissions: number;
  uniqueSubmitters: number;
  avgDurationMs: number | null;
  medianDurationMs: number | null;

  // Device breakdown
  deviceDesktop: number;
  deviceMobile: number;
  deviceTablet: number;

  // Browser breakdown
  browserChrome: number;
  browserFirefox: number;
  browserSafari: number;
  browserEdge: number;
  browserOther: number;

  // OS breakdown
  osWindows: number;
  osMacos: number;
  osIos: number;
  osAndroid: number;
  osLinux: number;
  osOther: number;

  // Flexible breakdowns
  countryBreakdown: CountBreakdown;
  cityBreakdown: CountBreakdown;
  sourceBreakdown: CountBreakdown;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Form Dropoff Daily Interface
// ============================================================================
export interface FormDropoffDaily {
  id: string;
  formId: string;
  date: string; // 'YYYY-MM-DD'
  questionId: string;
  questionIndex: number;

  viewCount: number;
  startCount: number;
  completeCount: number;
  dropoffCount: number;
  dropoffRate: number | null; // Percentage * 100
  completionRate: number | null;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Breakdown Types
// ============================================================================
export interface CountBreakdown {
  [key: string]: number;
}

// ============================================================================
// Dashboard Metrics Types
// ============================================================================
export interface FormInsightsMetrics {
  startDate: string;
  endDate: string;

  // Core metrics
  totalVisits: number;
  uniqueVisitors: number;
  totalSubmissions: number;
  uniqueRespondents: number;
  avgVisitDurationMs: number;

  // Breakdowns
  sources: CountBreakdown;
  devices: CountBreakdown;
  countries: CountBreakdown;
  cities: CountBreakdown;
  browsers: CountBreakdown;
  operatingSystems: CountBreakdown;

  // Time series data for charts
  dailyData: {
    date: string;
    visits: number;
    uniqueVisitors: number;
    submissions: number;
  }[];
}

export interface QuestionDropoffMetrics {
  formId: string;
  startDate: string;
  endDate: string;

  questions: {
    questionId: string;
    questionIndex: number;
    questionLabel?: string;
    viewCount: number;
    startCount: number;
    completeCount: number;
    dropoffCount: number;
    dropoffRate: number; // 0-100
    completionRate: number; // 0-100
  }[];

  // Overall funnel
  totalStarted: number;
  totalCompleted: number;
  overallCompletionRate: number;
}

// ============================================================================
// Time Range Filter
// ============================================================================
export type TimeRangeFilter =
  | "last_24_hours"
  | "last_7_days"
  | "last_30_days"
  | "last_90_days"
  | "custom";

export interface TimeRange {
  filter: TimeRangeFilter;
  startDate?: string;
  endDate?: string;
}
