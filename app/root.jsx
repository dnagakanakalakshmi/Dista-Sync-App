import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { useEffect } from "react";
import shopify from "./shopify.server";

export default function App() {
  useEffect(() => {
    function processWebVitals(metrics) {
      const monitorUrl = 'https://dista-sync-app.onrender.com/monitor-web-vitals';
      const data = JSON.stringify(metrics);
      navigator.sendBeacon(monitorUrl, data);
    }
    shopify.webVitals.onReport(processWebVitals);
  }, []);
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="shopify-debug" content="web-vitals" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
