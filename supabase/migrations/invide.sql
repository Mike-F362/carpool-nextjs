create table invites
(
    id         uuid primary key default gen_random_uuid(),
    code       text unique not null,
    created_at timestamp        default now(),
    used       boolean          default false
);


alter table invites
    add column used_by text;
alter table invites
    add column email text;
alter table invites
    add column role text default 'user';
alter table invites
    add column expires_at timestamp;
