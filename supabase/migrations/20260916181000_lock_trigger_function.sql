-- Trigger helper is not part of the public API surface.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
