"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ConsentState = "unknown" | "accepted" | "declined";

const LOCAL_STORAGE_KEY = "analytics_consent";

type PHWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  posthog?: {
    capture: (event: string, properties?: Record<string, unknown>) => void;
    identify?: (id: string, props?: Record<string, unknown>) => void;
    get_distinct_id?: () => string;
  };
};

function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

function injectInline(id: string, code: string): void {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.innerHTML = code;
  document.head.appendChild(s);
}

function initializeGA4(gaId: string) {
  if (!gaId) return;
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${gaId}`).then(() => {
    const w = window as PHWindow;
    w.dataLayer = w.dataLayer || [];
    function gtag(...args: unknown[]) {
      w.dataLayer!.push(args);
    }
    w.gtag = gtag;
    gtag("js", new Date());
    gtag("config", gaId, { send_page_view: false });
  });
}

function initializeClarity(tag: string) {
  if (!tag) return;
  injectInline(
    "ms-clarity-inline",
    `;(function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", ${JSON.stringify(tag)});`
  );
}

function initializePostHog(key: string, host: string | undefined) {
  if (!key) return;
  injectInline(
    "posthog-inline",
    `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init(${JSON.stringify(key)}, {
      api_host: ${JSON.stringify(host || "https://us.i.posthog.com")},
      capture_pageview: false,
      capture_exception: false,
      disable_session_recording: false,
      session_recording: { maskAllInputs: true, maskTextSelector: '[data-private]' },
      autocapture: { dom_event_allowlist: ['click','submit','change'] },
      loaded: function(ph){ /* no-op here; pageviews tracked via router */ }
    });`
  );
}

export default function TrackingConsentGate() {
  const [consent, setConsent] = useState<ConsentState>("unknown");
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const gaId = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "", []);
  const clarityTag = useMemo(() => process.env.NEXT_PUBLIC_MS_CLARITY_TAG || "", []);
  const phKey = useMemo(() => process.env.NEXT_PUBLIC_POSTHOG_KEY || "", []);
  const phHost = useMemo(() => process.env.NEXT_PUBLIC_POSTHOG_HOST || undefined, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY) as ConsentState | null;
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored);
    } else {
      // No action taken yet: keep banner visible, treat as accepted for usage
      setConsent("unknown");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (consent === "declined") return; // only block when explicitly declined
    initializeGA4(gaId);
    initializeClarity(clarityTag);
    initializePostHog(phKey, phHost);

    // Optional: forward unhandled errors to PostHog when available
    const onError = (event: ErrorEvent) => {
      const w = window as PHWindow;
      if (w.posthog && event?.error) {
        w.posthog.capture("client_error", {
          message: event.error.message,
          name: event.error.name,
          source: event.filename,
          line: event.lineno,
          col: event.colno,
        });
      }
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, [hydrated, consent, gaId, clarityTag, phKey, phHost]);

  // Track pageviews on route changes for GA4 and PostHog
  useEffect(() => {
    if (!hydrated) return;
    if (consent === "declined") return; // only block when explicitly declined
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    // GA4 page_view
    const w = window as PHWindow;
    if (typeof window !== "undefined" && w.gtag && gaId) {
      w.gtag("config", gaId, { page_path: url });
    }
    // PostHog pageview
    if (typeof window !== "undefined" && w.posthog) {
      w.posthog.capture("$pageview");
    }
  }, [pathname, searchParams, hydrated, consent, gaId]);

  const accept = () => {
    setConsent("accepted");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, "accepted");
    }
  };
  const decline = () => {
    setConsent("declined");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, "declined");
    }
  };

  if (consent !== "unknown") return null;

  return (
    <div className="fixed left-0 bottom-0 z-50 m-4 w-[360px] max-w-[90vw]">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          We use cookies and similar tech to analyze traffic and improve your experience. Enable analytics?
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={accept}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={decline}
            className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}


