import React from "react";

export type SideNavItem = {
  label: string;
  icon: "overview" | "star" | "applications" | "documents" | "feedback" | "profile" | "search" | "chat" | "messages" | "notifications" | "settings" | "logout";
  badge?: string;
  sectionId?: string;
  href?: string;
};

export function SideIcon({ name }: { name: SideNavItem["icon"] }) {
  const icons: Record<SideNavItem["icon"], JSX.Element> = {
    overview: <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />,
    star: <path d="m12 3 2.8 5.6L21 9.5l-4.5 4.4 1.1 6.1L12 17.1 6.4 20l1.1-6.1L3 9.5l6.2-.9L12 3Z" />,
    applications: <path d="M7 4h10v4H7V4Zm-1 6h12v10H6V10Zm2 2v2h2v-2H8Zm0 4v2h2v-2H8Zm4-4v2h4v-2h-4Zm0 4v2h4v-2h-4Z" />,
    documents: <path d="M7 3h7l5 5v13H7V3Zm7 1.5V9h4.5M9 12h8M9 15h8M9 18h6" />,
    feedback: <path d="M4 11h3v9H4v-9Zm5 9V9.5L12.5 6h4.2c1 0 1.7 1 1.4 2l-1 3h2.6c1.1 0 1.9 1 1.5 2l-1.8 5.6c-.2.6-.8 1-1.4 1H9Z" />,
    profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 1 1 14 0" />,
    search: <path d="M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.5-1.5-4.1-4.1A7 7 0 0 0 11 4Z" />,
    chat: (
      <g stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="3" />
        <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
        <path d="M12 2v5m-4 4V7a4 4 0 0 1 8 0v4" />
      </g>
    ),
    messages: <path d="M3 6h18v11H8l-5 4v-4H3V6Zm3 3h12M6 12h8" />,
    notifications: <path d="M12 3a5 5 0 0 1 5 5v2.8l1.4 2.3c.5.8 0 1.9-.9 1.9H6.5c-.9 0-1.4-1.1-.9-1.9L7 10.8V8a5 5 0 0 1 5-5Zm-2 14a2 2 0 1 0 4 0" />,
    settings: <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />,
    logout: <path d="M9 4H5v16h4M14 8l4 4-4 4M10 12h8" />,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export function ChevronIcon({ direction }: { direction: "up" | "down" | "left" | "right" }) {
  const paths: Record<"up" | "down" | "left" | "right", string> = {
    up: "M6 14l6-6 6 6",
    down: "M6 10l6 6 6-6",
    left: "M14 6l-6 6 6 6",
    right: "M10 6l6 6-6 6",
  };

  return (
    <svg viewBox="0 0 24 24" className="chevron-icon" aria-hidden="true">
      <path d={paths[direction]} />
    </svg>
  );
}

export function MapPinIcon({
  size = 16,
  color = "currentColor",
  className = "",
}: {
  size?: number | string;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function DownloadIcon({
  size = 16,
  color = "currentColor",
  className = "",
}: {
  size?: number | string;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function mapPinSvgString(color = "#f59e0b", size = 16): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
}

export function downloadSvgString(color = "currentColor", size = 16): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
}

