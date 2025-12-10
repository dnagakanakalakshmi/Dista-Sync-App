import { Page, Text, Card, BlockStack, InlineStack } from "@shopify/polaris";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import OnboardingWizard from "../components/OnboardingWizard";
import { TitleBar } from "@shopify/app-bridge-react";
import prisma from "../db.server";
import shopify from "../shopify.server";

const normalizeEmail = (value = "") => value.trim().toLowerCase();

async function getPartnerEmails(shop = null) {
  const where = shop ? { store: shop } : {};
  const rows = await prisma.users.findMany({ where, select: { email: true } });
  return Array.from(
    new Set(
      rows
        .map((row) => normalizeEmail(row.email || ""))
        .filter(Boolean),
    ),
  );
}

export async function action({ request }) {
  try {
    const { session } = await shopify.authenticate.admin(request);
    const shop = session?.shop || null;

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Ignore parse errors; validation below will handle missing fields
    }

    const { email, completed } = body || {};

    if (!email && !completed && !shop) {
      return json({ ok: false, error: "email or completed or shop required" }, { status: 400 });
    }

    // Server-side verification: if an email is present, ensure it exists in `Users` table with matching store
    if (email && shop) {
      try {
        const normalized = (email || "").trim().toLowerCase();
        const user = await prisma.users.findFirst({
          where: {
            email: normalized,
            store: shop
          }
        });
        
        if (!user) {
          console.log("/app action: email-store combination not found", { email: normalized, shop });
          return json(
            {
              ok: false,
              error: "email_not_registered",
              message: "This email is not registered with Dista-WMS.",
            },
            { status: 400 },
          );
        }
      } catch (e) {
        console.error("/app action: email verification failed", e);
        return json({ ok: false, error: "email_verification_failed" }, { status: 500 });
      }
    }

    if (shop) {
      const existing = await prisma.onboarding.findFirst({ where: { shop } });
      if (existing) {
        const updated = await prisma.onboarding.update({
          where: { id: existing.id },
          data: { completed: !!completed, adminEmail: email || existing.adminEmail, shop },
        });
        return json({ ok: true, record: updated });
      }
      const created = await prisma.onboarding.create({ data: { adminEmail: email || "", completed: !!completed, shop } });
      return json({ ok: true, record: created });
    }

    const existing = await prisma.onboarding.findFirst({ where: { adminEmail: email } });
    if (existing) {
      const updated = await prisma.onboarding.update({
        where: { id: existing.id },
        data: { completed: !!completed, adminEmail: email },
      });
      return json({ ok: true, record: updated });
    }
    const created = await prisma.onboarding.create({
      data: { adminEmail: email || "", completed: !!completed },
    });
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
      const partnerEmails = await getPartnerEmails(shop);
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
