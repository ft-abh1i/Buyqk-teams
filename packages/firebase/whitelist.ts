/**
 * buyQk Centralized Authorization Whitelist
 * 
 * Update authorization lists below to grant/revoke dashboard access.
 * Ensure emails are in lowercase.
 */

// Users who have access to the Super Admin Control Hub (admin.buyqk.com)
export const ADMIN_EMAILS = [
  'buyqk.shrivastavabhii@gmail.com',
  'akshat.srivastava098@gmail.com',
  'ankitsrigzb@gmail.com',
  'buyqk.namangoel@gmail.com',
  'buyq.maxalwani@gmail.com',
  'buyqk.maxalwani@gmail.com'
];

// Users who have access to the HR & Human Capital Hub (hr.buyqk.com) and the Team Console (team.buyqk.com)
export const HR_EMAILS = [
  'buyqk.shrivastavabhii@gmail.com',
  'buyqk.ankitshrivastav@gmail.com',
  'akshat.srivastava098@gmail.com',
  'ankitsrigzb@gmail.com',
  'buyqk.namangoel@gmail.com',
  'buyqk.aniketkumar@gmail.com',
  'buyq.maxalwani@gmail.com',
  'buyqk.maxalwani@gmail.com'
];

// Accounts with permanent Teams Portal owner privileges.
export const SUPER_ADMIN_EMAILS = [
  'buyqk.shrivastavabhii@gmail.com',
  'akshat.srivastava098@gmail.com'
];

const TEAM_EMAILS = Array.from(new Set([
  ...SUPER_ADMIN_EMAILS,
  ...ADMIN_EMAILS,
  ...HR_EMAILS
]));

const normalizeEmail = (email: string | null | undefined): string =>
  (email || '').trim().toLowerCase();

export const isTeamEmailAllowed = (email: string | null | undefined): boolean =>
  TEAM_EMAILS.includes(normalizeEmail(email));

export const isSuperAdminEmail = (email: string | null | undefined): boolean =>
  SUPER_ADMIN_EMAILS.includes(normalizeEmail(email));
