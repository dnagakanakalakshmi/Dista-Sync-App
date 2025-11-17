import { Page, Text, Card, BlockStack, InlineStack } from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import OnboardingWizard from "../components/OnboardingWizard";
import { TitleBar } from "@shopify/app-bridge-react";
import { PrismaClient } from "@prisma/client";
import shopify from "../shopify.server";

const prisma = new PrismaClient();

// Helper to load and normalize partner emails from the `Emails` table.
async function getPartnerEmails() {
  const rows = await prisma.emails.findMany({ select: { emails: true } });
  const collected = [];
  for (const r of rows) {
    const raw = ((r.emails) || "").toString().trim();
    if (!raw) continue;
    // parse JSON array string first
    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (typeof item === "string" && item.trim()) collected.push(item.trim().toLowerCase());
          }
          continue;
        }
      } catch (e) {
        // fall back to CSV parsing below
        console.warn("getPartnerEmails: failed to parse JSON", raw, e);
      }
    }
    const parts = raw.includes(",") ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [raw.trim()];
    for (const p of parts) collected.push(p.toLowerCase());
  }
  return Array.from(new Set(collected));
}

export async function action({ request }) {
  try {
    const body = await request.json();
    const { email, completed } = body || {};
    const url = new URL(request.url);
    const shop = body?.shop || url.searchParams.get("shop") || null;

    if (!email && !completed && !shop) {
      return json({ ok: false, error: "email or completed or shop required" }, { status: 400 });
    }

    // Server-side verification: if an email is present, ensure it exists in `Emails` table
    if (email) {
      try {
        const partnerEmails = await getPartnerEmails();
        const normalized = (email || "").trim().toLowerCase();
        if (!partnerEmails.includes(normalized)) {
          console.log("/app action: email not registered", { email: normalized });
          return json({ ok: false, error: "email_not_registered", message: "This email is not registered with Dista-WMS. If you're not registered, please email it@distacart.com" }, { status: 400 });
        }
      } catch (e) {
        console.error("/app action: email verification failed", e);
        return json({ ok: false, error: "email_verification_failed" }, { status: 500 });
      }
    }

    if (shop) {
      const existing = await prisma.onboarding.findFirst({ where: { shop } });
      if (existing) {
        const updated = await prisma.onboarding.update({ where: { id: existing.id }, data: { completed: !!completed, adminEmail: email || existing.adminEmail, shop } });
        return json({ ok: true, record: updated });
      }
      const created = await prisma.onboarding.create({ data: { adminEmail: email || "", completed: !!completed, shop } });
      return json({ ok: true, record: created });
    }

    const existing = await prisma.onboarding.findFirst({ where: { adminEmail: email } });
    if (existing) {
      const updated = await prisma.onboarding.update({ where: { id: existing.id }, data: { completed: !!completed, adminEmail: email } });
      return json({ ok: true, record: updated });
    }
    const created = await prisma.onboarding.create({ data: { adminEmail: email || "", completed: !!completed } });
    return json({ ok: true, record: created });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: "db_error" }, { status: 500 });
  }
}

export async function loader({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const { shop } = session;
    if (shop) {
      const rec = await prisma.onboarding.findFirst({ where: { shop } });
      const partnerEmails = await getPartnerEmails();
      return json({ completed: !!(rec && rec.completed), record: rec || null, shop, partnerEmails });
    }
    const rec = await prisma.onboarding.findFirst({ where: { completed: true } });
    const partnerEmails = await getPartnerEmails();
    return json({ completed: !!rec, record: rec || null, shop: null, partnerEmails });
  } catch (e) {
    console.error("/app loader error", e);
    return json({ completed: false, record: null, shop: null });
  }
}

export default function Index() {
  const data = useLoaderData();
  const completed = !!data?.completed;

  if (completed) {
    // Render homepage for onboarded stores
    return (
      <Page>
        <TitleBar title="Dista Sync App" />
        <div style={{ position: 'relative', width: '100%', maxWidth: 800, margin: '40px auto 0 auto' }}>
          <Card padding="800" background="bg-surface" borderRadius="400">
            <BlockStack gap="400" align="center">
              <InlineStack gap="200" align="center" blockAlign="center">
                <img
                  src="/dista_logoo.png"
                  alt="Dista Logo"
                  width="90"
                  height="90"
                  loading="eager"
                  style={{ display: 'block' }}
                />
                <Text as="h1" variant="heading2xl" fontWeight="bold" alignment="center">
                  Dista Sync App
                </Text>
              </InlineStack>
              <Text variant="bodyLg" as="p" tone="subdued" alignment="center">
                This app is required for safe and secure collaboration with the Distacart organisation.
                <br />
                Please do not uninstall this app.
              </Text>
            </BlockStack>
          </Card>
          <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', textAlign: 'right' }}>
            <Text variant="bodySm" tone="subdued" as="p">
              Powered by Distacart
            </Text>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Dista Sync App" />
      <OnboardingWizard initialEmail={data?.record?.adminEmail ?? ""} shop={data?.shop ?? null} partnerEmails={data?.partnerEmails ?? []} />
    </Page>
  );
}
