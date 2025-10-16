import {
  Page,
  Text,
  Card,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function Index() {
  return (
    <Page>
      <TitleBar title="Dista App" />
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
                Dista App
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
