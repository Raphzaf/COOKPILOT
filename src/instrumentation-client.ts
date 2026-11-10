// Browser-side error monitoring. Loaded only when NEXT_PUBLIC_SENTRY_DSN is set.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  });
}

export function onRouterTransitionStart() {
  // Navigation tracing is intentionally left to Sentry's defaults once initialised.
}
