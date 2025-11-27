# Implementation Example: AWS Secrets Manager Integration

## Step-by-Step Implementation

### Step 1: Install AWS SDK

```bash
npm install @aws-sdk/client-secrets-manager
```

### Step 2: Create Secrets Loader Module

Create `app/config/secrets-loader.server.js` (already added in this repo) with caching and fallback logic:

```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

let secretsCache = null;
let secretsLoadPromise = null;

async function loadSecretsFromAWS(secretName, region = "us-east-1") {
  const client = new SecretsManagerClient({ region });
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return JSON.parse(response.SecretString);
}

function loadSecretsFromEnv() {
  return {
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES,
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
    SHOP_CUSTOM_DOMAIN: process.env.SHOP_CUSTOM_DOMAIN,
    MONGODB_URI: process.env.MONGODB_URI,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HMR_SERVER_PORT: process.env.HMR_SERVER_PORT,
    FRONTEND_PORT: process.env.FRONTEND_PORT,
  };
}

export async function loadSecrets(options = {}) {
  if (secretsCache) return secretsCache;
  if (secretsLoadPromise) return secretsLoadPromise;

  secretsLoadPromise = (async () => {
    const {
      secretName = process.env.AWS_SECRET_NAME || `dista-sync-app/${process.env.NODE_ENV || "development"}`,
      region = process.env.AWS_REGION || "us-east-1",
      forceEnv = process.env.FORCE_ENV_FILE === "true",
    } = options;

    const isProduction = process.env.NODE_ENV === "production";
    const useAWS = isProduction && !forceEnv;

    if (useAWS) {
      try {
        const secrets = await loadSecretsFromAWS(secretName, region);
        Object.assign(process.env, secrets);
        secretsCache = secrets;
        return secrets;
      } catch (error) {
        console.warn("AWS secrets load failed, falling back to .env:", error.message);
      }
    }

    const secrets = loadSecretsFromEnv();
    secretsCache = secrets;
    return secrets;
  })();

  return secretsLoadPromise;
}
```

### Step 3: Load Secrets in `app/shopify.server.js`

Because Shopify configuration reads environment variables at module load time, we ensure secrets are loaded before creating the Shopify app:

```javascript
import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { loadSecrets } from "./config/secrets-loader.server";
import prisma from "./db.server";

await loadSecrets(); // ensures process.env is populated (cached + idempotent)

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  // ... rest of config
});
```

### Step 4: Optional - Guard Additional Entry Points

Most of the app flows through `app/shopify.server.js`, so loading secrets there covers admin/auth flows. If you have other server entry points (e.g., custom API routes that run before Shopify import), you can defensively call `await loadSecrets()` in those modules or loaders as well. The function is cached, so additional calls are cheap.

### Step 5: Update package.json

Add the AWS SDK dependency (already shown in Step 1).

---

## AWS Secrets Manager Setup

### 1. Create Secret in AWS Console

1. Go to AWS Secrets Manager Console
2. Click "Store a new secret"
3. Select "Other type of secret"
4. Choose "Plaintext" and paste your JSON:

```json
{
  "SHOPIFY_API_KEY": "your-api-key",
  "SHOPIFY_API_SECRET": "your-api-secret",
  "SCOPES": "read_products,write_products,...",
  "SHOPIFY_APP_URL": "https://your-app-url.com",
  "MONGODB_URI": "mongodb+srv://...",
  "NODE_ENV": "production"
}
```

5. Secret name: `dista-sync-app/production`
6. Click "Store"

### 2. Set Up IAM Role/Policy

#### Option A: If deploying to AWS (EC2, ECS, Lambda)

Attach this IAM policy to your instance/role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:dista-sync-app/*"
    }
  ]
}
```

#### Option B: For Local Testing or Non-AWS Deployment

Set AWS credentials as environment variables:

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

Or use AWS credentials file: `~/.aws/credentials`

---

## Environment Variables for Configuration

Add these optional environment variables to control behavior:

```bash
# .env (for local development)
NODE_ENV=development  # Use .env file

# Production (set in deployment)
NODE_ENV=production
AWS_SECRET_NAME=dista-sync-app/production  # Optional: override default
AWS_REGION=us-east-1  # Optional: override default
FORCE_ENV_FILE=false  # Set to "true" to force .env even in production
```

---

## Testing the Implementation

### Test Locally (Development Mode)

1. Keep your `.env` file
2. Run: `npm run dev`
3. Should see: `📝 Loading secrets from .env file (local development)`

### Test with AWS (Production Mode)

1. Set `NODE_ENV=production`
2. Configure AWS credentials
3. Run: `npm start`
4. Should see: `✅ Successfully loaded secrets from AWS Secrets Manager`

### Test Fallback

1. Set `NODE_ENV=production`
2. Don't configure AWS credentials (or use wrong ones)
3. Run: `npm start`
4. Should see: `⚠️ Failed to load from AWS, falling back to .env`

---

## Deployment Checklist

### For AWS Deployments (EC2, ECS, Lambda, etc.)

- [ ] Create IAM role with Secrets Manager permissions
- [ ] Attach role to your compute resource
- [ ] Create secret in AWS Secrets Manager
- [ ] Set `NODE_ENV=production` in deployment config
- [ ] Remove `.env` file from production (or keep as backup)

### For Non-AWS Deployments (Heroku, Railway, etc.)

- [ ] Set AWS credentials as environment variables:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
- [ ] Create secret in AWS Secrets Manager
- [ ] Set `NODE_ENV=production`
- [ ] Test connection to AWS

---

## Monitoring and Debugging

### Check if Secrets are Loaded

Add this to any route for debugging:

```javascript
import { getCachedSecrets } from "../config/secrets-loader.server.js";

export async function loader() {
  const secrets = getCachedSecrets();
  console.log("Secrets loaded:", secrets ? "Yes" : "No");
  // ... rest of loader
}
```

### Common Issues

1. **"Access Denied" Error**
   - Check IAM permissions
   - Verify secret name matches
   - Check AWS region

2. **"Secret Not Found"**
   - Verify secret name in AWS Console
   - Check `AWS_SECRET_NAME` environment variable

3. **"Timeout" Error**
   - Check network connectivity to AWS
   - Verify AWS region is correct
   - Check security groups/firewall rules

---

## Cost Optimization

### Caching Strategy

The implementation includes caching to minimize API calls:
- Secrets are loaded once at startup
- Cached for the lifetime of the process
- Reduces API calls from thousands to just 1 per server restart

### Estimated Costs

- **1 secret**: $0.40/month
- **API calls**: ~1 per server restart (negligible)
- **Total**: ~$0.40-0.50/month

---

## Security Best Practices

1. ✅ **Never commit secrets** - Already handled (`.env` in `.gitignore`)
2. ✅ **Use IAM roles** - Prefer roles over access keys
3. ✅ **Rotate secrets regularly** - Use AWS Secrets Manager rotation
4. ✅ **Separate environments** - Use different secrets for dev/staging/prod
5. ✅ **Least privilege** - Only grant `GetSecretValue` permission
6. ✅ **Enable CloudTrail** - Audit all secret access

---

## Rollback Plan

If you need to rollback:

1. **No code changes needed** - Just don't set `NODE_ENV=production`
2. **Keep `.env` file** - It will be used automatically
3. **Remove AWS SDK** - Optional: `npm uninstall @aws-sdk/client-secrets-manager`
4. **Remove secrets loader** - Optional: Delete `app/config/secrets-loader.server.js`

The application code doesn't change - it still uses `process.env`!

