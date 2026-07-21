// The official, live HalvingLens channels. Only channels that actually exist go
// here — the footer renders exactly this list, so an inactive/empty link can
// never appear (P2.1). Also used for the Organization `sameAs` structured data.
export interface SocialLink {
  label: string;
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: "X", href: "https://x.com/halvinglens" },
  { label: "YouTube", href: "https://youtube.com/@halvinglens" },
  { label: "Instagram", href: "https://instagram.com/halvinglens" },
];

export const CONTACT_EMAIL = "brief@halvinglens.com";
