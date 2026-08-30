const Razorpay = require('razorpay');

/**
 * Returns active Razorpay credentials based on NODE_ENV (production vs development).
 * Preserves your live production keys while enabling painless test mode in development.
 */
function getRazorpayConfig() {
  const isProd = process.env.NODE_ENV === 'production';

  // Live keys for production
  const liveKeyId = process.env.RAZORPAY_LIVE_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const liveSecret = process.env.RAZORPAY_LIVE_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

  // Test keys for local development
  const testKeyId = process.env.RAZORPAY_TEST_KEY_ID;
  const testSecret = process.env.RAZORPAY_TEST_KEY_SECRET;

  const keyId = isProd ? liveKeyId : (testKeyId || liveKeyId);
  const keySecret = isProd ? liveSecret : (testSecret || liveSecret);

  return {
    keyId,
    keySecret,
    isTestMode: !isProd && (!!testKeyId || !liveKeyId?.startsWith('rzp_live_')),
  };
}

/**
 * Creates and returns an instantiated Razorpay client.
 */
function getRazorpayClient() {
  const { keyId, keySecret } = getRazorpayConfig();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay API keys (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

module.exports = {
  getRazorpayConfig,
  getRazorpayClient,
};
