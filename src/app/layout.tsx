/** The document shell (<html>, fonts, providers) lives in app/[locale]/layout.tsx so `lang` follows the locale. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
