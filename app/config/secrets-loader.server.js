/**
 * Secrets Loader Module
 * 
 * This module loads secrets from AWS Secrets Manager in production,
 * and falls back to .env file for local development.
 * 
 * Usage: Import and call loadSecrets() at application startup
 */

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// Cache secrets to avoid repeated API calls
let secretsCache = null;
let secretsLoadPromise = null;

/**
 * Load secrets from AWS Secrets Manager
 * @param {string} secretName - Name of the secret in AWS Secrets Manager
 * @param {string} region - AWS region (default: us-east-1)
 * @returns {Promise<Object>} Secrets object
 */
async function loadSecretsFromAWS(secretName, region = "us-east-1") {
  const client = new SecretsManagerClient({ region });

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);
    
    // AWS Secrets Manager stores secrets as JSON strings
    const secrets = JSON.parse(response.SecretString);
    
    console.log(`✅ Successfully loaded secrets from AWS Secrets Manager: ${secretName}`);
    return secrets;
  } catch (error) {
    console.error(`❌ Error loading secrets from AWS:`, error.message);
    throw error;
  }
}

/**
 * Load secrets from .env file (for local development)
 * @returns {Object} Secrets object from process.env
 */
function loadSecretsFromEnv() {
  console.log(`📝 Loading secrets from .env file (local development)`);
  console.log('process.env', JSON.stringify(process.env, null, 2));
  
  // Return all relevant environment variables
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

/**
 * Main function to load secrets
 * 
 * Strategy:
 * - Production: Load from AWS Secrets Manager
 * - Development: Load from .env file
 * - Fallback: If AWS fails, try .env as backup
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.secretName - AWS secret name (default: based on NODE_ENV)
 * @param {string} options.region - AWS region (default: us-east-1)
 * @param {boolean} options.forceEnv - Force using .env even in production (for testing)
 * @returns {Promise<void>}
 */
export async function loadSecrets(options = {}) {
  // If already loaded and cached, return immediately
  if (secretsCache) {
    return secretsCache;
  }

  // If already loading, wait for that promise
  if (secretsLoadPromise) {
    return secretsLoadPromise;
  }

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
        
        // Merge secrets into process.env
        Object.assign(process.env, secrets);
        
        secretsCache = secrets;
        return secrets;
      } catch (error) {
        console.warn(`⚠️  Failed to load from AWS, falling back to .env:`, error.message);
        // Fall through to .env fallback
      }
    }

    // Use .env file (development or fallback)
    const secrets = loadSecretsFromEnv();
    
    // Note: process.env is already populated by Node.js/.env loader
    // This function just returns them for consistency
    secretsCache = secrets;
    return secrets;
  })();

  return secretsLoadPromise;
}

/**
 * Clear the secrets cache (useful for testing or rotation)
 */
export function clearSecretsCache() {
  secretsCache = null;
  secretsLoadPromise = null;
}

/**
 * Get cached secrets (returns null if not loaded yet)
 */
export function getCachedSecrets() {
  return secretsCache;
}

