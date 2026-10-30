# FlickSort V4 部署与验收

本分支增加 `/experiment/` 与 `/admin/`，主页增加开发版入口并标出V3留档；Classic、FlickSort、V3 与图片不变。当前 config 是本地 Test 模式，未部署 Supabase；不应开始真实招募。

## 最少必要操作

1. 在自己的 Supabase 账户创建项目，选择合适的数据区域。保管数据库密码。将 `supabase/migrations/202610300001_experiment.sql` 在 SQL Editor 完整执行（或使用 Supabase CLI `supabase db push`）。先在开发项目执行，不要覆盖其他数据库。
2. 在 Authentication 创建管理员账户并确认邮箱。关闭公开注册，在 SQL Editor 执行 `insert into public.admin_users(user_id) values ('实际管理员 auth.users UUID');`。普通 Auth 账户没有数据权限。建议启用管理员 MFA；当前后台采用邮箱密码登录，访问令牌只在内存保存，过期后重新登录。
3. 使用 CLI 登录、link 项目；配置服务端环境：`supabase secrets set ALLOWED_ORIGINS=https://yatging.github.io,http://localhost:8000 ALLOW_REAL=false`，然后 `supabase functions deploy ingest`。`SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 使用 Supabase Edge 内置服务端环境，绝不可复制到网页。`verify_jwt=false` 仅用于此接收接口，其授权由一次性招募码与 Session 凭证完成；不是开放数据库读取。
4. 在 `experiment/config.js` 填项目 URL 与公开 publishable/anon key，更新联系说明和保存期限。默认90天期限由数据库执行，若改配置，须同步修改 migration 中期限。保留 `mode:'test'` 完成验收后才改 `real`，并把服务端 `ALLOW_REAL` 改为 true。真实实验固定 `trialsPerCondition:12`；Pilot 可改4或8并更改实验版本，勿在已有 Session 中改变配置。
5. 生成一次性招募码，按四行各相同人数发放，从而平衡 Latin Square。下面查询一次生成4个码，只保存哈希到数据库；研究员把输出码安全地给参与者，不放进公开仓库。

```sql
with codes as (
 select row::text || ':' || gen_random_uuid()::text as code
 from generate_series(0,3) row
), inserted as (
 insert into public.enrollment_codes(code_hash)
 select encode(extensions.digest(code,'sha256'),'hex') from codes returning code_hash
)
select code from codes;
```

6. 部署到独立开发站点或审核后发布 GitHub Pages。通过自己设置的实际地址运行下面的真实云端验收。当前分支不自动合并 main、不改变已提交网站。GitHub Pages 是公开静态资源，后台安全性来自 Auth/RLS；隐藏 URL 不提供权限保护。
7. 配置每日删除过期数据的任务。Supabase Cron（先启用 pg_cron）可运行：

```sql
select cron.schedule('flicksort-retention','0 3 * * *',
 $$select public.purge_expired_experiments();$$);
```

关闭项目级自动备份前须遵循团队政策；应用删除不会立即清除 Supabase 历史备份，应在同意书/研究政策中说明备份保留时间。

## 云端真实验收（尚待执行）

- 用新招募码走完整 Test Session；核对 sessions 完成状态、48 Trials、2问卷、Events 与两份 CSV 字段及值一致。
- 浏览器断网执行数个任务、刷新/关闭后恢复；联网重试后确认 ID 不变、无重复。模拟服务端已保存但响应丢失后重试。
- 不带 JWT 直接查询每张表必须被拒绝；普通 Auth 用户查询返回空集，删除无效；另一个 Session 的 token 上传必须失败。
- 管理员登录累计读取、各筛选、全部/筛选导出、删除 Session 并检查级联数据删除。不要用 service role 模拟管理员，这会绕过 RLS。
- 尝试复用招募码、篡改评分/目标/条件、同 ID 不同内容、超大正文和高频请求，均应被拒绝。
- 检查完整状态必须拥有48个唯一正式试次与前后问卷；Practice 只在 Events 中出现，不进入 Trials。
- 在真实 iPhone/Android 复测60px和30°–60°手势、Undo、暂停、切后台、刷新和下载；做独立图片内容核验和计时 Pilot。

## 数据及安全设计

`sessions` 为匿名 Session；`trials/events/questionnaires` 保存有唯一 UUID 的原始 record JSON，Trials 的条件/Block/Trial 有额外索引及唯一约束；`sync_status` 记录服务器已确认数量和最后接收时间。数据库 JSON 与 CSV 使用相同字段定义（core.mjs）。Practice 不生成正式 Trial 行。

Edge 限制256KB请求、每批50条、每条16KB，校验版本、字段、评分、时间与分配计划。数据库事务验证 Session 能力凭证哈希，处理一次性招募码、幂等写入、ID内容冲突、正式试次重复、每分钟120次与每 Session 20000条限额。来源 allowlist 只是一层限制，不代替授权；一次性招募码控制创建滥用。

IndexedDB 原子保存进度和新记录；只有服务器显式确认 ID 后才标记 synced，失败保留队列。每15秒、恢复联网、结束时重试。网络层模拟验证已实现，但不等于真实 Supabase 验收。未上传的数据管理员无法查看；后台以最后同步时间/部分完成/数量不符提示可见异常，不能凭空知道离线设备错误。安全退出保留进度；撤回需凭本机 Session token，管理员也可按 Session 删除。

已关闭页面不能在所有浏览器保证后台继续上传；下次打开相同浏览器会继续。浏览器清理/卸载会丢本地缓存，CSV 备份仍应保留。页面已联网缓存后支持离线恢复；首次访问仍需网络。本机不要同时开多个实验标签。
