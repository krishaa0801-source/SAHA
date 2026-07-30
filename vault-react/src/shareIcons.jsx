/* Small hand-drawn monochrome brand glyphs (currentColor, 18x18) for the
   quick-share popup — Lucide doesn't ship brand marks and isn't installed
   in this project yet, and Material Symbols (used everywhere else on this
   page) has no WhatsApp/X/Facebook/Telegram/Instagram icons either, so
   these are minimal geometric approximations of each mark rather than a
   traced/copied icon-font asset. Every option is also paired with a text
   label in the popup, so exact pixel fidelity isn't load-bearing for
   usability — just recognizability at a glance. */

export function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 3a9 9 0 0 0-7.75 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.7 8.4c.2-.5.4-.5.6-.5h.5c.16 0 .37 0 .53.4.2.5.6 1.5.66 1.6.06.15.1.3 0 .5-.1.2-.15.3-.3.46-.14.16-.3.35-.43.47-.14.14-.3.3-.13.6.18.3.8 1.3 1.7 2.1 1.16 1 2.14 1.36 2.44 1.5.3.16.48.13.65-.08.18-.2.75-.85.94-1.14.2-.3.4-.24.66-.14.28.1 1.76.83 2.06 1 .3.13.5.2.57.32.08.13.08.7-.16 1.4-.24.66-1.4 1.3-1.95 1.36-.5.06-1.13.1-1.83-.1-.42-.13-.96-.3-1.66-.6-2.9-1.25-4.8-4.16-4.94-4.36-.14-.2-1.17-1.56-1.17-2.97 0-1.4.74-2.1 1-2.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="m6.8 12.1 9.6-4c.5-.2.9.15.7.7l-1.7 8.2c-.13.6-.5.75-1 .46l-2.5-1.85-1.2 1.16c-.13.13-.25.2-.5.2l.18-2.55 4.6-4.16c.2-.18-.05-.28-.3-.1l-5.7 3.6-2.45-.77c-.53-.16-.54-.53.1-.79Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M5 5l14 14M19 5 5 19"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13.6 20.6v-6.2h2.1l.3-2.4h-2.4V10.4c0-.7.2-1.2 1.2-1.2h1.3V7c-.23-.03-1-.1-1.9-.1-1.9 0-3.2 1.15-3.2 3.28v1.83H9v2.4h2v6.2"
        fill="currentColor"
      />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.9" cy="7.1" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function LinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true" {...props}>
      <path
        d="M9.5 14.5 14.5 9.5M11 8l1-1a3 3 0 1 1 4.24 4.24l-1.24 1.24M13 16l-1 1A3 3 0 1 1 7.76 12.76L9 11.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
