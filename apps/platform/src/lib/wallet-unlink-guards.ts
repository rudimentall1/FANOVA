export const MAX_WALLET_UNLINK_BODY_BYTES = 12_000;
export const MAX_ACTIVE_WALLET_UNLINK_CHALLENGES = 5;

export async function readBodyWithLimit(request: Request, maxBytes = MAX_WALLET_UNLINK_BODY_BYTES): Promise<string> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    throw new Error("BODY_TOO_LARGE");
  }
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let result = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("Request body exceeds configured limit.");
        throw new Error("BODY_TOO_LARGE");
      }
      result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
    return result;
  } finally {
    reader.releaseLock();
  }
}
