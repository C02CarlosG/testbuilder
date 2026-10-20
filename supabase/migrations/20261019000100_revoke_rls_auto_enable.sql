-- Quita el permiso de ejecución de la función de 'RLS automático' a los roles de la API pública.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
