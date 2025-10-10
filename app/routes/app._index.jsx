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
        <Card padding="800" background="bg-surface" borderRadius="400" style={{ width: '100%' }}>
          <BlockStack gap="400" align="center">
            <InlineStack gap="400" align="center" blockAlign="center">
              <img
                src="/dista_logo.png"
                alt="Dista Logo"
                style={{ width: 90, height: 90, display: 'block', verticalAlign: 'middle' }}
              />
              <Text as="h1" variant="heading2xl" fontWeight="bold" alignment="center" style={{ margin: 0, lineHeight: '90px', display: 'flex', alignItems: 'center' }}>
                Dista App
              </Text>
            </InlineStack>
            <Text variant="bodyLg" as="p" color="subdued" alignment="center">
              This app is required for safe and secure collaboration with the Distacart organisation.<br />
              <span>Please do not uninstall this app.</span>
            </Text>
          </BlockStack>
        </Card>
        <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', textAlign: 'right' }}>
          <Text variant="bodySm" color="subdued" style={{ marginTop: 8 }}>
            Powered by Distacart
          </Text>
        </div>
      </div>
    </Page>
  );
}
