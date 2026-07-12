// lib/utils.js
// Shared utility functions

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (INR by default).
 */
export function formatCurrency(amount, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date to a readable string.
 */
export function formatDate(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Format a datetime to a readable string.
 */
export function formatDateTime(date) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/**
 * Check if a license is expired or expiring within 30 days.
 */
export function getLicenseWarning(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return { level: "expired", daysUntilExpiry };
  if (daysUntilExpiry <= 30) return { level: "warning", daysUntilExpiry };
  return { level: "ok", daysUntilExpiry };
}

/**
 * Generate a unique trip code like TRP-20240712-001.
 */
export function generateTripCode() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 900) + 100;
  return `TRP-${dateStr}-${rand}`;
}

/**
 * Map VehicleStatus to status color key.
 */
export function vehicleStatusColor(status) {
  const map = {
    AVAILABLE: "green",
    ON_TRIP:   "blue",
    IN_SHOP:   "neutral",
    RETIRED:   "red",
  };
  return map[status] ?? "neutral";
}

/**
 * Map DriverStatus to status color key.
 */
export function driverStatusColor(status) {
  const map = {
    AVAILABLE: "green",
    ON_TRIP:   "blue",
    OFF_DUTY:  "neutral",
    SUSPENDED: "red",
  };
  return map[status] ?? "neutral";
}

/**
 * Map TripStatus to status color key.
 */
export function tripStatusColor(status) {
  const map = {
    DRAFT:      "neutral",
    DISPATCHED: "blue",
    COMPLETED:  "green",
    CANCELLED:  "red",
  };
  return map[status] ?? "neutral";
}

/**
 * Map MaintenanceStatus to status color key.
 */
export function maintenanceStatusColor(status) {
  const map = {
    ACTIVE:    "neutral",
    COMPLETED: "green",
  };
  return map[status] ?? "neutral";
}

/**
 * Human-readable label for enum values.
 */
export function humanizeEnum(value) {
  if (!value) return "—";
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}