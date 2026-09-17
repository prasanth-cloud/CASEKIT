const PUBLIC_PREFIXES = ["/", "/demo", "/login", "/auth", "/api/observability"] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
