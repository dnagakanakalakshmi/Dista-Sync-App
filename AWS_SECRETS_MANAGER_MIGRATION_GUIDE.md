# AWS Secrets Manager Migration Guide

## Current Setup (Using .env)

### How it works now:
1. **Environment Variables Location**: All secrets are stored in a `.env` file in the project root
2. **Loading Mechanism**: Node.js automatically loads `.env` files using `process.env` (via dotenv or built-in support)
3. **Variables Used**:
   - `SHOPIFY_API_KEY` - Shopify app API key
   - `SHOPIFY_API_SECRET` - Shopify app secret key
   - `SCOPES` - Comma-separated list of Shopify scopes
   - `SHOPIFY_APP_URL` - App URL
   - `SHOP_CUSTOM_DOMAIN` - Optional custom shop domain
   - `MONGODB_URI` - MongoDB connection string
   - `NODE_ENV` - Environment (development/production)
   - `PORT`, `HMR_SERVER_PORT`, `FRONTEND_PORT` - Server ports

4. **Files Using Environment Variables**:
   - `app/shopify.server.js` - Shopify configuration
   - `app/db.server.js` - Database connection
   - `app/routes/app.jsx` - API key for frontend
   - `vite.config.js` - Build configuration
   - `remix.config.js` - Remix configuration
   - `prisma/schema.prisma` - Database URL

### Current Process Flow:
```
Application Start → .env file loaded → process.env populated → App uses process.env.VARIABLE_NAME
```

---

## AWS Secrets Manager Approach

### How AWS Secrets Manager Works:
1. **Storage**: Secrets are stored in AWS Secrets Manager (cloud service)
2. **Access**: Secrets are retrieved via AWS SDK API calls
3. **Security**: 
   - Encrypted at rest and in transit
   - IAM-based access control
   - Automatic rotation support
   - Audit logging via CloudTrail

### Process Flow with AWS Secrets Manager:
```
Application Start → AWS SDK calls Secrets Manager → Secrets retrieved → process.env populated → App uses process.env.VARIABLE_NAME
```

---

## Feasibility: ✅ YES, Highly Feasible

### Why it's feasible:
1. ✅ **Minimal Code Changes**: Only need to add a secrets loading module at startup
2. ✅ **Backward Compatible**: Can fallback to `.env` for local development
3. ✅ **No Breaking Changes**: Application code continues using `process.env` as before
4. ✅ **Production Ready**: AWS Secrets Manager is production-grade and widely used
5. ✅ **Cost Effective**: ~$0.40 per secret per month + $0.05 per 10,000 API calls

### Benefits:
- 🔒 **Enhanced Security**: Secrets not stored in filesystem
- 🔄 **Centralized Management**: All secrets in one place
- 📊 **Audit Trail**: Track who accessed what secrets and when
- 🔐 **Automatic Rotation**: Can rotate secrets automatically
- 👥 **Team Access Control**: Fine-grained IAM permissions
- 🌍 **Multi-Environment**: Easy to manage dev/staging/prod secrets separately

### Considerations:
- ⚠️ **AWS Dependency**: Requires AWS account and proper IAM setup
- ⚠️ **Cold Start Latency**: First secret fetch adds ~100-200ms (can be cached)
- ⚠️ **Network Dependency**: Requires internet access to AWS
- ⚠️ **Cost**: Small monthly cost per secret

---

## Differences: Current vs AWS Secrets Manager

| Aspect | Current (.env) | AWS Secrets Manager |
|--------|---------------|---------------------|
| **Storage Location** | Local `.env` file | AWS Cloud (encrypted) |
| **Access Method** | File system read | HTTP API call via AWS SDK |
| **Security** | File permissions | IAM roles + encryption |
| **Version Control** | Must be in `.gitignore` | Never in codebase |
| **Sharing** | Copy file manually | IAM-based access |
| **Rotation** | Manual | Automatic (optional) |
| **Audit** | None | CloudTrail logs |
| **Multi-Environment** | Multiple `.env` files | Separate secrets per env |
| **Cost** | Free | ~$0.40/secret/month |
| **Latency** | Instant | ~100-200ms (first call) |
| **Dependency** | None | AWS account required |

