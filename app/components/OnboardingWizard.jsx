import { useState } from "react";
// Support both CJS default export and named exports depending on bundler
import {
  Page,
  Card,
  Button,
  TextField,
  Text,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { ExternalSiteFrame } from "./ExternalSiteFrame";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

export default function OnboardingWizard({ initialEmail = "", shop = null, finalUrl = "", onCompleted }) {
  const [email, setEmail] = useState(initialEmail || "");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showWebsite, setShowWebsite] = useState(false);

  function validateEmail(value) {
    if (!value) return "Email is required";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return ok ? "" : "Enter a valid email address";
  }

  function handleNextFromEmail() {
    const validation = validateEmail(email);
    if (validation) {
      setEmailError(validation);
      console.log("handleNextFromEmail: validation failed", validation);
      return;
    }

    // Save admin email to server with completed: true and show website
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(window.location.pathname, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, completed: true, shop }),
        });
        let j = null;
        try { j = await resp.json(); } catch (e) { /* ignore parse errors */ }
        if (!resp.ok) {
          const msg = (j && (j.message || j.error || j.msg)) || `Unexpected error (${resp.status})`;
          setEmailError(typeof msg === 'string' ? msg : JSON.stringify(msg));
          console.log("handleNextFromEmail: server returned error", { status: resp.status, body: j });
          return;
        }
        setShowWebsite(true);
        if (typeof onCompleted === "function") {
          onCompleted(normalizeEmail(email));
        }
      } catch (e) {
        console.error("handleNextFromEmail: fetch error", e);
        setEmailError("Network error, please try again");
      } finally {
        setLoading(false);
      }
    })();
  }

  // Build URL with the entered email
  const buildUrlWithEmail = () => {
    try {
      const url = new URL(finalUrl);
      if (email) {
        url.searchParams.set("email", normalizeEmail(email));
      }
      return url.toString();
    } catch (e) {
      return finalUrl;
    }
  };

  if (showWebsite) {
    return (
      <div style={{ height: "100vh", width: "100%", margin: 0, padding: 0 }}>
        <ExternalSiteFrame url={buildUrlWithEmail()} />
      </div>
    );
  }

  return (
    <Page>
      <Card sectioned>
        <BlockStack gap="800">
          <Text as="h1" variant="headingLg">Connect Dista-WMS</Text>

          <BlockStack gap="200">
            <Text variant="bodyMd" as="p" color="subdued">
              Please provide the email address which is registered to Dista-WMS.
            </Text>
            <TextField
              value={email}
              onChange={(v) => {
                setEmail(v);
                setEmailError("");
              }}
              type="email"
              error={emailError || undefined}
              label="Email"
            />
            {/* <Text as="p" variant="bodySm" color="subdued">
              If your email is not registered with Dista-WMS, please register <a href="https://dista-sync-client.onrender.com/" target="_blank" rel="noreferrer noopener">here</a>.
            </Text> */}
            <InlineStack gap="200" style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button primary onClick={handleNextFromEmail} loading={loading}>
                Next
              </Button>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>
    </Page>
  );
}
