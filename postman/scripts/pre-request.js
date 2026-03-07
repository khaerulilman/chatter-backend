/**
 * Chatter API - Global Pre-request Script
 * ========================================
 * Paste this into the Postman collection-level pre-request script,
 * or import it per-request as needed.
 *
 * What it does:
 * 1. Logs the request being sent (method + URL)
 * 2. Automatically sets the Authorization header if auth_token exists
 * 3. Ensures base_url is set
 */

// Log request info
const method = pm.request.method;
const url = pm.request.url.toString();
console.log(`[PRE-REQUEST] ${method} ${url}`);

// Ensure base_url is set
if (!pm.environment.get("base_url")) {
  pm.environment.set("base_url", "http://localhost:3000");
  console.log("[PRE-REQUEST] base_url was empty, set to http://localhost:3000");
}

// Auto-set Authorization header for authenticated requests
const authToken = pm.environment.get("auth_token");
if (authToken && authToken.length > 0) {
  // Only add if request expects auth (check if Bearer auth is configured)
  const authType = pm.request.auth ? pm.request.auth.type : null;
  if (authType === "bearer") {
    console.log(
      "[PRE-REQUEST] Auth token is set, Authorization header will be added.",
    );
  }
}

// Generate unique values for test data if needed
if (!pm.environment.get("test_email")) {
  const timestamp = Date.now();
  pm.environment.set("test_email", `testuser_${timestamp}@example.com`);
  pm.environment.set("test_username", `testuser_${timestamp}`);
  pm.environment.set("test_name", `Test User ${timestamp}`);
  pm.environment.set("test_password", "password123");
  console.log("[PRE-REQUEST] Generated test user data.");
}
