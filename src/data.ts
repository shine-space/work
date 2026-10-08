import type { ThreadMessageLike } from "@assistant-ui/react";

export type DemoMessage = ThreadMessageLike & {
  id: string;
  createdAt: Date;
};

export type ApplicationId = "project" | "conversation" | "history" | "files" | "none";

export type Conversation = {
  id: string;
  projectId: string | null;
  agentId: string;
  applicationId: ApplicationId | null;
  catalogApplicationId?: string | null;
  applicationAlias?: string | null;
  title: string;
  updatedAt: string;
  messages: DemoMessage[];
};

export type Project = {
  id: string;
  name: string;
  code: string;
  description: string;
  memberIds?: string[];
  agentIds?: string[];
  applicationIds?: string[];
  administratorApplicationId?: string;
};

export type GeneratedFile = {
  id: string;
  projectId: string;
  conversationId: string;
  agentId: string;
  name: string;
  format: "MD" | "CSV";
  size: string;
  updatedAt: string;
  summary: string;
  mimeType: string;
  content: string;
};

export type TeamResource = {
  id: string;
  name: string;
  updatedAt: string;
  content: string;
};

export type TeamResourceGroup = {
  id: string;
  name: string;
  resources: TeamResource[];
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  status: "在线" | "维护中";
};

const message = (
  id: string,
  role: "user" | "assistant",
  text: string,
  minutesAgo: number,
  catalogApplicationId?: string,
): DemoMessage => ({
  id,
  role,
  content: [{ type: "text", text }],
  createdAt: new Date(Date.now() - minutesAgo * 60_000),
  ...(role === "assistant" && catalogApplicationId
    ? { metadata: { custom: { catalogApplicationId } } }
    : {}),
});

const conversationMessages = (
  id: string,
  userText: string,
  assistantText: string,
  minutesAgo: number,
  catalogApplicationId?: string,
): DemoMessage[] => [
  message(`${id}-user`, "user", userText, minutesAgo),
  message(
    `${id}-assistant`,
    "assistant",
    assistantText,
    Math.max(0, minutesAgo - 1),
    catalogApplicationId,
  ),
];

const defaultDigitalEmployeeNames: Record<string, string> = {
  "senior-developer": "凌峰",
  "senior-financial-analyst": "衡远",
  "ui-designer": "知绘",
  "fullstack-developer": "构云",
  "product-planning-expert": "启程",
  "data-analyst": "数澜",
  "project-management-expert": "领航",
  "senior-legal-advisor": "法衡",
  "hr-manager": "知人",
  "market-strategy-expert": "拓维",
  "brand-creative-director": "映川",
  "user-research-expert": "洞见",
  "business-development-manager": "拓境",
  "senior-qa-engineer": "守真",
  "operations-architect": "云巡",
  "cybersecurity-expert": "安盾",
  "supply-chain-analyst": "链策",
  "customer-success-manager": "长青",
  "industry-research-consultant": "观澜",
  "enterprise-knowledge-manager": "知库",
};

export const projects: Project[] = [
  {
    id: "project-operations",
    name: "设备运维项目",
    code: "OPS-2026",
    description: "集中处理设备异常、维护计划与现场知识资产。",
    memberIds: ["demo-user", "engineer-wang", "engineer-chen", "supervisor-sun", "engineer-wu", "spare-parts-admin"],
    agentIds: ["agent-equipment"],
    applicationIds: ["operations-architect", "senior-developer", "senior-qa-engineer", "data-analyst", "project-management-expert", "enterprise-knowledge-manager"],
    administratorApplicationId: "operations-architect",
  },
  {
    id: "project-contract",
    name: "合同审查项目",
    code: "LEGAL-09",
    description: "沉淀供应商合同审查记录、风险结论与交付文件。",
    memberIds: ["demo-user", "engineer-li", "engineer-zhou", "supervisor-sun"],
    agentIds: ["agent-contract"],
    applicationIds: ["senior-legal-advisor", "business-development-manager", "enterprise-knowledge-manager", "industry-research-consultant", "hr-manager"],
    administratorApplicationId: "senior-legal-advisor",
  },
  {
    id: "project-growth",
    name: "增长分析项目",
    code: "GROWTH-Q3",
    description: "跟踪经营指标、分析转化异常并归档分析结果。",
    memberIds: ["demo-user", "engineer-zheng", "engineer-li", "engineer-wu"],
    agentIds: ["agent-analysis"],
    applicationIds: ["data-analyst", "senior-financial-analyst", "industry-research-consultant", "ui-designer", "product-planning-expert", "project-management-expert", "market-strategy-expert", "brand-creative-director", "business-development-manager"],
    administratorApplicationId: "data-analyst",
  },
];