---

## Implementation Strategy

### Recommended Approach: Hybrid Model

**Best Practice**: Use AWS Secrets Manager for production, keep `.env` for local development.

### Architecture:
```
┌─────────────────────────────────────────┐
│         Application Startup             │
└─────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Check Environment   │
         │  (NODE_ENV)          │
         └──────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│  Production  │      │   Development    │
│  (AWS)       │      │   (.env file)    │
└──────────────┘      └──────────────────┘
        │                       │
        ▼                       ▼
┌──────────────────────────────────────┐
│   Load Secrets into process.env      │
└──────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │   App Uses           │
         │   process.env.*      │
         └──────────────────────┘
```

---

## Implementation Steps

### Step 1: Install AWS SDK
```bash
npm install @aws-sdk/client-secrets-manager
```

### Step 2: Create Secrets Loading Module
Create a new file that loads secrets from AWS Secrets Manager (or falls back to .env)

### Step 3: Update Application Entry Point
Modify the app startup to load secrets before anything else runs

### Step 4: Set Up AWS Secrets Manager
1. Create secrets in AWS Secrets Manager
2. Set up IAM role/policy for your application
3. Configure AWS credentials

### Step 5: Update Deployment Configuration
- Ensure IAM role is attached to your deployment (EC2, ECS, Lambda, etc.)
- Or configure AWS credentials via environment variables

---

## Code Changes Required

### Files to Create:
1. `app/config/secrets-loader.server.js` - Secrets loading logic

### Files to Modify:
1. `app/shopify.server.js` - Import the loader and `await loadSecrets()` before creating the Shopify app instance
2. `package.json` - Add AWS SDK dependency
3. Deployment configuration - Add IAM permissions

### Files That DON'T Need Changes:
- ✅ `app/db.server.js` - Still uses `process.env`
- ✅ `app/routes/app.jsx` - Still uses `process.env`
- ✅ All other files - No changes needed!

---

## AWS Setup Requirements

### 1. Create Secrets in AWS Secrets Manager
- Secret name: `dista-sync-app/production` (or similar)
- Secret value: JSON format with all your env variables

### 2. IAM Policy Required
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
      "Resource": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:dista-sync-app/*"
    }
  ]
}
```

### 3. AWS Credentials
- Option A: IAM Role (recommended for EC2/ECS/Lambda)
- Option B: AWS Access Keys (for local testing or non-AWS deployments)

---

## Cost Estimate

- **Storage**: $0.40 per secret per month
- **API Calls**: $0.05 per 10,000 API calls
- **Example**: 1 secret, 100,000 API calls/month = $0.40 + $0.50 = **$0.90/month**

---

## Security Best Practices

1. ✅ **Never commit secrets to git** (already done - `.env` is in `.gitignore`)
2. ✅ **Use IAM roles** instead of access keys when possible
3. ✅ **Enable secret rotation** for sensitive credentials
4. ✅ **Use separate secrets** for dev/staging/prod
5. ✅ **Limit IAM permissions** to least privilege
6. ✅ **Enable CloudTrail** for audit logging

---

## Migration Checklist

- [ ] Install AWS SDK
- [ ] Create secrets loader module
- [ ] Update entry point to load secrets
- [ ] Create secrets in AWS Secrets Manager
- [ ] Set up IAM role/policy
- [ ] Test locally with AWS credentials
- [ ] Update deployment configuration
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Remove `.env` from production (keep for local dev)

---

## Rollback Plan

If issues arise, you can easily rollback:
1. The code will fallback to `.env` if AWS fails
2. Keep `.env` file as backup during migration
3. No code changes needed in application files (they still use `process.env`)

---

## Next Steps

Would you like me to:
1. ✅ Implement the secrets loader module?
2. ✅ Show you how to set up AWS Secrets Manager?
3. ✅ Create the IAM policy template?
4. ✅ Add caching to reduce API calls?

