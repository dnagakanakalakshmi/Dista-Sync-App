import { Session } from "@shopify/shopify-api";

function getShopDomain(sessionId) {
  return sessionId.replace(/^(offline|online)_/, "").split("_")[0];
}

function getShopHandle(shopDomain) {
  const suffix = ".myshopify.com";
  return shopDomain.endsWith(suffix)
    ? shopDomain.slice(0, -suffix.length)
    : shopDomain;
}

export class MongoSessionStorage {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async storeSession(session) {
    await this.prisma.session.upsert({
      where: { id: session.shop },
      update: {
        scope: session.scope,
        accessToken: session.accessToken,
      },
      create: {
        id: session.shop,
        shop: getShopHandle(session.shop),
        patternMatched: false,
        scope: session.scope,
        accessToken: session.accessToken,
      },
    });

    return true;
  }

  async loadSession(id) {
    const shopDomain = getShopDomain(id);
    const sessionData = await this.prisma.session.findUnique({
      where: { id: shopDomain },
    });

    if (!sessionData) return undefined;

    const isOnline = id.startsWith("online_");

    return new Session({
      id,
      shop: shopDomain,
      state: "",
      isOnline,
      scope: sessionData.scope,
      expires: null,
      accessToken: sessionData.accessToken,
    });
  }

  async deleteSession(id) {
    const shopDomain = getShopDomain(id);

    await this.prisma.session.delete({
      where: { id: shopDomain },
    });

    return true;
  }

  async deleteSessions(ids) {
    const shops = ids.map(getShopDomain);

    await this.prisma.session.deleteMany({
      where: { id: { in: shops } },
    });

    return true;
  }

  async findSessionsByShop(shop) {
    const sessions = await this.prisma.session.findMany({
      where: {
        OR: [{ id: shop }, { shop }],
      },
    });

    return sessions.map((sessionData) => {
      const sessionId = `offline_${sessionData.id}`;

      return new Session({
        id: sessionId,
        shop: sessionData.id,
        state: "",
        isOnline: false,
        scope: sessionData.scope,
        expires: null,
        accessToken: sessionData.accessToken,
      });
    });
  }
}
