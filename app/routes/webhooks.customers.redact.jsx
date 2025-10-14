import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  const customerId = payload.customer.id;
  const customerEmail = payload.customer.email;
  const ordersToRedact = payload.orders_to_redact;

  console.log(`Redaction request for customer: ${customerId} (${customerEmail})`);
  console.log(`Orders to redact: ${ordersToRedact}`);

  // TODO: Implement your logic to:
  // 1. Delete or anonymize all data related to this customer
  // 2. You have 48 hours to complete this
  // 3. This is a GDPR requirement

  // Example: Delete customer data from your database
  // await db.yourCustomerData.deleteMany({
  //   where: { shopifyCustomerId: customerId }
  // });

  return new Response();
};
