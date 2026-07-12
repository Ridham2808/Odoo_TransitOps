// lib/permissions.js
// Single source of truth for the RBAC permission matrix.
// Imported by: Sidebar (nav visibility), API routes (edit guard),
// Settings page (Phase 9 renders this table directly).

/**
 * Permission levels:
 *  "edit"  — full CRUD access
 *  "view"  — read-only access
 *   null   — no access (hidden from nav, 403 on API)
 */
export const PERMISSIONS = {
  FLEET_MANAGER: {
    dashboard:   "view",
    fleet:       "edit",
    drivers:     "edit",
    trips:       "edit",   // Phase 5: Fleet Manager can create/dispatch/complete/cancel trips
    fuel:        "edit",
    analytics:   "edit",
    settings:    "view",
    maintenance: "edit",   // same as fleet
  },
  DISPATCHER: {
    dashboard:   "view",
    fleet:       "view",
    drivers:     null,
    trips:       "edit",
    fuel:        null,
    analytics:   null,
    settings:    "view",
    maintenance: "view",   // same as fleet
  },
  SAFETY_OFFICER: {
    dashboard:   "view",
    fleet:       null,
    drivers:     "edit",
    trips:       "view",
    fuel:        null,
    analytics:   null,
    settings:    "view",
    maintenance: null,     // same as fleet
  },
  FINANCIAL_ANALYST: {
    dashboard:   "view",
    fleet:       "view",
    drivers:     null,
    trips:       null,
    fuel:        "edit",
    analytics:   "edit",
    settings:    "view",
    maintenance: "view",   // same as fleet
  },
};

/**
 * Human-readable role labels.
 */
export const ROLE_LABELS = {
  FLEET_MANAGER:     "Fleet Manager",
  DISPATCHER:        "Dispatcher",
  SAFETY_OFFICER:    "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};

/**
 * Get permission level for a role+section combination.
 * @param {string} role
 * @param {string} section  — one of the keys in PERMISSIONS
 * @returns {"edit" | "view" | null}
 */
export function getPermission(role, section) {
  return PERMISSIONS[role]?.[section] ?? null;
}

/**
 * Returns true if the role can view (or edit) the section.
 */
export function canView(role, section) {
  const p = getPermission(role, section);
  return p === "view" || p === "edit";
}

/**
 * Returns true if the role has full edit rights on the section.
 */
export function canEdit(role, section) {
  return getPermission(role, section) === "edit";
}

/**
 * Assert edit access inside an API route handler.
 * Throws an object with { status: 403, message } if denied.
 * Usage: assertEdit(role, "fleet")
 */
export function assertEdit(role, section) {
  if (!canEdit(role, section)) {
    const err = new Error(`Forbidden: '${role}' cannot edit '${section}'`);
    err.status = 403;
    throw err;
  }
}

/**
 * Assert any access (view or edit) inside an API route handler.
 */
export function assertView(role, section) {
  if (!canView(role, section)) {
    const err = new Error(`Forbidden: '${role}' cannot access '${section}'`);
    err.status = 403;
    throw err;
  }
}
