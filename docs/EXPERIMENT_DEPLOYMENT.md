# FlickSort 公开公测部署与安全说明

## 当前配置

- `/experiment/` 为公开公测入口，无需邀请码、不需注册；`/admin/` 为独立管理员后台。
- 公测版本 `4.1.0-public-pilot`、数据库 `mode=pilot`，与正式实验 `real`、开发测试 `test`、演示 `demo` 分离。正式实验保持关闭。
- 旧版 `4.0.1` 继续使用原 `ingest` 接口和旧邀请码，以便正在进行的旧会话继续同步；不要禁用它直至确认没有待同步会话。
- 新 `ingest-public` 接口调用服务端数据库函数，验证会话凭证、字段、范围、计时、分类和幂等。公开界面不能读取数据库，管理员通过 Auth 与 RLS 访问。
- 每日 UTC 最多新建120个公测会话，每分钟全局最多1200次有效请求，每个会话最多3000条事件。原每会话每分钟120请求及256KB请求上限继续适用。达到容量时未同步记录保留在设备并提示重试。
- 这些是全局容量控制，不是按 IP 的独立防护，也没有 CAPTCHA；恶意用户可能耗尽公测名额。扩大公测前应增加服务端验证或可信限流服务并评估成本。
- Latin Square 四种顺序随机分配而非强制等量；分析前检查实际各行数量，公测结果不得混入正式研究。

## 重建部署

1. 创建 Supabase 项目，在 SQL Editor 依次执行 `supabase/migrations/202610300001_experiment.sql` 和 `supabase/migrations/202611020002_public_pilot.sql`。每个迁移仅执行一次；现有项目无需重复执行。
2. 创建 Auth 管理员并将其 UUID 加入 `public.admin_users`；普通用户不应加入。关闭公开注册并按团队政策启用管理员账户保护。
3. 设置服务端环境：`ALLOWED_ORIGINS=https://yatging.github.io,http://localhost:8000`、`ALLOW_REAL=false`、`ALLOW_PUBLIC_PILOT=true`。部署 `ingest` 和 `ingest-public` Edge Functions。`SUPABASE_SERVICE_ROLE_KEY` 仅在服务端使用，绝不能放进网页、仓库或日志。
4. 在 `experiment/config.js` 填写项目 URL 和公开 publishable key，保留 `mode:'pilot'`。联系说明和保存期限由研究团队核实。正式实验需要单独验收、确定伦理流程后另行开放。
5. 每日计划任务 `flicksort-retention` 执行 `public.purge_expired_experiments()`；当前项目已启用，重建项目需启用 `pg_cron` 并重新安排：

```sql
select cron.schedule('flicksort-retention','0 3 * * *',
  $$select public.purge_expired_experiments();$$);
```

正常会话自创建起保留90天；到期后级联删除。保留期、研究撤回机制及备份副本处理应由团队和课程要求确认。应用内删除不会立即移除数据库历史备份。

## 运行与验收

先运行根 README 的自动测试。在隔离 Test/Pilot 会话中确认48条 Trials、2份问卷、断网恢复、CSV与云端逐行一致、匿名 REST 无法读取数据；再由管理员测试筛选、导出和删除。需要测试真实普通登录用户的 HTTP 权限、iPhone/Android、素材标签和 Pilot 实际耗时。不得将模拟数据描述为真实参与者结果。

关闭公测可将服务端 `ALLOW_PUBLIC_PILOT` 设为 false。用户可能已有未同步数据，关闭前应通知参与者导出 CSV，并为已开始会话制定完成或补传安排。浏览器离线队列只保存在本设备；清理浏览器数据、卸载或设备故障会丢失尚未同步的记录。
