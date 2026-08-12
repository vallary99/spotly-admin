const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Deliberately separate storage key from spotly-web's "spotly_token" —
// this is a genuinely different access point per the earlier decision,
// so an admin and a regular session on the same machine/browser don't
// collide or get confused with each other.
const TOKEN_KEY = "spotly_admin_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, ...init } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as any) };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 || res.status === 403) {
    // A 401/403 on an admin-gated endpoint means the session is dead or
    // was never actually an admin session — clear it and let the app
    // redirect to login, same instinct as spotly-web's unauthorized
    // handling but scoped to this app's own token.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("spotly-admin:unauthorized"));
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message || "Something went wrong.", res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface TierLimit {
  priceKes: number;
  photos: number;
  videos: number;
  videoMaxSeconds: number;
  concurrentExperiences: number | null;
  monthlyExperiencesIncluded: number | null;
  extraFeatures: string[];
}

export interface AnalyticsSummary {
  totalBusinesses: number;
  totalUsers: number;
  registeredUsers: number;
  businessOwners: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  tierBreakdown: Record<string, number>;
}

export interface UsagePoint {
  date: string;
  views: number;
  saves: number;
}

export interface AdminBusiness {
  id: string;
  name: string;
  category: string;
  city: string;
  neighborhood: string | null;
  tier: string;
  subscriptionStatus: string;
  profileViews: number;
  savesCount: number;
  isSuspended: boolean;
  suspendedUntil: string | null;
  isHiddenGem: boolean;
  isGrandfathered: boolean;
  discountPercent: number;
  isTrialing: boolean;
  trialOfferTier: string | null;
  ownerEmail: string;
  ownerName: string;
  createdAt: string;
}

export interface BusinessFilters {
  city?: string;
  category?: string;
  tier?: string;
  isSuspended?: boolean;
  isHiddenGem?: boolean;
  registeredAfter?: string;
  registeredBefore?: string;
  minProfileViews?: number;
  minSavesCount?: number;
  sortBy?: "createdAt" | "profileViews" | "savesCount" | "name";
  sortOrder?: "ASC" | "DESC";
  limit?: number;
  offset?: number;
}

export interface ModerationItem {
  id: string;
  reason: string;
  createdAt: string;
  media: { id: string; url: string; type: string; status: string; businessId: string; businessName?: string } | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailSendLog {
  id: string;
  templateId: string | null;
  templateName: string;
  subject: string;
  filters: Record<string, unknown>;
  recipientCount: number;
  businessIds: string[];
  sentByAdminId: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  businessId: string;
  businessName?: string;
  provider: string;
  purpose: string;
  amount: number;
  currency: string;
  status: string;
  mpesaReceiptNumber: string | null;
  createdAt: string;
}

export interface TransactionFilters {
  status?: string;
  purpose?: string;
  businessId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

function toQueryString(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; user: { id: string; email: string; name: string; role: string } }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify({ email, password }), auth: false },
      ),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email, resetUrlBase: typeof window !== "undefined" ? window.location.origin : "" }),
        auth: false,
      }),
    resetPassword: (token: string, newPassword: string) =>
      request<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
        auth: false,
      }),
  },
  categories: {
    list: () => request<string[]>("/businesses/categories", { auth: false }),
  },
  analytics: {
    summary: () => request<AnalyticsSummary>("/admin/analytics/summary"),
    usage: (granularity: "day" | "week" | "month", days: number) =>
      request<UsagePoint[]>(`/admin/analytics/usage${toQueryString({ granularity, days })}`),
  },
  businesses: {
    list: (filters: BusinessFilters) =>
      request<{ total: number; results: AdminBusiness[] }>(`/admin/businesses${toQueryString(filters as Record<string, unknown>)}`),
    suspend: (id: string, reason: string, until?: string) =>
      request(`/admin/businesses/${id}/suspend`, { method: "PUT", body: JSON.stringify({ reason, until }) }),
    unsuspend: (id: string) => request(`/admin/businesses/${id}/unsuspend`, { method: "PUT" }),
    setHiddenGem: (id: string, value: boolean) =>
      request(`/admin/businesses/${id}/hidden-gem`, { method: "PUT", body: JSON.stringify({ value }) }),
    discountCampaign: (filters: BusinessFilters, discountPercent: number) =>
      request<{ affected: number; excludedStarterCount?: number; message?: string }>("/admin/businesses/discount-campaign", {
        method: "POST",
        body: JSON.stringify({ ...filters, discountPercent }),
      }),
    trialCampaign: (filters: BusinessFilters, trialTier: "GROWTH" | "PREMIUM", days: number) =>
      request<{ affected: number; message?: string }>("/admin/businesses/trial-campaign", {
        method: "POST",
        body: JSON.stringify({ ...filters, trialTier, days }),
      }),
  },
  moderation: {
    list: () => request<ModerationItem[]>("/admin/moderation-queue"),
    resolve: (id: string, action: "approve" | "reject") =>
      request(`/admin/moderation-queue/${id}/resolve`, { method: "PUT", body: JSON.stringify({ action }) }),
  },
  email: {
    listTemplates: () => request<EmailTemplate[]>("/admin/email-templates"),
    getTemplate: (id: string) => request<EmailTemplate>(`/admin/email-templates/${id}`),
    createTemplate: (dto: { name: string; subject: string; body: string }) =>
      request<EmailTemplate>("/admin/email-templates", { method: "POST", body: JSON.stringify(dto) }),
    updateTemplate: (id: string, dto: Partial<{ name: string; subject: string; body: string }>) =>
      request<EmailTemplate>(`/admin/email-templates/${id}`, { method: "PUT", body: JSON.stringify(dto) }),
    deleteTemplate: (id: string) => request(`/admin/email-templates/${id}`, { method: "DELETE" }),
    preview: (subject: string, body: string, filters: BusinessFilters) =>
      request<{ matchCount: number; usingSampleData: boolean; subject: string; body: string; sampleBusiness: string }>(
        "/admin/email-templates/preview",
        { method: "POST", body: JSON.stringify({ subject, body, filters }) },
      ),
    send: (dto: { templateId?: string; subject?: string; body?: string; filters: BusinessFilters }) =>
      request<{ queued: number; totalMatched: number; logId: string }>("/admin/email-templates/send", {
        method: "POST",
        body: JSON.stringify(dto),
      }),
    sendHistory: () => request<EmailSendLog[]>("/admin/email-sends"),
  },
  transactions: {
    list: (filters: TransactionFilters) =>
      request<{ total: number; successTotalAmount: number; results: Transaction[] }>(
        `/admin/transactions${toQueryString(filters as Record<string, unknown>)}`,
      ),
  },
};
