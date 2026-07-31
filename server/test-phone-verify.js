const fetch = require('node-fetch');

const API_KEY = 'F38B8567203645239C5B9A91D3AE748E';

function normalizePhone(raw) {
  if (!raw) return '';
  let cleaned = raw.replace(/[\s\-\(\)]+/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

async function verifyPhone(phone) {
  const normalized = normalizePhone(phone);
  console.log(`\n--- Testing: "${phone}" → normalized: "${normalized}" ---`);
  try {
    const res = await fetch(
      'https://api.veriphone.io/v2/verify?' + new URLSearchParams({
        key: API_KEY,
        phone: normalized,
      })
    );
    const data = await res.json();
    console.log('Status:', data.status);
    console.log('phone_valid:', data.phone_valid);
    console.log('phone_type:', data.phone_type);
    console.log('carrier:', JSON.stringify(data.carrier));
    console.log('Phone:', data.phone);
    console.log('Country:', data.country);

    const passesVerification = data.phone_valid === true && data.carrier && data.carrier !== '';
    console.log('PASSES VERIFICATION?', passesVerification ? '✅ YES' : '❌ NO');

    return { ...data, passesVerification };
  } catch (err) {
    console.error('Error:', err.message);
    return null;
  }
}

(async () => {
  // Real number (existing user)
  await verifyPhone('+2347057581322');
  // Same number in local format
  await verifyPhone('07057581322');
  // Plausible but random number
  await verifyPhone('+2347012345678');
  // Fake UAN number
  await verifyPhone('07000000000');
  // Empty
  await verifyPhone('');
})();
