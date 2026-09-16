const PUBLIC_PREFIXES = ["/login", "/auth"] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
