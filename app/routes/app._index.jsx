import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import OnboardingWizard from "../components/OnboardingWizard";
import { ExternalSiteFrame } from "../components/ExternalSiteFrame";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";

const buildExternalUrl = (shop, email = "") => {
  const base = process.env.EXTERNAL_SITE_URL || "https://dista-sync-client.onrender.com";
  try {
    const url = new URL(base);
    if (shop) url.searchParams.set("shop", shop);
    if (email) url.searchParams.set("email", email);
    url.searchParams.set("source", "embedded_app");
    return url.toString();
  } catch (e) {
    // Fallback to the raw base if it is not a valid URL
    return base;
  }
};

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const existing = await prisma.onboarding.findFirst({ where: { shop } });

  return json({
    shop,
    onboardingCompleted: existing?.completed ?? false,
    adminEmail: existing?.adminEmail ?? "",
    externalUrl: buildExternalUrl(shop, existing?.adminEmail ?? ""),
  });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = (payload.email || "").trim().toLowerCase();
  const completed = Boolean(payload.completed);

  if (!email) {
    return json({ error: "Email is required" }, { status: 400 });
  }

  const existing = await prisma.onboarding.findFirst({ where: { shop } });

  if (existing) {
    await prisma.onboarding.update({
      where: { id: existing.id },
      data: { adminEmail: email, completed },
    });
  } else {
    await prisma.onboarding.create({
      data: { shop, adminEmail: email, completed },
    });
  }

  return json({ ok: true, completed });
};

// Client-side function to update email in URL
const updateEmailInUrl = (baseUrl, newEmail) => {
  try {
    const url = new URL(baseUrl);
    if (newEmail) {
      url.searchParams.set("email", newEmail);
    }
    return url.toString();
  } catch (e) {
    return baseUrl;
  }
};

export default function Index() {
  const {
    onboardingCompleted: onboardingCompletedFromLoader,
    adminEmail,
    shop,
    externalUrl,
  } = useLoaderData();

  const [onboardingCompleted, setOnboardingCompleted] = useState(onboardingCompletedFromLoader);
  const [currentEmail, setCurrentEmail] = useState(adminEmail);

  if (!onboardingCompleted) {
    return (
      <OnboardingWizard
        initialEmail={adminEmail}
        shop={shop}
        finalUrl={externalUrl}
        onCompleted={(updatedEmail) => {
          setOnboardingCompleted(true);
          setCurrentEmail(updatedEmail);
        }}
      />
    );
  }

  // Update URL with the current email (updated after onboarding)
  const finalExternalUrl = updateEmailInUrl(externalUrl, currentEmail);

  return (
    <div style={{ height: "100vh", width: "100%", margin: 0, padding: 0 }}>
      <ExternalSiteFrame url={finalExternalUrl} />
    </div>
  );
}