export const agents: Agent[] = [
  {
    id: "agent-equipment",
    name: "设备知识助手",
    description: "查询设备档案、维护记录与知识库证据",
    status: "在线",
  },
  {
    id: "agent-contract",
    name: "合同审查助手",
    description: "识别条款风险并给出可追溯修改建议",
    status: "在线",
  },
  {
    id: "agent-analysis",
    name: "经营分析助手",
    description: "将项目经营数据整理为可执行结论",
    status: "维护中",
  },
];

// Keep history titles long enough to exercise single-line truncation in navigation and history panels.
const standaloneSmartWritingHistory: Conversation[] = [
  ["product-launch", "新版工作台功能发布公告", "今天 08:55", "整理一份产品发布公告。", "已按发布亮点、适用对象和使用入口整理为正式公告。", 180],
  ["customer-follow-up", "重点客户季度回访邮件", "今天 08:10", "起草一封客户回访邮件。", "已生成简洁礼貌的回访邮件，并保留反馈入口。", 240],
  ["training-notice", "新员工产品培训安排通知", "今天 07:45", "优化这份内部培训安排。", "已明确培训时间、参与范围、会前准备和联系人。", 1_320],
  ["monthly-summary", "八月经营月报重点摘要", "今天 07:10", "把经营月报压缩成一页摘要。", "已提炼核心指标、主要变化和需关注事项。", 2_880],
  ["complaint-reply", "客户交付延期投诉回复措辞", "昨天 15:40", "帮我调整客户投诉回复的语气。", "已改为克制、负责且包含明确解决步骤的回复。", 3_120],
  ["risk-statement", "项目阶段风险与应对措施说明", "昨天 13:20", "整理当前项目风险说明。", "已按风险、影响、应对措施和责任人形成结构化说明。", 5_760],
  ["proposal-background", "解决方案背景润色与核心价值提炼", "昨天 10:15", "润色方案背景并提炼核心价值。", "已压缩背景信息，并突出业务价值与预期收益。", 8_640],
  ["partner-invitation", "生态合作伙伴联合活动邀请函", "昨天 08:30", "起草一封合作邀请函。", "已生成正式邀请函，包含合作背景、议题和回复方式。", 10_080],
  ["policy-update", "差旅报销制度更新说明", "2 天前", "将制度变化整理成员工说明。", "已用通俗语言说明变化内容、生效时间和注意事项。", 15_840],
  ["welcome-letter", "新员工入职首日欢迎信", "2 天前", "写一封新员工欢迎信。", "已生成亲切简洁的欢迎信，并补充入职首日指引。", 25_920],
  ["midyear-review", "上半年工作复盘汇报提纲", "2 天前", "整理年中复盘汇报提纲。", "已按目标回顾、成果、问题和下半年计划形成提纲。", 47_520],
  ["archive-summary", "往年项目历史材料核心摘要", "2 天前", "概括这批历史材料的核心结论。", "已按主题归纳主要结论，并标注需要进一步确认的信息。", 148_320],
].map(([id, title, updatedAt, userText, assistantText, minutesAgo]) => ({
  id: `conversation-standalone-${id}`,
  projectId: null,
  agentId: "agent-analysis",
  applicationId: "conversation",
  catalogApplicationId: "enterprise-knowledge-manager",
  title: String(title),
  updatedAt: String(updatedAt),
  messages: conversationMessages(
    `standalone-${id}`,
    String(userText),
    String(assistantText),
    Number(minutesAgo),
  ),
}));

