import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web HTML shell — injected around all Expo Router pages.
// Only runs at build/SSR time on web; ignored on native.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/* PWA */}
        <meta name="application-name" content="Ri Ri" />
        <meta name="description" content="Your personal operating system" />
        <meta name="theme-color" content="#6366F1" />
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ri Ri" />
        <link rel="apple-touch-icon" href="/favicon.png" />

        {/* Prevent body/html scroll bleeding */}
        <ScrollViewStyleReset />

        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js').catch(function (err) {
                    console.warn('[SW] Registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
