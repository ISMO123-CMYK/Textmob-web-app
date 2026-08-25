const crypto = require('crypto');

class DevPay {
    constructor({ appId, secret, gatewayUrl }) {
        if (!appId || !secret) {
            throw new Error('DevPay SDK requires appId and secret');
        }
        this.appId = appId;
        this.secret = secret;

        // Priority: Passed Arg > Env Var > Production Default
        const defaultUrl = process.env.DEVPAY_GATEWAY_URL || 'https://app-devpay.onrender.com';
        this.gatewayUrl = (gatewayUrl || defaultUrl).replace(/\/$/, '');
    }

    generateSecureCheckoutUrl(slug, options = {}) {
        const { amount, description, metadata = {} } = options;

        const params = new URLSearchParams();
        if (amount) params.append('amount', String(amount));
        if (description) params.append('description', description);

        // Add metadata
        for (const [key, value] of Object.entries(metadata)) {
            params.append(key, String(value));
        }

        // Add Security
        params.append('app_id', this.appId);
        params.append('ts', String(Date.now()));

        // Sort for consistency
        params.sort();

        const signature = crypto
            .createHmac('sha256', this.secret)
            .update(params.toString())
            .digest('hex');

        params.append('sig', signature);

        // THE FIX: Explicitly ensure the ? is present
        return `${this.gatewayUrl}/pay/${slug}?${params.toString()}`;
    }

    webhookMiddleware(handler) {
        return (req, res) => {
            const signature = req.headers['x-devpay-signature'];
            const payload = JSON.stringify(req.body);
            if (!signature) return res.status(401).json({ error: 'No signature' });

            const expected = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
            if (signature !== expected) return res.status(403).json({ error: 'Invalid signature' });

            try {
                handler(req.body);
                res.status(200).send('OK');
            } catch (err) {
                res.status(500).json({ error: 'Handler error' });
            }
        };
    }
}

module.exports = DevPay;
