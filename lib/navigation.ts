export type NavigationItem = {
  label: string;
  href: string;
};

export const workspaceNavigation: NavigationItem[] = [
  { label: "Home", href: "/" },
  { label: "Cases", href: "/cases" },
  { label: "Documents", href: "/documents" },
  { label: "Tasks", href: "/tasks" },
  { label: "Calendar", href: "/calendar" },
  { label: "Contacts", href: "/contacts" },
  { label: "AI Assistant", href: "/assistant" },
];

export const secondaryNavigation: NavigationItem[] = [
  { label: "Settings", href: "/settings" },
];