const standaloneDigitalEmployeeConversations: Conversation[] = [
  ["operations-architect", "核心服务可观测性巡检建议", "12 分钟前", "帮我检查核心服务的可观测性覆盖。", "已按指标、日志、链路和告警四个维度整理巡检清单，并标出需要优先补齐的监控项。", 12],
  ["senior-developer", "订单系统扩容方案评审", "28 分钟前", "评审一下订单系统扩容方案。", "已从容量基线、关键链路、降级策略和上线回滚四方面给出评审意见。", 28],
  ["data-analyst", "渠道异常指标诊断", "1 小时前", "分析最近一周渠道转化异常。", "已定位主要异常区间，并整理需要进一步核对的数据口径和验证步骤。", 60],
  ["project-management-expert", "本周里程碑与阻塞事项梳理", "2 小时前", "梳理本周里程碑和阻塞事项。", "已按里程碑、责任人、依赖和风险生成推进清单。", 120],
  ["senior-legal-advisor", "采购合同责任条款审查", "今天 09:20", "检查采购合同中的责任条款。", "已标注责任上限、赔偿范围和终止条件中的重点风险。", 210],
  ["senior-financial-analyst", "季度预算执行偏差分析", "今天 08:45", "分析季度预算执行偏差。", "已拆分收入、成本和费用偏差，并给出需要关注的预算调整建议。", 260],
  ["senior-qa-engineer", "发布前回归测试范围确认", "昨天 17:40", "制定本次发布的回归测试范围。", "已根据变更影响和历史缺陷整理优先级明确的回归范围。", 1_020],
  ["business-development-manager", "重点合作伙伴推进策略", "昨天 16:10", "整理重点合作伙伴的推进策略。", "已按合作价值、当前阶段和下一步行动形成跟进建议。", 1_120],
  ["industry-research-consultant", "智能制造政策趋势速览", "昨天 14:30", "汇总近期智能制造政策趋势。", "已整理政策方向、行业影响和建议持续跟踪的关键指标。", 1_240],
  ["hr-manager", "关键岗位招聘优先级规划", "昨天 11:15", "规划关键岗位的招聘优先级。", "已结合业务影响、人才稀缺度和到岗周期形成招聘顺序。", 1_430],
  ["ui-designer", "管理后台信息层级优化", "2 天前", "优化管理后台的信息层级。", "已梳理页面主次关系，并提出导航、表格和操作区的调整建议。", 2_880],
  ["product-planning-expert", "客户反馈功能优先级梳理", "2 天前", "根据客户反馈梳理功能优先级。", "已按用户价值、业务收益和实现成本形成优先级建议。", 3_120],
  ["market-strategy-expert", "行业活动获客策略复盘", "3 天前", "复盘本次行业活动的获客策略。", "已整理渠道表现、线索质量和下一轮优化动作。", 4_320],
  ["brand-creative-director", "品牌内容一致性检查", "3 天前", "检查近期品牌内容的一致性。", "已从语气、视觉表达和核心信息三个方面标注不一致项。", 4_680],
  ["fullstack-developer", "客户门户接口联调计划", "4 天前", "制定客户门户的接口联调计划。", "已按接口依赖、环境准备、联调顺序和验收条件排出执行计划。", 5_760],
  ["supply-chain-analyst", "关键物料库存周转分析", "5 天前", "分析关键物料的库存周转情况。", "已识别高库存和潜在缺货物料，并给出补货与去库存建议。", 7_200],
  ["customer-success-manager", "重点客户续约风险排查", "6 天前", "排查重点客户的续约风险。", "已按使用活跃度、问题闭环和价值达成度整理风险清单。", 8_640],
].map(([catalogApplicationId, title, updatedAt, userText, assistantText, minutesAgo]) => ({
  id: `conversation-standalone-${catalogApplicationId}`,
  projectId: null,
  agentId: "agent-analysis",
  applicationId: "conversation",
  catalogApplicationId: String(catalogApplicationId),
  title: String(title),
  updatedAt: String(updatedAt),
  messages: conversationMessages(
    `standalone-${catalogApplicationId}`,
    String(userText),
    String(assistantText),
    Number(minutesAgo),
    String(catalogApplicationId),
  ),
}));

