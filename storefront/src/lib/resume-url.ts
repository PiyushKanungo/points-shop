/** Folder in Vercel Blob for one order's resume. */
export function resumeFolder(orderId: string): string {
  return `resumes/${encodeURIComponent(orderId)}/`;
}

/**
 * True when the URL is a public Vercel Blob URL in this order's resume folder: https, a
 * *.public.blob.vercel-storage.com host, path resumes/<orderId>/..., ending in .pdf.
 */
export function isIssuedResumeUrl(url: string, orderId: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname.endsWith(".public.blob.vercel-storage.com") &&
    parsed.pathname.startsWith(`/${resumeFolder(orderId)}`) &&
    parsed.pathname.toLowerCase().endsWith(".pdf") &&
    url.length <= 255
  );
}
