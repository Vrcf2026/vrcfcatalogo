
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT SELECT, INSERT ON public.quotes TO anon;
GRANT ALL ON public.quotes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT SELECT, INSERT ON public.quote_items TO anon;
GRANT ALL ON public.quote_items TO service_role;
