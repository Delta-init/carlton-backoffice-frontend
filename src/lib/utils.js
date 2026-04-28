import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a human-readable error message from a failed API Response.
 *
 * FastAPI can return:
 *   { detail: "Some string message" }
 *   { detail: [{ msg: "field error", loc: [...] }] }
 *   { message: "..." }   (some custom endpoints)
 *
 * Usage:
 *   if (!res.ok) {
 *     const msg = await getApiError(res);
 *     toast.error(msg);
 *     return;
 *   }
 */
export async function getApiError(res, fallback = "Something went wrong. Please try again.") {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
    if (Array.isArray(data?.detail) && data.detail.length > 0) {
      return data.detail.map((e) => e.msg || e.message || JSON.stringify(e)).join(", ");
    }
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
    // HTTP status fallback
    const statusText = res.statusText || "";
    if (res.status === 401) return "Session expired. Please log in again.";
    if (res.status === 403) return "You don't have permission to perform this action.";
    if (res.status === 404) return "The requested resource was not found.";
    if (res.status === 422) return "Validation error. Please check the form and try again.";
    if (res.status >= 500) return "Server error. Please try again later.";
    return statusText || fallback;
  } catch {
    return fallback;
  }
}
