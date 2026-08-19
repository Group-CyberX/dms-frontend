import toast from "react-hot-toast";

/**
 * Every message the user sees after an action goes through here, so the wording
 * and the styling stay in one place instead of being decided per call site.
 *
 * The <Toaster> itself is mounted once in app/layout.tsx; this only decides
 * which kind of toast to raise.
 */
export const notify = {
  success(message: string) {
    return toast.success(message);
  },

  error(message: string) {
    return toast.error(message);
  },

  info(message: string) {
    return toast(message, { icon: "i" });
  },

  /** Shows pending/settled states for something that takes a moment. */
  promise<T>(
    work: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    return toast.promise(work, messages);
  },
};

/**
 * The message a failed response is carrying.
 *
 * Reads the API's { "message": ... } body and falls back to the given text.
 * Call sites used to pass `await res.text()` straight to alert(), which put raw
 * JSON on screen - a revoked share link read `{"message":"Link is revoked"}`.
 */
export async function apiMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.clone().json();
    if (body?.message && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // Not JSON - fall through to the plain body below.
  }

  try {
    const text = (await res.text()).trim();
    // Only use it if it is not a JSON blob we failed to parse above.
    if (text && !text.startsWith("{") && !text.startsWith("[")) {
      return text;
    }
  } catch {
    // Nothing readable - use the fallback.
  }

  return fallback;
}
