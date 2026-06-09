-- CREATE REDEMPTION QUEUE TABLE
CREATE TABLE IF NOT EXISTS public.redemption_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    coin_amount INTEGER NOT NULL,
    naira_value DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'CASH' or 'AIRTIME'
    payout_details JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_redemption_user_id ON public.redemption_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_redemption_status ON public.redemption_queue(status);

-- ENABLE REALTIME (Optional but recommended for admin)
ALTER TABLE public.redemption_queue REPLICA IDENTITY FULL;