const initialConversationSeed: Conversation[] = [
  ...standaloneDigitalEmployeeConversations,
  {
    id: "conversation-standalone-brief",
    projectId: null,
    agentId: "agent-analysis",
    applicationId: "conversation",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "整理今天需要优先推进的重点任务",
    updatedAt: "5 分钟前",
    messages: [
      message("standalone-brief-user", "user", "帮我整理今天需要优先推进的事项。", 8),
      message(
        "standalone-brief-assistant",
        "assistant",
        "可以。这是一条不属于任何群组项目的独立对话，我会仅根据当前对话内容帮你整理优先级。",
        7,
      ),
    ],
  },
  {
    id: "conversation-standalone-notice-rewrite",
    projectId: null,
    agentId: "agent-analysis",
    applicationId: "conversation",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "部门会议通知简洁改写",
    updatedAt: "今天 09:40",
    messages: conversationMessages(
      "standalone-notice-rewrite",
      "把这段部门通知改得更简洁一些。",
      "已压缩为三句话，并保留时间、地点和行动要求。",
      120,
    ),
  },
  {
    id: "conversation-standalone-weekly-polish",
    projectId: null,
    agentId: "agent-analysis",
    applicationId: "conversation",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "项目周报进展与风险内容润色",
    updatedAt: "昨天 16:20",
    messages: conversationMessages(
      "standalone-weekly-polish",
      "帮我润色本周项目周报。",
      "已统一表达口径，并将进展、风险和下周计划整理为清晰段落。",
      1_080,
    ),
  },
  {
    id: "conversation-standalone-meeting-summary",
    projectId: null,
    agentId: "agent-analysis",
    applicationId: "conversation",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "跨部门项目会议纪要重点摘要",
    updatedAt: "昨天 18:10",
    messages: conversationMessages(
      "standalone-meeting-summary",
      "将这份会议纪要整理成管理层摘要。",
      "已提炼决策结论、待办事项与风险提示，便于管理层快速阅读。",
      4_320,
    ),
  },
  ...standaloneSmartWritingHistory,
  {
    id: "conversation-equipment",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "project",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "3号冷却泵振动异常排查",
    updatedAt: "刚刚",
    messages: [
      message("equipment-user", "user", "@运维架构师 @数据分析师 请结合设备档案和监测数据，判断 3 号冷却泵最近的振动异常。", 12),
      message(
        "equipment-assistant-operations",
        "assistant",
        "从设备结构与维护记录看，优先检查联轴器对中、轴承座紧固和基础刚度。上次校准后径向偏差曾短时回升，建议先安排现场复测，再决定是否停机拆检。",
        11,
        "operations-architect",
      ),
      message(
        "equipment-assistant-analysis",
        "assistant",
        "从过去 24 小时趋势看，振动峰值主要集中在负载超过 82% 的时段，并与驱动端轴承温升同步。建议设置 4.5 mm/s 预警线，并重点复核高负载工况下的数据。",
        10,
        "data-analyst",
      ),
    ],
  },
  {
    id: "conversation-maintenance",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "history",
    catalogApplicationId: "project-management-expert",
    title: "九月重点设备维护执行计划",
    updatedAt: "18 分钟前",
    messages: [
      message("maintenance-user", "user", "汇总本月待执行的维护任务。", 22),
      message(
        "maintenance-assistant",
        "assistant",
        "本月还有 7 项维护任务未关闭，其中 2 项已超过计划日期。我可以继续按设备等级和停机窗口生成执行顺序。",
        21,
      ),
    ],
  },
  {
    id: "conversation-temperature-warning",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "project",
    catalogApplicationId: "data-analyst",
    title: "2号机组夜间温度预警复核",
    updatedAt: "32 分钟前",
    messages: conversationMessages(
      "temperature-warning",
      "复核昨晚 2 号机组的温度预警，判断是否需要停机检查。",
      "已对比轴承、绕组与环境温度曲线。22:10 至 22:35 期间驱动端轴承最高 78.6℃，超过预警线 3.6℃，但负载下降后已恢复。建议本班检查润滑状态与温度探头固定情况，暂不需要立即停机。",
      36,
    ),
  },
  {
    id: "conversation-spare-parts",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "files",
    catalogApplicationId: "senior-financial-analyst",
    title: "九月关键备件库存盘点",
    updatedAt: "今天 09:40",
    messages: conversationMessages(
      "spare-parts",
      "汇总本月关键备件库存，并标出需要补货的项目。",
      "盘点发现 3 项低于安全库存：6308 轴承剩余 4 件、机械密封组件剩余 2 套、设备专用润滑脂剩余 6 桶。按近三个月消耗速度，建议本周分别补充 8 件、4 套和 10 桶。",
      145,
    ),
  },
  {
    id: "conversation-night-inspection",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "conversation",
    catalogApplicationId: "project-management-expert",
    title: "夜班设备巡检异常交接",
    updatedAt: "昨天 22:10",
    messages: conversationMessages(
      "night-inspection",
      "把今晚巡检情况整理成白班可以直接执行的交接事项。",
      "已整理交接重点：3 号冷却泵振动值回落至 4.1 mm/s，继续每两小时复测；2 号机组回水阀有轻微渗漏，白班需安排紧固；东侧配电柜温湿度正常。未完成事项已按责任人列入待办。",
      680,
    ),
  },
  {
    id: "conversation-coupling-calibration",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "history",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "3号泵联轴器校准结果记录",
    updatedAt: "昨天 16:25",
    messages: conversationMessages(
      "coupling-calibration",
      "查询 3 号泵最近一次联轴器校准结果。",
      "最近一次校准完成于 9 月 18 日 16:10。径向偏差由 0.18 mm 调整至 0.04 mm，端面偏差由 0.21 mm 调整至 0.05 mm，均进入维护标准范围；复测人员为王工和赵工。",
      970,
    ),
  },
  {
    id: "conversation-energy-review",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "project",
    catalogApplicationId: "data-analyst",
    title: "本周泵站运行能耗异常复盘",
    updatedAt: "今天 08:20",
    messages: conversationMessages(
      "energy-review",
      "分析本周泵站能耗变化，找出异常设备。",
      "本周总用电量较上周上升 6.8%，主要来自 3 号泵夜间低负载运行。其单位输送能耗高出同组设备 11.2%。建议将 00:00—05:00 的运行时长转移给 1 号泵，并检查 3 号泵叶轮磨损情况。",
      4_800,
    ),
  },
  {
    id: "conversation-seal-leak",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "project",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "1号循环泵机械密封渗漏复核",
    updatedAt: "昨天 13:40",
    messages: conversationMessages(
      "seal-leak",
      "复核 1 号循环泵机械密封渗漏记录，判断是否需要更换。",
      "过去三个班次的渗漏量由每小时 8 ml 增至 17 ml，仍低于停机阈值，但增长趋势明显。建议在下一次计划停机时更换密封组件，并在此之前每班记录一次渗漏量。",
      2_900,
    ),
  },
  {
    id: "conversation-motor-current",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "project",
    catalogApplicationId: "data-analyst",
    title: "4号电机近一周电流波动分析",
    updatedAt: "昨天 11:15",
    messages: conversationMessages(
      "motor-current",
      "分析 4 号电机最近一周的电流波动。",
      "4 号电机工作电流在 68–76 A 之间，启动峰值正常。异常主要出现在负载切换后的 3 分钟内，最大波动 9.4%。建议检查变频器参数与出口阀开度反馈，暂未发现绕组故障特征。",
      4_350,
    ),
  },
  {
    id: "conversation-cooling-tower",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "history",
    catalogApplicationId: "project-management-expert",
    title: "冷却塔清洗完成情况跟进",
    updatedAt: "昨天 09:30",
    messages: conversationMessages(
      "cooling-tower",
      "汇总冷却塔清洗工作的完成情况和遗留事项。",
      "两座冷却塔的填料与集水盘已完成清洗，出水温差恢复至设计范围。遗留事项包括补装 3 处防护网、复测 2 号风机振动值，以及在下周水质检测后关闭工单。",
      8_700,
    ),
  },
  {
    id: "conversation-pump-noise",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "conversation",
    catalogApplicationId: "project-management-expert",
    title: "2号泵房异常噪声会诊记录",
    updatedAt: "昨天 08:05",
    messages: conversationMessages(
      "pump-noise",
      "整理泵房异响会诊的结论和后续安排。",
      "会诊判断异响主要来自 2 号泵入口短时汽蚀，轴承与联轴器未发现异常。后续将提高最低液位联锁值，并连续三天记录入口压力、流量和声音变化。",
      14_400,
    ),
  },
  {
    id: "conversation-lubrication-cycle",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "history",
    catalogApplicationId: "project-management-expert",
    title: "夏季轴承润滑周期调整评估",
    updatedAt: "2 天前",
    messages: conversationMessages(
      "lubrication-cycle",
      "根据夏季运行数据评估是否需要调整轴承润滑周期。",
      "高温月份轴承温度平均上升 4.2℃，但油脂状态检测仍在合格范围。建议重载设备维持 30 天周期，普通设备由 30 天延长至 45 天，并在首次延长周期后增加一次油脂取样。",
      33_000,
    ),
  },
  {
    id: "conversation-valve-replacement",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "files",
    catalogApplicationId: "senior-financial-analyst",
    title: "东区回水阀更换作业复盘",
    updatedAt: "2 天前",
    messages: conversationMessages(
      "valve-replacement",
      "复盘东区回水阀更换作业，整理可复用经验。",
      "作业比计划提前 40 分钟完成，停水范围控制符合预案。主要经验是提前完成旁路阀试动作并准备两套密封垫；需要改进的是旧阀拆除前的残压确认流程。",
      97_000,
    ),
  },
  {
    id: "conversation-summer-inspection",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "project",
    catalogApplicationId: "enterprise-knowledge-manager",
    title: "夏季高温设备专项巡检总结",
    updatedAt: "2 天前",
    messages: conversationMessages(
      "summer-inspection",
      "查询夏季高温专项巡检的主要发现。",
      "专项巡检共记录 12 项问题，其中 10 项已关闭。剩余两项为西侧控制柜散热风扇老化和 4 号泵房遮阳设施缺失，均已纳入季度检修计划。",
      138_000,
    ),
  },
  {
    id: "conversation-overhaul-review",
    projectId: "project-operations",
    agentId: "agent-equipment",
    applicationId: "files",
    catalogApplicationId: "senior-financial-analyst",
    title: "年度设备大修质量验收复盘",
    updatedAt: "2 天前",
    messages: conversationMessages(
      "overhaul-review",
      "汇总年度大修的质量验收结论。",
      "本次大修涉及 6 台主设备和 14 项辅助系统，验收项目全部通过。试运行期间发现的两处轻微泄漏已处理，建议下次大修提前锁定进口轴承交期，并统一校准振动测点编号。",
      240_000,
    ),
  },
  {
    id: "conversation-contract",
    projectId: "project-contract",
    agentId: "agent-contract",
    applicationId: "files",
    catalogApplicationId: "senior-legal-advisor",
    title: "供应商合同关键风险条款审查",
    updatedAt: "昨天 16:40",
    messages: [
      message("contract-user", "user", "@资深法务顾问 @企业知识管理员 请共同检查这份供应商合同需要优先修改的条款。", 160),
      message(
        "contract-assistant-legal",
        "assistant",
        "优先关注责任上限、数据使用范围和单方终止三个条款。当前演示不会读取真实合同；接入 Argus 后将显示对应页码、证据片段和审查记录。",
        159,
        "senior-legal-advisor",
      ),
      message(
        "contract-assistant-knowledge",
        "assistant",
        "已对照群组项目内的标准采购合同与历史审查意见，当前版本还缺少数据留存期限和供应商退出后的资料销毁要求，建议补入统一模板条款。",
        158,
        "enterprise-knowledge-manager",
      ),
    ],
  },
  {
    id: "conversation-growth",
    projectId: "project-growth",
    agentId: "agent-analysis",
    applicationId: "project",
    catalogApplicationId: "data-analyst",
    title: "华东区域线索转化率下降分析",
    updatedAt: "2 天前",
    messages: conversationMessages(
      "growth-region-conversion",
      "分析华东区域线索转化率下降的主要原因。",
      "华东区域本周线索转化率从 18.4% 降至 14.9%。下降主要集中在信息流渠道：有效联系方式缺失率上升 7.2 个百分点，首次跟进超过 24 小时的线索增加 31%。建议先收紧渠道表单校验，并将高意向线索自动分配时限缩短至 2 小时。",
      8_400,
    ),
  },
  {
    id: "conversation-channel-cost",
    projectId: "project-growth",
    agentId: "agent-analysis",
    applicationId: "project",
    catalogApplicationId: "senior-financial-analyst",
    title: "本月各渠道投放获客成本复盘",
    updatedAt: "今天 11:20",
    messages: [
      message("channel-cost-user", "user", "@资深财务分析师 @市场策略专家 复盘本月各渠道获客成本，并给出预算调整建议。", 95),
      message(
        "channel-cost-finance",
        "assistant",
        "搜索广告获客成本为 286 元，环比下降 9%；信息流升至 412 元，且有效线索率仅 38%；行业活动保持在 335 元。建议将信息流预算下调 20%。",
        94,
        "senior-financial-analyst",
      ),
      message(
        "channel-cost-market",
        "assistant",
        "从渠道策略看，可将削减预算的一半转入搜索广告，另一半保留用于高转化素材复测；同时按行业拆分落地页，避免只依赖整体获客成本判断。",
        93,
        "market-strategy-expert",
      ),
    ],
  },
  {
    id: "conversation-east-funnel",
    projectId: "project-growth",
    agentId: "agent-analysis",
    applicationId: "history",
    catalogApplicationId: "industry-research-consultant",
    title: "华东区域线索至签约漏斗分析",
    updatedAt: "今天 09:15",
    messages: conversationMessages(
      "east-funnel",
      "整理华东区域从线索到签约的漏斗表现。",
      "华东本月共有 1,284 条线索，形成 436 个有效商机、118 个方案报价和 42 个签约客户。最大流失发生在商机到报价阶段，转化率仅 27.1%。建议按行业拆分未报价原因，并优先复盘制造业大客户的方案响应时长。",
      220,
    ),
  },
  {
    id: "conversation-renewal-forecast",
    projectId: "project-growth",
    agentId: "agent-analysis",
    applicationId: "files",
    catalogApplicationId: "ui-designer",
    title: "下季度重点客户续约风险预测",
    updatedAt: "昨天 18:30",
    messages: conversationMessages(
      "renewal-forecast",
      "预测下季度重点客户续约风险，并列出需要提前介入的客户。",
      "当前 36 家重点客户中，25 家续约概率高于 80%，7 家处于观察区间，4 家为高风险。高风险客户共同特征是近 60 天活跃度下降且存在未关闭工单。建议本周优先联系华东智造、远航物流、北辰零售和新川能源。",
      760,
    ),
  },
  {
    id: "conversation-sales-target",
    projectId: "project-growth",
    agentId: "agent-analysis",
    applicationId: "conversation",
    catalogApplicationId: "project-management-expert",
    title: "本月销售目标达成情况跟踪",
    updatedAt: "昨天 14:05",
    messages: conversationMessages(
      "sales-target",
      "跟踪本月销售目标完成情况，并整理本周行动项。",
      "本月目标完成率为 72%，按当前节奏预计月底达到 93%。缺口主要来自华南企业客户组。已整理三项行动：本周推进 6 个已报价商机、复核 12 个停滞超过 14 天的机会、由区域负责人逐一确认高概率项目的签约日期。",
      1_180,
    ),
  },
  {
    id: "conversation-lead-quality",
    projectId: "project-growth",
    agentId: "agent-analysis",
    applicationId: "project",
    catalogApplicationId: "data-analyst",
    title: "近两周新客来源渠道质量评估",
    updatedAt: "2 天前",
    messages: conversationMessages(
      "lead-quality",
      "评估最近两周新客来源质量，找出最值得继续投入的渠道。",
      "按有效商机率和预计合同金额综合评估，合作伙伴转介绍质量最高，有效商机率 46%；自然搜索为 34%，但线索规模最大；信息流仅为 17%。建议扩大伙伴联合活动，同时继续优化自然搜索内容，信息流暂以小预算验证新定向策略。",
      3_900,
    ),
  },
];

