// Single source of truth for the production URL. Override via NEXT_PUBLIC_SITE_URL
// (e.g. for preview deploys); defaults to the live custom domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://halvinglens.com").replace(/\/$/, "");
export const SITE_HOST = "halvinglens.com";
export const SITE_NAME = "halvinglens.com";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
