import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { payload, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Log the data request for compliance tracking
  const customerId = payload.customer.id;
  const customerEmail = payload.customer.email;
  const ordersRequested = payload.orders_requested;

  console.log(`Data request for customer: ${customerId} (${customerEmail})`);
  console.log(`Orders requested: ${ordersRequested}`);

  // TODO: Implement your logic to:
  // 1. Collect all data you have stored about this customer
  // 2. Send the data to the customer or make it available for download
  // 3. You have 30 days to fulfill this request

  // Example: Query your database for customer data
  // const customerData = await db.yourCustomerData.findMany({
  //   where: { shopifyCustomerId: customerId }
  // });
  // Then send this data to the customer via email or provide a download link

  return new Response();
};
