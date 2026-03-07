/**
 * Chatter API - Global Post-response (Test) Script
 * ==================================================
 * Paste this into the Postman collection-level test script,
 * or import it per-request as needed.
 *
 * What it does:
 * 1. Logs the response status and time
 * 2. Validates response is valid JSON
 * 3. Logs response body summary
 */

// Log response info
const status = pm.response.code;
const responseTime = pm.response.responseTime;
console.log(`[POST-RESPONSE] Status: ${status} | Time: ${responseTime}ms`);

// Validate JSON response
pm.test("Response is valid JSON", function () {
  pm.response.to.be.json;
});

// Log response body (truncated for large responses)
try {
  const body = pm.response.json();
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > 500) {
    console.log(
      `[POST-RESPONSE] Body (truncated): ${bodyStr.substring(0, 500)}...`,
    );
  } else {
    console.log(`[POST-RESPONSE] Body: ${bodyStr}`);
  }
} catch (e) {
  console.log("[POST-RESPONSE] Could not parse response as JSON");
}

// Log response headers
console.log(
  `[POST-RESPONSE] Content-Type: ${pm.response.headers.get("Content-Type")}`,
);
