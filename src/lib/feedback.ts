import toast from "react-hot-toast";

/**
 * Feedback for something the user just did.
 *
 * Everything used to go through window.alert(), which the browser renders as a
 * blocking "localhost:3000 says" box - unstyled, impossible to brand, and it
 * puts the development origin on screen. These are the same react-hot-toast
 * toasts the profile and password screens already use, with the styling kept in
 * one place so every message looks like part of this product.
 *
 * Use these for the result of a completed action. A decision the user still has
 * to make belongs in useConfirm(), and a message about one field belongs under
 * that field.
 */

const BASE = {
  style: {
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "14px",
    maxWidth: "420px",
    background: "#FFFFFF",
    color: "#1F2937",
    border: "1px solid #E5E7EB",
    boxShadow: "0 10px 30px -12px rgba(15,23,42,.25)",
  },
};

/** Brand rust, the same accent the primary buttons use. */
const RUST = "#953002";

export const notify = {
  /** An action completed. */
  success(message: string) {
    return toast.success(message, {
      ...BASE,
      duration: 3000,
      iconTheme: { primary: "#15803D", secondary: "#FFFFFF" },
      style: { ...BASE.style, borderLeft: "3px solid #15803D" },
    });
  },

  /** An action failed. Held longer, because it usually needs reading. */
  error(message: string) {
    return toast.error(message, {
      ...BASE,
      duration: 5000,
      iconTheme: { primary: "#B91C1C", secondary: "#FFFFFF" },
      style: { ...BASE.style, borderLeft: "3px solid #B91C1C" },
    });
  },

  /** Neutral confirmation - something happened, nothing went wrong. */
  info(message: string) {
    return toast(message, {
      ...BASE,
      duration: 3000,
      style: { ...BASE.style, borderLeft: `3px solid ${RUST}` },
    });
  },

  /**
   * Ties a toast to a promise: pending, then the outcome. Useful for uploads
   * and syncs, where the wait is long enough that silence reads as a failure.
   */
  promise<T>(
    work: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    return toast.promise(work, messages, {
      ...BASE,
      style: { ...BASE.style, borderLeft: `3px solid ${RUST}` },
    });
  },
};

/**
 * The message an API actually returned, rather than the raw response body.
 *
 * A revoked share link used to reach the user as the literal text
 * {"message":"Link is revoked"} because the caller alerted `await res.text()`.
 */
export async function apiMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.message || fallback;
  } catch {
    return fallback;
  }
}
