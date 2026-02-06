import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const shopId = payload.shop_id;
  const shopDomain = payload.shop_domain;

  console.log(`Shop redaction request for: ${shopDomain} (ID: ${shopId})`);

  // TODO: Implement your logic to:
  // 1. Delete ALL data related to this shop
  // 2. You have 48 hours to complete this
  // 3. This happens when a merchant uninstalls your app or closes their store

  // Example: Delete all shop-related data
  try {
    // Delete sessions
    await db.session.deleteMany({
      where: { id: shopDomain }
    });

    // Delete any other shop-specific data you store
    // await db.yourShopData.deleteMany({
    //   where: { shopDomain: shopDomain }
    // });

    console.log(`Successfully redacted data for shop: ${shopDomain}`);
  } catch (error) {
    console.error(`Error redacting shop data: ${error}`);
    // Still return 200 to acknowledge receipt
  }

  return new Response();
};
