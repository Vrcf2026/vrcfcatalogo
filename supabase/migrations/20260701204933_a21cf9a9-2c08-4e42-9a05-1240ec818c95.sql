
-- 1) Function search_path hardening for pgmq wrapper helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 2) Invoices bucket: replace overly-permissive SELECT policy with ownership check
DROP POLICY IF EXISTS "Users view own invoice" ON storage.objects;

CREATE POLICY "Users view own invoice"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    public.has_gestao_access(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id::text = (storage.foldername(name))[1]
        AND q.user_id = auth.uid()
    )
  )
);

-- 3) Products: block anon from reading internal cost / tier pricing columns.
--    Public registration is disabled, so 'authenticated' effectively means staff;
--    they retain access for the admin/gestor UI. This closes the public exposure
--    called out by the scanner without breaking admin workflows.
REVOKE SELECT (purchase_price, purchase_price_vat, price_tier2, price_tier3)
  ON public.products FROM anon;
