import { useMemo, useState } from "react";
// Support both CJS default export and named exports depending on bundler
import { Page, Card, Button, TextField, Checkbox, Text, Badge, BlockStack, InlineStack } from "@shopify/polaris";

const PERMISSIONS = [
  { title: "Products", desc: "View and manage products" },
  { title: "Customers", desc: "View and manage customers" },
  { title: "Orders", desc: "View and manage orders" },
  { title: "Draft orders", desc: "View and manage draft orders" },
  { title: "Inventory", desc: "View and manage inventory levels" },
  { title: "Fulfillments", desc: "View and manage fulfillments" },
  { title: "Locations", desc: "View and manage locations" },
  { title: "Shipping", desc: "View and manage shipping settings" },
  { title: "Discounts & Price rules", desc: "View and manage discounts and price rules" },
];

const normalizeEmail = (value = "") => value.trim().toLowerCase();

export default function OnboardingWizard({ initialEmail = "", shop = null, partnerEmails = [] }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(initialEmail || "");
  const [emailError, setEmailError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizedPartnerEmails = useMemo(() => {
    if (!Array.isArray(partnerEmails)) return [];
    return partnerEmails.map((entry) => normalizeEmail(entry)).filter(Boolean);
  }, [partnerEmails]);


  function validateEmail(value) {
    if (!value) return "Email is required";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return ok ? "" : "Enter a valid email address";
  }

  // Permissions are shown as grouped, read-only summaries (no individual checkboxes)

  function handleNextFromEmail() {
    const validation = validateEmail(email);
    if (validation) {
      setEmailError(validation);
      console.log("handleNextFromEmail: validation failed", validation);
      return;
    }

    // Validate email against partnerEmails (provided by loader). If valid, save admin email to server and advance.
    try {
      const normalized = normalizeEmail(email || "");
      const allowed = normalizedPartnerEmails.includes(normalized);
      if (!allowed) {
        setEmailError("This email is not registered with Dista-WMS. If you're not registered, please email it@distacart.com");
        console.log("handleNextFromEmail: email not in partner list", { email: normalized, partnerEmails: normalizedPartnerEmails });
        return;
      }
    } catch (e) {
      console.error("handleNextFromEmail: validation check failed", e);
      setEmailError("Validation failed, please try again or contact it@distacart.com");
      return;
    }

    // Save admin email to server (best-effort) and advance to permissions step
    (async () => {
      setLoading(true);
      try {
        const resp = await fetch(window.location.pathname, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, completed: false, shop }),
        });
        let j = null;
        try { j = await resp.json(); } catch (e) { /* ignore parse errors */ }
        if (!resp.ok) {
          const msg = (j && (j.message || j.error || j.msg)) || `Unexpected error (${resp.status})`;
          setEmailError(typeof msg === 'string' ? msg : JSON.stringify(msg));
          console.log("handleNextFromEmail: server returned error", { status: resp.status, body: j });
          return; // do not advance
        }
        setStep(2);
      } catch (e) {
        console.error("handleNextFromEmail: fetch error", e);
        setEmailError("Network error, please try again");
      } finally {
        setLoading(false);
      }
    })();
  }

  function handleStartOAuth() {
    if (!accepted) {
      console.log("handleStartOAuth: user has not accepted permissions");
      return;
    }
    // Persist onboarding completed to server and navigate to main app page (skip OAuth for now)
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
          console.log("handleStartOAuth: server returned error", { status: resp.status, body: j });
          return;
        }
        setStep(3);
        if (typeof window !== "undefined") {
          // Preserve current query string (host/hmac/session) when navigating
          const target = window.location.pathname + (window.location.search || "");
          setTimeout(() => {
            window.location.href = target || "/app";
          }, 3000);
        }
      } catch (e) {
        console.error("handleStartOAuth: fetch error", e);
        setEmailError("Network error, please try again");
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <Page>
      <Card sectioned>
        <BlockStack gap="800">
          <InlineStack align="center" gap="200" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text as="h1" variant="headingLg">Connect Dista-WMS</Text>
            <Badge status="new">Step {step} of 3</Badge>
          </InlineStack>

          {step === 1 && (
            <BlockStack gap="200">
              <Text variant="bodyMd" as="p" color="subdued">
                Please provide the email address which is registered to Dista - WMS.
              </Text>
              <TextField
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setEmailError("");
                }}
                type="email"
                error={emailError || undefined}
              />
              <Text as="p" variant="bodySm" color="subdued">
                If your email is not registered with Dista-WMS, please send a message to <strong>it@distacart.com</strong> and our team will assist you.
              </Text>
              <InlineStack gap="200" style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button primary onClick={handleNextFromEmail} loading={loading}>
                  Next
                </Button>
              </InlineStack>
            </BlockStack>
          )}

          {step === 2 && (
            <BlockStack gap="200">
              <Text as="p">Dista-WMS requires the following permissions to synchronize your store.</Text>
              <Card sectioned>
                <BlockStack gap="200">
                  {PERMISSIONS.map((g) => (
                    <div key={g.title} style={{ marginBottom: 12 }}>
                      <Text as="h4" style={{ fontWeight: 600 }}>{g.title}</Text>
                      <Text as="p" color="subdued">{g.desc}</Text>
                    </div>
                  ))}
                </BlockStack>
              </Card>

              <InlineStack align="center" gap="200">
                <Checkbox
                  label="I understand and accept these permissions"
                  checked={accepted}
                  onChange={(v) => setAccepted(v)}
                />
              </InlineStack>

              <InlineStack gap="200" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Button onClick={() => setStep(1)}>Back</Button>
                <Button primary disabled={!accepted} onClick={handleStartOAuth}>
                  Authorize
                </Button>
              </InlineStack>
            </BlockStack>
          )}

          {step === 3 && (
            <BlockStack gap="200" align="center">
              <Text as="h2" variant="headingMd">You're all set</Text>
              <Text variant="bodyMd" as="p" color="subdued">
                Congratulations! Your Dista-WMS account is connected, Redirecting you to the app...
              </Text>
            </BlockStack>
          )}
        </BlockStack>
      </Card>
    </Page>
  );
}