export const initialConversations: Conversation[] = initialConversationSeed.map((conversation) => {
  if (conversation.projectId !== null || !conversation.catalogApplicationId) return conversation;
  return {
    ...conversation,
    applicationAlias: defaultDigitalEmployeeNames[conversation.catalogApplicationId]
      ?? conversation.applicationAlias
      ?? null,
  };
});

export const generatedFiles: GeneratedFile[] = [
  {
    id: "file-pump-vibration",
    projectId: "project-operations",
    conversationId: "conversation-equipment",
    agentId: "agent-equipment",
    name: "3 号泵振动趋势.csv",
    format: "CSV",
    size: "42 KB",
    updatedAt: "35 分钟前",
    summary: "3 号冷却泵最近 24 小时振动监测数据",
    mimeType: "text/csv;charset=utf-8",
    content: "时间,振动速度(mm/s)\n08:00,3.2\n12:00,4.8\n16:00,6.1",
  },
  {
    id: "file-pump-report",
    projectId: "project-operations",
    conversationId: "conversation-equipment",
    agentId: "agent-equipment",
    name: "3号冷却泵异常分析报告.md",
    format: "MD",
    size: "284 KB",
    updatedAt: "今天 10:24",
    summary: "振动趋势、可能原因与停机检查建议",
    mimeType: "text/markdown;charset=utf-8",
    content: "# 3号冷却泵异常分析报告\n\n演示文件：包含振动趋势、可能原因与停机检查建议。",
  },
  {
    id: "file-maintenance-plan",
    projectId: "project-operations",
    conversationId: "conversation-maintenance",
    agentId: "agent-equipment",
    name: "九月维护任务清单.csv",
    format: "CSV",
    size: "96 KB",
    updatedAt: "18 分钟前",
    summary: "7 项待关闭任务与建议执行顺序",
    mimeType: "text/csv;charset=utf-8",
    content: "任务,优先级,状态\n冷却泵检查,高,待执行\n联轴器校准,中,待排期",
  },
  {
    id: "file-maintenance-execution",
    projectId: "project-operations",
    conversationId: "conversation-maintenance",
    agentId: "agent-equipment",
    name: "九月维护执行清单.md",
    format: "MD",
    size: "128 KB",
    updatedAt: "昨天 17:42",
    summary: "九月维护任务、负责人及执行状态",
    mimeType: "text/markdown;charset=utf-8",
    content: "# 九月维护执行清单\n\n- [ ] 检查 3 号冷却泵轴承温度\n- [ ] 复核联轴器对中值\n- [x] 完成夜班巡检交接",
  },
  {
    id: "file-contract-risk",
    projectId: "project-contract",
    conversationId: "conversation-contract",
    agentId: "agent-contract",
    name: "供应商合同风险清单.md",
    format: "MD",
    size: "172 KB",
    updatedAt: "昨天 16:52",
    summary: "责任上限、数据使用和终止条款风险",
    mimeType: "text/markdown;charset=utf-8",
    content: "# 供应商合同风险清单\n\n1. 责任上限\n2. 数据使用范围\n3. 单方终止条款",
  },
  {
    id: "file-growth-conversion",
    projectId: "project-growth",
    conversationId: "conversation-growth",
    agentId: "agent-analysis",
    name: "区域线索转化分析.csv",
    format: "CSV",
    size: "48 KB",
    updatedAt: "9 月 16 日",
    summary: "各区域转化率变化与异常标记",
    mimeType: "text/csv;charset=utf-8",
    content: "区域,本期转化率,环比\n华东,12.4%,-2.1%\n华南,15.8%,0.6%",
  },
  {
    id: "file-growth-funnel",
    projectId: "project-growth",
    conversationId: "conversation-growth",
    agentId: "agent-analysis",
    name: "区域转化漏斗分析.csv",
    format: "CSV",
    size: "54 KB",
    updatedAt: "18 分钟前",
    summary: "各区域从线索到成交的漏斗转化情况",
    mimeType: "text/csv;charset=utf-8",
    content: "区域,线索,商机,成交\n华东,1200,286,72\n华南,980,251,68",
  },
];

