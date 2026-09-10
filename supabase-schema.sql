-- ============================================================
--  一人公司 · 管理后台 数据库建表脚本
-- ------------------------------------------------------------
--  用法：
--    1. 打开你的 Supabase 项目
--    2. 左侧菜单点「SQL Editor」
--    3. 点「New query」
--    4. 把本文件全部内容复制粘贴进去
--    5. 点右下角绿色「Run」按钮
--
--  跑一次就够了。以后不用再跑。
--  （重复跑也不会出错，脚本里都加了 if not exists）
-- ============================================================


-- ------------------------------------------------------------
-- 1. 首页档案（只有一行数据）
-- ------------------------------------------------------------
create table if not exists profile (
  id            int primary key default 1,
  brand         text default '一人公司',
  site_name     text default '一人公司',
  logo_url      text default '',
  hero_image_url text default '',
  hero_tag      text default '',
  hero_title    text default '',
  hero_subtitle text default '',
  cta_primary   text default '',
  cta_secondary text default '',
  stats         jsonb default '[]'::jsonb,
  cta_title     text default '',
  cta_desc      text default '',
  contact_email text default '',
  wechat        text default '',
  updated_at    timestamptz default now(),
  constraint profile_single_row check (id = 1)
);


-- ------------------------------------------------------------
-- 2. 产品服务（多行）
-- ------------------------------------------------------------
create table if not exists services (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subtitle    text default '',
  description text default '',
  price       text default '',
  features    jsonb default '[]'::jsonb,
  icon        text default 'chat',
  anchor      text default '',
  badge       text default '',
  badge_sub   text default '',
  cta         text default '',
  sort_order  int default 0,
  visible     boolean default true,
  created_at  timestamptz default now()
);


-- ------------------------------------------------------------
-- 3. 关于我（只有一行数据）
-- ------------------------------------------------------------
create table if not exists about (
  id            int primary key default 1,
  hero_title    text default '',
  hero_subtitle text default '',
  photo_title   text default '',
  photo_sub     text default '',
  story_title   text default '',
  story         text default '',
  timeline      jsonb default '[]'::jsonb,
  "values"      jsonb default '[]'::jsonb,
  tools         jsonb default '[]'::jsonb,
  updated_at    timestamptz default now(),
  constraint about_single_row check (id = 1)
);


-- ------------------------------------------------------------
-- 4. 我的文章（多行）
-- ------------------------------------------------------------
create table if not exists articles (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text unique,
  summary     text default '',
  tags        jsonb default '[]'::jsonb,
  cover_text  text default '',
  cover_image_url text default '',
  date        text default '',
  content     text default '',
  published   boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);


-- ------------------------------------------------------------
-- 5. 预约咨询线索（多行）
-- ------------------------------------------------------------
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  contact    text,
  service    text,
  time_slot  text,
  city       text,
  topic      text,
  source     text,
  status     text default 'new',
  note       text default '',
  created_at timestamptz default now()
);


-- ============================================================
--  访问权限（RLS）
--  规则很简单：
--    · 网站访客  → 只能「看」内容，只能「提交」预约
--    · 登录后的你 → 可以增删改查所有内容
-- ============================================================
alter table profile  enable row level security;
alter table services enable row level security;
alter table about    enable row level security;
alter table articles enable row level security;
alter table leads    enable row level security;

-- 访客可以看网站内容（文章只看已发布的）
drop policy if exists "public read profile"  on profile;
drop policy if exists "public read services" on services;
drop policy if exists "public read about"    on about;
drop policy if exists "public read articles" on articles;
create policy "public read profile"  on profile  for select using (true);
create policy "public read services" on services for select using (true);
create policy "public read about"    on about    for select using (true);
create policy "public read articles" on articles for select using (published = true);

-- 登录后的你可以增删改查内容
drop policy if exists "auth write profile"  on profile;
drop policy if exists "auth write services" on services;
drop policy if exists "auth write about"    on about;
drop policy if exists "auth write articles" on articles;
create policy "auth write profile"  on profile  for all to authenticated using (true) with check (true);
create policy "auth write services" on services for all to authenticated using (true) with check (true);
create policy "auth write about"    on about    for all to authenticated using (true) with check (true);
create policy "auth write articles" on articles for all to authenticated using (true) with check (true);

-- 预约线索：任何人都能提交，但只有登录后的你能看到
drop policy if exists "anyone insert leads" on leads;
drop policy if exists "auth read leads"     on leads;
drop policy if exists "auth update leads"   on leads;
drop policy if exists "auth delete leads"   on leads;
create policy "anyone insert leads" on leads for insert to anon, authenticated with check (true);
create policy "auth read leads"     on leads for select to authenticated using (true);
create policy "auth update leads"   on leads for update to authenticated using (true) with check (true);
create policy "auth delete leads"   on leads for delete to authenticated using (true);


-- ============================================================
--  初始化两行"单条数据"，让后台一打开就有东西可改
-- ============================================================
insert into profile (id) values (1) on conflict (id) do nothing;
insert into about   (id) values (1) on conflict (id) do nothing;
