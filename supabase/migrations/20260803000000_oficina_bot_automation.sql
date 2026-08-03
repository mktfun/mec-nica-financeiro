create table if not exists public.oficina_contas (
    id uuid primary key default gen_random_uuid(),
    store_id text not null,
    id_interno text not null,
    fornecedor text,
    valor_original numeric(10,2) default 0,
    valor_em_aberto numeric(10,2) default 0,
    vencimento text,
    status text,
    tipo text check (tipo in ('PAGAR', 'RECEBER')),
    updated_at timestamp with time zone default now(),
    unique (store_id, id_interno, tipo)
);

alter table public.oficina_contas enable row level security;
create policy "Enable all for authenticated users on oficina_contas" 
    on public.oficina_contas for all 
    using (auth.role() = 'authenticated' or auth.role() = 'service_role')
    with check (auth.role() = 'authenticated' or auth.role() = 'service_role');

create table if not exists public.oficina_os_cache (
    id uuid primary key default gen_random_uuid(),
    store_id text not null,
    os_number text not null,
    status_cache text,
    payload_completo jsonb,
    updated_at timestamp with time zone default now(),
    unique (store_id, os_number)
);

alter table public.oficina_os_cache enable row level security;
create policy "Enable all for authenticated users on oficina_os_cache" 
    on public.oficina_os_cache for all 
    using (auth.role() = 'authenticated' or auth.role() = 'service_role')
    with check (auth.role() = 'authenticated' or auth.role() = 'service_role');