export const teamResourceGroups: TeamResourceGroup[] = [
  {
    id: "team-guidelines",
    name: "团队规范",
    resources: [
      { id: "team-collaboration-guide", name: "团队协作规范.md", updatedAt: "今天 09:30", content: "# 团队协作规范\n\n1. 任务需明确负责人、截止时间与验收标准。\n2. 关键决策应记录背景、结论和后续行动。\n3. 跨团队事项统一在群组项目对话中同步进展。\n4. 阻塞超过一个工作日时及时升级。" },
      { id: "team-data-policy", name: "信息安全与数据使用规范.md", updatedAt: "昨天 16:20", content: "# 信息安全与数据使用规范\n\n- 仅在授权范围内访问和使用团队资料。\n- 不在对话中粘贴密码、密钥及其他敏感凭证。\n- 对外发送文件前确认权限、脱敏状态与接收方。\n- 发现异常访问或数据泄露风险时立即上报。" },
    ],
  },
  {
    id: "shared-templates",
    name: "共享模板",
    resources: [
      { id: "weekly-report-template", name: "项目周报模板.md", updatedAt: "2 天前", content: "# 项目周报\n\n## 本周进展\n- \n\n## 风险与阻塞\n- \n\n## 下周计划\n- \n\n## 需要协助\n- " },
      { id: "meeting-notes-template", name: "会议纪要模板.md", updatedAt: "3 天前", content: "# 会议纪要\n\n时间：\n参会人：\n\n## 讨论结论\n- \n\n## 行动项\n- 事项 / 负责人 / 截止时间" },
      { id: "analysis-template", name: "数据分析模板.csv", updatedAt: "9 月 18 日", content: "指标,本期值,上期值,变化率,异常说明\n示例指标,0,0,0%,待补充" },
    ],
  },
  {
    id: "public-materials",
    name: "公共资料",
    resources: [
      { id: "application-guide", name: "团队应用使用指南.md", updatedAt: "9 月 12 日", content: "# 团队数字员工使用指南\n\n1. 选择与任务匹配的数字员工。\n2. 在对话中描述目标、背景和期望输出。\n3. 按需引用团队资源或上传附件。\n4. 检查输出依据后再用于正式业务流程。" },
      { id: "release-checklist", name: "应用发布检查清单.md", updatedAt: "8 月 30 日", content: "# 数字员工发布检查清单\n\n- [ ] 名称、说明与能力范围准确\n- [ ] 权限和数据访问范围已确认\n- [ ] 关键场景已完成验证\n- [ ] 异常与降级路径可用\n- [ ] 发布负责人和回滚方案明确" },
    ],
  },
];

export const starterPrompts = [
  "汇总这个群组项目今天需要处理的事项",
  "根据现有资料给出下一步建议",
  "列出结论对应的来源和风险",
];
