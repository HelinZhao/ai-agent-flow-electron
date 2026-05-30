---
name: recent-work-and-next-steps
description: 近20条对话的工作总结和待办事项，2026-05-29
metadata:
  type: project
---

## 已完成（按时间倒序）

1. **Git 版本控制** — 改用 VS Code 风格的手动暂存/提交，移除自动提交。GitPanel 可选择暂存单个或全部文件
2. **实体版本历史** — Agent/Skill/工作流详情页可查看 Git 提交历史，工作流支持预览画布（只读 ReactFlow + 实际 nodeTypes）
3. **Git 设置响应式** — `gitEnabled` 纳入 `settingsStore`，Footer 即时响应开关
4. **settingsStore** — 新增 `gitEnabled` 字段
5. **Footer 组件** — 后端连接状态（绿/红点）、CPU/内存占用（Electron 进程）、Git 按钮、侧边栏收起按钮
6. **SVG 导航图标** — 侧边栏换成阿里矢量图风格的 SVG 图标（DAG 工作流、机器人 Agent 等）
7. **React 19 兼容** — 修复 Chat.tsx 中因 `conv` 对象包含 ref 导致的 "Cannot access refs during render" 错误
8. **Marketplace 优化** — Tab 溢出滚动 + 文字不换行
9. **Modal width 属性** — 支持自定义 `max-w-*` 类名
10. **版本号统一管理** — 在 `config/index.ts` 配置，Footer 和关于页同步读取
11. **NodeConfigPanel readOnly** — 预览节点时只读查看配置
12. **WorkflowViewer** — 只读 ReactFlow 视图组件，从 WorkflowDesigner 导出 nodeTypes 复用

## 团队功能（Phase 1）— 已完成

- Team 类型、Sequelize 模型、CRUD API 路由（含 changeNotifier）
- teamApi + workflowStore 中的 CRUD actions
- Teams 管理页（列表 + 二级详情/编辑页，风格与 Agent 页一致）
- Team 节点（NODE_DEFS、TeamConfig、NodeConfigPanel 注册）
- 列表卡片样式与 Agent 页一致（渐变色带、hover 操作、ItemPickerModal 选择成员）

## 待办

**Phase 2：Team 节点执行（队长分发）**
- 队长 Agent 拆解任务 → 分配给成员 Agent → 收集结果 → 汇总
- 后端执行引擎支持 Team 节点类型
- 需要实现 LLM 调用队长 Agent 进行任务分解

**Phase 2：需求池（可选）**
- 类似 Paperclip 的工单系统
- Team 节点轮询/触发从需求池取任务

**Phase 3：定时调度 + Heartbeat**
- 让团队自主运转，无需工作流触发

## 其他优化方向

- MiniMap 在预览中全白问题（未根因解决，已移除 MiniMap）
- Paperclip 集成调研（用户参考其设计思路）
