import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  // Redirect to your app's main page after successful authentication
  return redirect("/app");
};