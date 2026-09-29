import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  unstable_useComposerInput,
  useAuiState,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  App as AntApp,
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  Layout,
  Modal,
  Popover,
  Radio,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  theme as antdTheme,
  TimePicker,
  Tooltip,
  Typography,
  Upload,
  type InputRef,
  type MenuProps,
  type UploadProps,
} from "antd";
import { Cambio } from "cambio";
import {
  Archive,
  ArrowLeft,
  ArrowRightLeft,
  ArrowUpFromDot,
  Bot,
  Bookmark,
  BookOpenCheck,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  ChevronsUpDown,
  Check,
  CircleCheck,
  CirclePlus,
  Copy,
  Download,
  FileText,
  FileCheck2,
  FolderClosed,
  FolderKanban,
  Gauge,
  HardDrive,
  History,
  ListCollapse,
  ListChevronsDownUp,
  ListFilter,
  Languages,
  Link2Off,
  ListChecks,
  Menu,
  Mail,
  MailCheck,
  MessageCirclePlus,
  MessagesSquare,
  MessageSquare,
  MonitorSmartphone,
  MoreHorizontal,
  MousePointerClick,
  NotebookPen,
  Paperclip,
  Palette,
  PanelLeft,
  PanelLeftOpen,
  PenLine,
  Pencil,
  Pickaxe,
  Plus,
  RefreshCw,
  Search,
  ScanText,
  Settings,
  ShieldAlert,
  Share2,
  Sparkles,
  Split,
  Square,
  Star,
  Store,
  TableProperties,
  Telescope,
  Timer,
  CalendarClock,
  Trash2,
  UploadCloud,
  UserRoundCog,
  UserRound,
  Users,
  LogOut,
  X,
} from "lucide-react";
import zhCN from "antd/locale/zh_CN";
import {
  agents,
  generatedFiles,
  initialConversations,
  projects,
  teamResourceGroups,
  type ApplicationId,
  type Conversation,
  type DemoMessage,
  type GeneratedFile,
  type Project,
  type TeamResource,
  type TeamResourceGroup,
} from "./data";
import { createTheme } from "./theme";

const { Content } = Layout;
const { Text, Title } = Typography;

type ProjectWorkspaceTool = "connections" | "files" | "runs" | "schedules" | "settings" | "skills";
type PendingConversationTarget = {
  conversationId: string;
  type: "application" | "project";
  targetId: string;
};
type TaskIslandStatus = "idle" | "running" | "waiting" | "success" | "error";
type ConversationTaskParticipantStatus = "queued" | Exclude<TaskIslandStatus, "idle">;
type ConversationTaskParticipant = {
  applicationId: string;
  name: string;
  avatar?: string;
  status: ConversationTaskParticipantStatus;
};
type RunStageSelection = {
  conversationId: string;
  applicationId: string;
  name: string;
  stageIndex: number;
  status: ConversationTaskParticipantStatus;
  taskTitle: string;
};
type ConversationTaskState = {
  conversationId: string;
  status: Exclude<TaskIslandStatus, "idle">;
  title: string;
  ownerName: string;
  targetType: "digital-employee" | "project";
  targetId: string;
  updatedAt: number;
  participants: ConversationTaskParticipant[];
  errorMessage?: string;
};
const SHOW_TASK_ISLAND_PROFILE_ON_HOVER = false;

const taskStatusPriority: Record<ConversationTaskState["status"], number> = {
  waiting: 4,
  error: 3,
  running: 2,
  success: 1,
};

function pickPrimaryTask(tasks: ConversationTaskState[]) {
  return [...tasks].sort((left, right) => (
    taskStatusPriority[right.status] - taskStatusPriority[left.status]
    || right.updatedAt - left.updatedAt
  ))[0];
}

function getTaskPrimaryParticipant(task?: ConversationTaskState) {
  if (!task?.participants.length) return undefined;
  return task.participants.find((participant) => (
    participant.status === "running"
    || participant.status === "waiting"
    || participant.status === "error"
  )) ?? [...task.participants].reverse().find((participant) => participant.status === "success")
    ?? task.participants[0];
}

function shouldShowNavigationTask(
  task: ConversationTaskState,
  activeConversationId: string,
  viewedTaskVersions: Record<string, number>,
) {
  if (task.status !== "success") return true;
  return task.conversationId !== activeConversationId
    && viewedTaskVersions[task.conversationId] !== task.updatedAt;
}

const officePlatformCatalog = [
  { id: "feishu", name: "飞书", shortName: "飞", color: "var(--ui-color-feishu)", description: "通过飞书机器人接收并回复用户消息" },
  { id: "wechat-work", name: "企业微信", shortName: "微", color: "var(--ui-color-wecom)", description: "通过企业微信机器人接收并回复用户消息" },
  { id: "dingtalk", name: "钉钉", shortName: "钉", color: "var(--ui-color-blue-6)", description: "通过钉钉机器人接收并回复用户消息" },
] as const;

const conversationMoreMenuItems: MenuProps["items"] = [
  { key: "rename", icon: <Pencil size={14} />, label: "重命名" },
  { key: "archive", icon: <Archive size={14} />, label: "归档（演示）", disabled: true },
  { type: "divider" },
  { key: "delete", icon: <Trash2 size={14} />, label: "删除", danger: true },
];

const teamOptions = [
  { id: "argus", name: "Argus Workspace", shortName: "A", avatarColor: "var(--ui-color-neutral-8)" },
  { id: "operations", name: "设备运维团队", shortName: "运", avatarColor: "var(--ui-color-team-green)" },
  { id: "product", name: "产品研发团队", shortName: "研", avatarColor: "var(--ui-color-team-purple)" },
];

const projectMembers = [
  { id: "demo-user", name: "演示用户", shortName: "演", avatarColor: "var(--ui-color-blue-5)", role: "所有者" },
  { id: "equipment-agent", name: "设备知识助手", shortName: "设", avatarColor: "var(--ui-color-purple-5)", role: "协作者" },
  { id: "engineer-wang", name: "王工", shortName: "王", avatarColor: "var(--ui-color-blue-6)", role: "协作者" },
  { id: "engineer-chen", name: "陈工", shortName: "陈", avatarColor: "var(--ui-color-blue-7)", role: "协作者" },
  { id: "engineer-li", name: "李工", shortName: "李", avatarColor: "var(--ui-color-cyan-7)", role: "协作者" },
  { id: "engineer-zhou", name: "周工", shortName: "周", avatarColor: "var(--ui-color-green-7)", role: "协作者" },
  { id: "supervisor-sun", name: "孙主管", shortName: "孙", avatarColor: "var(--ui-color-orange-7)", role: "协作者" },
  { id: "maintenance-agent", name: "维护计划助手", shortName: "维", avatarColor: "var(--ui-color-purple-7)", role: "协作者" },
  { id: "inspection-agent", name: "安全巡检助手", shortName: "安", avatarColor: "var(--ui-color-magenta-7)", role: "协作者" },
  { id: "diagnosis-agent", name: "故障诊断助手", shortName: "诊", avatarColor: "var(--ui-color-lime-7)", role: "协作者" },
  { id: "engineer-wu", name: "吴工", shortName: "吴", avatarColor: "var(--ui-color-geekblue-7)", role: "协作者" },
  { id: "engineer-zheng", name: "郑工", shortName: "郑", avatarColor: "var(--ui-color-cyan-8)", role: "协作者" },
  { id: "spare-parts-admin", name: "备件管理员", shortName: "备", avatarColor: "var(--ui-color-orange-8)", role: "协作者" },
  { id: "energy-agent", name: "能效分析助手", shortName: "能", avatarColor: "var(--ui-color-purple-8)", role: "协作者" },
];
const currentUser = projectMembers[0];

const projectInviteCandidates = [
  { id: "engineer-zhao", name: "赵工", shortName: "赵", avatarColor: "var(--ui-color-teal-6)" },
  { id: "engineer-liu", name: "刘工", shortName: "刘", avatarColor: "var(--ui-color-orange-7)" },
  { id: "analysis-agent", name: "经营分析助手", shortName: "析", avatarColor: "var(--ui-color-purple-7)" },
];

const teamMembers = [
  ...projectMembers.map((member) => ({
    ...member,
    role: member.role === "所有者" ? "所有者" : "成员",
  })),
  ...projectInviteCandidates.map((member) => ({ ...member, role: "成员" })),
];

const avatarColorPalette = ["var(--ui-color-blue-6)", "var(--ui-color-teal-6)", "var(--ui-color-purple-6)", "var(--ui-color-orange-7)", "var(--ui-color-magenta-7)", "var(--ui-color-green-8)"];

function avatarColorForName(name: string) {
  const knownPerson = [...projectMembers, ...projectInviteCandidates].find((person) => person.name === name);
  if (knownPerson) return knownPerson.avatarColor;
  const colorIndex = Array.from(name).reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0);
  return avatarColorPalette[colorIndex % avatarColorPalette.length];
}

function InitialAvatar({ name, color, size = 24 }: { name: string; color?: string; size?: number }) {
  return (
    <Avatar className="initial-avatar" size={size} style={{ backgroundColor: color ?? avatarColorForName(name) }}>
      {name.trim().slice(0, 1)}
    </Avatar>
  );
}

function ActivityActorAvatar({ name, applicationCover }: { name: string; applicationCover?: string }) {
  const isApplication = agents.some((agent) => agent.name === name);
  if (isApplication) {
    return (
      <Avatar
        className="project-activity-avatar"
        size={24}
        src={applicationCover}
        icon={applicationCover ? undefined : <Bot size={14} />}
        style={{ backgroundColor: applicationCover ? undefined : avatarColorForName(name) }}
      />
    );
  }
  return <InitialAvatar name={name} />;
}

type ProjectActivity = {
  id: string;
  projectId: string;
  catalogApplicationId?: string;
  fileId?: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  kind: "conversation" | "file" | "task" | "member";
};

type ProjectTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: "待处理" | "进行中" | "已完成" | "已逾期";
  priority: "高" | "中" | "低";
  owner: string;
  dueAt: string;
};

type ProjectScheduledTask = {
  id: string;
  projectId: string;
  title: string;
  cadence: string;
  nextRun: string;
  enabled: boolean;
};

type ScheduledTaskFormValues = {
  title: string;
  frequency: "once" | "daily" | "weekdays" | "weekly" | "monthly";
  frequencyDetail: string;
  runDate?: { format: (pattern: string) => string };
  time?: { format: (pattern: string) => string };
  hasEndDate: boolean;
  endDate?: unknown;
  prompt: string;
};

const getScheduledTaskCadence = (values: ScheduledTaskFormValues) => {
  const time = values.time?.format("HH:mm") ?? "09:00";
  const frequencyLabel = {
    once: values.runDate?.format("YYYY年M月D日") ?? "指定日期",
    daily: "每天",
    weekdays: "工作日",
    weekly: `每${values.frequencyDetail}`,
    monthly: `每月 ${values.frequencyDetail}`,
  }[values.frequency];
  return `${frequencyLabel} ${time}`;
};

const projectActivities: ProjectActivity[] = [
  { id: "activity-ops-1", projectId: "project-operations", catalogApplicationId: "enterprise-knowledge-manager", actor: "设备知识助手", action: "完成了对话", target: "冷却泵异常排查", time: "10 分钟前", kind: "conversation" },
  { id: "activity-ops-2", projectId: "project-operations", fileId: "file-pump-vibration", actor: "演示用户", action: "上传了文件", target: "3 号泵振动趋势.csv", time: "35 分钟前", kind: "file" },
  { id: "activity-ops-3", projectId: "project-operations", actor: "王工", action: "更新了待办", target: "核对联轴器对中值", time: "今天 09:20", kind: "task" },
  { id: "activity-ops-4", projectId: "project-operations", catalogApplicationId: "project-management-expert", fileId: "file-maintenance-execution", actor: "设备知识助手", action: "生成了文件", target: "九月维护执行清单.md", time: "昨天 17:42", kind: "file" },
  { id: "activity-contract-1", projectId: "project-contract", catalogApplicationId: "senior-legal-advisor", actor: "合同审查助手", action: "完成了对话", target: "供应商合同风险", time: "22 分钟前", kind: "conversation" },
  { id: "activity-contract-2", projectId: "project-contract", actor: "陈法务", action: "更新了待办", target: "确认违约责任上限", time: "今天 10:05", kind: "task" },
  { id: "activity-contract-3", projectId: "project-contract", actor: "演示用户", action: "邀请了成员", target: "采购负责人参与审阅", time: "昨天 15:30", kind: "member" },
  { id: "activity-growth-1", projectId: "project-growth", catalogApplicationId: "senior-financial-analyst", fileId: "file-growth-funnel", actor: "经营分析助手", action: "生成了文件", target: "区域转化漏斗分析.csv", time: "18 分钟前", kind: "file" },
  { id: "activity-growth-2", projectId: "project-growth", actor: "李经理", action: "更新了待办", target: "复核华东区线索口径", time: "今天 11:10", kind: "task" },
  { id: "activity-growth-3", projectId: "project-growth", catalogApplicationId: "data-analyst", actor: "经营分析助手", action: "完成了对话", target: "区域线索转化下降", time: "昨天 16:20", kind: "conversation" },
];

const projectTasks: ProjectTask[] = [
  { id: "task-ops-1", projectId: "project-operations", title: "核对 3 号泵轴承温度", description: "对比最近 24 小时趋势与告警阈值", status: "进行中", priority: "高", owner: "王工", dueAt: "今天 16:00" },
  { id: "task-ops-2", projectId: "project-operations", title: "确认联轴器对中值", description: "补录现场测量结果并附照片", status: "待处理", priority: "高", owner: "赵工", dueAt: "明天 12:00" },
  { id: "task-ops-3", projectId: "project-operations", title: "关闭逾期维护工单", description: "核实两项逾期任务的停机窗口", status: "已逾期", priority: "中", owner: "刘工", dueAt: "昨天 18:00" },
  { id: "task-ops-4", projectId: "project-operations", title: "归档九月巡检记录", description: "将签字版记录上传至群组项目文件", status: "已完成", priority: "低", owner: "王工", dueAt: "今天 09:00" },
  { id: "task-contract-1", projectId: "project-contract", title: "确认违约责任上限", description: "与采购方确认可接受的责任比例", status: "进行中", priority: "高", owner: "陈法务", dueAt: "今天 17:30" },
  { id: "task-contract-2", projectId: "project-contract", title: "补充数据处理附件", description: "要求供应商补充跨境数据说明", status: "待处理", priority: "中", owner: "周律师", dueAt: "明天 15:00" },
  { id: "task-contract-3", projectId: "project-contract", title: "完成付款条款复核", description: "核对验收节点与付款比例", status: "已完成", priority: "低", owner: "陈法务", dueAt: "昨天 14:00" },
  { id: "task-growth-1", projectId: "project-growth", title: "复核华东区线索口径", description: "排除渠道字段调整造成的统计偏差", status: "进行中", priority: "高", owner: "李经理", dueAt: "今天 18:00" },
  { id: "task-growth-2", projectId: "project-growth", title: "补充流失客户样本", description: "从 CRM 导出近两周未转化线索", status: "待处理", priority: "中", owner: "数据组", dueAt: "周五 12:00" },
  { id: "task-growth-3", projectId: "project-growth", title: "发布区域分析摘要", description: "同步本周转化异常与建议动作", status: "已逾期", priority: "中", owner: "李经理", dueAt: "昨天 17:00" },
];

const projectScheduledTasks: ProjectScheduledTask[] = [
  { id: "schedule-ops-1", projectId: "project-operations", title: "每日设备异常汇总", cadence: "每天 09:00", nextRun: "明天 09:00", enabled: true },
  { id: "schedule-ops-2", projectId: "project-operations", title: "周度维护计划提醒", cadence: "每周一 08:30", nextRun: "周一 08:30", enabled: true },
  { id: "schedule-contract-1", projectId: "project-contract", title: "待审合同风险汇总", cadence: "工作日 17:30", nextRun: "今天 17:30", enabled: true },
  { id: "schedule-contract-2", projectId: "project-contract", title: "供应商材料催办", cadence: "每周三 10:00", nextRun: "周三 10:00", enabled: false },
  { id: "schedule-growth-1", projectId: "project-growth", title: "经营指标日报", cadence: "每天 09:30", nextRun: "明天 09:30", enabled: true },
  { id: "schedule-growth-2", projectId: "project-growth", title: "区域转化异常检查", cadence: "每周五 16:00", nextRun: "周五 16:00", enabled: true },
];

type SelectedFile = File & { uid: string };

function createSelectedFile(file: File, source: "local" | "resource" = "local"): SelectedFile {
  return Object.assign(file, {
    uid: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
}

function AttachmentSourceMenu({
  uploadProps,
  resources,
  resourceConversations,
}: {
  uploadProps: UploadProps;
  resources: GeneratedFile[];
  resourceConversations: Conversation[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceSearch, setResourceSearch] = useState("");
  const [selectedResourceKeys, setSelectedResourceKeys] = useState<Set<string>>(() => new Set());
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const normalizedResourceSearch = resourceSearch.trim().toLocaleLowerCase();
  const visibleResources = resources.filter((resource) => (
    !normalizedResourceSearch
    || `${resource.name} ${resource.summary} ${resource.format}`.toLocaleLowerCase().includes(normalizedResourceSearch)
  ));
  const visibleTeamGroups = teamResourceGroups
    .map((group) => ({
      ...group,
      resources: group.resources.filter((resource) => (
        !normalizedResourceSearch
        || `${group.name} ${resource.name}`.toLocaleLowerCase().includes(normalizedResourceSearch)
      )),
    }))
    .filter((group) => group.resources.length > 0);
  const visibleConversationGroups = resourceConversations
    .map((conversation) => ({
      conversation,
      resources: visibleResources.filter((resource) => resource.conversationId === conversation.id),
    }))
    .filter((group) => group.resources.length > 0);
  const visibleUngroupedResources = visibleResources.filter((resource) => !resource.conversationId);

  const addFiles = (files: SelectedFile[]) => {
    const beforeUploadHandler = uploadProps.beforeUpload as
      | ((file: SelectedFile, fileList: SelectedFile[]) => unknown)
      | undefined;
    files.forEach((file) => beforeUploadHandler?.(file, files));
  };

  const closeResourceModal = () => {
    setResourceModalOpen(false);
    setResourceSearch("");
    setSelectedResourceKeys(new Set());
  };

  const toggleResource = (key: string, checked: boolean) => {
    setSelectedResourceKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const addSelectedResources = () => {
    const files: SelectedFile[] = [];
    resources.forEach((resource) => {
      if (!selectedResourceKeys.has(`project:${resource.id}`)) return;
      files.push(createSelectedFile(
        new File([resource.content || resource.summary], resource.name, { type: resource.mimeType || "text/plain" }),
        "resource",
      ));
    });
    teamResourceGroups.forEach((group) => {
      group.resources.forEach((resource) => {
        if (!selectedResourceKeys.has(`team:${resource.id}`)) return;
        files.push(createSelectedFile(
          new File([`来自团队资源库：${resource.name}`], resource.name, { type: "text/plain" }),
          "resource",
        ));
      });
    });
    addFiles(files);
    closeResourceModal();
  };

  const sourceItems: MenuProps["items"] = [
    {
      key: "local",
      icon: <FileText className="attachment-source-menu-icon" size={14} />,
      label: "从本地文件添加",
    },
    {
      key: "resource",
      icon: <HardDrive className="attachment-source-menu-icon" size={14} />,
      label: "从资源库中添加",
    },
  ];

  return (
    <>
      <Dropdown
        trigger={["click"]}
        placement="topLeft"
        open={menuOpen}
        onOpenChange={(open) => {
          setMenuOpen(open);
        }}
        menu={{
          items: sourceItems,
          onClick: ({ key }) => {
            if (key === "local") {
              localFileInputRef.current?.click();
              return;
            }
            if (key === "resource") {
              setMenuOpen(false);
              setResourceModalOpen(true);
            }
          },
        }}
      >
        <Button className="attachment-source-trigger" type="text" icon={<Plus size={16} />} aria-label="添加附件" />
      </Dropdown>
      <input
        ref={localFileInputRef}
        className="attachment-native-input"
        type="file"
        accept={typeof uploadProps.accept === "string" ? uploadProps.accept : undefined}
        multiple={uploadProps.multiple}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []).map((file) => createSelectedFile(file));
          addFiles(files);
          event.currentTarget.value = "";
        }}
      />
      <Modal
        className="attachment-library-modal"
        title="从资源库中添加"
        open={resourceModalOpen}
        width={640}
        centered
        okText={selectedResourceKeys.size ? `添加（${selectedResourceKeys.size}）` : "添加"}
        cancelText="取消"
        okButtonProps={{ disabled: selectedResourceKeys.size === 0 }}
        onCancel={closeResourceModal}
        onOk={addSelectedResources}
      >
        <Input
          className="attachment-library-search"
          allowClear
          prefix={<Search size={14} />}
          placeholder="搜索资源"
          value={resourceSearch}
          onChange={(event) => setResourceSearch(event.target.value)}
        />
        <div className="attachment-library-tree">
          {visibleTeamGroups.length ? (
            <section className="attachment-library-section" aria-label="团队资源">
              <header className="attachment-library-root-row">
                <FolderClosed size={16} />
                <span>团队资源</span>
                <small>{teamResourceGroups.reduce((total, group) => total + group.resources.length, 0)}</small>
              </header>
              {visibleTeamGroups.map((group) => (
                <div className="attachment-library-group" key={group.id}>
                  <div className="attachment-library-folder-row">
                    <ChevronDown size={14} />
                    <FolderClosed size={15} />
                    <span>{group.name}</span>
                    <small>{group.resources.length}</small>
                  </div>
                  {group.resources.map((resource) => {
                    const key = `team:${resource.id}`;
                    return (
                      <label className="attachment-library-file-row" key={key}>
                        <Checkbox
                          checked={selectedResourceKeys.has(key)}
                          onChange={(event) => toggleResource(key, event.target.checked)}
                        />
                        <FileText size={15} />
                        <span>{resource.name}</span>
                        <small>{resource.updatedAt}</small>
                      </label>
                    );
                  })}
                </div>
              ))}
            </section>
          ) : null}
          {(visibleConversationGroups.length || visibleUngroupedResources.length) ? (
            <section className="attachment-library-section" aria-label="所有对话">
              <header className="attachment-library-root-row">
                <FolderClosed size={16} />
                <span>所有对话</span>
                <small>{resources.length}</small>
              </header>
              {visibleConversationGroups.map(({ conversation, resources: conversationResources }) => (
                <div className="attachment-library-group" key={conversation.id}>
                  <div className="attachment-library-folder-row">
                    <ChevronDown size={14} />
                    <FolderClosed size={15} />
                    <span>{conversation.title}</span>
                    <small>{conversationResources.length}</small>
                  </div>
                  {conversationResources.map((resource) => {
                    const key = `project:${resource.id}`;
                    return (
                      <label className="attachment-library-file-row" key={key}>
                        <Checkbox
                          checked={selectedResourceKeys.has(key)}
                          onChange={(event) => toggleResource(key, event.target.checked)}
                        />
                        <FileText size={15} />
                        <span>{resource.name}</span>
                        <small>{resource.updatedAt}</small>
                      </label>
                    );
                  })}
                </div>
              ))}
              {visibleUngroupedResources.map((resource) => {
                const key = `project:${resource.id}`;
                return (
                  <label className="attachment-library-file-row is-root-file" key={key}>
                    <Checkbox
                      checked={selectedResourceKeys.has(key)}
                      onChange={(event) => toggleResource(key, event.target.checked)}
                    />
                    <FileText size={15} />
                    <span>{resource.name}</span>
                    <small>{resource.updatedAt}</small>
                  </label>
                );
              })}
            </section>
          ) : null}
          {!visibleTeamGroups.length && !visibleConversationGroups.length && !visibleUngroupedResources.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的资源" />
          ) : null}
        </div>
      </Modal>
    </>
  );
}

const applicationCategories = ["全部", "技术研发", "数据分析", "产品设计", "项目管理", "法务人事", "市场商务", "客户运营", "知识研究"] as const;
type ApplicationCategory = (typeof applicationCategories)[number];
type ApplicationCardCategory = Exclude<ApplicationCategory, "全部">;

const skillCategories = ["全部", "研究分析", "内容创作", "办公效率", "数据处理"] as const;
type SkillCategory = (typeof skillCategories)[number];
type SkillCardCategory = Exclude<SkillCategory, "全部">;

const skillIconCatalog = {
  telescope: Telescope,
  pen: PenLine,
  scan: ScanText,
  chart: ChartNoAxesCombined,
  notes: NotebookPen,
  review: FileCheck2,
  table: TableProperties,
  calendar: CalendarDays,
  risk: ShieldAlert,
  translate: Languages,
} as const;

type SkillDefinition = {
  id: string;
  name: string;
  category: SkillCardCategory;
  description: string;
  icon: keyof typeof skillIconCatalog;
  iconColor: string;
  iconBackground: string;
};

const skillCatalog: SkillDefinition[] = [
  { id: "deep-research", name: "深度研究", category: "研究分析", description: "交叉验证多来源资料，形成带依据的专题研究结论。", icon: "telescope", iconColor: "var(--ui-color-red-6)", iconBackground: "var(--ui-color-red-1)" },
  { id: "content-creation", name: "内容研创", category: "内容创作", description: "根据目标、素材和受众生成结构完整的内容初稿。", icon: "pen", iconColor: "var(--ui-color-blue-6)", iconBackground: "var(--ui-color-blue-1)" },
  { id: "webpage-reader", name: "网页速读", category: "研究分析", description: "快速提炼网页重点、关键数据和待跟进事项。", icon: "scan", iconColor: "var(--ui-color-orange-6)", iconBackground: "var(--ui-color-orange-1)" },
  { id: "data-insight", name: "数据洞察", category: "数据处理", description: "分析业务指标变化，识别异常、趋势与可能原因。", icon: "chart", iconColor: "var(--ui-color-purple-6)", iconBackground: "var(--ui-color-purple-1)" },
  { id: "meeting-notes", name: "会议纪要", category: "办公效率", description: "整理讨论结论、决策事项、负责人和截止时间。", icon: "notes", iconColor: "var(--ui-color-cyan-6)", iconBackground: "var(--ui-color-cyan-1)" },
  { id: "document-review", name: "文档校对", category: "办公效率", description: "检查错别字、语法、格式及专业术语一致性。", icon: "review", iconColor: "var(--ui-color-green-6)", iconBackground: "var(--ui-color-green-1)" },
  { id: "table-cleanup", name: "表格整理", category: "数据处理", description: "规范字段和数据格式，完成清洗、分类与摘要。", icon: "table", iconColor: "var(--ui-color-lime-6)", iconBackground: "var(--ui-color-lime-1)" },
  { id: "project-weekly", name: "项目周报", category: "办公效率", description: "汇总项目进展、风险、阻塞事项和下周计划。", icon: "calendar", iconColor: "var(--ui-color-gold-6)", iconBackground: "var(--ui-color-gold-1)" },
  { id: "risk-scan", name: "风险扫描", category: "研究分析", description: "识别合同、方案与交付材料中的潜在风险。", icon: "risk", iconColor: "var(--ui-color-magenta-6)", iconBackground: "var(--ui-color-magenta-1)" },
  { id: "multilingual-translation", name: "多语翻译", category: "内容创作", description: "保留专业术语和原有格式，完成准确自然的翻译。", icon: "translate", iconColor: "var(--ui-color-geekblue-6)", iconBackground: "var(--ui-color-geekblue-1)" },
];

const skillDetailCatalog: Record<string, { capabilities: string[]; usage: string }> = {
  "deep-research": { capabilities: ["多来源资料交叉验证", "关键信息溯源与归纳", "形成带依据的研究结论"], usage: "适用于行业调研、竞品分析、专题研究与重要决策前的信息核验。" },
  "content-creation": { capabilities: ["识别目标与受众", "组织完整内容结构", "生成可继续编辑的初稿"], usage: "适用于公告、方案、邮件、文章和活动文案等内容的快速起草。" },
  "webpage-reader": { capabilities: ["提炼网页核心信息", "识别关键数据与结论", "整理后续行动事项"], usage: "适用于快速阅读新闻、报告、产品页面和长篇网页内容。" },
  "data-insight": { capabilities: ["识别指标变化", "定位异常与趋势", "归纳可能原因"], usage: "适用于经营数据复盘、指标诊断和分析结论整理。" },
  "meeting-notes": { capabilities: ["提取讨论结论", "整理负责人和截止时间", "生成结构化会议纪要"], usage: "适用于项目会议、评审会、周会及跨部门沟通记录。" },
  "document-review": { capabilities: ["检查错别字与语法", "统一格式和术语", "标记表达与一致性问题"], usage: "适用于方案、合同附件、报告和对外材料提交前的检查。" },
  "table-cleanup": { capabilities: ["规范字段和格式", "清洗并分类数据", "生成摘要与统计说明"], usage: "适用于业务台账、调研数据、名单和跨系统导出表格的整理。" },
  "project-weekly": { capabilities: ["汇总项目进展", "识别风险与阻塞", "整理下周计划"], usage: "适用于项目周报、阶段汇报和管理层进展同步。" },
  "risk-scan": { capabilities: ["识别潜在风险", "定位风险所在内容", "提供检查与跟进建议"], usage: "适用于合同、方案、交付材料和项目计划的风险预检。" },
  "multilingual-translation": { capabilities: ["保留专业术语", "保持原有内容结构", "生成自然准确的译文"], usage: "适用于邮件、报告、产品文档和跨语言协作材料。" },
};

type SkillInstallationTargetType = "digital-employee" | "project";
type SkillInstallation = {
  skillId: string;
  targetType: SkillInstallationTargetType;
  targetId: string;
};

const SKILL_INSTALLATIONS_STORAGE_KEY = "argus-skill-installations-v1";
const initialSkillInstallations: SkillInstallation[] = [
  { skillId: "deep-research", targetType: "digital-employee", targetId: "enterprise-knowledge-manager" },
  { skillId: "data-insight", targetType: "project", targetId: "project-growth" },
  { skillId: "risk-scan", targetType: "project", targetId: "project-contract" },
];

const readSkillInstallations = (): SkillInstallation[] => {
  try {
    const storedValue = window.localStorage.getItem(SKILL_INSTALLATIONS_STORAGE_KEY);
    if (!storedValue) return initialSkillInstallations;
    const parsedValue = JSON.parse(storedValue) as unknown;
    if (!Array.isArray(parsedValue)) return initialSkillInstallations;
    return parsedValue.filter((item): item is SkillInstallation => (
      typeof item === "object"
      && item !== null
      && typeof (item as SkillInstallation).skillId === "string"
      && ["digital-employee", "project"].includes((item as SkillInstallation).targetType)
      && typeof (item as SkillInstallation).targetId === "string"
    ));
  } catch {
    return initialSkillInstallations;
  }
};

const isSkillInstalledAtTarget = (
  installations: SkillInstallation[],
  skillId: string,
  targetType: SkillInstallationTargetType,
  targetId: string,
) => installations.some((installation) => (
  installation.skillId === skillId
  && installation.targetType === targetType
  && installation.targetId === targetId
));

type CatalogApplication = {
  id: string;
  name: string;
  category: ApplicationCardCategory;
  description: string;
  cover: string;
  avatar: string;
  contextId: ApplicationId;
};

const applicationCatalogSource: CatalogApplication[] = [
  { id: "senior-developer", name: "高级开发工程师", category: "技术研发", description: "解决复杂系统设计与技术攻坚问题，提升架构质量、研发效率和交付稳定性", cover: "/application-covers/01-高级开发工程师.png", avatar: "/application-avatars/01-高级开发工程师.png", contextId: "project" },
  { id: "senior-financial-analyst", name: "资深财务分析师", category: "数据分析", description: "分析财务表现与经营差异，优化预算预测、成本管控和管理决策质量", cover: "/application-covers/02-资深财务分析师.png", avatar: "/application-avatars/02-资深财务分析师.png", contextId: "project" },
  { id: "ui-designer", name: "UI设计师", category: "产品设计", description: "将业务需求转化为清晰易用的界面，提升产品体验、效率与品牌一致性", cover: "/application-covers/03-UI设计师.png", avatar: "/application-avatars/03-UI设计师.png", contextId: "files" },
  { id: "fullstack-developer", name: "全栈开发工程师", category: "技术研发", description: "贯通前端、后端与数据服务，加速功能开发、联调验证和稳定上线", cover: "/application-covers/04-全栈开发工程师.png", avatar: "/application-avatars/04-全栈开发工程师.png", contextId: "project" },
  { id: "product-planning-expert", name: "产品规划专家", category: "产品设计", description: "识别用户与业务机会，制定产品路线、功能优先级和阶段性目标", cover: "/application-covers/05-产品规划专家.png", avatar: "/application-avatars/05-产品规划专家.png", contextId: "project" },
  { id: "data-analyst", name: "数据分析师", category: "数据分析", description: "清洗并分析多源业务数据，识别趋势异常并形成可执行决策建议", cover: "/application-covers/06-数据分析师.png", avatar: "/application-avatars/06-数据分析师.png", contextId: "project" },
  { id: "project-management-expert", name: "项目管理专家", category: "项目管理", description: "统筹项目范围、进度、资源与风险，推动跨团队协作并保障按期交付", cover: "/application-covers/07-项目管理专家.png", avatar: "/application-avatars/07-项目管理专家.png", contextId: "project" },
  { id: "senior-legal-advisor", name: "资深法务顾问", category: "法务人事", description: "审查合同条款与业务合规风险，提供可落地的修改建议和法律依据", cover: "/application-covers/08-资深法务顾问.png", avatar: "/application-avatars/08-资深法务顾问.png", contextId: "files" },
  { id: "hr-manager", name: "人力资源经理", category: "法务人事", description: "优化人才招聘、培养与绩效管理，提升组织能力、协作效率和员工体验", cover: "/application-covers/09-人力资源经理.png", avatar: "/application-avatars/09-人力资源经理.png", contextId: "files" },
  { id: "market-strategy-expert", name: "市场策略专家", category: "市场商务", description: "分析市场、用户与竞争环境，制定定位、增长路径和营销行动策略", cover: "/application-covers/10-市场策略专家.png", avatar: "/application-avatars/10-市场策略专家.png", contextId: "history" },
  { id: "brand-creative-director", name: "品牌创意总监", category: "市场商务", description: "建立统一的品牌创意方向，提升内容质量、市场辨识度和传播影响力", cover: "/application-covers/11-品牌创意总监.png", avatar: "/application-avatars/11-品牌创意总监.png", contextId: "files" },
  { id: "user-research-expert", name: "用户研究专家", category: "产品设计", description: "通过访谈、观察与可用性测试，发现真实需求并验证产品设计方向", cover: "/application-covers/12-用户研究专家.png", avatar: "/application-avatars/12-用户研究专家.png", contextId: "history" },
  { id: "business-development-manager", name: "商务拓展经理", category: "市场商务", description: "识别高价值合作机会，推进客户沟通、方案协同和商业关系转化", cover: "/application-covers/13-商务拓展经理.png", avatar: "/application-avatars/13-商务拓展经理.png", contextId: "history" },
  { id: "senior-qa-engineer", name: "高级测试工程师", category: "技术研发", description: "规划自动化与质量验证体系，提前发现缺陷并降低版本发布风险", cover: "/application-covers/14-高级测试工程师.png", avatar: "/application-avatars/14-高级测试工程师.png", contextId: "project" },
  { id: "operations-architect", name: "运维架构师", category: "技术研发", description: "设计可观测、高可用的运维架构，提升故障响应效率和服务连续性", cover: "/application-covers/15-运维架构师.png", avatar: "/application-avatars/15-运维架构师.png", contextId: "project" },
  { id: "cybersecurity-expert", name: "网络安全专家", category: "技术研发", description: "识别网络攻击与数据安全风险，完善防护策略并守护企业信息资产", cover: "/application-covers/16-网络安全专家.png", avatar: "/application-avatars/16-网络安全专家.png", contextId: "project" },
  { id: "supply-chain-analyst", name: "供应链分析师", category: "数据分析", description: "分析采购、库存、物流与履约数据，降低供应链成本并提升周转效率", cover: "/application-covers/17-供应链分析师.png", avatar: "/application-avatars/17-供应链分析师.png", contextId: "project" },
  { id: "customer-success-manager", name: "客户成功经理", category: "客户运营", description: "推动客户启用、采用与价值实现，提升产品活跃度、满意度和长期续约率", cover: "/application-covers/18-客户成功经理.png", avatar: "/application-avatars/18-客户成功经理.png", contextId: "conversation" },
  { id: "industry-research-consultant", name: "行业研究顾问", category: "知识研究", description: "跟踪行业趋势、政策与竞争格局，形成支持战略选择的研究判断", cover: "/application-covers/19-行业研究顾问.png", avatar: "/application-avatars/19-行业研究顾问.png", contextId: "history" },
  { id: "enterprise-knowledge-manager", name: "企业知识管理员", category: "知识研究", description: "建立知识分类、治理与更新机制，提升企业信息检索、复用和传承效率", cover: "/application-covers/20-企业知识管理员.png", avatar: "/application-avatars/20-企业知识管理员.png", contextId: "project" },
];

const applicationCatalog: CatalogApplication[] = applicationCatalogSource.map((application) => ({
  ...application,
  cover: getPublicAssetPath(application.cover),
  avatar: getPublicAssetPath(application.avatar),
}));

const applicationSkillTags: Record<CatalogApplication["id"], readonly [string, string, string]> = {
  "senior-developer": ["架构设计", "技术攻坚", "代码评审"],
  "senior-financial-analyst": ["经营分析", "预算预测", "成本管控"],
  "ui-designer": ["界面设计", "交互规范", "设计系统"],
  "fullstack-developer": ["前端开发", "后端服务", "联调上线"],
  "product-planning-expert": ["机会识别", "产品路线", "优先级规划"],
  "data-analyst": ["指标口径", "数据诊断", "决策建议"],
  "project-management-expert": ["进度管理", "资源协调", "风险控制"],
  "senior-legal-advisor": ["合同审查", "合规判断", "风险建议"],
  "hr-manager": ["人才招聘", "绩效管理", "组织发展"],
  "market-strategy-expert": ["市场洞察", "竞争分析", "增长策略"],
  "brand-creative-director": ["品牌策略", "创意方向", "内容审校"],
  "user-research-expert": ["用户访谈", "需求洞察", "可用性测试"],
  "business-development-manager": ["商机识别", "客户沟通", "合作推进"],
  "senior-qa-engineer": ["测试规划", "自动化测试", "质量保障"],
  "operations-architect": ["高可用架构", "可观测性", "故障响应"],
  "cybersecurity-expert": ["威胁识别", "安全防护", "应急响应"],
  "supply-chain-analyst": ["采购分析", "库存优化", "履约管理"],
  "customer-success-manager": ["客户启用", "价值运营", "续约提升"],
  "industry-research-consultant": ["趋势跟踪", "政策分析", "行业判断"],
  "enterprise-knowledge-manager": ["知识分类", "内容治理", "检索复用"],
};

function getApplicationStarterPrompts(application: CatalogApplication) {
  const [primarySkill, secondarySkill, tertiarySkill] = applicationSkillTags[application.id];
  return [
    `请帮我完成一项${primarySkill}任务，并整理清晰的执行步骤`,
    `请分析当前问题，运用${secondarySkill}给出专业建议`,
    `请结合${tertiarySkill}能力，帮我检查并优化现有方案`,
  ];
}

function getProjectStarterPrompts(project: Project) {
  return [
    `请帮我梳理${project.name}当前最需要推进的事项`,
    "请协调群组中的数字员工分析群组项目风险并提出建议",
    "请根据群组项目资料整理下一步分工与执行计划",
  ];
}

const getProjectCatalogApplications = (project: Project) => (project.applicationIds ?? [])
  .map((applicationId) => applicationCatalog.find((application) => application.id === applicationId))
  .filter((application): application is CatalogApplication => Boolean(application))
  .slice(0, 10);

const getProjectMembers = (project: Project) => (project.memberIds ?? [])
  .map((memberId) => projectMembers.find((member) => member.id === memberId))
  .filter((member): member is (typeof projectMembers)[number] => Boolean(member));

const escapeRegularExpression = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMentionedCatalogApplications = (
  value: string,
  applications: CatalogApplication[],
) => {
  if (!value || !applications.length) return [];
  const applicationsByName = new Map(applications.map((application) => [application.name, application]));
  const applicationNames = [...applicationsByName.keys()].sort((left, right) => right.length - left.length);
  const mentionPattern = new RegExp(
    `@(${applicationNames.map(escapeRegularExpression).join("|")})(?=$|\\s|[，。！？、,.!?;；:：])`,
    "g",
  );
  return Array.from(value.matchAll(mentionPattern))
    .map((match) => applicationsByName.get(match[1]))
    .filter((application): application is CatalogApplication => Boolean(application));
};

const catalogApplicationNames = applicationCatalog
  .map((application) => application.name)
  .sort((left, right) => right.length - left.length);
const catalogApplicationNameSet = new Set(catalogApplicationNames);
const catalogMentionPattern = new RegExp(
  `(@(?:${catalogApplicationNames.map(escapeRegularExpression).join("|")})(?=$|\\s|[，。！？、,.!?;；:：]))`,
  "g",
);

function MessageTextWithMentions({ text }: { text: string }) {
  return (
    <p>
      {text.split(catalogMentionPattern).filter(Boolean).map((part, index) => (
        <span
          className={part.startsWith("@") && catalogApplicationNameSet.has(part.slice(1))
            ? "message-mention"
            : undefined}
          key={`${index}-${part}`}
        >
          {part}
        </span>
      ))}
    </p>
  );
}

function NavigationProjectIcon({ project }: { project: Project }) {
  const applications = getProjectCatalogApplications(project);

  if (applications.length === 0) {
    return (
      <span
        className="navigation-project-icon navigation-project-icon-fallback"
        role="img"
        aria-label={project.name}
      >
        <FolderClosed size={20} />
      </span>
    );
  }

  const administrator = applications.find(
    (application) => application.id === project.administratorApplicationId,
  ) ?? applications[0];
  const members = applications.filter((application) => application.id !== administrator.id);
  const visibleApplications = applications.length === 1
    ? [administrator]
    : applications.length === 2
      ? [administrator, members[0]]
      : [members[0], administrator, members[1]];

  return (
    <span
      className="navigation-project-icon navigation-project-icon-group"
      data-count={visibleApplications.length}
      role="img"
      aria-label={`${project.name}的团队组合头像`}
    >
      {visibleApplications.map((application) => (
        <img
          className={application.id === administrator.id ? "is-administrator" : undefined}
          key={application.id}
          src={application.avatar}
          alt=""
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

const getConversationCatalogApplication = (conversation: Conversation) => (
  applicationCatalog.find((application) => application.id === conversation.catalogApplicationId)
  ?? applicationCatalog.find((application) => application.contextId === conversation.applicationId)
);

function getCreatedDigitalEmployees(conversations: Conversation[]) {
  const createdIds = new Set(
    conversations
      .filter((conversation) => conversation.projectId === null)
      .map((conversation) => getConversationCatalogApplication(conversation)?.id)
      .filter((applicationId): applicationId is string => Boolean(applicationId)),
  );
  return applicationCatalog.filter((application) => createdIds.has(application.id));
}

function NavigationConversationIcon({ conversation, size }: { conversation: Conversation; size: number }) {
  const application = getConversationCatalogApplication(conversation);

  if (!application) return <MessageSquare size={size} />;

  return (
    <Tooltip title={application.name} placement="right">
      <img
        className="navigation-application-icon"
        src={application.avatar}
        alt=""
        aria-label={application.name}
        style={{ width: size, height: size }}
      />
    </Tooltip>
  );
}

const formatNavigationUpdatedAt = (updatedAt: string) => {
  const todayTime = updatedAt.match(/^今天\s+(.+)$/);
  if (todayTime) return todayTime[1];
  if (/^昨天(?:\s+.*)?$/.test(updatedAt)) return "昨天";

  const calendarDate = updatedAt.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日$/);
  if (!calendarDate) return updatedAt;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(now.getFullYear(), Number(calendarDate[1]) - 1, Number(calendarDate[2]));
  if (target > today) target = new Date(now.getFullYear() - 1, target.getMonth(), target.getDate());
  const days = Math.max(1, Math.floor((today.getTime() - target.getTime()) / 86_400_000));

  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return `${Math.floor(days / 30)} 月前`;
};

const getNavigationUpdatedAtSortValue = (updatedAt: string, now = new Date()) => {
  const currentTime = now.getTime();
  if (updatedAt === "刚刚") return currentTime;

  const minutesAgo = updatedAt.match(/^(\d+)\s*分钟前$/);
  if (minutesAgo) return currentTime - Number(minutesAgo[1]) * 60_000;

  const hoursAgo = updatedAt.match(/^(\d+)\s*小时前$/);
  if (hoursAgo) return currentTime - Number(hoursAgo[1]) * 3_600_000;

  const daysAgo = updatedAt.match(/^(\d+)\s*天前$/);
  if (daysAgo) return currentTime - Number(daysAgo[1]) * 86_400_000;

  const dayAndTime = updatedAt.match(/^(今天|昨天)(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (dayAndTime) {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dayAndTime[1] === "昨天") target.setDate(target.getDate() - 1);
    target.setHours(Number(dayAndTime[2] ?? 0), Number(dayAndTime[3] ?? 0), 0, 0);
    return dayAndTime[1] === "今天"
      ? Math.min(target.getTime(), currentTime - 1)
      : target.getTime();
  }

  const calendarDate = updatedAt.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日$/);
  if (!calendarDate) return 0;
  const target = new Date(now.getFullYear(), Number(calendarDate[1]) - 1, Number(calendarDate[2]));
  if (target.getTime() > currentTime) target.setFullYear(target.getFullYear() - 1);
  return target.getTime();
};

const getConversationAgeDays = (updatedAt: string) => {
  if (/^(刚刚|\d+\s*分钟(?:前)?|\d+\s*小时(?:前)?|今天(?:\s+.*)?)$/.test(updatedAt)) return 0;
  if (/^昨天(?:\s+.*)?$/.test(updatedAt)) return 1;

  const relativeDays = updatedAt.match(/^(\d+)\s*天前$/);
  if (relativeDays) return Number(relativeDays[1]);

  const calendarDate = updatedAt.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日$/);
  if (!calendarDate) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(now.getFullYear(), Number(calendarDate[1]) - 1, Number(calendarDate[2]));
  if (target > today) target = new Date(now.getFullYear() - 1, target.getMonth(), target.getDate());
  return Math.max(0, Math.floor((today.getTime() - target.getTime()) / 86_400_000));
};

const formatConversationHistoryGroup = (updatedAt: string) => {
  const days = getConversationAgeDays(updatedAt);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days >= 90) return "三个月前";

  const calendarDate = updatedAt.match(/^(\d{1,2})\s*月\s*(\d{1,2})\s*日$/);
  if (calendarDate) return `${Number(calendarDate[1])} 月 ${Number(calendarDate[2])} 日`;

  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
};

const applicationMeta: Record<ApplicationId, { label: string; category: string; description: string }> = {
  project: {
    label: "群组项目全部资料",
    category: "知识检索",
    description: "综合当前可用的对话、文件及资料",
  },
  conversation: {
    label: "当前对话",
    category: "上下文",
    description: "只参考本次对话消息和附件",
  },
  history: {
    label: "历史对话",
    category: "上下文",
    description: "检索当前归属范围内的其他对话",
  },
  files: {
    label: "生成文件",
    category: "内容处理",
    description: "只使用当前可访问的生成文件",
  },
  none: {
    label: "不使用上下文",
    category: "通用",
    description: "仅根据本次输入回答",
  },
};

type WorkspaceRoute =
  | { page: "overview" }
  | { page: "applications" }
  | { page: "project"; projectId: string }
  | { page: "conversation"; projectId: string; conversationId: string }
  | { page: "standalone"; conversationId: string };

const appBasePath = import.meta.env.BASE_URL === "/"
  ? ""
  : import.meta.env.BASE_URL.replace(/\/$/, "");

function getWorkspacePathname(pathname: string) {
  if (!appBasePath) return pathname;
  if (pathname === appBasePath) return "/";
  if (pathname.startsWith(`${appBasePath}/`)) return pathname.slice(appBasePath.length);
  return pathname;
}

function getBrowserPath(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${appBasePath}${normalizedPath}`;
}

function getPublicAssetPath(pathname: string) {
  return `${import.meta.env.BASE_URL}${pathname.replace(/^\/+/, "")}`;
}

function parseWorkspaceRoute(pathname: string): WorkspaceRoute {
  if (/^\/overview\/?$/.test(pathname)) return { page: "overview" };
  if (/^\/apps\/?$/.test(pathname)) return { page: "applications" };
  const standaloneMatch = pathname.match(/^\/conversations\/([^/]+)\/?$/);
  if (standaloneMatch) {
    return {
      page: "standalone",
      conversationId: decodeURIComponent(standaloneMatch[1]),
    };
  }
  const conversationMatch = pathname.match(/^\/projects\/([^/]+)\/conversations\/([^/]+)\/?$/);
  if (conversationMatch) {
    return {
      page: "conversation",
      projectId: decodeURIComponent(conversationMatch[1]),
      conversationId: decodeURIComponent(conversationMatch[2]),
    };
  }
  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/?$/);
  if (projectMatch) {
    return { page: "project", projectId: decodeURIComponent(projectMatch[1]) };
  }
  return { page: "project", projectId: projects[0].id };
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("生成已停止", "AbortError"));
      },
      { once: true },
    );
  });

function getText(content: AppendMessage["content"]) {
  return content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();
}

function getStoredMessageText(message: DemoMessage) {
  if (typeof message.content === "string") return message.content;
  return message.content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();
}

function createMockAnswer(
  prompt: string,
  files: SelectedFile[],
  applicationId: ApplicationId,
  responderName?: string,
) {
  if (prompt.includes("失败")) {
    return "模拟请求失败：当前演示已展示可恢复错误状态。请修改问题后重试，或使用消息下方的重新生成操作。";
  }
  const fileLine = files.length
    ? `\n\n已收到 ${files.length} 个本地附件：${files.map((file) => file.name).join("、")}。当前演示只显示附件，不上传文件。`
    : "";
  const contextLine =
    applicationId === "none"
      ? "当前应用：不使用上下文。"
      : `当前应用：${applicationMeta[applicationId].label}。`;
  const responderLine = responderName ? `本轮由${responderName}处理。\n\n` : "";
  return `${responderLine}${contextLine}\n\n我已处理“${prompt}”。建议先确认目标、时间边界和可用资料，再执行具体动作。正式接入 Argus 后，这里会显示真实 Agent 的流式回答、工具进度、知识引用与审批结果。${fileLine}`;
}

function createMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
  catalogApplicationId?: string | null,
): DemoMessage {
  return {
    id,
    role,
    content: [{ type: "text", text }],
    createdAt: new Date(),
    ...(role === "assistant" && catalogApplicationId
      ? { metadata: { custom: { catalogApplicationId } } }
      : {}),
  };
}

function createConversationTitle(prompt: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  return normalized.length > 22 ? `${normalized.slice(0, 22)}…` : normalized || "新对话";
}

function isUnsentConversationDraft(conversation: Conversation) {
  return conversation.title === "新对话" && conversation.messages.length === 0;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem("argus-sidebar-collapsed") === "true",
  );

  useEffect(() => {
    window.localStorage.setItem("argus-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <ConfigProvider button={{ autoInsertSpace: false }} locale={zhCN} theme={createTheme(darkMode)}>
      <AntApp>
        <ConversationWorkspace
          darkMode={darkMode}
          mobileNavigationOpen={mobileNavigationOpen}
          sidebarCollapsed={sidebarCollapsed}
          onDarkModeChange={setDarkMode}
          onMobileNavigationChange={setMobileNavigationOpen}
          onSidebarCollapsedChange={setSidebarCollapsed}
        />
      </AntApp>
    </ConfigProvider>
  );
}

type ConversationWorkspaceProps = {
  darkMode: boolean;
  mobileNavigationOpen: boolean;
  sidebarCollapsed: boolean;
  onDarkModeChange: (value: boolean) => void;
  onMobileNavigationChange: (value: boolean) => void;
  onSidebarCollapsedChange: (value: boolean) => void;
};

function ConversationWorkspace({
  darkMode,
  mobileNavigationOpen,
  sidebarCollapsed,
  onDarkModeChange,
  onMobileNavigationChange,
  onSidebarCollapsedChange,
}: ConversationWorkspaceProps) {
  const { message: antMessage, modal } = AntApp.useApp();
  const { token: themeToken } = antdTheme.useToken();
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const [conversations, setConversations] = useState(initialConversations);
  const [skillInstallations, setSkillInstallations] = useState<SkillInstallation[]>(readSkillInstallations);
  const [pathname, setPathname] = useState(() => {
    const initialLocation = getWorkspacePathname(window.location.pathname);
    if (initialLocation === "/") {
      const initialPath = "/overview";
      window.history.replaceState(null, "", getBrowserPath(initialPath));
      return initialPath;
    }
    return initialLocation;
  });
  const [conversationTasks, setConversationTasks] = useState<Record<string, ConversationTaskState>>({});
  const [viewedTaskVersions, setViewedTaskVersions] = useState<Record<string, number>>({});
  const [taskOverlay, setTaskOverlay] = useState<"current" | "global" | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [pendingConversationTarget, setPendingConversationTarget] = useState<PendingConversationTarget | null>(null);
  const [projectWorkspaceTool, setProjectWorkspaceTool] = useState<ProjectWorkspaceTool | null>(null);
  const [runStageSelection, setRunStageSelection] = useState<RunStageSelection | null>(null);
  const [projectFileToOpenId, setProjectFileToOpenId] = useState<string | null>(null);
  const taskControllersRef = useRef(new Map<string, AbortController>());
  const globalTaskViewSnapshotRef = useRef<ConversationTaskState[]>([]);
  const composerPromptRef = useRef<((prompt: string) => void) | null>(null);

  useEffect(() => {
    window.localStorage.setItem(SKILL_INSTALLATIONS_STORAGE_KEY, JSON.stringify(skillInstallations));
  }, [skillInstallations]);

  const installSkill = useCallback((
    skill: SkillDefinition,
    targetType: SkillInstallationTargetType,
    targetId: string,
    targetName: string,
  ) => {
    if (isSkillInstalledAtTarget(skillInstallations, skill.id, targetType, targetId)) return;
    setSkillInstallations((current) => [
      ...current,
      { skillId: skill.id, targetType, targetId },
    ]);
    antMessage.success(`${skill.name}已安装到${targetName}`);
  }, [antMessage, skillInstallations]);

  useEffect(() => {
    const handlePopState = () => setPathname(getWorkspacePathname(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateTo = useCallback((nextPath: string) => {
    if (nextPath === getWorkspacePathname(window.location.pathname)) return;
    window.history.pushState(null, "", getBrowserPath(nextPath));
    setPathname(nextPath);
  }, []);

  const route = parseWorkspaceRoute(pathname);
  const isStandaloneConversation = route.page === "standalone";
  const projectHomeVisible = false;
  const projectFilesOpen = projectWorkspaceTool === "files";
  const setProjectFilesOpen = useCallback((open: boolean) => {
    setProjectWorkspaceTool(open ? "files" : null);
  }, []);

  useEffect(() => {
    if (route.page !== "conversation" && route.page !== "standalone") setProjectWorkspaceTool(null);
  }, [route.page]);

  const activeProject =
    projectList.find(
      (project) =>
        (route.page === "project" || route.page === "conversation") &&
        project.id === route.projectId,
    ) ?? projectList[0];
  const standaloneConversations = conversations.filter((conversation) => conversation.projectId === null);
  const projectConversations = conversations.filter(
    (conversation) => conversation.projectId === activeProject.id,
  );
  const projectConversationHistory = [...projectConversations].sort(
    (left, right) => (
      getNavigationUpdatedAtSortValue(right.updatedAt)
      - getNavigationUpdatedAtSortValue(left.updatedAt)
    ),
  );
  const activeConversation =
    (route.page === "standalone"
      ? conversations.find(
          (conversation) => conversation.id === route.conversationId && conversation.projectId === null,
        )
      : route.page === "conversation"
        ? conversations.find(
            (conversation) =>
              conversation.id === route.conversationId && conversation.projectId === activeProject.id,
          )
        : projectConversationHistory[0]) ?? conversations[0];
  const activeConversationId = activeConversation.id;
  useEffect(() => {
    if (isUnsentConversationDraft(activeConversation)) setProjectWorkspaceTool(null);
  }, [activeConversation]);
  const activeAgent = agents.find((agent) => agent.id === activeConversation.agentId) ?? agents[0];
  const activeProjectCatalogApplications = getProjectCatalogApplications(activeProject);
  const activeProjectAdministratorApplication = activeProjectCatalogApplications.find(
    (application) => application.id === activeProject.administratorApplicationId,
  ) ?? activeProjectCatalogApplications[0];
  const selectableCatalogApplications = isStandaloneConversation
    ? applicationCatalog
    : activeProjectCatalogApplications;
  const activePendingConversationTarget = pendingConversationTarget?.conversationId === activeConversationId
    ? pendingConversationTarget
    : null;
  const pendingTargetApplication = activePendingConversationTarget?.type === "application"
    ? applicationCatalog.find((application) => application.id === activePendingConversationTarget.targetId)
    : undefined;
  const pendingTargetProject = activePendingConversationTarget?.type === "project"
    ? projectList.find((project) => project.id === activePendingConversationTarget.targetId)
    : undefined;
  const pendingTargetProjectApplications = pendingTargetProject
    ? getProjectCatalogApplications(pendingTargetProject)
    : [];
  const pendingTargetProjectAdministrator = pendingTargetProjectApplications.find(
    (application) => application.id === pendingTargetProject?.administratorApplicationId,
  ) ?? pendingTargetProjectApplications[0];
  const activeCatalogApplicationId = isStandaloneConversation
    ? activeConversation.catalogApplicationId
      ?? applicationCatalog.find((application) => application.contextId === activeConversation.applicationId)?.id
      ?? null
    : activeConversation.catalogApplicationId
      ?? activeProjectCatalogApplications.find((application) => application.contextId === activeConversation.applicationId)?.id
      ?? activeProjectCatalogApplications[0]?.id
      ?? null;
  const activeStandaloneApplication = isStandaloneConversation
    ? applicationCatalog.find((application) => application.id === activeCatalogApplicationId)
    : undefined;
  const activeStandaloneApplicationName = activeStandaloneApplication?.name ?? "";
  const activeStandaloneApplicationConversations = activeStandaloneApplication
    ? standaloneConversations
        .filter((conversation) => (
          getConversationCatalogApplication(conversation)?.id === activeStandaloneApplication.id
        ))
        .sort(
          (left, right) => (
            getNavigationUpdatedAtSortValue(right.updatedAt)
            - getNavigationUpdatedAtSortValue(left.updatedAt)
          ),
        )
    : [];
  const taskList = useMemo(() => Object.values(conversationTasks), [conversationTasks]);
  const activeTask = conversationTasks[activeConversationId];
  const activeTaskIslandStatus: TaskIslandStatus = activeTask?.status ?? "idle";
  const activeRuntimeError = activeTask?.status === "error" ? activeTask.errorMessage : null;

  useEffect(() => {
    setPendingConversationTarget((current) => (
      current && current.conversationId !== activeConversationId ? null : current
    ));
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeTask) return;
    setViewedTaskVersions((current) => (
      current[activeConversationId] === activeTask.updatedAt
        ? current
        : { ...current, [activeConversationId]: activeTask.updatedAt }
    ));
  }, [activeConversationId, activeTask?.updatedAt]);

  const changeTaskOverlay = (nextOverlay: "current" | "global" | null) => {
    if (taskOverlay === "global" && nextOverlay !== "global") {
      const viewedTasks = globalTaskViewSnapshotRef.current;
      if (viewedTasks.length) {
        setViewedTaskVersions((current) => {
          const next = { ...current };
          viewedTasks.forEach((task) => {
            next[task.conversationId] = task.updatedAt;
          });
          return next;
        });
      }
      globalTaskViewSnapshotRef.current = [];
    }

    if (nextOverlay === "global" && taskOverlay !== "global") {
      globalTaskViewSnapshotRef.current = taskList.filter((task) => (
        task.conversationId !== activeConversationId
        && viewedTaskVersions[task.conversationId] !== task.updatedAt
      ));
    }

    setTaskOverlay(nextOverlay);
  };

  const discardActiveEmptyConversation = (nextConversationId?: string) => {
    if (
      activeConversation.id === nextConversationId
      || activeConversation.title !== "新对话"
      || activeConversation.messages.length > 0
    ) return;
    setConversations((current) => current.filter((conversation) => conversation.id !== activeConversation.id));
  };

  useEffect(() => {
    if (
      route.page === "standalone" &&
      activeConversation.projectId === null &&
      route.conversationId !== activeConversation.id
    ) {
      const nextPath = `/conversations/${activeConversation.id}`;
      window.history.replaceState(null, "", nextPath);
      setPathname(nextPath);
    }
  }, [activeConversation.id, activeConversation.projectId, route]);

  const updateConversationMessages = useCallback(
    (conversationId: string, updater: (messages: DemoMessage[]) => DemoMessage[]) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, messages: updater(conversation.messages), updatedAt: "刚刚" }
            : conversation,
        ),
      );
    },
    [],
  );

  const runMockAgents = useCallback(
    async (
      conversationId: string,
      prompt: string,
      files: SelectedFile[],
      baseMessages: DemoMessage[],
      responders: Array<{
        applicationId: ApplicationId;
        catalogApplicationId?: string | null;
        name?: string;
      }>,
      taskTarget?: { project?: Project; application?: CatalogApplication },
    ) => {
      if (!responders.length) return;
      taskControllersRef.current.get(conversationId)?.abort();
      const controller = new AbortController();
      taskControllersRef.current.set(conversationId, controller);
      const targetConversation = conversations.find((conversation) => conversation.id === conversationId);
      const targetProject = taskTarget?.project ?? (targetConversation?.projectId
        ? projectList.find((project) => project.id === targetConversation.projectId)
        : null);
      const targetApplication = taskTarget?.application ?? (targetConversation
        ? getConversationCatalogApplication(targetConversation)
        : null);
      const taskParticipants: ConversationTaskParticipant[] = responders.map((responder, index) => {
        const catalogApplication = applicationCatalog.find(
          (application) => application.id === responder.catalogApplicationId,
        );
        return {
          applicationId: catalogApplication?.id ?? responder.catalogApplicationId ?? `${responder.applicationId}-${index}`,
          name: responder.name ?? catalogApplication?.name ?? targetApplication?.name ?? "数字员工",
          avatar: catalogApplication?.avatar,
          status: index === 0 ? "running" : "queued",
        };
      });
      const taskIdentity = {
        conversationId,
        title: createConversationTitle(prompt),
        ownerName: taskParticipants[0]?.name ?? targetApplication?.name ?? "数字员工",
        targetType: targetProject ? "project" as const : "digital-employee" as const,
        targetId: targetProject?.id ?? targetApplication?.id ?? conversationId,
        participants: taskParticipants,
      };
      setConversationTasks((current) => ({
        ...current,
        [conversationId]: { ...taskIdentity, status: "running", updatedAt: Date.now() },
      }));
      let accumulatedMessages = [...baseMessages];
      let activeResponderIndex = 0;

      try {
        const responseBatchId = Date.now();
        for (const [responderIndex, responder] of responders.entries()) {
          activeResponderIndex = responderIndex;
          const stagedParticipants = taskParticipants.map((participant, index) => ({
            ...participant,
            status: index < responderIndex
              ? "success" as const
              : index === responderIndex
                ? "running" as const
                : "queued" as const,
          }));
          setConversationTasks((current) => ({
            ...current,
            [conversationId]: {
              ...taskIdentity,
              ownerName: stagedParticipants[responderIndex]?.name ?? taskIdentity.ownerName,
              participants: stagedParticipants,
              status: "running",
              updatedAt: Date.now(),
            },
          }));
          const assistantId = `assistant-${responseBatchId}-${responderIndex}`;
          const fullAnswer = createMockAnswer(
            prompt,
            files,
            responder.applicationId,
            responder.name,
          );
          accumulatedMessages = [
            ...accumulatedMessages,
            createMessage(assistantId, "assistant", "", responder.catalogApplicationId),
          ];
          updateConversationMessages(conversationId, () => accumulatedMessages);

          for (let index = 1; index <= fullAnswer.length; index += 2) {
            await sleep(24, controller.signal);
            const text = fullAnswer.slice(0, index + 1);
            accumulatedMessages = accumulatedMessages.map((item) =>
              item.id === assistantId
                ? { ...item, content: [{ type: "text", text }] }
                : item,
            );
            updateConversationMessages(conversationId, () => accumulatedMessages);
          }
        }
        if (prompt.includes("失败")) {
          const failedParticipants = taskParticipants.map((participant, index) => ({
            ...participant,
            status: index < activeResponderIndex
              ? "success" as const
              : index === activeResponderIndex
                ? "error" as const
                : "queued" as const,
          }));
          setConversationTasks((current) => ({
            ...current,
            [conversationId]: {
              ...taskIdentity,
              ownerName: failedParticipants[activeResponderIndex]?.name ?? taskIdentity.ownerName,
              participants: failedParticipants,
              status: "error",
              updatedAt: Date.now(),
              errorMessage: "演示请求返回失败状态；会话内容已经保留，可以直接重试。",
            },
          }));
        } else if (prompt.includes("确认") || prompt.includes("审批")) {
          const waitingParticipants = taskParticipants.map((participant, index) => ({
            ...participant,
            status: index < activeResponderIndex
              ? "success" as const
              : index === activeResponderIndex
                ? "waiting" as const
                : "queued" as const,
          }));
          setConversationTasks((current) => ({
            ...current,
            [conversationId]: {
              ...taskIdentity,
              ownerName: waitingParticipants[activeResponderIndex]?.name ?? taskIdentity.ownerName,
              participants: waitingParticipants,
              status: "waiting",
              updatedAt: Date.now(),
            },
          }));
        } else {
          const completedParticipants = taskParticipants.map((participant) => ({
            ...participant,
            status: "success" as const,
          }));
          setConversationTasks((current) => ({
            ...current,
            [conversationId]: {
              ...taskIdentity,
              ownerName: completedParticipants.at(-1)?.name ?? taskIdentity.ownerName,
              participants: completedParticipants,
              status: "success",
              updatedAt: Date.now(),
            },
          }));
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          if (taskControllersRef.current.get(conversationId) === controller) {
            setConversationTasks((current) => {
              const next = { ...current };
              delete next[conversationId];
              return next;
            });
          }
        } else {
          const failedParticipants = taskParticipants.map((participant, index) => ({
            ...participant,
            status: index < activeResponderIndex
              ? "success" as const
              : index === activeResponderIndex
                ? "error" as const
                : "queued" as const,
          }));
          setConversationTasks((current) => ({
            ...current,
            [conversationId]: {
              ...taskIdentity,
              ownerName: failedParticipants[activeResponderIndex]?.name ?? taskIdentity.ownerName,
              participants: failedParticipants,
              status: "error",
              updatedAt: Date.now(),
              errorMessage: error instanceof Error ? error.message : "生成失败，请重试。",
            },
          }));
        }
      } finally {
        if (taskControllersRef.current.get(conversationId) === controller) {
          taskControllersRef.current.delete(conversationId);
        }
      }
    },
    [conversations, projectList, updateConversationMessages],
  );

  const resumeWaitingTask = useCallback(async (conversationId: string) => {
    const waitingTask = conversationTasks[conversationId];
    if (!waitingTask || waitingTask.status !== "waiting") return;
    taskControllersRef.current.get(conversationId)?.abort();
    const controller = new AbortController();
    taskControllersRef.current.set(conversationId, controller);
    const waitingParticipantIndex = waitingTask.participants.findIndex(
      (participant) => participant.status === "waiting",
    );
    const resumedParticipants = waitingTask.participants.map((participant, index) => ({
      ...participant,
      status: index === waitingParticipantIndex ? "running" as const : participant.status,
    }));
    setConversationTasks((current) => ({
      ...current,
      [conversationId]: {
        ...waitingTask,
        participants: resumedParticipants,
        status: "running",
        updatedAt: Date.now(),
      },
    }));
    try {
      await sleep(1200, controller.signal);
      const completedParticipants = resumedParticipants.map((participant) => ({
        ...participant,
        status: "success" as const,
      }));
      setConversationTasks((current) => ({
        ...current,
        [conversationId]: {
          ...waitingTask,
          ownerName: completedParticipants.at(-1)?.name ?? waitingTask.ownerName,
          participants: completedParticipants,
          status: "success",
          updatedAt: Date.now(),
        },
      }));
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setConversationTasks((current) => ({
          ...current,
          [conversationId]: {
            ...waitingTask,
            status: "error",
            updatedAt: Date.now(),
            errorMessage: error instanceof Error ? error.message : "继续执行失败，请重试。",
          },
        }));
      }
    } finally {
      if (taskControllersRef.current.get(conversationId) === controller) {
        taskControllersRef.current.delete(conversationId);
      }
    }
  }, [conversationTasks]);

  const getPromptResponders = useCallback((prompt: string) => {
      const effectiveProjectApplications = pendingTargetProject
        ? pendingTargetProjectApplications
        : activeProjectCatalogApplications;
      const projectMode = Boolean(pendingTargetProject) || !isStandaloneConversation;
      const mentionedApplications = projectMode
        ? getMentionedCatalogApplications(prompt, effectiveProjectApplications)
        : [];
      const fallbackApplication = pendingTargetApplication
        ?? pendingTargetProjectAdministrator
        ?? (isStandaloneConversation
          ? applicationCatalog.find((application) => application.id === activeCatalogApplicationId)
          : activeProjectAdministratorApplication);
      return mentionedApplications.length
        ? mentionedApplications.map((application) => ({
            applicationId: application.contextId,
            catalogApplicationId: application.id,
            name: application.name,
          }))
        : fallbackApplication
          ? [{
              applicationId: fallbackApplication.contextId,
              catalogApplicationId: fallbackApplication.id,
              name: fallbackApplication.name,
            }]
          : activeConversation.applicationId
            ? [{ applicationId: activeConversation.applicationId }]
            : [];
    }, [
      activeCatalogApplicationId,
      activeConversation.applicationId,
      activeProjectAdministratorApplication,
      activeProjectCatalogApplications,
      isStandaloneConversation,
      pendingTargetApplication,
      pendingTargetProject,
      pendingTargetProjectAdministrator,
      pendingTargetProjectApplications,
    ]);

  const sendPrompt = useCallback(
    async (prompt: string, content?: AppendMessage["content"]) => {
      if (!prompt && selectedFiles.length === 0) return;
      const responders = getPromptResponders(prompt);
      if (!responders.length) {
        antMessage.warning("请先选择数字员工或群组项目");
        return;
      }
      const conversationId = activeConversation.id;
      const userMessage = createMessage(
        `user-${Date.now()}`,
        "user",
        prompt || `上传了 ${selectedFiles.length} 个附件`,
      );
      const nextMessages = [
        ...activeConversation.messages,
        { ...userMessage, content: content?.length ? content : userMessage.content },
      ] as DemoMessage[];
      const pendingProjectAgent = pendingTargetProject
        ? (
            agents.find((item) => pendingTargetProject.agentIds?.includes(item.id))
            ?? agents.find((item) => (
              pendingTargetProject.id === "project-contract"
                ? item.id === "agent-contract"
                : pendingTargetProject.id === "project-growth"
                  ? item.id === "agent-analysis"
                  : item.id === "agent-equipment"
            ))
            ?? agents[0]
          )
        : null;
      setConversations((current) => current.map((conversation) => (
        conversation.id === conversationId
          ? {
              ...conversation,
              ...(pendingTargetApplication
                ? {
                    projectId: null,
                    agentId: agents[0].id,
                    applicationId: pendingTargetApplication.contextId,
                    catalogApplicationId: pendingTargetApplication.id,
                  }
                : pendingTargetProject
                  ? {
                      projectId: pendingTargetProject.id,
                      agentId: pendingProjectAgent?.id ?? conversation.agentId,
                      applicationId: pendingTargetProjectAdministrator?.contextId ?? "project",
                      catalogApplicationId: pendingTargetProjectAdministrator?.id ?? null,
                    }
                  : {}),
              messages: nextMessages,
              title: conversation.title === "新对话"
                ? createConversationTitle(prompt || `上传了 ${selectedFiles.length} 个附件`)
                : conversation.title,
              updatedAt: "刚刚",
            }
          : conversation
      )));
      if (pendingTargetApplication) {
        navigateTo(`/conversations/${conversationId}`);
        setPendingConversationTarget(null);
      } else if (pendingTargetProject) {
        navigateTo(`/projects/${pendingTargetProject.id}/conversations/${conversationId}`);
        setPendingConversationTarget(null);
      }
      const files = [...selectedFiles];
      setSelectedFiles([]);
      await runMockAgents(
        conversationId,
        prompt || "请分析附件",
        files,
        nextMessages,
        responders,
        pendingTargetApplication || pendingTargetProject
          ? {
              project: pendingTargetProject,
              application: pendingTargetApplication ?? pendingTargetProjectAdministrator,
            }
          : undefined,
      );
    },
    [
      activeConversation,
      antMessage,
      getPromptResponders,
      navigateTo,
      pendingTargetApplication,
      pendingTargetProject,
      pendingTargetProjectAdministrator,
      runMockAgents,
      selectedFiles,
    ],
  );

  const handleNewMessage = useCallback(
    async (message: AppendMessage) => {
      await sendPrompt(getText(message.content), message.content);
    },
    [sendPrompt],
  );

  const handleReload = useCallback(
    async (parentId: string | null) => {
      const parentIndex = activeConversation.messages.findIndex((item) => item.id === parentId);
      const baseMessages = activeConversation.messages.slice(0, parentIndex + 1);
      const userMessage = [...baseMessages].reverse().find((item) => item.role === "user");
      const prompt = userMessage ? getStoredMessageText(userMessage) : "";
      if (!prompt || !activeConversation.applicationId) return;
      const responders = getPromptResponders(prompt);
      if (!responders.length) return;
      await runMockAgents(
        activeConversation.id,
        prompt,
        [],
        baseMessages,
        responders,
      );
    },
    [activeConversation, getPromptResponders, runMockAgents],
  );

  const handleEdit = useCallback(
    async (message: AppendMessage) => {
      const targetIndex = activeConversation.messages.findIndex((item) => item.id === message.parentId);
      const text = getText(message.content);
      if (targetIndex < 0 || !text || !activeConversation.applicationId) return;
      const nextMessages = [
        ...activeConversation.messages.slice(0, targetIndex),
        {
          ...activeConversation.messages[targetIndex],
          content: message.content,
          createdAt: new Date(),
        },
      ] as DemoMessage[];
      updateConversationMessages(activeConversation.id, () => nextMessages);
      const responders = getPromptResponders(text);
      if (!responders.length) return;
      await runMockAgents(
        activeConversation.id,
        text,
        [],
        nextMessages,
        responders,
      );
    },
    [activeConversation, getPromptResponders, runMockAgents, updateConversationMessages],
  );

  const runtime = useExternalStoreRuntime<DemoMessage>({
    messages: activeConversation.messages,
    isRunning: activeTask?.status === "running",
    convertMessage: (item) => item,
    setMessages: (items) =>
      updateConversationMessages(activeConversation.id, () => [...items] as DemoMessage[]),
    onNew: handleNewMessage,
    onEdit: handleEdit,
    onReload: handleReload,
    onCancel: async () => taskControllersRef.current.get(activeConversation.id)?.abort(),
  });

  const switchConversation = (conversationId: string) => {
    const conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    changeTaskOverlay(null);
    discardActiveEmptyConversation(conversationId);
    setSelectedFiles([]);
    if (conversation.projectId === null) {
      navigateTo(`/conversations/${conversation.id}`);
    } else {
      navigateTo(`/projects/${conversation.projectId}/conversations/${conversation.id}`);
    }
    onMobileNavigationChange(false);
  };

  const openProject = (projectId: string) => {
    changeTaskOverlay(null);
    const firstConversation = conversations
      .filter((conversation) => conversation.projectId === projectId)
      .sort(
        (left, right) => (
          getNavigationUpdatedAtSortValue(right.updatedAt)
          - getNavigationUpdatedAtSortValue(left.updatedAt)
        ),
      )[0];
    discardActiveEmptyConversation(firstConversation?.id);
    setSelectedFiles([]);
    if (firstConversation) {
      navigateTo(`/projects/${projectId}/conversations/${firstConversation.id}`);
    } else {
      createProjectConversation(projectId);
    }
    onMobileNavigationChange(false);
  };

  const openApplications = () => {
    changeTaskOverlay(null);
    discardActiveEmptyConversation();
    setSelectedFiles([]);
    navigateTo("/apps");
    onMobileNavigationChange(false);
  };

  const openOverview = () => {
    changeTaskOverlay(null);
    discardActiveEmptyConversation();
    setSelectedFiles([]);
    navigateTo("/overview");
    onMobileNavigationChange(false);
  };

  const createProject = (
    name: string,
    applicationIds: string[],
    administratorApplicationId: string,
    description: string,
  ) => {
    const timestamp = Date.now();
    const project: Project = {
      id: `project-${timestamp}`,
      name,
      code: `PROJECT-${String(timestamp).slice(-4)}`,
      description: description.trim() || "集中管理群组项目对话、数字员工与工作资料。",
      applicationIds,
      administratorApplicationId,
    };
    discardActiveEmptyConversation();
    setProjectList((current) => [...current, project]);
    createProjectConversation(project.id, "", [], "project", null, project);
    antMessage.success("群组项目已创建");
  };

  const createProjectConversation = (
    projectId = activeProject.id,
    initialPrompt = "",
    initialFiles: SelectedFile[] = [],
    applicationId: ApplicationId = "project",
    catalogApplicationId: string | null = null,
    projectOverride?: Project,
  ) => {
    const project = projectOverride ?? projectList.find((item) => item.id === projectId) ?? projectList[0];
    const projectAgent =
      agents.find((item) => project.agentIds?.includes(item.id)) ??
      agents.find((item) =>
        project.id === "project-contract"
          ? item.id === "agent-contract"
          : project.id === "project-growth"
            ? item.id === "agent-analysis"
            : item.id === "agent-equipment",
      ) ?? agents[0];
    const prompt = initialPrompt.trim();
    const timestamp = Date.now();
    const initialMessages = prompt
      ? [createMessage(`user-${timestamp}`, "user", prompt)]
      : [];
    const conversation: Conversation = {
      id: `conversation-${timestamp}`,
      projectId: project.id,
      agentId: projectAgent.id,
      applicationId: prompt || catalogApplicationId ? applicationId : null,
      catalogApplicationId,
      title: createConversationTitle(prompt),
      updatedAt: "刚刚",
      messages: initialMessages,
    };
    discardActiveEmptyConversation(conversation.id);
    setConversations((current) => [conversation, ...current]);
    setSelectedFiles([]);
    navigateTo(`/projects/${project.id}/conversations/${conversation.id}`);
    onMobileNavigationChange(false);
    if (prompt) {
      const responderApplication = applicationCatalog.find(
        (application) => application.id === catalogApplicationId,
      );
      void runMockAgents(
        conversation.id,
        prompt,
        initialFiles,
        initialMessages,
        [{
          applicationId,
          catalogApplicationId,
          name: responderApplication?.name,
        }],
        { project, application: responderApplication },
      );
    }
  };

  const createStandaloneConversation = (
    applicationId: ApplicationId | null = null,
    catalogApplicationId: string | null = null,
  ) => {
    const conversation: Conversation = {
      id: `conversation-${Date.now()}`,
      projectId: null,
      agentId: agents[0].id,
      applicationId,
      catalogApplicationId,
      title: "新对话",
      updatedAt: "刚刚",
      messages: [],
    };
    discardActiveEmptyConversation(conversation.id);
    setConversations((current) => [conversation, ...current]);
    setSelectedFiles([]);
    navigateTo(`/conversations/${conversation.id}`);
    onMobileNavigationChange(false);
  };

  const launchStandaloneApplication = (application: CatalogApplication) => {
    createStandaloneConversation(application.contextId, application.id);
    antMessage.success(`${application.name}已创建`);
  };

  const selectCatalogApplication = (catalogApplicationId: string) => {
    const application = selectableCatalogApplications.find((item) => item.id === catalogApplicationId);
    if (!application) return;
    if (catalogApplicationId === activeCatalogApplicationId) return;

    if (activeConversation.messages.length > 0) {
      if (isStandaloneConversation) {
        createStandaloneConversation(application.contextId, application.id);
      } else {
        createProjectConversation(
          activeProject.id,
          "",
          [],
          application.contextId,
          application.id,
        );
      }
      antMessage.info(`已使用${application.name}创建新对话`);
      return;
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversation.id
          ? { ...conversation, applicationId: application.contextId, catalogApplicationId }
          : conversation,
      ),
    );
  };

  const selectConversationTargetApplication = (catalogApplicationId: string) => {
    const application = getCreatedDigitalEmployees(conversations).find(
      (item) => item.id === catalogApplicationId,
    );
    if (!application) return;
    setPendingConversationTarget({
      conversationId: activeConversation.id,
      type: "application",
      targetId: application.id,
    });
  };

  const selectConversationTargetProject = (projectId: string) => {
    const project = projectList.find((item) => item.id === projectId);
    if (!project) return;
    setPendingConversationTarget({
      conversationId: activeConversation.id,
      type: "project",
      targetId: project.id,
    });
  };

  const renameConversation = (conversation: Conversation) => {
    let nextTitle = conversation.title;
    modal.confirm({
      title: "重命名对话",
      content: (
        <Input
          autoFocus
          defaultValue={conversation.title}
          maxLength={40}
          onChange={(event) => {
            nextTitle = event.target.value.trim();
          }}
        />
      ),
      okText: "保存",
      cancelText: "取消",
      onOk: () => {
        if (!nextTitle) throw new Error("请输入对话名称");
        setConversations((current) =>
          current.map((item) =>
            item.id === conversation.id ? { ...item, title: nextTitle } : item,
          ),
        );
        antMessage.success("对话名称已更新");
      },
    });
  };

  const renameProject = (project: Project) => {
    let nextName = project.name;
    modal.confirm({
      title: "重命名群组项目",
      content: (
        <Input
          autoFocus
          defaultValue={project.name}
          maxLength={30}
          showCount
          aria-label="群组项目名称"
          onChange={(event) => {
            nextName = event.target.value.trim();
          }}
        />
      ),
      okText: "保存",
      cancelText: "取消",
      onOk: () => {
        if (!nextName) {
          antMessage.warning("请输入群组项目名称");
          return Promise.reject();
        }
        setProjectList((current) =>
          current.map((item) => item.id === project.id ? { ...item, name: nextName } : item),
        );
        antMessage.success("群组项目名称已更新");
      },
    });
  };

  const archiveProject = (project: Project) => {
    modal.confirm({
      title: `归档“${project.name}”？`,
      content: "归档后，群组项目及其对话会从当前群组项目列表中隐藏，之后仍可在归档群组项目中恢复。",
      okText: "归档",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => antMessage.success("群组项目已归档"),
    });
  };

  const editProject = (project: Project) => {
    let nextName = project.name;
    modal.confirm({
      title: "编辑群组项目",
      content: (
        <div className="project-edit-form">
          <label>
            <span>群组项目名称</span>
            <Input
              autoFocus
              defaultValue={project.name}
              maxLength={30}
              aria-label="群组项目名称"
              onChange={(event) => {
                nextName = event.target.value.trim();
              }}
            />
          </label>
        </div>
      ),
      okText: "保存",
      cancelText: "取消",
      onOk: () => {
        if (!nextName) {
          antMessage.warning("请输入群组项目名称");
          return Promise.reject();
        }
        setProjectList((current) => current.map((item) => (
          item.id === project.id
            ? { ...item, name: nextName }
            : item
        )));
        antMessage.success("群组项目已更新");
      },
    });
  };

  const deleteConversation = (conversation: Conversation) => {
    modal.confirm({
      title: "删除对话记录？",
      content: `将删除“${conversation.title}”及其本地演示消息，此操作不可撤销。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        const standaloneFallback = standaloneConversations.find((item) => item.id !== conversation.id);
        taskControllersRef.current.get(conversation.id)?.abort();
        taskControllersRef.current.delete(conversation.id);
        setConversationTasks((current) => {
          const next = { ...current };
          delete next[conversation.id];
          return next;
        });
        setConversations((current) => {
          const remaining = current.filter((item) => item.id !== conversation.id);
          if (conversation.id === activeConversationId) {
            navigateTo(
              conversation.projectId === null && standaloneFallback
                ? `/conversations/${standaloneFallback.id}`
                : `/projects/${conversation.projectId ?? projectList[0].id}`,
            );
          }
          return remaining;
        });
      },
    });
  };

  const beforeUpload: UploadProps["beforeUpload"] = (file) => {
    setSelectedFiles((current) => [...current, file as SelectedFile]);
    return false;
  };

  const navigation = (
    <ConversationNavigation
      activeConversationId={activeConversationId}
      activeProjectId={activeProject.id}
      applicationsPageActive={route.page === "applications"}
      newConversationActive={isStandaloneConversation && isUnsentConversationDraft(activeConversation)}
      overviewPageActive={route.page === "overview"}
      darkMode={darkMode}
      isStandaloneConversation={isStandaloneConversation}
      projectNavigationActive={route.page === "project" || route.page === "conversation"}
      conversations={conversations}
      conversationTasks={taskList}
      viewedTaskVersions={viewedTaskVersions}
      projects={projectList}
      onCreateProject={createProject}
      onCreateStandaloneConversation={createStandaloneConversation}
      onDelete={deleteConversation}
      onDarkModeChange={onDarkModeChange}
      onApplicationsOpen={openApplications}
      onOverviewOpen={openOverview}
      onProjectSelect={openProject}
      onPrototypeAction={(label) => antMessage.info(`${label}为结构演示入口，正式版将接入 Argus 对应能力。`)}
      onArchiveProject={archiveProject}
      onRename={renameConversation}
      onRenameProject={renameProject}
      onSelect={switchConversation}
      collapsed={sidebarCollapsed}
      onSidebarExpand={() => onSidebarCollapsedChange(false)}
      onSidebarClose={() => {
        if (window.matchMedia("(max-width: 900px)").matches) {
          onMobileNavigationChange(false);
        } else {
          onSidebarCollapsedChange(true);
        }
      }}
    />
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Layout
        className="app-shell"
        data-theme={darkMode ? "dark" : "light"}
        style={{
          fontFamily: themeToken.fontFamily,
          "--ant-font-weight-strong": themeToken.fontWeightStrong,
        } as React.CSSProperties}
      >
        <div className="workspace-frame">
          <aside
            className={sidebarCollapsed ? "desktop-navigation is-collapsed" : "desktop-navigation"}
            aria-label="主导航"
          >
            {navigation}
          </aside>

          <main className="workspace-main">
            <Button
              className="mobile-menu-button"
              type="text"
              icon={<Menu size={18} />}
              aria-label="打开群组项目与对话"
              onClick={() => onMobileNavigationChange(true)}
            />
            <Content className="conversation-content">
              {route.page === "overview" ? (
                <OverviewHome
                  conversations={conversations}
                  projects={projectList}
                  tasks={taskList}
                  onOpenConversation={switchConversation}
                />
              ) : route.page === "applications" ? (
                  <ApplicationsHome
                    conversations={conversations}
                    onLaunch={launchStandaloneApplication}
                    onOpenConversation={switchConversation}
                    onInstallSkill={installSkill}
                    projects={projectList}
                    skillInstallations={skillInstallations}
                  />
              ) : route.page === "project" && projectHomeVisible ? (
                <div className="conversation-workspace-split">
                  <ConversationHistoryPanel
                    title={activeProject.name}
                    conversations={projectConversationHistory}
                    activeConversationId={projectConversationHistory[0]?.id ?? ""}
                    onCreate={() => createProjectConversation(activeProject.id)}
                    onDelete={deleteConversation}
                    onRename={renameConversation}
                    onSelect={switchConversation}
                  />
                  <ProjectHome
                    key={activeProject.id}
                    project={activeProject}
                    conversations={projectConversations}
                    files={generatedFiles.filter((file) => file.projectId === activeProject.id)}
                    draftFiles={selectedFiles}
                    onCreateConversation={() => createProjectConversation(activeProject.id)}
                    onCreateApplicationConversation={(catalogApplicationId) => {
                      const application = activeProjectCatalogApplications.find(
                        (item) => item.id === catalogApplicationId,
                      );
                      if (!application) return;
                      createProjectConversation(
                        activeProject.id,
                        "",
                        [],
                        application.contextId,
                        application.id,
                      );
                    }}
                    onDraftFileRemove={(file) =>
                      setSelectedFiles((current) => current.filter((item) => item.uid !== file.uid))
                    }
                    onDeleteConversation={deleteConversation}
                    onOpenConversation={switchConversation}
                    onOpenFile={(fileId) => {
                      setProjectFileToOpenId(fileId);
                      setProjectFilesOpen(true);
                    }}
                    onOpenScheduledTask={(task) => {
                      const existingConversation = projectConversations.find(
                        (conversation) => conversation.title === task.title,
                      );
                      if (existingConversation) {
                        switchConversation(existingConversation.id);
                        return;
                      }
                      const application = activeProjectCatalogApplications[0] ?? applicationCatalog[0];
                      createProjectConversation(
                        activeProject.id,
                        task.title,
                        [],
                        application.contextId,
                        application.id,
                      );
                    }}
                    onReferenceFile={(file) => {
                      setSelectedFiles((current) => [...current, file]);
                      antMessage.success(`已引用“${file.name}”`);
                    }}
                    onEditProject={() => editProject(activeProject)}
                    onRenameConversation={renameConversation}
                    onStartConversation={(prompt, catalogApplicationId) => {
                      const application = activeProjectCatalogApplications.find((item) => item.id === catalogApplicationId)
                        ?? activeProjectCatalogApplications[0]
                        ?? applicationCatalog[0];
                      createProjectConversation(
                        activeProject.id,
                        prompt,
                        [...selectedFiles],
                        application.contextId,
                        application.id,
                      );
                    }}
                    onProjectApplicationsChange={(applicationIds) => {
                      setProjectList((current) => current.map((project) => (
                        project.id === activeProject.id
                          ? { ...project, applicationIds }
                          : project
                      )));
                      antMessage.success("群组项目数字员工已更新");
                    }}
                    uploadProps={{ beforeUpload, multiple: true, showUploadList: false }}
                  />
                  {projectFilesOpen ? (
                    <ProjectFilesPanel
                      key={`${activeProject.id}-${projectFileToOpenId ?? "all"}`}
                      project={activeProject}
                      conversations={projectConversations}
                      files={generatedFiles.filter((file) => file.projectId === activeProject.id)}
                      initialSelectedFileId={projectFileToOpenId}
                      onClose={() => {
                        setProjectFilesOpen(false);
                        setProjectFileToOpenId(null);
                      }}
                      onOpenConversation={(conversationId) => {
                        setProjectFilesOpen(false);
                        setProjectFileToOpenId(null);
                        switchConversation(conversationId);
                      }}
                      onReferenceFile={(file) => {
                        setSelectedFiles((current) => [...current, file]);
                        antMessage.success(`已引用“${file.name}”`);
                      }}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="conversation-workspace-split">
                  <div className="conversation-primary-region">
                  {isStandaloneConversation && activeStandaloneApplication ? (
                    <ConversationHistoryPanel
                      title={activeStandaloneApplicationName}
                      conversations={activeStandaloneApplicationConversations}
                      activeConversationId={activeConversationId}
                      onCreate={() => createStandaloneConversation(
                        activeStandaloneApplication.contextId,
                        activeStandaloneApplication.id,
                      )}
                      onDelete={deleteConversation}
                      onRename={renameConversation}
                      onSelect={switchConversation}
                    />
                  ) : !isStandaloneConversation ? (
                    <ConversationHistoryPanel
                      title={activeProject.name}
                      conversations={projectConversationHistory}
                      activeConversationId={activeConversationId}
                      onCreate={() => createProjectConversation(activeProject.id)}
                      onDelete={deleteConversation}
                      onRename={renameConversation}
                      onSelect={switchConversation}
                    />
                  ) : null}
                  <section className={`conversation-stage has-floating-orb${isStandaloneConversation ? " is-standalone" : ""}`} aria-label="Agent 对话工作区">
                    <div className="task-island-cluster">
                    {isStandaloneConversation && activeStandaloneApplication ? (
                      <ConversationTaskIsland
                        name={activeStandaloneApplication.name}
                        avatar={(
                          <Avatar
                            className="application-avatar-surface digital-employee-floating-orb-avatar"
                            size={32}
                            src={activeStandaloneApplication.avatar}
                          />
                        )}
                        profile={(
                          <ApplicationHoverCard
                            application={activeStandaloneApplication}
                            skillInstallations={skillInstallations}
                          />
                        )}
                        status={activeTaskIslandStatus}
                        task={activeTask}
                        open={taskOverlay === "current"}
                        onOpenChange={(open) => changeTaskOverlay(open ? "current" : null)}
                        onContinue={() => resumeWaitingTask(activeConversationId)}
                        onOpenStage={(participant, stageIndex) => {
                          if (!activeTask) return;
                          setRunStageSelection({
                            conversationId: activeConversationId,
                            applicationId: participant.applicationId,
                            name: participant.name,
                            stageIndex,
                            status: participant.status,
                            taskTitle: activeTask.title,
                          });
                          changeTaskOverlay(null);
                          setProjectWorkspaceTool("runs");
                        }}
                      />
                    ) : null}
                    {!isStandaloneConversation ? (
                      <ConversationTaskIsland
                        name={activeProject.name}
                        avatar={(
                          <span className="project-floating-orb-avatar">
                            <NavigationProjectIcon project={activeProject} />
                          </span>
                        )}
                        profile={(
                          <ProjectHoverCard
                            project={activeProject}
                            skillInstallations={skillInstallations}
                          />
                        )}
                        status={activeTaskIslandStatus}
                        task={activeTask}
                        open={taskOverlay === "current"}
                        onOpenChange={(open) => changeTaskOverlay(open ? "current" : null)}
                        onContinue={() => resumeWaitingTask(activeConversationId)}
                        onOpenStage={(participant, stageIndex) => {
                          if (!activeTask) return;
                          setRunStageSelection({
                            conversationId: activeConversationId,
                            applicationId: participant.applicationId,
                            name: participant.name,
                            stageIndex,
                            status: participant.status,
                            taskTitle: activeTask.title,
                          });
                          changeTaskOverlay(null);
                          setProjectWorkspaceTool("runs");
                        }}
                      />
                    ) : null}
                    <GlobalTaskCenter
                      activeConversationId={activeConversationId}
                      expanded={taskOverlay === "global"}
                      tasks={taskList}
                      viewedTaskVersions={viewedTaskVersions}
                      onOpen={(task) => {
                        switchConversation(task.conversationId);
                        if (task.status === "success") setProjectWorkspaceTool("runs");
                      }}
                      onExpandedChange={(open) => changeTaskOverlay(open ? "global" : null)}
                    />
                    </div>

                  {activeRuntimeError ? (
                    <div className="runtime-alert" role="alert">
                      <span className="font-strong">本轮运行需要处理</span>
                      <span>{activeRuntimeError}</span>
                      <Button
                        size="small"
                        type="text"
                        icon={<X size={14} />}
                        onClick={() => setConversationTasks((current) => {
                          const next = { ...current };
                          delete next[activeConversationId];
                          return next;
                        })}
                      />
                    </div>
                  ) : null}

                    <ThreadView
                      key={activeConversationId}
                      conversationId={activeConversationId}
                      messages={activeConversation.messages}
                      showConversationTarget={isUnsentConversationDraft(activeConversation)}
                      activeAgentName={activeAgent.name}
                      administratorApplicationId={pendingTargetProject
                        ? pendingTargetProject.administratorApplicationId ?? null
                        : isStandaloneConversation
                          ? null
                          : activeProject.administratorApplicationId ?? null}
                      catalogApplicationId={pendingTargetApplication?.id
                        ?? pendingTargetProjectAdministrator?.id
                        ?? activeCatalogApplicationId}
                      project={pendingTargetProject ?? (isStandaloneConversation ? null : activeProject)}
                      projectApplications={pendingTargetProject
                        ? pendingTargetProjectApplications
                        : selectableCatalogApplications}
                      availableApplications={getCreatedDigitalEmployees(conversations)}
                      availableProjects={projectList}
                      enableApplicationMentions={Boolean(pendingTargetProject) || !isStandaloneConversation}
                      resourceFiles={pendingTargetProject
                        ? generatedFiles.filter((file) => file.projectId === pendingTargetProject.id)
                        : !isStandaloneConversation
                          ? generatedFiles.filter((file) => file.projectId === activeProject.id)
                          : []}
                      resourceConversations={pendingTargetProject
                        ? conversations.filter((conversation) => conversation.projectId === pendingTargetProject.id)
                        : !isStandaloneConversation
                          ? projectConversations
                        : []}
                      files={selectedFiles}
                      insertStarterPromptRef={composerPromptRef}
                      onFileRemove={(file) =>
                        setSelectedFiles((current) => current.filter((item) => item.uid !== file.uid))
                      }
                      onTargetApplicationSelect={selectConversationTargetApplication}
                      onTargetProjectSelect={selectConversationTargetProject}
                      uploadProps={{ beforeUpload, multiple: true, showUploadList: false }}
                    />
                  </section>

                  </div>

                  {!isUnsentConversationDraft(activeConversation) ? (
                  <ProjectWorkspaceRail
                    activeTool={projectWorkspaceTool}
                    activeConversation={activeConversation}
                    applications={isStandaloneConversation && activeStandaloneApplication
                      ? [activeStandaloneApplication]
                      : activeProjectCatalogApplications}
                    createdApplications={getCreatedDigitalEmployees(conversations)}
                    conversations={isStandaloneConversation ? activeStandaloneApplicationConversations : projectConversations}
                    files={isStandaloneConversation
                      ? []
                      : generatedFiles.filter((file) => file.projectId === activeProject.id)}
                    project={isStandaloneConversation ? null : activeProject}
                    standaloneApplication={isStandaloneConversation ? activeStandaloneApplication : null}
                    skillInstallations={skillInstallations}
                    runStageSelection={runStageSelection?.conversationId === activeConversation.id
                      ? runStageSelection
                      : null}
                    onInstallSkill={installSkill}
                    onProjectNameChange={!isStandaloneConversation
                      ? (projectId, name) => {
                          setProjectList((current) => current.map((project) => (
                            project.id === projectId ? { ...project, name } : project
                          )));
                          antMessage.success("名称修改成功");
                        }
                      : undefined}
                    onActiveToolChange={setProjectWorkspaceTool}
                    onOpenConversation={(conversationId) => {
                      setProjectWorkspaceTool(null);
                      switchConversation(conversationId);
                    }}
                    onFillComposerPrompt={(prompt) => composerPromptRef.current?.(prompt)}
                    onProjectApplicationsChange={!isStandaloneConversation
                      ? (applicationIds) => {
                          setProjectList((current) => current.map((project) => (
                            project.id === activeProject.id
                              ? { ...project, applicationIds }
                              : project
                          )));
                          antMessage.success("群组项目数字员工已更新");
                        }
                      : undefined}
                    onReferenceFile={(file) => {
                      setSelectedFiles((current) => [...current, file]);
                      antMessage.success(`已引用“${file.name}”`);
                    }}
                  />
                  ) : null}
                </div>
              )}
            </Content>
          </main>

        </div>

        <Drawer
          className="mobile-navigation-drawer"
          placement="left"
          size="min(88vw, 320px)"
          open={mobileNavigationOpen}
          onClose={() => onMobileNavigationChange(false)}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          {navigation}
        </Drawer>
      </Layout>
    </AssistantRuntimeProvider>
  );
}

type ConversationHistoryPanelProps = {
  title: string;
  conversations: Conversation[];
  activeConversationId: string;
  onCreate: () => void;
  onDelete: (conversation: Conversation) => void;
  onRename: (conversation: Conversation) => void;
  onSelect: (conversationId: string) => void;
};

const taskIslandStatusCopy: Record<TaskIslandStatus, { label: string; description: string }> = {
  idle: {
    label: "待命",
    description: "当前没有执行中的任务。发送消息后，这里会同步展示任务进度。",
  },
  running: {
    label: "任务执行中",
    description: "正在理解任务、调用可用能力并整理结果。",
  },
  waiting: {
    label: "等待确认",
    description: "任务已暂停，确认后将继续执行剩余步骤。",
  },
  success: {
    label: "任务已完成",
    description: "本轮任务已经完成，结果已写入当前对话。",
  },
  error: {
    label: "需要处理",
    description: "本轮任务未能完成，可关闭后在对话中直接重试。",
  },
};

const taskParticipantStatusCopy: Record<ConversationTaskParticipantStatus, string> = {
  queued: "待执行",
  running: "执行中",
  waiting: "等待确认",
  success: "已完成",
  error: "失败",
};

function ConversationTaskIsland({
  name,
  avatar,
  profile,
  status,
  task,
  open,
  onOpenChange,
  onContinue,
  onOpenStage,
}: {
  name: string;
  avatar: ReactNode;
  profile: ReactNode;
  status: TaskIslandStatus;
  task?: ConversationTaskState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue?: () => void;
  onOpenStage?: (participant: ConversationTaskParticipant, stageIndex: number) => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isPreparingClose, setIsPreparingClose] = useState(false);
  const [collapsedContentVisible, setCollapsedContentVisible] = useState(!open);
  const [expandedPosition, setExpandedPosition] = useState(() => ({
    top: 12,
    left: window.innerWidth / 2,
  }));
  const statusCopy = taskIslandStatusCopy[status];
  const showStatus = status !== "idle";
  const primaryParticipant = getTaskPrimaryParticipant(task);
  const showParticipantStages = task?.targetType === "project" && Boolean(task.participants.length);
  const displayName = showParticipantStages && primaryParticipant ? primaryParticipant.name : name;
  const displayAvatar = showParticipantStages && primaryParticipant?.avatar ? (
    <Avatar
      className="application-avatar-surface digital-employee-floating-orb-avatar"
      size={32}
      src={primaryParticipant.avatar}
    />
  ) : avatar;
  const completedParticipantCount = task?.participants.filter(
    (participant) => participant.status === "success",
  ).length ?? 0;
  const participantStage = task?.participants.length
    ? status === "success"
      ? task.participants.length
      : Math.min(task.participants.length, completedParticipantCount + 1)
    : 0;
  const displayStatusLabel = showParticipantStages && task
    ? `${participantStage}/${task.participants.length} · ${statusCopy.label}`
    : statusCopy.label;

  const syncExpandedPosition = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setExpandedPosition({ top: rect.top, left: rect.left + rect.width / 2 });
  };

  const setAnchorNode = useCallback((node: HTMLDivElement | null) => {
    anchorRef.current = node;
    setPortalContainer(node?.closest<HTMLElement>(".app-shell") ?? null);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const parent = anchorRef.current?.parentElement;
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(syncExpandedPosition);
    if (parent) resizeObserver?.observe(parent);
    window.addEventListener("resize", syncExpandedPosition);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncExpandedPosition);
    };
  }, [open]);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (open) {
      setCollapsedContentVisible(false);
      return undefined;
    }
    const revealTimer = window.setTimeout(() => {
      setCollapsedContentVisible(true);
    }, reduceMotion ? 0 : 200);
    return () => window.clearTimeout(revealTimer);
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
      setIsPreparingClose(false);
      syncExpandedPosition();
      onOpenChange(true);
      setProfileOpen(false);
      return;
    }
    if (isPreparingClose) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onOpenChange(false);
      return;
    }
    setIsPreparingClose(true);
    closeTimerRef.current = window.setTimeout(() => {
      onOpenChange(false);
      closeTimerRef.current = window.setTimeout(() => {
        setIsPreparingClose(false);
        closeTimerRef.current = null;
      }, 260);
    }, 40);
  };

  return (
    <div className="task-island-anchor" ref={setAnchorNode}>
      <Cambio.Root
        dismissible={{ threshold: 88, velocity: 520 }}
        modal={false}
        motion="smooth"
        open={open}
        onOpenChange={handleOpenChange}
      >
      <Popover
        arrow={false}
        content={profile}
        mouseEnterDelay={0.12}
        mouseLeaveDelay={0.08}
        onOpenChange={(nextOpen) => {
          if (SHOW_TASK_ISLAND_PROFILE_ON_HOVER && !open) setProfileOpen(nextOpen);
        }}
        open={SHOW_TASK_ISLAND_PROFILE_ON_HOVER && !open && profileOpen}
        placement="bottom"
        rootClassName="application-hover-popover"
        trigger={SHOW_TASK_ISLAND_PROFILE_ON_HOVER ? "hover" : []}
      >
        <Cambio.Trigger
          className={`digital-employee-floating-orb is-${status}${collapsedContentVisible ? " is-content-visible" : " is-content-hidden"}`}
          type="button"
          aria-label={`${displayName}，${displayStatusLabel}，点击查看任务状态`}
          aria-live="polite"
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className="digital-employee-floating-orb-avatar-slot">{displayAvatar}</span>
          <span className="digital-employee-floating-orb-copy">
            <span className="digital-employee-floating-orb-name">{displayName}</span>
            {showStatus ? (
              <span className="digital-employee-floating-orb-status">{displayStatusLabel}</span>
            ) : null}
          </span>
        </Cambio.Trigger>
      </Popover>
      <Cambio.Portal container={portalContainer}>
        <Cambio.Popup
          className={`task-island-popup is-${status}${isPreparingClose ? " is-preparing-close" : ""}`}
          aria-label={`${displayName}${status === "idle" ? "资料卡" : "任务状态"}`}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          style={{
            top: `${expandedPosition.top}px`,
            left: `${expandedPosition.left}px`,
            translate: "-50% 0",
          }}
        >
          {status === "idle" ? (
            <div className="task-island-profile-card">
              <Cambio.Close
                className="task-island-popup-close task-island-profile-close"
                aria-label="关闭资料卡"
              >
                <X size={16} />
              </Cambio.Close>
              {profile}
            </div>
          ) : (
            <>
              <header className="task-island-popup-header">
                <span className="task-island-popup-heading-avatar">{avatar}</span>
                <div className="task-island-popup-heading-copy">
                  <strong>{name}</strong>
                  <span>任务执行阶段信息</span>
                </div>
                <Cambio.Close className="task-island-popup-close" aria-label="关闭任务状态">
                  <X size={16} />
                </Cambio.Close>
              </header>
              <div className="task-island-popup-body">
                {showParticipantStages && task ? (
                  <>
                    <ol className="task-island-participants" aria-label="数字员工执行阶段">
                      {task.participants.map((participant, index) => (
                        <li className={`is-${participant.status}`} key={`${participant.applicationId}-${index}`}>
                          <button
                            className="task-island-participant-main"
                            type="button"
                            aria-label={`查看${participant.name}第 ${index + 1} 阶段运行记录`}
                            onClick={() => onOpenStage?.(participant, index)}
                          >
                            <span className="task-island-participant-status" aria-hidden="true"><i /></span>
                            <span className="task-island-participant-copy">
                              <span className="font-strong">{participant.name}</span>
                              <small>第 {index + 1} 阶段 · {taskParticipantStatusCopy[participant.status]}</small>
                            </span>
                          </button>
                          {participant.status === "waiting" ? (
                            <Button size="small" type="text" onClick={onContinue}>继续</Button>
                          ) : null}
                          <button
                            className="task-island-participant-chevron"
                            type="button"
                            aria-label={`查看${participant.name}第 ${index + 1} 阶段运行记录`}
                            onClick={() => onOpenStage?.(participant, index)}
                          >
                            <ChevronRight size={16} aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ol>
                    {status === "waiting" ? (
                      <div className="task-island-participant-action">
                        <span>当前数字员工需要你的确认</span>
                      </div>
                    ) : null}
                  </>
                ) : status === "running" ? (
                  <div className="task-island-progress" aria-label="任务进度">
                    <div className="task-island-progress-bar"><span /></div>
                    <ol>
                      <li className="is-complete"><Check size={14} />理解任务</li>
                      <li className="is-active"><span className="task-island-progress-pulse" />调用能力并整理结果</li>
                      <li><span className="task-island-progress-dot" />输出到当前对话</li>
                    </ol>
                  </div>
                ) : status === "waiting" ? (
                  <div className="task-island-waiting">
                    <div className="task-island-summary is-waiting">
                      <span className="task-island-summary-icon" aria-hidden="true"><ShieldAlert size={16} /></span>
                      <span>需要你的确认后继续</span>
                    </div>
                    <Button size="small" type="primary" onClick={onContinue}>继续执行</Button>
                  </div>
                ) : (
                  <div className={`task-island-summary is-${status}`}>
                    <span className="task-island-summary-icon" aria-hidden="true">
                      {status === "success" ? <Check size={16} /> : <ShieldAlert size={16} />}
                    </span>
                    <span>{status === "success" ? "结果已就绪" : "可以返回对话重试"}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </Cambio.Popup>
      </Cambio.Portal>
      </Cambio.Root>
    </div>
  );
}

const globalTaskStatusCopy: Record<ConversationTaskState["status"], { label: string; description: string }> = {
  running: { label: "任务执行中", description: "数字员工正在处理任务" },
  waiting: { label: "任务待执行", description: "等待确认后继续执行" },
  success: { label: "任务已完成", description: "任务结果已经生成" },
  error: { label: "任务需处理", description: "执行遇到问题，请返回查看" },
};

function TaskPendingIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 20 20" aria-hidden="true">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M9.172 17.5H8.005c-2.988 0-4.482 0-5.41-.946s-.928-2.468-.928-5.513 0-4.566.928-5.512 2.422-.946 5.41-.946h3.169c2.987 0 4.481 0 5.41.946.713.728.878 1.796.916 3.637" />
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="m15.709 15.708-1.125-.75v-1.875m-3.75 1.5a3.75 3.75 0 1 0 7.5 0 3.75 3.75 0 0 0-7.5 0M13.334 4.583l-.083-.257c-.413-1.284-.62-1.925-1.11-2.292s-1.143-.367-2.448-.367h-.22c-1.304 0-1.956 0-2.447.367-.49.367-.697 1.008-1.11 2.292l-.083.257" />
    </svg>
  );
}

function GlobalTaskCenter({
  tasks,
  activeConversationId,
  viewedTaskVersions,
  expanded,
  onOpen,
  onExpandedChange,
}: {
  tasks: ConversationTaskState[];
  activeConversationId: string;
  viewedTaskVersions: Record<string, number>;
  expanded: boolean;
  onOpen: (task: ConversationTaskState) => void;
  onExpandedChange: (open: boolean) => void;
}) {
  const sortedTasks = [...tasks].sort((left, right) => (
    taskStatusPriority[right.status] - taskStatusPriority[left.status]
    || right.updatedAt - left.updatedAt
  ));
  const backgroundTasks = sortedTasks.filter((task) => (
    task.conversationId !== activeConversationId
    && viewedTaskVersions[task.conversationId] !== task.updatedAt
  ));
  if (!backgroundTasks.length) return null;
  const primaryTask = backgroundTasks[0];
  const attentionCount = backgroundTasks.filter((task) => task.status !== "running").length;
  const primaryStatusCopy = globalTaskStatusCopy[primaryTask.status];

  return (
    <aside className={`global-task-center${expanded ? " is-expanded" : ""}`} aria-label="全局任务">
      <button
        className={`global-task-center-trigger is-${primaryTask.status}`}
        type="button"
        aria-label={`${backgroundTasks.length} 个后台任务${attentionCount ? `，${attentionCount} 个状态更新` : ""}`}
        aria-expanded={expanded}
        onClick={() => onExpandedChange(!expanded)}
      >
        <span className={`global-task-center-orbit is-${primaryTask.status}`} aria-hidden="true">
          <span className="global-task-center-progress-ring" />
          <span className="global-task-center-count">{backgroundTasks.length}</span>
        </span>
        <span>{primaryStatusCopy.label}</span>
        <ChevronUp className="global-task-center-trigger-arrow" size={14} aria-hidden="true" />
      </button>
      {expanded ? (
        <div className="global-task-center-panel">
          <header>
            <span className="global-task-center-header-icon"><TaskPendingIcon size={30} /></span>
            <div className="global-task-center-header-copy">
              <strong>{primaryStatusCopy.label}</strong>
              <span>任务信息、进展事件</span>
            </div>
            <button
              className="task-island-popup-close global-task-center-close"
              type="button"
              aria-label="关闭全局任务"
              onClick={() => onExpandedChange(false)}
            >
              <X size={16} />
            </button>
          </header>
          <div className="global-task-center-list">
            {backgroundTasks.map((task) => (
              <article className={`global-task-row is-${task.status}`} key={task.conversationId}>
                <button className="global-task-row-main" type="button" onClick={() => {
                  onOpen(task);
                  onExpandedChange(false);
                }}>
                  <span className="global-task-row-status" aria-hidden="true"><i /></span>
                  <span className="global-task-row-copy">
                    <strong>{task.title}</strong>
                    <small><span>{task.ownerName}</span><span>{globalTaskStatusCopy[task.status].description}</span></small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
                {task.status === "waiting" ? (
                  <Button className="global-task-row-action" size="small" onClick={() => {
                    onOpen(task);
                    onExpandedChange(false);
                  }}>查看</Button>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function ApplicationHoverCard({
  application,
  skillInstallations,
}: {
  application: CatalogApplication;
  skillInstallations: SkillInstallation[];
}) {
  const installedSkills = skillCatalog.filter((skill) => isSkillInstalledAtTarget(
    skillInstallations,
    skill.id,
    "digital-employee",
    application.id,
  ));

  return (
    <article className="application-hover-card" aria-label={`${application.name}应用信息`}>
      <img
        className="application-hover-card-background"
        src={getPublicAssetPath("backgrounds/application-hover-card.png")}
        alt=""
        aria-hidden="true"
      />
      <Badge className="application-hover-card-status" status="success" text="在线" />
      <div className="application-hover-card-identity">
        <img src={application.avatar} alt="" aria-hidden="true" />
        <strong>{application.name}</strong>
      </div>
      <div className="application-hover-card-details">
        <p className="application-hover-card-description">{application.description}</p>
        <Divider />
        <div className="application-hover-card-skills">
          <span>已开启技能</span>
          <div>
            {installedSkills.length ? installedSkills.map((skill) => (
              <Tag bordered={false} key={skill.id}>{skill.name}</Tag>
            )) : <span className="application-hover-card-skills-empty">暂无</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

function ApplicationProfileSummary({
  application,
  showMeta = true,
}: {
  application: CatalogApplication;
  showMeta?: boolean;
}) {
  return (
    <section className="application-profile-summary" aria-label={`${application.name}资料`}>
      <div className="application-profile-photo-card">
        <img src={application.avatar} alt="" />
        <span title={application.id}>ID: {application.id}</span>
      </div>
      <div className="application-profile-identity">
        <h3>{application.name}</h3>
        {showMeta ? (
          <div className="application-profile-meta">
            <span className="application-profile-online"><i aria-hidden="true" />在线</span>
            <span>启用时间：2026年9月24日</span>
          </div>
        ) : null}
        <p>{application.description}</p>
      </div>
    </section>
  );
}

function ProjectHoverCard({
  project,
  skillInstallations,
}: {
  project: Project;
  skillInstallations: SkillInstallation[];
}) {
  const installedSkills = skillCatalog.filter((skill) => isSkillInstalledAtTarget(
    skillInstallations,
    skill.id,
    "project",
    project.id,
  ));

  return (
    <article className="application-hover-card project-hover-card" aria-label={`${project.name}信息`}>
      <img
        className="application-hover-card-background"
        src={getPublicAssetPath("backgrounds/application-hover-card.png")}
        alt=""
        aria-hidden="true"
      />
      <div className="application-hover-card-identity project-hover-card-identity">
        <NavigationProjectIcon project={project} />
        <strong>{project.name}</strong>
      </div>
      <div className="application-hover-card-details">
        <p className="application-hover-card-description">{project.description}</p>
        <Divider />
        <div className="application-hover-card-skills">
          <span>已开启技能</span>
          <div>
            {installedSkills.length ? installedSkills.map((skill) => (
              <Tag bordered={false} key={skill.id}>{skill.name}</Tag>
            )) : <span className="application-hover-card-skills-empty">暂无</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

function ConversationHistoryPanel({
  title,
  conversations,
  activeConversationId,
  onCreate,
  onDelete,
  onRename,
  onSelect,
}: ConversationHistoryPanelProps) {
  const historyPanelStyle = {
    "--conversation-history-icon-color": "var(--ui-color-black-a45)",
    "--conversation-history-icon-hover-color": "var(--ui-color-black-a95)",
  } as CSSProperties;
  const groups = Array.from(
    conversations.reduce((result, conversation) => {
      const label = formatConversationHistoryGroup(conversation.updatedAt);
      const group = result.get(label) ?? [];
      group.push(conversation);
      result.set(label, group);
      return result;
    }, new Map<string, Conversation[]>()),
  );
  const firstGroupLabel = groups[0]?.[0] ?? "";
  const [visibleGroupLabel, setVisibleGroupLabel] = useState(firstGroupLabel);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const activeHistoryConversation = conversations.find((conversation) => conversation.id === activeConversationId)
    ?? conversations[0];

  const syncVisibleGroupLabel = useCallback((scrollContainer: HTMLDivElement) => {
    const groupSwitchLine = scrollContainer.getBoundingClientRect().top + 28;
    const sections = Array.from(
      scrollContainer.querySelectorAll<HTMLElement>("[data-history-group]"),
    );
    let nextLabel = sections[0]?.dataset.historyGroup ?? firstGroupLabel;

    for (const section of sections) {
      if (section.getBoundingClientRect().top > groupSwitchLine) break;
      nextLabel = section.dataset.historyGroup ?? nextLabel;
    }

    setVisibleGroupLabel((current) => current === nextLabel ? current : nextLabel);
  }, [firstGroupLabel]);

  useEffect(() => {
    setVisibleGroupLabel(firstGroupLabel);
    const syncRestoredScrollPosition = () => {
      if (historyScrollRef.current) syncVisibleGroupLabel(historyScrollRef.current);
    };
    const frame = window.requestAnimationFrame(syncRestoredScrollPosition);
    const timeout = window.setTimeout(syncRestoredScrollPosition, 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [title, firstGroupLabel, syncVisibleGroupLabel]);

  const handleHistoryScroll = (event: React.UIEvent<HTMLDivElement>) => {
    syncVisibleGroupLabel(event.currentTarget);
  };

  const identity = (
    <span className="application-conversation-panel-identity">
      <span className="font-strong">对话记录</span>
    </span>
  );

  const renderConversationGroups = (
    showFirstGroupLabel: boolean,
    handleSelect: (conversationId: string) => void,
    showActiveCheck = false,
  ) => groups.map(([label, groupConversations]) => (
    <section
      className="application-conversation-history-group"
      data-history-group={label}
      key={label}
    >
      {showFirstGroupLabel || label !== firstGroupLabel ? (
        <header className="application-conversation-history-group-title">{label}</header>
      ) : null}
      <div className="application-conversation-history-list">
        {groupConversations.map((conversation) => {
          const selected = conversation.id === activeConversationId;
          return (
            <div
              className="application-conversation-history-row"
              data-active={selected}
              key={conversation.id}
            >
              <button type="button" onClick={() => handleSelect(conversation.id)}>
                <span title={conversation.title}>{conversation.title}</span>
                {showActiveCheck && selected ? (
                  <Check
                    className="application-conversation-history-active-check"
                    size={14}
                    aria-label="当前对话"
                  />
                ) : null}
              </button>
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: conversationMoreMenuItems,
                  onClick: ({ key }) => {
                    if (key === "rename") onRename(conversation);
                    if (key === "delete") onDelete(conversation);
                  },
                }}
              >
                <Button
                  className="navigation-icon-button"
                  type="text"
                  size="small"
                  icon={<MoreHorizontal size={16} />}
                  aria-label={`${conversation.title}更多操作`}
                />
              </Dropdown>
            </div>
          );
        })}
      </div>
    </section>
  ));

  if (historyCollapsed) {
    const collapsedHistory = (
      <div className="application-conversation-history-dropdown" aria-label={`${title}的对话选择`}>
        {renderConversationGroups(true, (conversationId) => {
          setHistoryDropdownOpen(false);
          onSelect(conversationId);
        }, true)}
      </div>
    );

    return (
      <aside
        className="application-conversation-panel is-collapsed"
        style={historyPanelStyle}
        aria-label={`${title}的全部对话`}
      >
        <div className="application-conversation-collapsed-bar">
          <Tooltip title="展开">
            <button
              className="application-conversation-panel-toggle"
              type="button"
              aria-label="展开对话记录"
              onClick={() => setHistoryCollapsed(false)}
            >
              <ListCollapse size={16} aria-hidden="true" />
            </button>
          </Tooltip>
          <Popover
            arrow={false}
            content={collapsedHistory}
            open={historyDropdownOpen}
            onOpenChange={setHistoryDropdownOpen}
            placement="bottomLeft"
            align={{ offset: [-39, 12] }}
            rootClassName="application-conversation-history-popover"
            trigger={["click"]}
          >
            <button
              className="application-conversation-collapsed-title"
              type="button"
              aria-expanded={historyDropdownOpen}
            >
              <span>{activeHistoryConversation?.title ?? "选择对话"}</span>
            </button>
          </Popover>
          <Tooltip title="发起新对话">
            <Button
              className="navigation-icon-button"
              type="text"
              size="small"
              icon={<CirclePlus size={16} />}
              aria-label={`新建${title}对话`}
              onClick={onCreate}
            />
          </Tooltip>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="application-conversation-panel"
      style={historyPanelStyle}
      aria-label={`${title}的全部对话`}
    >
      <header className="application-conversation-panel-header">
        {identity}
        <Tooltip title="收起">
          <Button
            className="navigation-icon-button application-conversation-collapse-button"
            type="text"
            size="small"
            icon={<ListChevronsDownUp size={16} aria-hidden="true" />}
            aria-label="收起对话记录"
            onClick={() => setHistoryCollapsed(true)}
          />
        </Tooltip>
      </header>

      <div className="application-conversation-panel-date-header">
        <span aria-live="polite">{visibleGroupLabel}</span>
        <Tooltip title="发起新对话">
          <Button
            className="navigation-icon-button"
            type="text"
            size="small"
            icon={<CirclePlus size={16} />}
            aria-label={`新建${title}对话`}
            onClick={onCreate}
          />
        </Tooltip>
      </div>

      <div
        className="application-conversation-panel-scroll"
        onScroll={handleHistoryScroll}
        ref={historyScrollRef}
      >
        {renderConversationGroups(false, onSelect)}
      </div>
    </aside>
  );
}

function ProjectMembersPopup({
  members = projectMembers,
  applications = [],
  title = "群组项目成员",
}: {
  members?: typeof teamMembers;
  applications?: CatalogApplication[];
  title?: string;
}) {
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const closeMemberSearch = () => {
    setMemberSearch("");
    setMemberSearchOpen(false);
  };
  const normalizedMemberSearch = memberSearch.trim().toLocaleLowerCase("zh-CN");
  const owner = members.find((member) => member.role === "所有者");
  const collaboratorMembers = members.filter((member) => member.role !== "所有者");
  const memberEntries = [
    ...(owner ? [{ ...owner, entryType: "member" as const }] : []),
    ...applications.map((application) => ({
      id: `application-${application.id}`,
      name: application.name,
      role: "AI助理",
      cover: application.avatar,
      entryType: "application" as const,
    })),
    ...collaboratorMembers.map((member) => ({ ...member, entryType: "member" as const })),
  ];
  const visibleMembers = memberEntries.filter((member) =>
    !normalizedMemberSearch || member.name.toLocaleLowerCase("zh-CN").includes(normalizedMemberSearch),
  );

  return (
    <div
      className="project-members-popup"
      role="dialog"
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        if (memberSearchOpen && !(event.target as Element).closest(".project-members-search")) {
          closeMemberSearch();
        }
      }}
    >
      <section className="project-members-section">
        <header className="project-members-heading">
          <span className="project-members-title">
            <span className="font-strong">{title}</span>
            <span className="project-members-dot" aria-hidden="true" />
            <span>{memberEntries.length}</span>
          </span>
          {memberSearchOpen ? (
            <Input
              className="project-members-search"
              autoFocus
              allowClear
              prefix={<Search size={14} />}
              placeholder="搜索成员"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeMemberSearch();
              }}
            />
          ) : (
            <Button
              className="project-members-search-trigger"
              type="text"
              size="small"
              icon={<Search size={14} />}
              aria-label="搜索成员"
              onClick={(event) => {
                event.stopPropagation();
                setMemberSearchOpen(true);
              }}
            />
          )}
        </header>
        <div className="project-members-list">
          {visibleMembers.map((member) => (
            <div className="project-member-row" key={member.id}>
              <span className="project-member-identity">
                {member.entryType === "application" ? (
                  <Avatar className="project-member-application-avatar" size={24} src={member.cover} />
                ) : (
                  <InitialAvatar name={member.name} color={member.avatarColor} />
                )}
                <span>{member.name}</span>
              </span>
              {member.role === "所有者" ? (
                <Tag color="gold" bordered={false}>所有者</Tag>
              ) : (
                <Text className="project-member-role" type="secondary">{member.role}</Text>
              )}
            </div>
          ))}
          {visibleMembers.length === 0 ? (
            <div className="project-members-empty">未找到匹配成员</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ProjectMembersButton({
  members,
  applications,
  title = "群组项目成员",
}: {
  members?: typeof teamMembers;
  applications?: CatalogApplication[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip placement="bottom" title={open ? null : title}>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        open={open}
        onOpenChange={setOpen}
        menu={{ items: [] }}
        popupRender={() => (
          <ProjectMembersPopup members={members} applications={applications} title={title} />
        )}
      >
        <Button type="text" size="small" icon={<Users size={16} />} aria-label={title} />
      </Dropdown>
    </Tooltip>
  );
}

function ConversationTools({
  projectConversation,
  applications,
  filesOpen,
  onFilesOpenChange,
  onAction,
}: {
  projectConversation: boolean;
  applications?: CatalogApplication[];
  filesOpen: boolean;
  onFilesOpenChange: (open: boolean) => void;
  onAction: (label: string) => void;
}) {
  const tools = [
    { label: "日程", icon: <CalendarDays size={16} /> },
  ];

  return (
    <>
      <div className="conversation-header-tools" aria-label="对话工具">
        {projectConversation ? (
          <ProjectMembersButton applications={applications} />
        ) : (
          <Tooltip placement="bottom" title="群组项目成员">
            <Button
              type="text"
              size="small"
              icon={<Users size={16} />}
              aria-label="群组项目成员"
              onClick={() => onAction("独立对话不属于群组项目。")}
            />
          </Tooltip>
        )}
        <Tooltip placement="bottom" title={filesOpen ? null : "群组项目文件"}>
          <Button
            type="text"
            size="small"
            icon={<HardDrive size={16} />}
            aria-label="群组项目文件"
            onClick={() => {
              if (projectConversation) onFilesOpenChange(!filesOpen);
              else onAction("独立对话不属于群组项目。");
            }}
          />
        </Tooltip>
        {tools.map((tool) => (
          <Tooltip key={tool.label} placement="bottom" title={tool.label}>
            <Button
              type="text"
              size="small"
              icon={tool.icon}
              aria-label={tool.label}
              onClick={() => onAction(tool.label)}
            />
          </Tooltip>
        ))}
      </div>
    </>
  );
}

function ProjectFilesPanel({
  project,
  conversations,
  files,
  initialSelectedFileId,
  onClose,
  onOpenConversation,
  onReferenceFile,
}: {
  project: Project;
  conversations: Conversation[];
  files: GeneratedFile[];
  initialSelectedFileId?: string | null;
  onClose: () => void;
  onOpenConversation: (conversationId: string) => void;
  onReferenceFile: (file: SelectedFile) => void;
}) {
  return (
    <aside className="project-files-panel" aria-label="群组项目文件">
      <WorkspacePanelHeader title="群组项目文件" onClose={onClose} />
      <div className="project-files-panel-body">
        <ProjectFileExplorer
          project={project}
          conversations={conversations}
          files={files}
          initialSelectedFileId={initialSelectedFileId}
          onOpenConversation={onOpenConversation}
          onReferenceFile={onReferenceFile}
        />
      </div>
    </aside>
  );
}

function ProjectWorkspaceRail({
  activeTool,
  activeConversation,
  applications,
  createdApplications,
  conversations,
  files,
  project,
  standaloneApplication,
  skillInstallations,
  runStageSelection,
  onProjectNameChange,
  onActiveToolChange,
  onInstallSkill,
  onOpenConversation,
  onFillComposerPrompt,
  onProjectApplicationsChange,
  onReferenceFile,
}: {
  activeTool: ProjectWorkspaceTool | null;
  activeConversation: Conversation;
  applications: CatalogApplication[];
  createdApplications: CatalogApplication[];
  conversations: Conversation[];
  files: GeneratedFile[];
  project: Project | null;
  standaloneApplication?: CatalogApplication | null;
  skillInstallations: SkillInstallation[];
  runStageSelection?: RunStageSelection | null;
  onProjectNameChange?: (projectId: string, name: string) => void;
  onActiveToolChange: (tool: ProjectWorkspaceTool | null) => void;
  onInstallSkill: (
    skill: SkillDefinition,
    targetType: SkillInstallationTargetType,
    targetId: string,
    targetName: string,
  ) => void;
  onOpenConversation: (conversationId: string) => void;
  onFillComposerPrompt: (prompt: string) => void;
  onProjectApplicationsChange?: (applicationIds: string[]) => void;
  onReferenceFile: (file: SelectedFile) => void;
}) {
  const { message: antMessage } = AntApp.useApp();
  const [panelWidth, setPanelWidth] = useState(420);
  const [resizing, setResizing] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(project?.name ?? "");
  const [renderedTool, setRenderedTool] = useState<ProjectWorkspaceTool | null>(activeTool);
  const [skillSearch, setSkillSearch] = useState("");
  const [activeSkillCategory, setActiveSkillCategory] = useState<SkillCategory>("全部");
  const [showInstalledSkills, setShowInstalledSkills] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null);
  const [applicationPickerOpen, setApplicationPickerOpen] = useState(false);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [runResultExpanded, setRunResultExpanded] = useState(true);
  const [manualScheduleModalOpen, setManualScheduleModalOpen] = useState(false);
  const [manualScheduledTasks, setManualScheduledTasks] = useState<ProjectScheduledTask[]>([]);
  const [connectedOfficePlatforms, setConnectedOfficePlatforms] = useState<Set<string>>(() => new Set());
  const [enabledOfficePlatforms, setEnabledOfficePlatforms] = useState<Set<string>>(() => new Set());
  const resizeStateRef = useRef({ startX: 0, startWidth: 420 });

  useEffect(() => {
    if (runStageSelection) setRunResultExpanded(true);
  }, [runStageSelection]);
  const currentProjectMembers = project ? getProjectMembers(project) : [];
  const isStandalone = !project;
  const skillApplication = standaloneApplication ?? applications[0];
  const skillTarget = project
    ? { type: "project" as const, id: project.id, name: project.name }
    : skillApplication
      ? { type: "digital-employee" as const, id: skillApplication.id, name: skillApplication.name }
      : null;
  const scheduleTargetId = project?.id ?? standaloneApplication?.id ?? activeConversation.id;
  const createManualScheduledTask = (values: ScheduledTaskFormValues) => {
    const cadence = getScheduledTaskCadence(values);
    setManualScheduledTasks((current) => [
      ...current,
      {
        id: `schedule-${scheduleTargetId}-${Date.now()}`,
        projectId: scheduleTargetId,
        title: values.title.trim(),
        cadence,
        nextRun: cadence,
        enabled: true,
      },
    ]);
    setManualScheduleModalOpen(false);
    antMessage.success("定时任务已创建");
  };
  const normalizedApplicationSearch = applicationSearch.trim().toLocaleLowerCase("zh-CN");
  const selectedApplicationIds = new Set(applications.map((application) => application.id));
  const visibleCreatedApplications = createdApplications.filter((application) => (
    !selectedApplicationIds.has(application.id)
    && (!normalizedApplicationSearch
      || `${application.name} ${application.description}`.toLocaleLowerCase("zh-CN").includes(normalizedApplicationSearch))
  ));
  const scheduleTemplates = [
    {
      id: "daily-priorities",
      title: "每日优先事项简报",
      description: "每天早上从日程、待办和消息里整理最重要的几件事。",
      schedule: "每天 08:30",
      icon: <ListChecks size={17} />,
    },
    {
      id: "email-digest",
      title: "邮件今日速览",
      description: "把新邮件按需要回复、需要行动、等待结果和仅供了解分类。",
      schedule: "工作日 17:30",
      icon: <Mail size={17} />,
    },
    {
      id: "reply-check",
      title: "待回复事项检查",
      description: "找出邮件和消息里仍需要你回复、确认或补材料的对话。",
      schedule: "每天 16:00",
      icon: <MailCheck size={17} />,
    },
    {
      id: "meeting-prep",
      title: "今日会议准备",
      description: "提前整理今天重要会议的背景、议程和需要确认的问题。",
      schedule: "工作日 08:00",
      icon: <CalendarDays size={17} />,
    },
    {
      id: "weekly-progress",
      title: "每周项目进展汇总",
      description: "每周整理重点项目的进展、风险、阻塞和下一步。",
      schedule: "每周五 17:00",
      icon: <ChartNoAxesCombined size={17} />,
    },
    {
      id: "deadline-check",
      title: "截止事项提前检查",
      description: "提前发现未来两周的重要 Deadline，整理材料、依赖和风险。",
      schedule: "每周一 09:00",
      icon: <CalendarClock size={17} />,
    },
    {
      id: "unfinished-follow-up",
      title: "未完成事项跟进",
      description: "每周找出拖着没闭环的事，明确下一步或决定放弃。",
      schedule: "每周五 16:30",
      icon: <NotebookPen size={17} />,
    },
  ];

  useEffect(() => {
    setWorkspaceName(project?.name ?? "");
    setApplicationPickerOpen(false);
    setApplicationSearch("");
  }, [project?.id, project?.name]);
  useEffect(() => {
    if (activeTool) setRenderedTool(activeTool);
  }, [activeTool]);

  const clampPanelWidth = useCallback((width: number) => {
    const availableWidth = Math.max(320, window.innerWidth - 720);
    return Math.min(Math.max(width, 320), Math.min(680, availableWidth));
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = resizeStateRef.current.startWidth + resizeStateRef.current.startX - event.clientX;
      setPanelWidth(clampPanelWidth(nextWidth));
    };
    const handlePointerUp = () => setResizing(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [clampPanelWidth, resizing]);

  const tools: Array<{ key: ProjectWorkspaceTool; label: string; icon: React.ReactNode }> = [
    { key: "settings", label: "设置", icon: <Settings size={17} /> },
    { key: "files", label: isStandalone ? "文件" : "群组项目文件", icon: <HardDrive size={17} /> },
    { key: "skills", label: "Skill技能", icon: <Pickaxe size={17} /> },
    ...(isStandalone ? [{ key: "connections" as const, label: "IM连接", icon: <Split size={17} /> }] : []),
    { key: "schedules", label: "定时任务", icon: <Timer size={17} /> },
    { key: "runs", label: "运行记录", icon: <MonitorSmartphone size={17} /> },
  ];

  const toggleTool = (tool: ProjectWorkspaceTool) => {
    onActiveToolChange(activeTool === tool ? null : tool);
  };

  const commitWorkspaceName = () => {
    if (!project) return;
    const currentName = project.name;
    const nextName = workspaceName.trim();
    if (!nextName) {
      setWorkspaceName(currentName);
      return;
    }
    if (nextName === currentName) return;
    setWorkspaceName(nextName);
    onProjectNameChange?.(project.id, nextName);
  };

  const renderPanelContent = (tool: ProjectWorkspaceTool | null) => {
    if (tool === "connections" && isStandalone) {
      return (
        <WorkspaceDemoPanel title="IM 连接管理" onClose={() => onActiveToolChange(null)}>
          <div className="office-platform-panel">
            <span>接入即时通讯工具，为不同聊天指派数字员工自动响应</span>
            <div className="office-platform-list" aria-label="来自连接器市场">
              {officePlatformCatalog.map((platform) => {
                const connected = connectedOfficePlatforms.has(platform.id);
                return (
                  <article className="office-platform-card" key={platform.id}>
                    <span
                      className="office-platform-icon"
                      style={{ backgroundColor: platform.color }}
                      aria-hidden="true"
                    >
                      {platform.shortName}
                    </span>
                    <span className="office-platform-copy">
                      <span className="office-platform-title-row">
                        <strong>{platform.name}</strong>
                        <i aria-hidden="true" />
                        <em>{connected ? "已连接" : "未连接"}</em>
                      </span>
                      <small>{platform.description}</small>
                    </span>
                    <span className="office-platform-actions">
                      {!connected ? (
                        <Button
                          className="office-platform-connect"
                          size="small"
                          onClick={() => {
                            setConnectedOfficePlatforms((current) => new Set(current).add(platform.id));
                            setEnabledOfficePlatforms((current) => new Set(current).add(platform.id));
                          }}
                        >
                          连接
                        </Button>
                      ) : null}
                      {connected ? (
                        <>
                          <Tooltip title="解绑">
                            <Button
                              className="office-platform-unlink"
                              type="text"
                              size="small"
                              icon={<Link2Off size={16} />}
                              aria-label={`解绑${platform.name}`}
                              onClick={() => {
                                setConnectedOfficePlatforms((current) => {
                                  const next = new Set(current);
                                  next.delete(platform.id);
                                  return next;
                                });
                                setEnabledOfficePlatforms((current) => {
                                  const next = new Set(current);
                                  next.delete(platform.id);
                                  return next;
                                });
                              }}
                            />
                          </Tooltip>
                          <Switch
                            size="small"
                            checked={enabledOfficePlatforms.has(platform.id)}
                            aria-label={`${platform.name}${enabledOfficePlatforms.has(platform.id) ? "已启用" : "已停用"}`}
                            onChange={(checked) => setEnabledOfficePlatforms((current) => {
                              const next = new Set(current);
                              if (checked) next.add(platform.id);
                              else next.delete(platform.id);
                              return next;
                            })}
                          />
                        </>
                      ) : null}
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        </WorkspaceDemoPanel>
      );
    }

    if (tool === "skills") {
      const normalizedSkillSearch = skillSearch.trim().toLocaleLowerCase();
      const installedSkillIds = new Set(
        skillTarget
          ? skillInstallations
              .filter((installation) => (
                installation.targetType === skillTarget.type
                && installation.targetId === skillTarget.id
              ))
              .map((installation) => installation.skillId)
          : [],
      );
      const visibleSkills = skillCatalog.filter((skill) => {
        const matchesCategory = activeSkillCategory === "全部" || skill.category === activeSkillCategory;
        const matchesSearch = !normalizedSkillSearch
          || `${skill.name} ${skill.category} ${skill.description}`.toLocaleLowerCase().includes(normalizedSkillSearch);
        const matchesInstalled = !showInstalledSkills || installedSkillIds.has(skill.id);
        return matchesCategory && matchesSearch && matchesInstalled;
      });

      return (
        <WorkspaceDemoPanel title="Skill技能" onClose={() => onActiveToolChange(null)}>
          {skillTarget ? (
            <div className="application-skills-panel">
              <div className="application-skills-panel-controls">
                <Input
                  value={skillSearch}
                  suffix={<Search size={14} />}
                  placeholder="搜索 Skill"
                  allowClear
                  aria-label="搜索 Skill"
                  onChange={(event) => setSkillSearch(event.target.value)}
                />
                <div className="application-skills-panel-filters">
                  <ResponsiveSkillCategories
                    value={activeSkillCategory}
                    onChange={setActiveSkillCategory}
                  />
                  <button
                    className={`applications-category-pill${showInstalledSkills ? " is-active" : ""}`}
                    type="button"
                    aria-pressed={showInstalledSkills}
                    onClick={() => setShowInstalledSkills((current) => !current)}
                  >
                    我安装的
                  </button>
                </div>
              </div>
              <SkillCardCollection
                className="is-workspace-panel"
                emptyDescription="没有匹配的 Skill"
                skills={visibleSkills}
                onOpenSkill={setSelectedSkill}
                renderAction={(skill) => {
                  const installed = installedSkillIds.has(skill.id);
                  return (
                    <Button
                      className="skill-card-install"
                      size="small"
                      disabled={installed}
                      onClick={() => onInstallSkill(
                        skill,
                        skillTarget.type,
                        skillTarget.id,
                        skillTarget.name,
                      )}
                    >
                      {installed ? "已安装" : "安装"}
                    </Button>
                  );
                }}
              />
            </div>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可安装目标" />
          )}
        </WorkspaceDemoPanel>
      );
    }

    if (tool === "files") {
      if (isStandalone) {
        return (
          <TeamResourcesPanel
            groups={teamResourceGroups}
            onClose={() => onActiveToolChange(null)}
            onReferenceFile={onReferenceFile}
          />
        );
      }

      return (
        <ProjectFilesPanel
          project={project}
          conversations={conversations}
          files={files}
          onClose={() => onActiveToolChange(null)}
          onOpenConversation={onOpenConversation}
          onReferenceFile={onReferenceFile}
        />
      );
    }

    if (tool === "settings") {
      const profileApplication = standaloneApplication ?? applications[0] ?? null;
      const profileConversations = profileApplication
        ? conversations.filter((conversation) => (
            !conversation.projectId
            && getConversationCatalogApplication(conversation)?.id === profileApplication.id
          ))
        : [];
      const profileSkills = profileApplication
        ? skillCatalog.filter((skill) => isSkillInstalledAtTarget(
            skillInstallations,
            skill.id,
            "digital-employee",
            profileApplication.id,
          ))
        : [];
      const profileEnabledAt = new Date(2026, 8, 24);
      const today = new Date();
      const profileEnabledDays = Math.max(1, Math.floor((
        Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
        - Date.UTC(profileEnabledAt.getFullYear(), profileEnabledAt.getMonth(), profileEnabledAt.getDate())
      ) / 86_400_000) + 1);

      return (
        <WorkspaceDemoPanel
          className="project-settings-panel"
          bodyClassName="project-settings-body"
          title={isStandalone ? "资料概览" : "设置"}
          onClose={() => onActiveToolChange(null)}
        >
          {isStandalone ? (
            profileApplication ? (
              <div className="application-profile-overview">
                <ApplicationProfileSummary application={profileApplication} />

                <section className="application-profile-section">
                  <h4>工作概览</h4>
                  <div className="application-profile-stats">
                    <div><strong>{profileEnabledDays}</strong><span>启用天数</span></div>
                    <div><strong>0</strong><span>进行中</span></div>
                    <div><strong>{profileConversations.length}</strong><span>已完成</span></div>
                    <div><strong>0</strong><span>待处理</span></div>
                  </div>
                </section>

                <section className="application-profile-section">
                  <div className="application-profile-section-heading">
                    <h4>核心能力</h4>
                    <span>{applicationSkillTags[profileApplication.id].length} 项</span>
                  </div>
                  <div className="application-profile-capabilities">
                    {applicationSkillTags[profileApplication.id].map((capability) => (
                      <div key={capability}>
                        <span className="application-profile-check" aria-hidden="true"><Check size={13} /></span>
                        <span>{capability}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="application-profile-section">
                  <div className="application-profile-section-heading">
                    <h4>Skill技能</h4>
                    <span>{profileSkills.length} 项已安装</span>
                  </div>
                  {profileSkills.length ? (
                    <div className="application-profile-skills">
                      {profileSkills.map((skill) => {
                        const SkillIcon = skillIconCatalog[skill.icon];
                        return (
                          <div key={skill.id}>
                            <span className="application-profile-skill-icon" style={{ backgroundColor: skill.iconBackground, color: skill.iconColor }}>
                              <SkillIcon size={15} />
                            </span>
                            <span>{skill.name}</span>
                            <small>已安装</small>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="application-profile-empty">暂无已安装的 Skill</div>
                  )}
                </section>
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数字员工资料" />
            )
          ) : (
            <>
            <div className="project-settings-form-item">
              <label htmlFor="project-settings-name">群组项目名称</label>
              <Input
                id="project-settings-name"
                value={workspaceName}
                placeholder="请输入"
                onChange={(event) => setWorkspaceName(event.target.value)}
                onBlur={commitWorkspaceName}
                onPressEnter={(event) => event.currentTarget.blur()}
              />
            </div>

            <div className="project-settings-form-item">
              <div className="project-settings-label">
                <span>群组项目成员</span>
                <Tooltip title="添加群组项目成员（演示）">
                  <Button type="text" size="small" icon={<CirclePlus size={16} />} aria-label="添加群组项目成员" />
                </Tooltip>
              </div>
              <div className="project-settings-people" aria-label="群组项目成员列表">
                {currentProjectMembers.map((member) => (
                  <div className="project-settings-person" key={member.id}>
                    <Tooltip title={member.name}>
                      <span className="project-settings-avatar-trigger">
                        <InitialAvatar name={member.name} color={member.avatarColor} />
                      </span>
                    </Tooltip>
                    <span className="project-settings-person-name" title={member.name}>{member.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="project-settings-form-item">
              <div className="project-settings-label">
                <span>数字员工</span>
                <Dropdown
                  trigger={["click"]}
                  placement="bottomRight"
                  open={applicationPickerOpen}
                  onOpenChange={(open) => {
                    setApplicationPickerOpen(open);
                    if (!open) setApplicationSearch("");
                  }}
                  menu={{ items: [] }}
                  popupRender={() => (
                    <div
                      className="project-settings-application-picker"
                      role="dialog"
                      aria-label="添加数字员工"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Input
                        className="create-project-application-search"
                        autoFocus
                        value={applicationSearch}
                        prefix={<Search size={14} />}
                        placeholder="搜索数字员工"
                        aria-label="搜索数字员工"
                        allowClear
                        onChange={(event) => setApplicationSearch(event.target.value)}
                      />
                      <div className="create-project-application-list">
                        {visibleCreatedApplications.map((application) => (
                          <label className="create-project-application" key={application.id}>
                            <img className="create-project-application-cover" src={application.avatar} alt="" />
                            <span className="create-project-application-copy">
                              <span className="font-strong">{application.name}</span>
                              <small>{application.description}</small>
                            </span>
                            <Checkbox
                              checked={false}
                              aria-label={`添加${application.name}`}
                              onChange={() => onProjectApplicationsChange?.([
                                ...applications.map((item) => item.id),
                                application.id,
                              ])}
                            />
                          </label>
                        ))}
                        {visibleCreatedApplications.length === 0 ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={normalizedApplicationSearch
                              ? "没有匹配的数字员工"
                              : "暂无可添加的数字员工"}
                          />
                        ) : null}
                      </div>
                    </div>
                  )}
                >
                  <Tooltip title={applicationPickerOpen ? null : "添加数字员工"}>
                    <Button type="text" size="small" icon={<CirclePlus size={16} />} aria-label="添加数字员工" />
                  </Tooltip>
                </Dropdown>
              </div>
              <div className="project-settings-people" aria-label="数字员工列表">
                {applications.map((application) => (
                  <div className="project-settings-person" key={application.id}>
                    <Tooltip title={application.name}>
                      <span className="project-settings-avatar-trigger">
                        <Avatar className="application-avatar-surface" size={24} src={application.avatar} />
                      </span>
                    </Tooltip>
                    <span className="project-settings-person-name" title={application.name}>{application.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            <div className="project-settings-danger">
              <div>
                <strong>删除群组项目</strong>
                <span>删除后不可找回，群组项目成员也将无法继续访问</span>
              </div>
              <Tooltip title="删除群组项目（演示）">
                <Button danger icon={<Trash2 size={16} />} aria-label="删除群组项目（演示）" />
              </Tooltip>
            </div>
            </>
          )}
        </WorkspaceDemoPanel>
      );
    }

    if (tool === "schedules") {
      const activeSchedules = [
        {
          id: "weekend-plan",
          title: "周末安排推荐",
          schedule: "每周五 09:00",
          icon: <Timer size={17} />,
        },
        ...manualScheduledTasks
          .filter((task) => task.projectId === scheduleTargetId)
          .map((task) => ({
            id: task.id,
            title: task.title,
            schedule: task.cadence,
            icon: <Timer size={17} />,
          })),
      ];

      return (
        <>
        <WorkspaceDemoPanel
          title="定时任务"
          bodyClassName="workspace-schedule-body"
          onClose={() => onActiveToolChange(null)}
        >
          <div className="workspace-schedule-panel">
            <section className="workspace-schedule-section" aria-labelledby="active-schedules-title">
              <div className="workspace-schedule-section-header">
                <h4 id="active-schedules-title">进行中</h4>
                <Button
                  type="link"
                  size="small"
                  icon={<Plus size={14} />}
                  onClick={() => setManualScheduleModalOpen(true)}
                >
                  手动创建
                </Button>
              </div>
              <div className="workspace-schedule-list">
                {activeSchedules.map((schedule) => (
                  <article className="workspace-schedule-item workspace-schedule-item-active" key={schedule.id}>
                    <span className="workspace-schedule-icon" aria-hidden="true">{schedule.icon}</span>
                    <div className="workspace-schedule-copy">
                      <strong>{schedule.title}</strong>
                    </div>
                    <span className="workspace-schedule-time">{schedule.schedule}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="workspace-schedule-section" aria-labelledby="recommended-schedules-title">
              <h4 id="recommended-schedules-title">为你推荐</h4>
              <div className="workspace-schedule-list">
                  {scheduleTemplates.map((schedule) => (
                    <button
                      className="workspace-schedule-item workspace-schedule-item-action"
                      key={schedule.id}
                      type="button"
                      aria-label={`填充${schedule.title}到对话输入框`}
                      onClick={() => onFillComposerPrompt(
                        `请创建“${schedule.title}”定时任务：${schedule.description} 执行时间：${schedule.schedule}。`,
                      )}
                    >
                      <span className="workspace-schedule-icon" aria-hidden="true">{schedule.icon}</span>
                      <div className="workspace-schedule-copy">
                        <strong>{schedule.title}</strong>
                        <span>{schedule.description}</span>
                      </div>
                      <span className="workspace-schedule-add" aria-hidden="true"><Plus size={16} /></span>
                    </button>
                  ))}
                </div>
            </section>
          </div>
        </WorkspaceDemoPanel>
        <ScheduledTaskModal
          open={manualScheduleModalOpen}
          onCancel={() => setManualScheduleModalOpen(false)}
          onCreate={createManualScheduledTask}
        />
        </>
      );
    }

    if (tool === "runs") {
      const getRunMessageText = (message?: DemoMessage) => {
        if (!message) return "";
        if (typeof message.content === "string") return message.content.trim();
        return message.content
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n")
          .trim();
      };
      const getMessageApplicationId = (message?: DemoMessage) => {
        const value = message?.metadata?.custom?.catalogApplicationId;
        return typeof value === "string" ? value : undefined;
      };
      let selectedAssistantIndex = -1;
      if (runStageSelection) {
        for (let index = activeConversation.messages.length - 1; index >= 0; index -= 1) {
          const message = activeConversation.messages[index];
          if (
            message.role === "assistant"
            && getMessageApplicationId(message) === runStageSelection.applicationId
          ) {
            selectedAssistantIndex = index;
            break;
          }
        }
      }
      const selectedAssistantMessage = selectedAssistantIndex >= 0
        ? activeConversation.messages[selectedAssistantIndex]
        : [...activeConversation.messages].reverse().find((message) => message.role === "assistant");
      const selectedPromptMessage = selectedAssistantIndex >= 0
        ? [...activeConversation.messages.slice(0, selectedAssistantIndex)]
          .reverse()
          .find((message) => message.role === "user")
        : activeConversation.messages.find((message) => message.role === "user");
      const activeApplicationName = runStageSelection?.name ?? applications[0]?.name ?? "数字员工";
      const runPrompt = getRunMessageText(
        selectedPromptMessage,
      ) || "请根据当前对话内容执行任务并返回结果。";
      const runResult = getRunMessageText(selectedAssistantMessage)
        || "任务正在处理中，完成后将在这里展示运行结果。";
      const runTitle = runStageSelection
        ? `${runStageSelection.taskTitle} · 第 ${runStageSelection.stageIndex + 1} 阶段`
        : activeConversation.title === "新对话" ? "当前对话任务" : activeConversation.title;
      const runStatus = runStageSelection
        ? taskParticipantStatusCopy[runStageSelection.status]
        : "已完成";
      return (
        <section className="project-workspace-demo-panel project-run-panel" aria-label="运行记录面板">
          <WorkspacePanelHeader
            title="任务详情"
            titleAccessory={(
              <span className="project-run-header-status">
                {runStageSelection?.status === "success" || !runStageSelection
                  ? <CircleCheck size={14} />
                  : <Timer size={14} />}
                {runStatus}
              </span>
            )}
            onClose={() => onActiveToolChange(null)}
          />
          <div className="project-run-body">
            <article className="project-run-task-card">
              <header>
                <span className="project-run-task-icon"><FileCheck2 size={16} /></span>
                <strong>{runTitle}</strong>
                <Tag variant="filled" icon={<Bot size={12} />}>Agent</Tag>
              </header>
              <p>{runPrompt}</p>
              <footer>
                <span>{runStageSelection ? `第 ${runStageSelection.stageIndex + 1} 阶段` : "开始时间 今天 11:23"}</span>
                <i aria-hidden="true" />
                <span>{activeApplicationName}</span>
              </footer>
            </article>

            <section className="project-run-result-card" aria-label="任务运行结果">
              <button
                className="project-run-result-toggle"
                type="button"
                aria-expanded={runResultExpanded}
                onClick={() => setRunResultExpanded((expanded) => !expanded)}
              >
                <span>已处理 2 分 47 秒</span>
                <ChevronRight className={runResultExpanded ? "is-expanded" : undefined} size={14} />
              </button>
              {runResultExpanded ? (
                <div className="project-run-result-content">
                  <strong>{activeApplicationName}</strong>
                  <p>{runResult}</p>
                </div>
              ) : null}
            </section>
          </div>
        </section>
      );
    }

    return (
      <WorkspaceDemoPanel title="运行记录" onClose={() => onActiveToolChange(null)}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无运行记录" />
      </WorkspaceDemoPanel>
    );
  };

  const selectedSkillInstalled = Boolean(
    selectedSkill
    && skillTarget
    && isSkillInstalledAtTarget(
      skillInstallations,
      selectedSkill.id,
      skillTarget.type,
      skillTarget.id,
    ),
  );

  return (
    <>
    <aside className={`project-workspace${activeTool ? " is-open" : ""}${resizing ? " is-resizing" : ""}`} aria-label={isStandalone ? "数字员工工作区工具" : "群组项目工作区工具"}>
      <nav className="project-workspace-toolbar" aria-label={isStandalone ? "数字员工工作区导航" : "群组项目工作区导航"}>
        {tools.map((tool) => (
          <Tooltip key={tool.key} placement="left" title={tool.label}>
            <Button
              className={activeTool === tool.key ? "is-active" : undefined}
              type="text"
              icon={tool.icon}
              aria-label={tool.label}
              aria-pressed={activeTool === tool.key}
              onClick={() => toggleTool(tool.key)}
            />
          </Tooltip>
        ))}
      </nav>
      <div
        className="project-workspace-resizer"
        role="separator"
        aria-label="调整群组项目工作区宽度"
        aria-orientation="vertical"
        aria-valuemin={320}
        aria-valuemax={680}
        aria-valuenow={Math.round(panelWidth)}
        aria-hidden={!activeTool}
        tabIndex={activeTool ? 0 : -1}
        onKeyDown={(event) => {
          if (!activeTool || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
          event.preventDefault();
          setPanelWidth((current) => clampPanelWidth(current + (event.key === "ArrowLeft" ? 24 : -24)));
        }}
        onPointerDown={(event) => {
          if (!activeTool) return;
          event.preventDefault();
          resizeStateRef.current = { startX: event.clientX, startWidth: panelWidth };
          setResizing(true);
        }}
      ><span /></div>
      <div
        className="project-workspace-panel-shell"
        aria-hidden={!activeTool}
        style={{
          width: activeTool ? panelWidth : 0,
          "--project-workspace-panel-width": `${panelWidth}px`,
        } as CSSProperties}
      >
        <div className="project-workspace-panel">
          {renderPanelContent(activeTool ?? renderedTool)}
        </div>
      </div>
    </aside>
    <SkillDetailModal
      skill={selectedSkill}
      onClose={() => setSelectedSkill(null)}
      action={selectedSkill && skillTarget ? (
        <Button
          type="primary"
          block
          disabled={selectedSkillInstalled}
          onClick={() => onInstallSkill(
            selectedSkill,
            skillTarget.type,
            skillTarget.id,
            skillTarget.name,
          )}
        >
          {selectedSkillInstalled ? "已安装" : "安装"}
        </Button>
      ) : null}
    />
    </>
  );
}

function WorkspaceDemoPanel({
  bodyClassName,
  children,
  className,
  title,
  onClose,
}: {
  bodyClassName?: string;
  children: React.ReactNode;
  className?: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <section className={`project-workspace-demo-panel${className ? ` ${className}` : ""}`} aria-label={`${title}面板`}>
      <WorkspacePanelHeader title={title} onClose={onClose} />
      <div className={`project-workspace-demo-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
    </section>
  );
}

function WorkspacePanelHeader({
  title,
  titleAccessory,
  onClose,
}: {
  title: string;
  titleAccessory?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <header className="project-workspace-panel-header">
      <div className="project-workspace-panel-heading">
        <h5>{title}</h5>
        {titleAccessory}
      </div>
      <Button
        className="project-workspace-panel-close"
        type="text"
        size="small"
        icon={<X size={16} />}
        aria-label={`关闭${title}`}
        onClick={onClose}
      />
    </header>
  );
}

function TeamResourcesPanel({
  groups,
  onClose,
  onReferenceFile,
}: {
  groups: TeamResourceGroup[];
  onClose: () => void;
  onReferenceFile?: (file: SelectedFile) => void;
}) {
  const { message: antMessage, modal } = AntApp.useApp();
  const [resourceGroups, setResourceGroups] = useState(groups);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
    () => new Set(groups.map((group) => group.id)),
  );
  const [selectedResource, setSelectedResource] = useState<TeamResource | null>(null);
  const [renameResource, setRenameResource] = useState<TeamResource | null>(null);
  const [renameResourceName, setRenameResourceName] = useState("");

  const createResourceFile = (resource: TeamResource) => {
    const explorerFile = createTeamResourceExplorerFile(resource);
    return createSelectedFile(new File([explorerFile.content], explorerFile.name, { type: explorerFile.mimeType }), "resource");
  };

  const commitResourceRename = () => {
    if (!renameResource) return;
    const name = renameResourceName.trim();
    if (!name) {
      antMessage.warning("请输入文件名称");
      return;
    }
    setResourceGroups((current) => current.map((group) => ({
      ...group,
      resources: group.resources.map((resource) => resource.id === renameResource.id ? { ...resource, name } : resource),
    })));
    if (selectedResource?.id === renameResource.id) setSelectedResource({ ...selectedResource, name });
    setRenameResource(null);
    antMessage.success("文件已重命名");
  };

  const confirmResourceDelete = (resource: TeamResource) => {
    modal.confirm({
      title: `删除“${resource.name}”？`,
      content: "删除后，该资源将从当前列表移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setResourceGroups((current) => current.map((group) => ({
          ...group,
          resources: group.resources.filter((item) => item.id !== resource.id),
        })));
        if (selectedResource?.id === resource.id) setSelectedResource(null);
        antMessage.success("文件已删除");
      },
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <aside className="project-files-panel team-resources-panel" aria-label="团队资源">
      <WorkspacePanelHeader title="团队资源" onClose={onClose} />
      <div className="project-files-panel-body team-resources-panel-body">
        {selectedResource ? (
          <section className="work-file-preview team-resource-preview" aria-label={`${selectedResource.name}文件预览`}>
            <header className="work-file-preview-header">
              <Button type="text" icon={<ArrowLeft size={17} />} aria-label="返回团队资源" onClick={() => setSelectedResource(null)} />
              <span className="work-file-preview-icon">
                <FileTypeIcon type={FILE_TYPE_ICON_BY_EXTENSION[selectedResource.name.split(".").pop()?.toLocaleLowerCase() ?? ""] ?? "other"} />
              </span>
              <div className="work-file-preview-title">
                <span className="font-strong">{selectedResource.name}</span>
                <small>{selectedResource.updatedAt}</small>
              </div>
              <Space className="work-file-preview-actions" size={2}>
                {onReferenceFile ? (
                  <Tooltip title="引用该资源">
                    <Button
                      type="text"
                      icon={<Paperclip size={16} />}
                      aria-label={`引用${selectedResource.name}`}
                      onClick={() => onReferenceFile(createResourceFile(selectedResource))}
                    />
                  </Tooltip>
                ) : null}
                <Tooltip title="下载">
                  <Button
                    type="text"
                    icon={<Download size={16} />}
                    aria-label={`下载${selectedResource.name}`}
                    onClick={() => downloadExplorerFile(createTeamResourceExplorerFile(selectedResource))}
                  />
                </Tooltip>
              </Space>
            </header>
            <div className="work-file-preview-body">
              <ExplorerFilePreviewContent file={createTeamResourceExplorerFile(selectedResource)} />
            </div>
          </section>
        ) : (
        <div className="team-resource-groups" aria-label="团队资源分类">
          {resourceGroups.map((group) => {
            const expanded = expandedGroupIds.has(group.id);
            return (
              <section className="team-resource-group" key={group.id} aria-label={group.name}>
                <button className="work-folder-row work-root-row" type="button" onClick={() => toggleGroup(group.id)}>
                  {expanded
                    ? <ChevronDown className="work-folder-disclosure" size={12} />
                    : <ChevronRight className="work-folder-disclosure" size={12} />}
                  <FileTypeIcon type="folder" />
                  <span>{group.name}</span>
                  <small>{group.resources.length}</small>
                </button>
                {expanded ? (
                  <div className="team-resource-group-files">
                    {group.resources.map((resource) => {
                      const extension = resource.name.split(".").pop()?.toLocaleLowerCase() ?? "";
                      const referenceResource = () => onReferenceFile?.(createResourceFile(resource));
                      const explorerFile = createTeamResourceExplorerFile(resource);
                      const menuItems: MenuProps["items"] = [
                        { key: "open", label: "打开文件", onClick: () => setSelectedResource(resource) },
                        onReferenceFile ? { key: "reference", icon: <Paperclip size={14} />, label: "引用该资源", onClick: referenceResource } : null,
                        {
                          key: "rename",
                          label: "重命名",
                          onClick: () => {
                            setRenameResource(resource);
                            setRenameResourceName(resource.name);
                          },
                        },
                        { key: "download", label: "下载", onClick: () => downloadExplorerFile(explorerFile) },
                        { type: "divider" },
                        { key: "delete", label: "删除", danger: true, onClick: () => confirmResourceDelete(resource) },
                      ];
                      return (
                        <div
                          className="work-file-row team-resource-file-row"
                          style={{ "--tree-depth": 1 } as React.CSSProperties}
                          key={resource.id}
                        >
                          <button
                            className="work-file-main team-resource-static-file"
                            type="button"
                            onClick={() => setSelectedResource(resource)}
                          >
                            <span className="work-file-type">
                              <FileTypeIcon type={FILE_TYPE_ICON_BY_EXTENSION[extension] ?? "other"} />
                            </span>
                            <span className="work-file-copy"><span>{resource.name}</span></span>
                          </button>
                          <div className="work-file-tail">
                            <small className="work-file-time">{resource.updatedAt}</small>
                            <div className="work-file-actions">
                              <Tooltip title="下载">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<Download size={15} />}
                                  aria-label={`下载${resource.name}`}
                                  onClick={() => downloadExplorerFile(explorerFile)}
                                />
                              </Tooltip>
                              <Dropdown trigger={["click"]} menu={{ items: menuItems }}>
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<MoreHorizontal size={15} />}
                                  aria-label={`${resource.name}更多操作`}
                                />
                              </Dropdown>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
        )}
      </div>
      <Modal
        title="重命名文件"
        open={Boolean(renameResource)}
        okText="保存"
        cancelText="取消"
        onOk={commitResourceRename}
        onCancel={() => setRenameResource(null)}
      >
        <Input
          autoFocus
          value={renameResourceName}
          onChange={(event) => setRenameResourceName(event.target.value)}
          onPressEnter={commitResourceRename}
        />
      </Modal>
    </aside>
  );
}

function ResponsiveApplicationCategories({
  ariaLabel = "应用分类",
  value,
  onChange,
}: {
  ariaLabel?: string;
  value: ApplicationCategory;
  onChange: (category: ApplicationCategory) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(applicationCategories.length);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    let frameId = 0;
    const updateVisibleCount = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const itemWidths = Array.from(measure.querySelectorAll<HTMLElement>(".ant-segmented-item"))
          .map((item) => item.getBoundingClientRect().width);
        if (itemWidths.length !== applicationCategories.length) return;

        const itemGap = 4;
        const totalWidth = itemWidths.reduce((sum, width) => sum + width, 0)
          + itemGap * (itemWidths.length - 1);
        if (totalWidth <= container.clientWidth) {
          setVisibleCount(applicationCategories.length);
          return;
        }

        const overflowButtonWidth = 36;
        const availableWidth = Math.max(0, container.clientWidth - overflowButtonWidth - itemGap);
        let usedWidth = 0;
        let nextVisibleCount = 0;
        for (const itemWidth of itemWidths) {
          const nextWidth = usedWidth + (nextVisibleCount ? itemGap : 0) + itemWidth;
          if (nextWidth > availableWidth) break;
          usedWidth = nextWidth;
          nextVisibleCount += 1;
        }
        setVisibleCount(Math.max(1, nextVisibleCount));
      });
    };

    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(container);
    updateVisibleCount();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const visibleCategories = applicationCategories.slice(0, visibleCount);
  const overflowCategories = applicationCategories.slice(visibleCount);
  const visibleValue = visibleCategories.includes(value) ? value : undefined;

  return (
    <div className="applications-category-shell" ref={containerRef}>
      <Segmented<ApplicationCategory>
        className="applications-category-tabs"
        value={visibleValue}
        options={[...visibleCategories]}
        onChange={onChange}
        aria-label={ariaLabel}
      />
      {overflowCategories.length ? (
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={{
            items: overflowCategories.map((category) => ({
              key: category,
              label: (
                <span className="applications-category-overflow-item">
                  <span>{category}</span>
                  {value === category ? <Check className="applications-category-selected-icon" size={14} /> : null}
                </span>
              ),
            })),
            onClick: ({ key }) => onChange(key as ApplicationCategory),
          }}
        >
          <Button
            className={`applications-category-more${overflowCategories.includes(value) ? " is-selected" : ""}`}
            type="text"
            size="small"
            icon={<ChevronDown size={14} />}
            aria-label="更多应用分类"
          />
        </Dropdown>
      ) : null}
      <div className="applications-category-measure" ref={measureRef} aria-hidden="true">
        <Segmented<ApplicationCategory>
          className="applications-category-tabs"
          options={[...applicationCategories]}
        />
      </div>
    </div>
  );
}

function ResponsiveCategoryPills<Category extends string>({
  categories,
  ariaLabel,
  value,
  onChange,
  className = "applications-category-pills",
}: {
  categories: readonly Category[];
  ariaLabel: string;
  value: Category;
  onChange: (category: Category) => void;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState<number>(categories.length);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    let frameId = 0;
    const updateVisibleCount = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const itemWidths = Array.from(measure.querySelectorAll<HTMLElement>(".applications-category-pill"))
          .map((item) => item.getBoundingClientRect().width);
        if (itemWidths.length !== categories.length) return;

        const itemGap = 6;
        const totalWidth = itemWidths.reduce((sum, width) => sum + width, 0)
          + itemGap * (itemWidths.length - 1);
        if (totalWidth <= container.clientWidth) {
          setVisibleCount(categories.length);
          return;
        }

        const overflowButtonWidth = 32;
        const availableWidth = Math.max(0, container.clientWidth - overflowButtonWidth - itemGap);
        let usedWidth = 0;
        let nextVisibleCount = 0;
        for (const itemWidth of itemWidths) {
          const nextWidth = usedWidth + (nextVisibleCount ? itemGap : 0) + itemWidth;
          if (nextWidth > availableWidth) break;
          usedWidth = nextWidth;
          nextVisibleCount += 1;
        }
        setVisibleCount(Math.max(1, nextVisibleCount));
      });
    };

    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(container);
    updateVisibleCount();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [categories]);

  const visibleCategories = categories.slice(0, visibleCount);
  const overflowCategories = categories.slice(visibleCount);

  return (
    <div className={className} ref={containerRef} role="group" aria-label={ariaLabel}>
      {visibleCategories.map((category) => (
        <button
          className={`applications-category-pill${value === category ? " is-active" : ""}`}
          key={category}
          type="button"
          aria-pressed={value === category}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
      {overflowCategories.length ? (
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          menu={{
            items: overflowCategories.map((category) => ({
              key: category,
              label: (
                <span className="applications-category-overflow-item">
                  <span>{category}</span>
                  {value === category ? <Check className="applications-category-selected-icon" size={14} /> : null}
                </span>
              ),
            })),
            onClick: ({ key }) => onChange(key as Category),
          }}
        >
          <Button
            className={`applications-category-more${overflowCategories.includes(value) ? " is-selected" : ""}`}
            type="text"
            size="small"
            icon={<ChevronDown size={14} />}
            aria-label={`更多${ariaLabel}`}
          />
        </Dropdown>
      ) : null}
      <div className="applications-category-pill-measure" ref={measureRef} aria-hidden="true">
        {categories.map((category) => (
          <button className="applications-category-pill" key={category} type="button">{category}</button>
        ))}
      </div>
    </div>
  );
}

function ResponsiveSkillCategories({
  value,
  onChange,
}: {
  value: SkillCategory;
  onChange: (category: SkillCategory) => void;
}) {
  return (
    <ResponsiveCategoryPills
      categories={skillCategories}
      ariaLabel="Skill分类"
      value={value}
      onChange={onChange}
      className="application-skills-panel-category-shell"
    />
  );
}

function SkillCardCollection({
  skills,
  renderAction,
  onOpenSkill,
  emptyDescription,
  className = "",
}: {
  skills: SkillDefinition[];
  renderAction: (skill: SkillDefinition) => React.ReactNode;
  onOpenSkill: (skill: SkillDefinition) => void;
  emptyDescription: string;
  className?: string;
}) {
  if (!skills.length) {
    return <Empty className="applications-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyDescription} />;
  }

  return (
    <div className={`skill-grid${className ? ` ${className}` : ""}`}>
      {skills.map((skill) => {
        const SkillIcon = skillIconCatalog[skill.icon];
        return (
          <article
            className="skill-card"
            key={skill.id}
            role="button"
            tabIndex={0}
            aria-label={`查看${skill.name}详情`}
            onClick={() => onOpenSkill(skill)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onOpenSkill(skill);
            }}
          >
            <span className="skill-card-icon" style={{ backgroundColor: skill.iconBackground, color: skill.iconColor }} aria-hidden="true">
              <SkillIcon size={16} />
            </span>
            <div className="skill-card-body">
              <div className="skill-card-heading">
                <span className="skill-card-title">{skill.name}</span>
                <span
                  className="skill-card-action"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {renderAction(skill)}
                </span>
              </div>
              <p className="skill-card-description">{skill.description}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function SkillDetailModal({
  action,
  onClose,
  skill,
}: {
  action?: React.ReactNode;
  onClose: () => void;
  skill: SkillDefinition | null;
}) {
  if (!skill) return null;
  const SkillIcon = skillIconCatalog[skill.icon];
  const detail = skillDetailCatalog[skill.id];

  return (
    <Modal
      className="skill-detail-modal"
      open
      centered
      width={680}
      title={null}
      onCancel={onClose}
      footer={action ? <div className="skill-detail-footer-action">{action}</div> : null}
      destroyOnHidden
    >
      <header className="skill-detail-header">
        <span className="skill-detail-icon" style={{ backgroundColor: skill.iconBackground, color: skill.iconColor }} aria-hidden="true">
          <SkillIcon size={30} />
        </span>
        <div className="skill-detail-identity">
          <div className="skill-detail-title-row">
            <h2>{skill.name}</h2>
          </div>
          <p>{skill.description}</p>
        </div>
      </header>
      <Divider />
      <section className="skill-detail-section">
        <h3>详细介绍</h3>
        <p>{skill.description}该 Skill 会结合当前对话和工作区上下文，输出清晰、可继续编辑的结果。</p>
      </section>
      <section className="skill-detail-section">
        <h3>核心能力</h3>
        <div className="skill-detail-capabilities">
          {detail.capabilities.map((capability) => (
            <div key={capability}>
              <span className="skill-detail-check" aria-hidden="true"><Check size={14} /></span>
              <span>{capability}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="skill-detail-section">
        <h3>使用说明</h3>
        <div className="skill-detail-usage">
          <strong>适用场景</strong>
          <p>{detail.usage}</p>
          <strong>如何使用</strong>
          <p>安装后，在对应数字员工或群组项目的对话中直接描述任务，系统会按需调用此 Skill。</p>
        </div>
      </section>
    </Modal>
  );
}

function DigitalEmployeeDetailModal({
  application,
  onClose,
  onCreate,
}: {
  application: CatalogApplication | null;
  onClose: () => void;
  onCreate: (application: CatalogApplication) => void;
}) {
  if (!application) return null;
  const capabilities = applicationSkillTags[application.id];

  return (
    <Modal
      className="skill-detail-modal digital-employee-detail-modal"
      open
      centered
      width={680}
      title={null}
      onCancel={onClose}
      footer={(
        <div className="skill-detail-footer-action">
          <Button
            type="primary"
            block
            onClick={() => {
              onClose();
              onCreate(application);
            }}
          >
            创建
          </Button>
        </div>
      )}
      destroyOnHidden
    >
      <header className="skill-detail-header">
        <Avatar className="digital-employee-detail-avatar" size={56} src={application.avatar} />
        <div className="skill-detail-identity">
          <div className="skill-detail-title-row">
            <h2>{application.name}</h2>
          </div>
          <p>{application.description}</p>
        </div>
      </header>
      <Divider />
      <section className="skill-detail-section">
        <h3>详细介绍</h3>
        <p>{application.description}该数字员工会结合当前对话与工作区上下文，协助完成专业任务并输出可继续编辑的结果。</p>
      </section>
      <section className="skill-detail-section">
        <h3>核心能力</h3>
        <div className="skill-detail-capabilities">
          {capabilities.map((capability) => (
            <div key={capability}>
              <span className="skill-detail-check" aria-hidden="true"><Check size={14} /></span>
              <span>{capability}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="skill-detail-section">
        <h3>使用说明</h3>
        <div className="skill-detail-usage">
          <strong>适用场景</strong>
          <p>适用于{application.category}相关的日常协作、内容处理与专业任务。</p>
          <strong>如何使用</strong>
          <p>创建后进入该数字员工的独立对话，直接描述目标、补充必要背景或上传相关资料。</p>
        </div>
      </section>
    </Modal>
  );
}

function CreateDigitalEmployeeModal({
  application,
  onCancel,
  onCreate,
}: {
  application: CatalogApplication | null;
  onCancel: () => void;
  onCreate: (application: CatalogApplication) => void;
}) {
  const aliasInputRef = useRef<InputRef>(null);
  if (!application) return null;

  return (
    <Modal
      className="create-digital-employee-modal"
      open
      centered
      width={400}
      title={null}
      onCancel={onCancel}
      footer={null}
      closable={false}
      classNames={{ mask: "create-digital-employee-mask" }}
      afterOpenChange={(open) => {
        if (open) aliasInputRef.current?.focus({ cursor: "end" });
      }}
      destroyOnHidden
    >
      <div className="create-digital-employee-card">
        <img
          className="create-digital-employee-decoration"
          src={getPublicAssetPath("backgrounds/create-digital-employee-header.png")}
          alt=""
          aria-hidden="true"
        />
        <button
          className="create-digital-employee-close"
          type="button"
          aria-label="取消创建数字员工"
          onClick={onCancel}
        >
          <X size={20} />
        </button>

        <section className="create-digital-employee-profile" aria-label={`${application.name}概览`}>
          <div className="application-profile-photo-card">
            <img src={application.avatar} alt="" />
            <span title={application.id}>ID: {application.id}</span>
          </div>
          <div className="create-digital-employee-identity">
            <h2>{application.name}</h2>
            <p>{application.description}</p>
          </div>
        </section>

        <div className="create-digital-employee-capabilities">
          <span>我擅长：</span>
          <div>
            {applicationSkillTags[application.id].map((capability, index) => (
              <span key={capability}>
                {index > 0 ? <i aria-hidden="true">·</i> : null}
                {capability}
              </span>
            ))}
          </div>
        </div>

        <label className="create-digital-employee-alias">
          <span>称呼：</span>
          <Input
            variant="borderless"
            aria-label="数字员工称呼"
            placeholder="请输入称呼"
            autoFocus
            ref={aliasInputRef}
          />
        </label>

        <Button
          className="create-digital-employee-submit"
          type="primary"
          block
          onClick={() => {
            onCancel();
            onCreate(application);
          }}
        >
          创建数字员工
        </Button>
      </div>
    </Modal>
  );
}

type OverviewTaskStatus = ConversationTaskState["status"] | "complete";
type OverviewStatusFilter = "all" | OverviewTaskStatus | "attention" | "completed";

type OverviewTaskRow = {
  conversation: Conversation;
  ownerName: string;
  projectName: string;
  status: OverviewTaskStatus;
  title: string;
  updatedAt: string;
};

function OverviewHome({
  conversations,
  projects,
  tasks,
  onOpenConversation,
}: {
  conversations: Conversation[];
  projects: Project[];
  tasks: ConversationTaskState[];
  onOpenConversation: (conversationId: string) => void;
}) {
  const [attentionTab, setAttentionTab] = useState<"attention" | "results">("attention");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "project" | "employee">("all");
  const [status, setStatus] = useState<OverviewStatusFilter>("all");
  const [period, setPeriod] = useState<"week" | "month" | "all">("month");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const taskByConversation = useMemo(
    () => new Map(tasks.map((task) => [task.conversationId, task])),
    [tasks],
  );
  const rows = useMemo<OverviewTaskRow[]>(() => conversations
    .map((conversation) => {
      const task = taskByConversation.get(conversation.id);
      const application = getConversationCatalogApplication(conversation);
      const project = conversation.projectId
        ? projects.find((item) => item.id === conversation.projectId)
        : undefined;
      return {
        conversation,
        ownerName: task?.ownerName
          ?? application?.name
          ?? agents.find((agent) => agent.id === conversation.agentId)?.name
          ?? "数字员工",
        projectName: project?.name ?? "独立数字员工",
        status: (task?.status ?? "complete") as OverviewTaskStatus,
        title: task?.title ?? conversation.title,
        updatedAt: conversation.updatedAt,
      };
    })
    .sort((left, right) => (
      getNavigationUpdatedAtSortValue(right.updatedAt)
      - getNavigationUpdatedAtSortValue(left.updatedAt)
    )), [conversations, projects, taskByConversation]);

  const periodRows = rows.filter((row) => {
    const ageDays = getConversationAgeDays(row.updatedAt);
    if (period === "week") return ageDays <= 7;
    if (period === "month") return ageDays <= 30;
    return true;
  });
  const runningCount = periodRows.filter((row) => row.status === "running").length;
  const attentionRows = periodRows.filter((row) => row.status === "waiting" || row.status === "error");
  const completedRows = periodRows.filter((row) => row.status === "success" || row.status === "complete");
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const filteredRows = rows.filter((row) => {
    if (normalizedQuery && !`${row.title} ${row.ownerName} ${row.projectName}`.toLocaleLowerCase("zh-CN").includes(normalizedQuery)) return false;
    if (scope === "project" && row.conversation.projectId === null) return false;
    if (scope === "employee" && row.conversation.projectId !== null) return false;
    if (status === "attention" && row.status !== "waiting" && row.status !== "error") return false;
    if (status === "completed" && row.status !== "success" && row.status !== "complete") return false;
    if (status !== "all" && status !== "attention" && status !== "completed" && row.status !== status) return false;
    return periodRows.includes(row);
  });
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const spotlightRows = attentionTab === "attention" ? attentionRows : completedRows.slice(0, 4);
  const statusCopy: Record<OverviewTaskStatus, string> = {
    running: "执行中",
    waiting: "需要操作",
    success: "已完成",
    error: "执行失败",
    complete: "已结束",
  };

  useEffect(() => {
    if (attentionRows.length === 0 && completedRows.length > 0) setAttentionTab("results");
  }, [attentionRows.length, completedRows.length]);

  useEffect(() => {
    setPage(1);
  }, [query, scope, status, period]);

  return (
    <section className="overview-home overview-dashboard" aria-label="任务概览">
      <header className="overview-header">
        <div>
          <Title level={2}>概览</Title>
          <Text type="secondary">从任务出发，查看数字员工的工作进度、待办操作与交付结果。</Text>
        </div>
      </header>

      <section className="overview-summary" aria-labelledby="overview-summary-title">
        <header>
          <span id="overview-summary-title" className="font-strong">工作记录</span>
          <Select
            className="overview-period-select"
            value={period}
            aria-label="统计数据周期"
            options={[
              { label: "最近 7 天", value: "week" },
              { label: "最近一个月", value: "month" },
              { label: "全部时间", value: "all" },
            ]}
            onChange={setPeriod}
          />
        </header>
        <div className="overview-metrics">
          {[
            { filter: "all" as const, label: "任务总数", value: periodRows.length, icon: <MessagesSquare size={20} />, note: "数字员工的全部工作记录" },
            { filter: "running" as const, label: "执行中任务", value: runningCount, icon: <MonitorSmartphone size={20} />, note: runningCount > 0 ? "数字员工正在为你推进" : "当前没有正在执行的任务" },
            { filter: "attention" as const, label: "需要操作", value: attentionRows.length, icon: <MousePointerClick size={20} />, note: attentionRows.length > 0 ? "查看等待处理与异常事项" : "暂无需要处理的事项" },
            { filter: "completed" as const, label: "已结束任务", value: completedRows.length, icon: <CircleCheck size={20} />, note: "查看数字员工的交付结果" },
          ].map((metric) => (
            <button
              aria-pressed={status === metric.filter}
              aria-label={`${metric.label} ${metric.value}`}
              data-metric={metric.filter}
              className={status === metric.filter ? "is-active" : undefined}
              key={metric.label}
              type="button"
              onClick={() => {
                setStatus(metric.filter);
                if (metric.filter === "attention") setAttentionTab("attention");
                if (metric.filter === "completed") setAttentionTab("results");
              }}
            >
              <span className="overview-metric-top"><span>{metric.label}</span><span className="overview-metric-icon" aria-hidden="true">{metric.icon}</span></span>
              <strong>{metric.value}<span className="overview-metric-unit">项</span></strong>
              <span className="overview-metric-foot"><span>{metric.note}</span><ChevronRight size={16} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="overview-attention" aria-label="任务操作与结果">
        <header className="overview-section-heading">
          <div><Title level={4}>任务动态</Title></div>
        </header>
        <div className="overview-attention-tabs" role="tablist" aria-label="任务动态分类">
          <button
            data-active={attentionTab === "attention"}
            type="button"
            role="tab"
            aria-selected={attentionTab === "attention"}
            onClick={() => setAttentionTab("attention")}
          >
            需要操作 <span>({attentionRows.length})</span>
          </button>
          <button
            data-active={attentionTab === "results"}
            type="button"
            role="tab"
            aria-selected={attentionTab === "results"}
            onClick={() => setAttentionTab("results")}
          >
            查收结果 <span>({completedRows.length})</span>
          </button>
        </div>
        <div className="overview-spotlight-list">
          {spotlightRows.map((row) => (
            <article key={`${attentionTab}-${row.conversation.id}`}>
              <span className={`overview-result-icon is-${row.status}`} aria-hidden="true">
                {row.status === "error" || row.status === "waiting" ? <ShieldAlert size={21} /> : <FileCheck2 size={21} />}
              </span>
              <span className="overview-spotlight-copy">
                <strong>{row.title}</strong>
                <small>{row.ownerName} · {row.projectName} · {row.updatedAt}</small>
              </span>
              <Button onClick={() => onOpenConversation(row.conversation.id)}>
                {attentionTab === "attention" ? "去处理" : "查看结果"}
              </Button>
            </article>
          ))}
          {spotlightRows.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={attentionTab === "attention" ? "暂无需要操作的任务" : "暂无可查收的结果"} />
          ) : null}
        </div>
      </section>

      <section className="overview-all-tasks" aria-labelledby="overview-all-tasks-title">
        <header>
          <div className="overview-table-heading"><Title id="overview-all-tasks-title" level={4}>全部任务</Title></div>
          <span><ListFilter size={16} /> 列表</span>
        </header>
        <div className="overview-filters">
          <Input
            allowClear
            value={query}
            prefix={<Search size={15} />}
            placeholder="搜索任务、数字员工或群组项目"
            aria-label="搜索任务"
            onChange={(event) => setQuery(event.target.value)}
          />
          <Select
            value={scope}
            aria-label="筛选任务归属"
            options={[
              { label: "全部归属", value: "all" },
              { label: "群组项目", value: "project" },
              { label: "独立数字员工", value: "employee" },
            ]}
            onChange={setScope}
          />
          <Select
            value={status}
            aria-label="筛选任务状态"
            options={[
              { label: "全部状态", value: "all" },
              { label: "执行中", value: "running" },
              { label: "需要操作", value: "attention" },
              { label: "已结束", value: "completed" },
              { label: "已完成", value: "success" },
              { label: "执行失败", value: "error" },
            ]}
            onChange={setStatus}
          />
          <Select
            value={period}
            aria-label="筛选任务时间"
            options={[
              { label: "最近 7 天", value: "week" },
              { label: "最近一个月", value: "month" },
              { label: "全部时间", value: "all" },
            ]}
            onChange={setPeriod}
          />
        </div>
        <div className="overview-task-table" role="table" aria-label="全部任务列表">
          <div className="overview-task-table-head" role="row">
            <span>任务</span><span>执行者</span><span>归属</span><span>状态</span><span>最近更新</span>
          </div>
          {visibleRows.map((row) => (
            <button
              className="overview-task-table-row"
              type="button"
              role="row"
              key={row.conversation.id}
              onClick={() => onOpenConversation(row.conversation.id)}
            >
              <span className="font-strong overview-task-name"><span className="overview-task-glyph" aria-hidden="true"><FileText size={18} /></span>{row.title}</span>
              <span>{row.ownerName}</span>
              <span>{row.projectName}</span>
              <span><Tag color={row.status === "error" ? "error" : row.status === "waiting" ? "warning" : row.status === "running" ? "processing" : "success"} variant="filled">{statusCopy[row.status]}</Tag></span>
              <span>{row.updatedAt}</span>
            </button>
          ))}
          {filteredRows.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有符合条件的任务" />
          ) : null}
        </div>
        {filteredRows.length > 0 ? (
          <footer className="overview-pagination" aria-label="任务列表分页">
            <span>共 {filteredRows.length} 条</span>
            <div>
              <Button
                type="text"
                size="small"
                icon={<ArrowLeft size={15} />}
                aria-label="上一页"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              />
              <span>{page} / {pageCount}</span>
              <Button
                type="text"
                size="small"
                icon={<ChevronRight size={15} />}
                aria-label="下一页"
                disabled={page === pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              />
            </div>
          </footer>
        ) : null}
      </section>
    </section>
  );
}

function ApplicationsHome({
  conversations,
  onLaunch,
  onOpenConversation,
  onInstallSkill,
  projects: projectList,
  skillInstallations,
}: {
  conversations: Conversation[];
  onLaunch: (application: CatalogApplication) => void;
  onOpenConversation: (conversationId: string) => void;
  onInstallSkill: (
    skill: SkillDefinition,
    targetType: SkillInstallationTargetType,
    targetId: string,
    targetName: string,
  ) => void;
  projects: Project[];
  skillInstallations: SkillInstallation[];
}) {
  const [activeProductTab, setActiveProductTab] = useState<"digital-employees" | "skills">("digital-employees");
  const [activeCategory, setActiveCategory] = useState<ApplicationCategory>("全部");
  const [activeSkillCategory, setActiveSkillCategory] = useState<SkillCategory>("全部");
  const [applicationSearch, setApplicationSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<CatalogApplication | null>(null);
  const [creatingApplication, setCreatingApplication] = useState<CatalogApplication | null>(null);
  const normalizedApplicationSearch = applicationSearch.trim().toLocaleLowerCase();
  const visibleApplications = applicationCatalog.filter(
    (application) => {
      const matchesCategory = activeCategory === "全部" || application.category === activeCategory;
      const matchesSearch = !normalizedApplicationSearch
        || `${application.name} ${application.category} ${application.description}`.toLocaleLowerCase().includes(normalizedApplicationSearch);
      return matchesCategory && matchesSearch;
    },
  );
  const createdDigitalEmployees = useMemo(() => {
    return getCreatedDigitalEmployees(conversations);
  }, [conversations]);
  const createdConversationByApplicationId = useMemo(() => {
    const result = new Map<string, Conversation>();
    conversations.forEach((conversation) => {
      if (conversation.projectId !== null) return;
      const application = getConversationCatalogApplication(conversation);
      if (application && !result.has(application.id)) {
        result.set(application.id, conversation);
      }
    });
    return result;
  }, [conversations]);
  const visibleSkills = skillCatalog.filter((skill) => {
    const matchesCategory = activeSkillCategory === "全部" || skill.category === activeSkillCategory;
    const matchesSearch = !normalizedApplicationSearch
      || `${skill.name} ${skill.category} ${skill.description}`.toLocaleLowerCase().includes(normalizedApplicationSearch);
    return matchesCategory && matchesSearch;
  });

  const isSkillInstalled = (
    skillId: string,
    targetType: SkillInstallationTargetType,
    targetId: string,
  ) => isSkillInstalledAtTarget(skillInstallations, skillId, targetType, targetId);

  const getSkillInstallMenuItems = (skill: SkillDefinition): MenuProps["items"] => [
    {
      type: "group",
      label: "数字员工",
      children: createdDigitalEmployees.length
        ? createdDigitalEmployees.map((application) => {
            const installed = isSkillInstalled(skill.id, "digital-employee", application.id);
            return {
              key: `digital-employee::${application.id}`,
              disabled: installed,
              label: (
                <span className="skill-install-target-row">
                  <Avatar className="skill-install-target-avatar" size={24} src={application.avatar} />
                  <span className="skill-install-target-name">{application.name}</span>
                  <span className={`skill-install-target-status${installed ? " is-installed" : ""}`}>
                    {installed ? "已安装" : "安装"}
                  </span>
                </span>
              ),
            };
          })
        : [{ key: "digital-employee-empty", disabled: true, label: "暂无已创建的数字员工" }],
    },
    {
      type: "group",
      label: "群组项目",
      children: projectList.length
        ? projectList.map((project) => {
            const installed = isSkillInstalled(skill.id, "project", project.id);
            return {
              key: `project::${project.id}`,
              disabled: installed,
              label: (
                <span className="skill-install-target-row">
                  <span className="skill-install-project-icon"><NavigationProjectIcon project={project} /></span>
                  <span className="skill-install-target-name">{project.name}</span>
                  <span className={`skill-install-target-status${installed ? " is-installed" : ""}`}>
                    {installed ? "已安装" : "安装"}
                  </span>
                </span>
              ),
            };
          })
        : [{ key: "project-empty", disabled: true, label: "暂无群组项目" }],
    },
  ];

  return (
    <div className="applications-workspace-split">
      <section className="conversation-stage applications-home" aria-label="应用">
        <div className="applications-surface">
          <div className="applications-results-scroll">
            <div className="applications-sticky-tabs">
              <header className="applications-topbar">
              <nav className="applications-product-tabs" aria-label="应用类型">
                <button
                  className={`applications-product-tab${activeProductTab === "digital-employees" ? " is-active" : ""}`}
                  type="button"
                  aria-current={activeProductTab === "digital-employees" ? "page" : undefined}
                  onClick={() => setActiveProductTab("digital-employees")}
                >
                  <Bot size={14} />
                  数字员工
                </button>
                <button
                  className={`applications-product-tab${activeProductTab === "skills" ? " is-active" : ""}`}
                  type="button"
                  aria-current={activeProductTab === "skills" ? "page" : undefined}
                  onClick={() => setActiveProductTab("skills")}
                >
                  <Pickaxe size={14} />
                  Skill技能
                </button>
              </nav>
              <Input
                className="applications-search"
                value={applicationSearch}
                suffix={<Search size={14} />}
                placeholder="输入关键词"
                allowClear
                aria-label="搜索应用"
                onChange={(event) => setApplicationSearch(event.target.value)}
              />
              </header>
              <div className="applications-filterbar">
              {activeProductTab === "skills" ? (
                <ResponsiveCategoryPills
                  categories={skillCategories}
                  ariaLabel="Skill分类"
                  value={activeSkillCategory}
                  onChange={setActiveSkillCategory}
                />
              ) : (
                <ResponsiveCategoryPills
                  categories={applicationCategories}
                  ariaLabel="数字员工分类"
                  value={activeCategory}
                  onChange={setActiveCategory}
                />
              )}
              {activeProductTab === "skills" ? (
                <div className="skill-filter-actions">
                  <Button size="small" disabled>导入 Skill</Button>
                </div>
              ) : (
                <Text className="applications-count">{visibleApplications.length} 个数字员工</Text>
              )}
              </div>
            </div>
            {activeProductTab === "digital-employees" && visibleApplications.length ? (
              <div className="application-grid">
                {visibleApplications.map((application) => {
                  const createdConversation = createdConversationByApplicationId.get(application.id);
                  return (
                  <article className="application-card" key={application.id}>
                    <button
                      className="application-card-primary"
                      type="button"
                      aria-label={`查看${application.name}详情`}
                      onClick={() => setSelectedApplication(application)}
                    >
                      <span className="application-card-title">{application.name}</span>
                      <span className="application-card-portrait">
                        <img className="application-card-cover" src={application.cover} alt="" />
                      </span>
                      <span className="application-card-details">
                        <span className="application-card-description">{application.description}</span>
                        <span className="application-card-tags" aria-label={`${application.name}能力`}>
                          {applicationSkillTags[application.id].map((skill) => (
                            <span className="application-card-tag" key={skill}>{skill}</span>
                          ))}
                        </span>
                      </span>
                    </button>
                    <span className="application-card-actions">
                      <button
                        className="application-card-action-secondary"
                        type="button"
                        onClick={() => setSelectedApplication(application)}
                      >
                        查看详情
                      </button>
                      <button
                        className="application-card-action-primary"
                        type="button"
                        onClick={() => {
                          if (createdConversation) {
                            onOpenConversation(createdConversation.id);
                            return;
                          }
                          setCreatingApplication(application);
                        }}
                      >
                        {createdConversation ? "发起对话" : "创建"}
                      </button>
                    </span>
                  </article>
                  );
                })}
              </div>
            ) : null}
            {activeProductTab === "digital-employees" && !visibleApplications.length ? (
              <Empty className="applications-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有匹配的数字员工" />
            ) : null}
            {activeProductTab === "skills" ? (
              <SkillCardCollection
                emptyDescription="没有匹配的 Skill"
                skills={visibleSkills}
                onOpenSkill={setSelectedSkill}
                renderAction={(skill) => (
                  <Tooltip title="安装到">
                    <Dropdown
                      classNames={{ root: "skill-install-menu" }}
                      menu={{
                        items: getSkillInstallMenuItems(skill),
                        onClick: ({ key }) => {
                          if (!key.includes("::")) return;
                          const [targetType, targetId] = key.split("::") as [SkillInstallationTargetType, string];
                          const targetName = targetType === "digital-employee"
                            ? applicationCatalog.find((application) => application.id === targetId)?.name
                            : projectList.find((project) => project.id === targetId)?.name;
                          if (!targetName) return;
                          onInstallSkill(skill, targetType, targetId, targetName);
                        },
                      }}
                      placement="bottomRight"
                      trigger={["click"]}
                    >
                      <Button
                        className="skill-card-add"
                        type="text"
                        size="small"
                        icon={<Plus size={18} />}
                        aria-label={`安装${skill.name}到`}
                      />
                    </Dropdown>
                  </Tooltip>
                )}
              />
            ) : null}
          </div>
        </div>
      </section>
      <SkillDetailModal
        skill={selectedSkill}
        onClose={() => setSelectedSkill(null)}
        action={selectedSkill ? (
          <Dropdown
            classNames={{ root: "skill-install-menu" }}
            menu={{
              items: getSkillInstallMenuItems(selectedSkill),
              onClick: ({ key }) => {
                if (!key.includes("::")) return;
                const [targetType, targetId] = key.split("::") as [SkillInstallationTargetType, string];
                const targetName = targetType === "digital-employee"
                  ? applicationCatalog.find((application) => application.id === targetId)?.name
                  : projectList.find((project) => project.id === targetId)?.name;
                if (!targetName) return;
                onInstallSkill(selectedSkill, targetType, targetId, targetName);
              },
            }}
            placement="top"
            trigger={["click"]}
          >
            <Button type="primary" block>安装到</Button>
          </Dropdown>
        ) : null}
      />
      <DigitalEmployeeDetailModal
        application={selectedApplication}
        onClose={() => setSelectedApplication(null)}
        onCreate={setCreatingApplication}
      />
      <CreateDigitalEmployeeModal
        application={creatingApplication}
        onCancel={() => setCreatingApplication(null)}
        onCreate={onLaunch}
      />
    </div>
  );
}

type ProjectHomeProps = {
  project: Project;
  conversations: Conversation[];
  files: GeneratedFile[];
  draftFiles: SelectedFile[];
  onCreateConversation: () => void;
  onCreateApplicationConversation: (catalogApplicationId: string) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onDraftFileRemove: (file: SelectedFile) => void;
  onEditProject: () => void;
  onOpenConversation: (conversationId: string) => void;
  onOpenFile: (fileId: string) => void;
  onOpenScheduledTask: (task: ProjectScheduledTask) => void;
  onReferenceFile: (file: SelectedFile) => void;
  onRenameConversation: (conversation: Conversation) => void;
  onStartConversation: (prompt: string, catalogApplicationId: string) => void;
  onProjectApplicationsChange: (applicationIds: string[]) => void;
  uploadProps: UploadProps;
};

type ProjectFolder = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
};

type ExplorerFile = {
  id: string;
  projectId: string;
  conversationId?: string;
  agentId?: string;
  folderId?: string;
  name: string;
  format: string;
  size: string;
  updatedAt: string;
  summary: string;
  mimeType: string;
  content: string;
  previewText?: string;
  source: "generated" | "uploaded" | "team-resource";
};

const PROJECT_FOLDER_STORAGE_KEY = "argus-project-file-folders-v1";
const PROJECT_UPLOAD_STORAGE_KEY = "argus-project-uploaded-files-v1";
const MAX_LOCAL_UPLOAD_SIZE = 2 * 1024 * 1024;

function readLocalCollection<T>(key: string): T[] {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T[]) : [];
  } catch {
    return [];
  }
}

function saveLocalCollection<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getFileFormat(name: string) {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.toUpperCase() : "FILE";
}

type ExplorerFilePreviewKind = "audio" | "image" | "pdf" | "text" | "unsupported" | "video";

const TEXT_PREVIEW_EXTENSIONS = new Set([
  "css", "csv", "html", "htm", "ini", "js", "json", "jsx", "less", "log", "md", "markdown",
  "mdx", "sass", "scss", "sql", "text", "toml", "ts", "tsx", "txt", "xml", "yaml", "yml",
]);
const IMAGE_PREVIEW_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);
const AUDIO_PREVIEW_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav"]);
const VIDEO_PREVIEW_EXTENSIONS = new Set(["m4v", "mov", "mp4", "mpeg", "mpg", "ogv", "webm"]);

function getFileExtension(file: Pick<ExplorerFile, "format" | "name">) {
  return file.name.includes(".")
    ? file.name.split(".").pop()?.toLocaleLowerCase() ?? ""
    : file.format.toLocaleLowerCase();
}

function getExplorerFilePreviewKind(file: ExplorerFile): ExplorerFilePreviewKind {
  const extension = getFileExtension(file);
  const mimeType = file.mimeType.toLocaleLowerCase();
  if (mimeType.includes("pdf") || extension === "pdf") return "pdf";
  if (mimeType.startsWith("image/") && IMAGE_PREVIEW_EXTENSIONS.has(extension)) return "image";
  if (mimeType.startsWith("audio/") && AUDIO_PREVIEW_EXTENSIONS.has(extension)) return "audio";
  if (mimeType.startsWith("video/") && VIDEO_PREVIEW_EXTENSIONS.has(extension)) return "video";
  if (file.previewText !== undefined || mimeType.startsWith("text/") || TEXT_PREVIEW_EXTENSIONS.has(extension)) return "text";
  return "unsupported";
}

function downloadExplorerFile(file: ExplorerFile) {
  const anchor = document.createElement("a");
  if (file.source === "uploaded") {
    anchor.href = file.content;
  } else {
    const blob = new Blob([file.content], { type: file.mimeType });
    anchor.href = URL.createObjectURL(blob);
  }
  anchor.download = file.name;
  anchor.click();
  if (file.source !== "uploaded") window.setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
}

function getMimeTypeFromFileName(name: string) {
  const extension = name.split(".").pop()?.toLocaleLowerCase() ?? "";
  const mimeTypes: Record<string, string> = {
    avif: "image/avif",
    bmp: "image/bmp",
    csv: "text/csv;charset=utf-8",
    gif: "image/gif",
    html: "text/html;charset=utf-8",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    json: "application/json;charset=utf-8",
    m4a: "audio/mp4",
    md: "text/markdown;charset=utf-8",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    pdf: "application/pdf",
    png: "image/png",
    svg: "image/svg+xml",
    txt: "text/plain;charset=utf-8",
    wav: "audio/wav",
    webm: "video/webm",
    webp: "image/webp",
    xml: "application/xml;charset=utf-8",
  };
  return mimeTypes[extension] ?? "application/octet-stream";
}

function createTeamResourceExplorerFile(resource: TeamResource, projectId = "team-resources"): ExplorerFile {
  const mimeType = getMimeTypeFromFileName(resource.name);
  const previewKind = getExplorerFilePreviewKind({
    id: resource.id,
    projectId,
    name: resource.name,
    format: getFileFormat(resource.name),
    size: "",
    updatedAt: resource.updatedAt,
    summary: "团队资源",
    mimeType,
    content: resource.content,
    source: "team-resource",
  });
  return {
    id: `team-resource-${resource.id}`,
    projectId,
    name: resource.name,
    format: getFileFormat(resource.name),
    size: formatBytes(new Blob([resource.content]).size),
    updatedAt: resource.updatedAt,
    summary: "团队资源",
    mimeType,
    content: resource.content,
    previewText: previewKind === "text" ? resource.content : undefined,
    source: "team-resource",
  };
}

function ExplorerFilePreviewContent({ file }: { file: ExplorerFile }) {
  const previewKind = getExplorerFilePreviewKind(file);
  if (previewKind === "text") {
    return (
      <div className="work-file-document">
        <div className="work-file-document-meta">
          <span>{file.format}</span>
          <span>{file.summary}</span>
        </div>
        <pre>{file.previewText ?? file.content}</pre>
      </div>
    );
  }
  if (previewKind === "image") {
    return <img className="work-file-media-preview work-file-image-preview" src={file.content} alt={file.name} />;
  }
  if (previewKind === "pdf") {
    return <iframe className="work-file-pdf-preview" src={file.content} title={`${file.name}预览`} />;
  }
  if (previewKind === "audio") {
    return <audio className="work-file-media-preview" src={file.content} controls aria-label={`${file.name}音频预览`} />;
  }
  if (previewKind === "video") {
    return <video className="work-file-media-preview work-file-video-preview" src={file.content} controls aria-label={`${file.name}视频预览`} />;
  }
  return (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="不支持该格式，请下载后预览">
      <Button icon={<Download size={15} />} onClick={() => downloadExplorerFile(file)}>下载文件</Button>
    </Empty>
  );
}

type FileTypeIconName =
  | "apk"
  | "css"
  | "doc"
  | "folder"
  | "img"
  | "ipa"
  | "js"
  | "md"
  | "mp3"
  | "numbers"
  | "other"
  | "pdf"
  | "ppt"
  | "rar"
  | "tet"
  | "video"
  | "xls";

const FILE_TYPE_ICON_BY_EXTENSION: Record<string, FileTypeIconName> = {
  apk: "apk",
  ipa: "ipa",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",
  js: "js",
  jsx: "js",
  ts: "js",
  tsx: "js",
  json: "js",
  html: "js",
  htm: "js",
  xml: "js",
  md: "md",
  markdown: "md",
  mdx: "md",
  pdf: "pdf",
  ppt: "ppt",
  pptx: "ppt",
  key: "ppt",
  rar: "rar",
  zip: "rar",
  "7z": "rar",
  tar: "rar",
  gz: "rar",
  bz2: "rar",
  doc: "doc",
  docx: "doc",
  rtf: "doc",
  odt: "doc",
  xls: "xls",
  xlsx: "xls",
  csv: "xls",
  numbers: "numbers",
  txt: "tet",
  text: "tet",
  log: "tet",
  jpg: "img",
  jpeg: "img",
  png: "img",
  gif: "img",
  webp: "img",
  svg: "img",
  bmp: "img",
  tif: "img",
  tiff: "img",
  heic: "img",
  heif: "img",
  avif: "img",
  mp3: "mp3",
  wav: "mp3",
  aac: "mp3",
  flac: "mp3",
  m4a: "mp3",
  ogg: "mp3",
  wma: "mp3",
  aiff: "mp3",
  ape: "mp3",
  opus: "mp3",
  mp4: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  webm: "video",
  m4v: "video",
  mpeg: "video",
  mpg: "video",
  wmv: "video",
  flv: "video",
};

function FileTypeIcon({ type }: { type: FileTypeIconName }) {
  return <img className="file-type-icon" src={`/file-types/${type}.svg`} alt="" aria-hidden="true" />;
}

function getExplorerFileIcon(file: ExplorerFile) {
  const mimeCategory = file.mimeType.split("/", 1)[0]?.toLocaleLowerCase();
  if (mimeCategory === "audio") return <FileTypeIcon type="mp3" />;
  if (mimeCategory === "video") return <FileTypeIcon type="video" />;
  if (mimeCategory === "image") return <FileTypeIcon type="img" />;

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLocaleLowerCase()
    : file.format.toLocaleLowerCase();
  return <FileTypeIcon type={FILE_TYPE_ICON_BY_EXTENSION[extension ?? ""] ?? "other"} />;
}

function ProjectFileExplorer({
  project,
  conversations,
  files,
  initialSelectedFileId,
  onOpenConversation,
  onReferenceFile,
}: {
  project: Project;
  conversations: Conversation[];
  files: GeneratedFile[];
  initialSelectedFileId?: string | null;
  onOpenConversation: (conversationId: string) => void;
  onReferenceFile?: (file: SelectedFile) => void;
}) {
  const { message: antMessage, modal } = AntApp.useApp();
  const [folders, setFolders] = useState<ProjectFolder[]>(() =>
    readLocalCollection<ProjectFolder>(PROJECT_FOLDER_STORAGE_KEY),
  );
  const [uploadedFiles, setUploadedFiles] = useState<ExplorerFile[]>(() =>
    readLocalCollection<ExplorerFile>(PROJECT_UPLOAD_STORAGE_KEY),
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set([
      "team-resources",
      ...teamResourceGroups.map((group) => `team-resource-${group.id}`),
      "all",
      ...conversations.map((conversation) => conversation.id),
    ]),
  );
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<ExplorerFile | null>(() => {
    const initialFile = files.find((file) => file.id === initialSelectedFileId);
    return initialFile ? { ...initialFile, source: "generated" } : null;
  });
  const [favoriteFileIds, setFavoriteFileIds] = useState<Set<string>>(() => new Set());
  const [searchValue, setSearchValue] = useState("");
  const [sortMode, setSortMode] = useState<"updated" | "name">("updated");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [renamedFileNames, setRenamedFileNames] = useState<Record<string, string>>({});
  const [removedFileIds, setRemovedFileIds] = useState<Set<string>>(() => new Set());
  const [renameTarget, setRenameTarget] = useState<ExplorerFile | null>(null);
  const [renameFileName, setRenameFileName] = useState("");

  const projectFolders = folders.filter((folder) => folder.projectId === project.id);
  const projectUploads = uploadedFiles.filter((file) => file.projectId === project.id);
  const generatedExplorerFiles: ExplorerFile[] = files.map((file) => ({
    ...file,
    name: renamedFileNames[file.id] ?? file.name,
    format: getFileFormat(renamedFileNames[file.id] ?? file.name),
    source: "generated" as const,
  })).filter((file) => !removedFileIds.has(file.id));
  const allFiles = [...generatedExplorerFiles, ...projectUploads].filter((file) => !removedFileIds.has(file.id));
  const activeFolder = projectFolders.find((folder) => folder.id === activeFolderId);
  const normalizedSearch = searchValue.trim().toLocaleLowerCase();

  useEffect(() => {
    setActiveFolderId(null);
    setSelectedFile(
      generatedExplorerFiles.find((file) => file.id === initialSelectedFileId) ?? null,
    );
    setSearchValue("");
    setRenamedFileNames({});
    setRemovedFileIds(new Set());
    setExpandedFolders(new Set([
      "team-resources",
      ...teamResourceGroups.map((group) => `team-resource-${group.id}`),
      "all",
      ...conversations.map((conversation) => conversation.id),
    ]));
  }, [project.id, initialSelectedFileId]);

  const sortedFiles = (items: ExplorerFile[]) =>
    [...items].sort((a, b) =>
      sortMode === "name" ? a.name.localeCompare(b.name, "zh-CN") : b.id.localeCompare(a.id),
    );

  const matchesSearch = (file: ExplorerFile) =>
    !normalizedSearch || `${file.name} ${file.summary} ${file.format}`.toLocaleLowerCase().includes(normalizedSearch);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) {
      antMessage.warning("请输入文件夹名称");
      return;
    }
    if (projectFolders.some((folder) => folder.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      antMessage.warning("当前群组项目中已存在同名文件夹");
      return;
    }
    const folder: ProjectFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: project.id,
      name,
      createdAt: "刚刚",
    };
    const nextFolders = [...folders, folder];
    setFolders(nextFolders);
    saveLocalCollection(PROJECT_FOLDER_STORAGE_KEY, nextFolders);
    setExpandedFolders((current) => new Set(current).add(folder.id));
    setActiveFolderId(folder.id);
    setNewFolderName("");
    setNewFolderOpen(false);
    antMessage.success(`已新建文件夹“${name}”`);
  };

  const uploadFile = async (file: File) => {
    if (file.size > MAX_LOCAL_UPLOAD_SIZE) {
      antMessage.error(`${file.name} 超过 2 MB，无法保存到本地演示环境`);
      return false;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    let previewText: string | undefined;
    if (
      file.type.startsWith("text/") ||
      /\.(md|markdown|csv|json|xml|html|txt|log)$/i.test(file.name)
    ) {
      previewText = await file.text();
    }
    const uploadedFile: ExplorerFile = {
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: project.id,
      folderId: activeFolderId ?? undefined,
      name: file.name,
      format: getFileFormat(file.name),
      size: formatBytes(file.size),
      updatedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
      summary: activeFolder ? `上传至 ${activeFolder.name}` : "上传至群组项目根目录",
      mimeType: file.type || "application/octet-stream",
      content: dataUrl,
      previewText,
      source: "uploaded",
    };
    const nextUploads = [...uploadedFiles, uploadedFile];
    try {
      saveLocalCollection(PROJECT_UPLOAD_STORAGE_KEY, nextUploads);
      setUploadedFiles(nextUploads);
      antMessage.success(`${file.name} 已上传`);
    } catch {
      antMessage.error("浏览器存储空间不足，文件未保存");
    }
    return false;
  };

  const deleteUploadedFile = (file: ExplorerFile) => {
    modal.confirm({
      title: `删除“${file.name}”？`,
      content: "文件只会从当前浏览器中的演示群组项目移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        const nextUploads = uploadedFiles.filter((item) => item.id !== file.id);
        setUploadedFiles(nextUploads);
        saveLocalCollection(PROJECT_UPLOAD_STORAGE_KEY, nextUploads);
        if (selectedFile?.id === file.id) setSelectedFile(null);
        antMessage.success("文件已删除");
      },
    });
  };

  const beginRenameFile = (file: ExplorerFile) => {
    setRenameTarget(file);
    setRenameFileName(file.name);
  };

  const commitFileRename = () => {
    if (!renameTarget) return;
    const name = renameFileName.trim();
    if (!name) {
      antMessage.warning("请输入文件名称");
      return;
    }
    if (renameTarget.source === "uploaded") {
      const nextUploads = uploadedFiles.map((file) => file.id === renameTarget.id
        ? { ...file, name, format: getFileFormat(name) }
        : file);
      setUploadedFiles(nextUploads);
      saveLocalCollection(PROJECT_UPLOAD_STORAGE_KEY, nextUploads);
    } else {
      setRenamedFileNames((current) => ({ ...current, [renameTarget.id]: name }));
    }
    if (selectedFile?.id === renameTarget.id) {
      setSelectedFile({ ...selectedFile, name, format: getFileFormat(name) });
    }
    setRenameTarget(null);
    antMessage.success("文件已重命名");
  };

  const deleteFile = (file: ExplorerFile) => {
    if (file.source === "uploaded") {
      deleteUploadedFile(file);
      return;
    }
    modal.confirm({
      title: `删除“${file.name}”？`,
      content: "删除后，该资源将从当前列表移除。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => {
        setRemovedFileIds((current) => new Set(current).add(file.id));
        if (selectedFile?.id === file.id) setSelectedFile(null);
        antMessage.success("文件已删除");
      },
    });
  };

  const referenceFile = (file: Pick<ExplorerFile, "name" | "mimeType" | "content" | "summary">) => {
    onReferenceFile?.(createSelectedFile(
      new File([file.content || file.summary], file.name, { type: file.mimeType || "text/plain" }),
      "resource",
    ));
  };

  const renderFileRow = (file: ExplorerFile, depth = 2) => {
    const sourceConversation = conversations.find((conversation) => conversation.id === file.conversationId);
    const menuItems: MenuProps["items"] = [
      onReferenceFile
        ? { key: "reference", icon: <Paperclip size={14} />, label: "引用该资源", onClick: () => referenceFile(file) }
        : null,
      { key: "open", label: "打开文件", onClick: () => setSelectedFile(file) },
      { key: "rename", label: "重命名", onClick: () => beginRenameFile(file) },
      sourceConversation
        ? { key: "source", label: "打开来源对话", onClick: () => onOpenConversation(sourceConversation.id) }
        : null,
      { key: "download", label: "下载", onClick: () => downloadExplorerFile(file) },
      { type: "divider" },
      { key: "delete", label: "删除", danger: true, onClick: () => deleteFile(file) },
    ];
    return (
      <div className="work-file-row" style={{ "--tree-depth": depth } as React.CSSProperties} key={file.id}>
        <button className="work-file-main" type="button" onClick={() => setSelectedFile(file)}>
          <span className="work-file-type">{getExplorerFileIcon(file)}</span>
          <span className="work-file-copy">
            <span>{file.name}</span>
          </span>
          {file.source === "uploaded" ? <Tag variant="filled">上传</Tag> : null}
        </button>
        <div className="work-file-tail">
          <small className="work-file-time">{file.updatedAt}</small>
          <div className="work-file-actions">
            <Tooltip title="下载">
              <Button type="text" size="small" icon={<Download size={15} />} aria-label={`下载${file.name}`} onClick={() => downloadExplorerFile(file)} />
            </Tooltip>
            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
              <Button type="text" size="small" icon={<MoreHorizontal size={15} />} aria-label={`${file.name}更多操作`} />
            </Dropdown>
          </div>
        </div>
      </div>
    );
  };

  const renderFolder = ({
    id,
    name,
    folderFiles,
    custom = false,
  }: {
    id: string;
    name: string;
    folderFiles: ExplorerFile[];
    custom?: boolean;
  }) => {
    const visibleFiles = sortedFiles(folderFiles.filter(matchesSearch));
    if (normalizedSearch && !visibleFiles.length && !name.toLocaleLowerCase().includes(normalizedSearch)) return null;
    const expanded = normalizedSearch ? true : expandedFolders.has(id);
    return (
      <div className="work-folder" key={id}>
        <button
          className={`work-folder-row${activeFolderId === id ? " is-current" : ""}`}
          type="button"
          onClick={() => {
            toggleFolder(id);
            if (custom) setActiveFolderId(id);
          }}
        >
          {expanded
            ? <ChevronDown className="work-folder-disclosure" size={12} />
            : <ChevronRight className="work-folder-disclosure" size={12} />}
          <FileTypeIcon type="folder" />
          <span>{name}</span>
          <small>{folderFiles.length}</small>
        </button>
        {expanded ? (
          <div className="work-folder-children">
            {visibleFiles.length ? visibleFiles.map((file) => renderFileRow(file, 3)) : (
              <div className="work-folder-empty">{normalizedSearch ? "无匹配文件" : "空文件夹"}</div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const rootUploadedFiles = projectUploads.filter((file) => !file.folderId);
  const visibleRootUploads = sortedFiles(rootUploadedFiles.filter(matchesSearch));
  const teamResourceCount = teamResourceGroups.reduce((total, group) => total + group.resources.length, 0);
  const visibleTeamResourceGroups = teamResourceGroups
    .map((group) => ({
      ...group,
      resources: group.resources.filter((resource) => (
        !normalizedSearch
        || `${group.name} ${resource.name}`.toLocaleLowerCase().includes(normalizedSearch)
      )),
    }))
    .filter((group) => group.resources.length > 0 || group.name.toLocaleLowerCase().includes(normalizedSearch));
  const conversationResourceFolders = conversations
    .map((conversation) => ({
      conversation,
      folderFiles: generatedExplorerFiles.filter((file) => file.conversationId === conversation.id),
    }))
    .filter(({ folderFiles }) => folderFiles.length > 0);
  const sortMenu: MenuProps = {
    selectedKeys: [sortMode],
    onClick: ({ key }) => setSortMode(key as "updated" | "name"),
    items: [
      { key: "updated", label: "按更新时间" },
      { key: "name", label: "按文件名" },
    ],
  };

  const renameFileModal = (
    <Modal
      title="重命名文件"
      open={Boolean(renameTarget)}
      okText="保存"
      cancelText="取消"
      onOk={commitFileRename}
      onCancel={() => setRenameTarget(null)}
    >
      <Input
        autoFocus
        value={renameFileName}
        onChange={(event) => setRenameFileName(event.target.value)}
        onPressEnter={commitFileRename}
      />
    </Modal>
  );

  if (selectedFile) {
    const sourceConversation = conversations.find((conversation) => conversation.id === selectedFile.conversationId);
    const isFavorite = favoriteFileIds.has(selectedFile.id);
    return (
      <>
      <section className="work-file-preview" aria-label={`${selectedFile.name}文件预览`}>
        <header className="work-file-preview-header">
          <Button type="text" icon={<ArrowLeft size={17} />} aria-label="返回工作文件" onClick={() => setSelectedFile(null)} />
          <span className="work-file-preview-icon">{getExplorerFileIcon(selectedFile)}</span>
          <div className="work-file-preview-title">
            <span className="font-strong">{selectedFile.name}</span>
            <small>{selectedFile.size} · {selectedFile.updatedAt}</small>
          </div>
          <Space className="work-file-preview-actions" size={2}>
            <Tooltip title={isFavorite ? "取消收藏" : "收藏"}>
              <Button
                type="text"
                icon={isFavorite ? <Star size={16} fill="currentColor" /> : <Star size={16} />}
                aria-label={isFavorite ? "取消收藏" : "收藏文件"}
                onClick={() => setFavoriteFileIds((current) => {
                  const next = new Set(current);
                  if (next.has(selectedFile.id)) next.delete(selectedFile.id);
                  else next.add(selectedFile.id);
                  return next;
                })}
              />
            </Tooltip>
            {getExplorerFilePreviewKind(selectedFile) === "text" ? (
              <Tooltip title="复制内容">
                <Button
                  type="text"
                  icon={<Copy size={16} />}
                  aria-label="复制文件内容"
                  onClick={async () => {
                    await navigator.clipboard.writeText(selectedFile.previewText ?? selectedFile.content);
                    antMessage.success("文件内容已复制");
                  }}
                />
              </Tooltip>
            ) : null}
            <Tooltip title="分享">
              <Button type="text" icon={<Share2 size={16} />} aria-label="分享文件" onClick={() => antMessage.info("分享能力将在接入群组项目文件服务后开放")} />
            </Tooltip>
            <Tooltip title="下载">
              <Button type="text" icon={<Download size={16} />} aria-label="下载文件" onClick={() => downloadExplorerFile(selectedFile)} />
            </Tooltip>
            <Dropdown
              menu={{
                items: [
                  sourceConversation ? { key: "source", label: "打开来源对话", onClick: () => onOpenConversation(sourceConversation.id) } : null,
                  { key: "rename", label: "重命名", onClick: () => beginRenameFile(selectedFile) },
                  { key: "delete", label: "删除文件", danger: true, onClick: () => deleteFile(selectedFile) },
                ],
              }}
              trigger={["click"]}
            >
              <Button type="text" icon={<MoreHorizontal size={16} />} aria-label="更多文件操作" />
            </Dropdown>
          </Space>
        </header>
        <div className="work-file-preview-body">
          <ExplorerFilePreviewContent file={selectedFile} />
        </div>
      </section>
      {renameFileModal}
      </>
    );
  }

  return (
    <section className="work-files" aria-label="群组项目工作文件">
      <div className="work-files-toolbar">
        <Input
          allowClear
          prefix={<Search size={15} />}
          placeholder="搜索工作文件"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
        <div className="work-files-toolbar-actions">
          <Tooltip title="刷新">
            <Button
              icon={<RefreshCw className={refreshing ? "is-spinning" : ""} size={16} />}
              aria-label="刷新文件"
              onClick={() => {
                setRefreshing(true);
                window.setTimeout(() => setRefreshing(false), 450);
                antMessage.success("工作文件已刷新");
              }}
            />
          </Tooltip>
          <Dropdown menu={sortMenu} trigger={["click"]}>
            <Button icon={<ListFilter size={16} />} aria-label="文件排序" />
          </Dropdown>
          <Tooltip title="新建文件夹">
            <Button icon={<FolderKanban size={16} />} aria-label="新建文件夹" onClick={() => setNewFolderOpen(true)} />
          </Tooltip>
          <Upload
            multiple
            showUploadList={false}
            beforeUpload={(file) => {
              void uploadFile(file).catch(() => antMessage.error(`${file.name} 上传失败，请重试`));
              return false;
            }}
          >
            <Button type="primary" icon={<UploadCloud size={16} />}>上传</Button>
          </Upload>
        </div>
      </div>

      <div className="work-file-tree">
        <button className="work-folder-row work-root-row" type="button" onClick={() => toggleFolder("team-resources")}>
          {expandedFolders.has("team-resources")
            ? <ChevronDown className="work-folder-disclosure" size={12} />
            : <ChevronRight className="work-folder-disclosure" size={12} />}
          <FileTypeIcon type="folder" />
          <span>团队资源</span>
          <small>{teamResourceCount}</small>
        </button>
        {expandedFolders.has("team-resources") ? (
          <div className="work-root-children">
            {visibleTeamResourceGroups.map((group) => {
              const folderId = `team-resource-${group.id}`;
              const expanded = normalizedSearch ? true : expandedFolders.has(folderId);
              return (
                <div className="work-folder" key={group.id}>
                  <button className="work-folder-row" type="button" onClick={() => toggleFolder(folderId)}>
                    {expanded
                      ? <ChevronDown className="work-folder-disclosure" size={12} />
                      : <ChevronRight className="work-folder-disclosure" size={12} />}
                    <FileTypeIcon type="folder" />
                    <span>{group.name}</span>
                    <small>{group.resources.length}</small>
                  </button>
                  {expanded ? (
                    <div className="work-folder-children">
                      {group.resources.map((resource) => {
                        const extension = resource.name.split(".").pop()?.toLocaleLowerCase() ?? "";
                        const rawResourceFile = createTeamResourceExplorerFile(resource, project.id);
                        const resourceFileName = renamedFileNames[rawResourceFile.id] ?? rawResourceFile.name;
                        const resourceFile = {
                          ...rawResourceFile,
                          name: resourceFileName,
                          format: getFileFormat(resourceFileName),
                        };
                        if (removedFileIds.has(resourceFile.id)) return null;
                        const menuItems: MenuProps["items"] = [
                          { key: "open", label: "打开文件", onClick: () => setSelectedFile(resourceFile) },
                          onReferenceFile
                            ? { key: "reference", icon: <Paperclip size={14} />, label: "引用该资源", onClick: () => referenceFile(resourceFile) }
                            : null,
                          { key: "rename", label: "重命名", onClick: () => beginRenameFile(resourceFile) },
                          { key: "download", label: "下载", onClick: () => downloadExplorerFile(resourceFile) },
                          { type: "divider" },
                          { key: "delete", label: "删除", danger: true, onClick: () => deleteFile(resourceFile) },
                        ];
                        return (
                          <div className="work-file-row" style={{ "--tree-depth": 3 } as React.CSSProperties} key={resource.id}>
                            <button
                              className="work-file-main team-resource-static-file"
                              type="button"
                              onClick={() => setSelectedFile(resourceFile)}
                            >
                              <span className="work-file-type">
                                <FileTypeIcon type={FILE_TYPE_ICON_BY_EXTENSION[extension] ?? "other"} />
                              </span>
                              <span className="work-file-copy"><span>{resourceFile.name}</span></span>
                            </button>
                            <div className="work-file-tail">
                              <small className="work-file-time">{resource.updatedAt}</small>
                              <div className="work-file-actions">
                                <Tooltip title="下载">
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<Download size={15} />}
                                    aria-label={`下载${resourceFile.name}`}
                                    onClick={() => downloadExplorerFile(resourceFile)}
                                  />
                                </Tooltip>
                                <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                                  <Button
                                    type="text"
                                    size="small"
                                    icon={<MoreHorizontal size={15} />}
                                    aria-label={`${resourceFile.name}更多操作`}
                                  />
                                </Dropdown>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {!visibleTeamResourceGroups.length ? <div className="work-folder-empty">无匹配团队资源</div> : null}
          </div>
        ) : null}

        <button className="work-folder-row work-root-row" type="button" onClick={() => toggleFolder("all")}>
          {expandedFolders.has("all")
            ? <ChevronDown className="work-folder-disclosure" size={12} />
            : <ChevronRight className="work-folder-disclosure" size={12} />}
          <FileTypeIcon type="folder" />
          <span>所有对话</span>
          <small>{allFiles.length}</small>
        </button>
        {expandedFolders.has("all") ? (
          <div className="work-root-children">
            {visibleRootUploads.map((file) => renderFileRow(file, 2))}
            {conversationResourceFolders.map(({ conversation, folderFiles }) =>
              renderFolder({
                id: conversation.id,
                name: conversation.title,
                folderFiles,
              }),
            )}
            {projectFolders.map((folder) =>
              renderFolder({
                id: folder.id,
                name: folder.name,
                folderFiles: projectUploads.filter((file) => file.folderId === folder.id),
                custom: true,
              }),
            )}
            {!conversationResourceFolders.length && !projectFolders.length && !visibleRootUploads.length ? (
              <Empty description="暂无工作文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}
          </div>
        ) : null}
      </div>

      <Modal
        title="新建文件夹"
        open={newFolderOpen}
        okText="新建"
        cancelText="取消"
        onOk={createFolder}
        onCancel={() => {
          setNewFolderOpen(false);
          setNewFolderName("");
        }}
      >
        <Input
          autoFocus
          maxLength={40}
          placeholder="请输入文件夹名称"
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          onPressEnter={createFolder}
        />
      </Modal>
      {renameFileModal}
    </section>
  );
}

function ScheduledTaskModal({
  open,
  onCancel,
  onCreate,
}: {
  open: boolean;
  onCancel: () => void;
  onCreate: (values: ScheduledTaskFormValues) => void;
}) {
  const [form] = Form.useForm<ScheduledTaskFormValues>();
  const selectedFrequency = Form.useWatch("frequency", form) ?? "daily";
  const hasEndDate = Form.useWatch("hasEndDate", form) ?? false;
  const detailOptions = selectedFrequency === "weekly"
    ? ["周一", "周二", "周三", "周四", "周五", "周六", "周日"].map((label) => ({ label, value: label }))
    : selectedFrequency === "monthly"
      ? Array.from({ length: 28 }, (_, index) => ({ label: `${index + 1} 日`, value: `${index + 1} 日` }))
      : [{ label: selectedFrequency === "weekdays" ? "工作日" : "每天", value: selectedFrequency === "weekdays" ? "工作日" : "每天" }];

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: "",
      frequency: "daily",
      frequencyDetail: "每天",
      runDate: undefined,
      time: undefined,
      hasEndDate: false,
      endDate: undefined,
      prompt: "",
    });
  }, [form, open]);

  const close = () => {
    onCancel();
    form.resetFields();
  };

  return (
    <Modal
      className="scheduled-task-modal"
      title="创建定时任务"
      open={open}
      centered
      width={600}
      okText="创建"
      cancelText="取消"
      onCancel={close}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ frequency: "daily", frequencyDetail: "每天", hasEndDate: false }}
        onFinish={(values) => {
          onCreate(values);
          form.resetFields();
        }}
      >
        <Form.Item label="任务名称" name="title" rules={[{ required: true, whitespace: true, message: "请输入任务名称" }]}>
          <Input autoFocus maxLength={60} placeholder="例如：每日同步团队进展" />
        </Form.Item>
        <Form.Item className="scheduled-task-frequency-item" label="执行频率">
          <div className={`scheduled-task-frequency-row is-${selectedFrequency}`}>
            <Form.Item name="frequency" noStyle>
              <Select
                aria-label="执行频率"
                options={[
                  { label: "不重复", value: "once" },
                  { label: "每天", value: "daily" },
                  { label: "工作日", value: "weekdays" },
                  { label: "每周", value: "weekly" },
                  { label: "每月", value: "monthly" },
                ]}
                onChange={(value: ScheduledTaskFormValues["frequency"]) => {
                  form.setFieldValue(
                    "frequencyDetail",
                    value === "weekly" ? "周一" : value === "monthly" ? "1 日" : value === "weekdays" ? "工作日" : "每天",
                  );
                  if (value !== "once") form.setFieldValue("runDate", undefined);
                }}
              />
            </Form.Item>
            {selectedFrequency === "once" ? (
              <Form.Item name="runDate" noStyle rules={[{ required: true, message: "请选择执行日期" }]}>
                <DatePicker aria-label="执行日期" placeholder="选择日期" />
              </Form.Item>
            ) : selectedFrequency === "weekly" || selectedFrequency === "monthly" ? (
              <Form.Item name="frequencyDetail" noStyle>
                <Select aria-label="执行日期" options={detailOptions} />
              </Form.Item>
            ) : null}
            <Form.Item name="time" noStyle>
              <TimePicker aria-label="执行时间" format="HH:mm" minuteStep={5} placeholder="09:00" />
            </Form.Item>
          </div>
        </Form.Item>
        <Form.Item className={`scheduled-task-end-date-toggle${hasEndDate ? " has-date" : ""}`} name="hasEndDate" valuePropName="checked">
          <Checkbox onChange={(event) => {
            if (!event.target.checked) form.setFieldValue("endDate", undefined);
          }}>
            设置到期日期
          </Checkbox>
        </Form.Item>
        <div className="scheduled-task-end-date-reveal" data-open={hasEndDate} aria-hidden={!hasEndDate}>
          <div>
            <Form.Item className="scheduled-task-end-date" name="endDate">
              <DatePicker aria-label="到期日期" disabled={!hasEndDate} placeholder="选择到期日期" style={{ width: "100%" }} />
            </Form.Item>
          </div>
        </div>
        <Form.Item label="提示词" name="prompt" rules={[{ required: true, whitespace: true, message: "请输入任务提示词" }]}>
          <Input.TextArea maxLength={1000} placeholder="描述定时任务需要执行的内容" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

function ProjectHome({
  project,
  conversations,
  files,
  draftFiles,
  onCreateConversation,
  onCreateApplicationConversation,
  onDeleteConversation,
  onDraftFileRemove,
  onEditProject,
  onOpenConversation,
  onOpenFile,
  onOpenScheduledTask,
  onReferenceFile,
  onRenameConversation,
  onStartConversation,
  onProjectApplicationsChange,
  uploadProps,
}: ProjectHomeProps) {
  const { message: antMessage, modal } = AntApp.useApp();
  const { token } = antdTheme.useToken();
  const [hoveredConversationId, setHoveredConversationId] = useState<string | null>(null);
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [starterPrompt, setStarterPrompt] = useState("");
  const [manageApplicationsOpen, setManageApplicationsOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [managedApplicationIds, setManagedApplicationIds] = useState<string[]>(project.applicationIds ?? []);
  const [managedApplicationCategory, setManagedApplicationCategory] = useState<ApplicationCategory>("全部");
  const projectCatalogApplications = getProjectCatalogApplications(project);
  const [starterCatalogApplicationId, setStarterCatalogApplicationId] = useState(
    () => projectCatalogApplications[0]?.id ?? applicationCatalog[0].id,
  );
  const activities = projectActivities.filter((activity) => activity.projectId === project.id);
  const tasks = projectTasks.filter((task) => task.projectId === project.id);
  const [scheduledTasks, setScheduledTasks] = useState<ProjectScheduledTask[]>(
    () => projectScheduledTasks.filter((task) => task.projectId === project.id),
  );
  const projectAgentIds = project.agentIds?.length
    ? project.agentIds
    : Array.from(new Set(conversations.map((conversation) => conversation.agentId)));
  const projectApplications = projectCatalogApplications.length
    ? projectCatalogApplications.map((application) => ({
          id: application.id,
          name: application.name,
          icon: <img className="project-application-cover" src={application.avatar} alt="" />,
        }))
    : projectAgentIds
        .map((agentId) => agents.find((agent) => agent.id === agentId))
        .filter((agent): agent is (typeof agents)[number] => Boolean(agent))
        .map((agent) => ({ id: agent.id, name: agent.name, icon: <Bot size={14} /> }));
  const pendingTaskCount = tasks.filter((task) => task.status !== "已完成").length;

  const openScheduledTaskModal = () => setScheduleModalOpen(true);

  const createScheduledTask = (values: ScheduledTaskFormValues) => {
    const cadence = getScheduledTaskCadence(values);
    setScheduledTasks((current) => [
      ...current,
      {
        id: `schedule-${project.id}-${Date.now()}`,
        projectId: project.id,
        title: values.title.trim(),
        cadence,
        nextRun: cadence,
        enabled: true,
      },
    ]);
    setScheduleModalOpen(false);
    antMessage.success("定时任务已创建");
  };

  const submitStarterPrompt = () => {
    const prompt = starterPrompt.trim();
    if (!prompt) return;
    const selectedApplication = projectCatalogApplications.find(
      (application) => application.id === starterCatalogApplicationId,
    ) ?? projectCatalogApplications[0] ?? applicationCatalog[0];
    onStartConversation(prompt, selectedApplication.id);
    setStarterPrompt("");
  };

  const conversationGroups = [...conversations]
    .sort((left, right) => getConversationAgeDays(left.updatedAt) - getConversationAgeDays(right.updatedAt))
    .reduce<Array<{ label: string; conversations: Conversation[] }>>((groups, conversation) => {
      const label = formatConversationHistoryGroup(conversation.updatedAt);
      const existingGroup = groups.find((group) => group.label === label);
      if (existingGroup) {
        existingGroup.conversations.push(conversation);
      } else {
        groups.push({ label, conversations: [conversation] });
      }
      return groups;
    }, []);

  const conversationHistory = conversations.length ? (
    <div className="project-record-list" aria-label="历史对话记录">
      {conversationGroups.map((group) => (
        <section className="project-conversation-group" aria-label={`${group.label}的对话`} key={group.label}>
          <h3 className="project-conversation-group-title">{group.label}</h3>
          {group.conversations.map((conversation) => {
            const actionsVisible = hoveredConversationId === conversation.id || openConversationMenuId === conversation.id;
            return (
              <div
                className="project-record project-conversation-record"
                key={conversation.id}
                style={{ gridTemplateColumns: "minmax(0, 1fr) 72px" }}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setHoveredConversationId(null);
                  }
                }}
                onFocusCapture={() => setHoveredConversationId(conversation.id)}
                onMouseEnter={() => setHoveredConversationId(conversation.id)}
                onMouseLeave={() => setHoveredConversationId(null)}
              >
                <button
                  type="button"
                  style={{
                    display: "grid",
                    minWidth: 0,
                    height: "100%",
                    padding: 0,
                    alignItems: "center",
                    gap: 8,
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                    gridTemplateColumns: "16px minmax(0, 1fr)",
                    textAlign: "left",
                  }}
                  onClick={() => onOpenConversation(conversation.id)}
                >
                  <NavigationConversationIcon conversation={conversation} size={16} />
                  <span className="record-primary">{conversation.title}</span>
                </button>
                <span style={{ display: "grid", justifyItems: "end" }}>
                  {actionsVisible ? (
                    <Dropdown
                      trigger={["click"]}
                      open={openConversationMenuId === conversation.id}
                      onOpenChange={(open) => setOpenConversationMenuId(open ? conversation.id : null)}
                      menu={{
                        items: conversationMoreMenuItems,
                        onClick: ({ key }) => {
                          if (key === "rename") onRenameConversation(conversation);
                          if (key === "delete") onDeleteConversation(conversation);
                        },
                      }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<MoreHorizontal size={16} />}
                        aria-label={`${conversation.title}更多操作`}
                      />
                    </Dropdown>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {conversation.updatedAt}
                    </Text>
                  )}
                </span>
              </div>
            );
          })}
        </section>
      ))}
      <p className="project-record-list-end">没有更多了</p>
    </div>
  ) : (
    <Empty description="暂无历史对话" image={Empty.PRESENTED_IMAGE_SIMPLE}>
      <Button type="primary" onClick={onCreateConversation}>开始新对话</Button>
    </Empty>
  );

  const generatedFileHistory = (
    <ProjectFileExplorer
      project={project}
      conversations={conversations}
      files={files}
      onOpenConversation={onOpenConversation}
      onReferenceFile={onReferenceFile}
    />
  );

  const activityHistory = (
    <section className="project-activity-list" aria-label="群组项目动态">
      {activities.map((activity) => (
        <article className="project-activity-row" key={activity.id}>
          <ActivityActorAvatar
            name={activity.actor}
            applicationCover={applicationCatalog.find(
              (application) => application.id === activity.catalogApplicationId,
            )?.avatar}
          />
          <span className="project-activity-copy">
            <span>
              <span className="font-strong">{activity.actor}</span>
              <Text className="project-activity-action" type="secondary"> {activity.action}</Text>
            </span>
            {activity.fileId ? (
              <button
                className="project-activity-target"
                type="button"
                aria-label={`打开文件${activity.target}`}
                onClick={() => onOpenFile(activity.fileId!)}
              >
                {activity.target}
              </button>
            ) : <small>{activity.target}</small>}
          </span>
          <time>{activity.time}</time>
        </article>
      ))}
    </section>
  );

  const taskHistory = (
    <section className="project-task-list" aria-label="群组项目待办任务">
      {tasks.map((task) => {
        return (
          <article className="project-task-row" key={task.id} data-completed={task.status === "已完成"}>
            <span className="project-task-copy">
              <span>{task.title}</span>
            </span>
            <span className="project-task-status">
              <Tag>{task.status}</Tag>
            </span>
            <span className="project-task-tags">
              <Tag>{task.priority}优先级</Tag>
            </span>
            <span className="project-task-owner">
              <InitialAvatar name={task.owner} />
            </span>
            <time className={task.status === "已逾期" ? "is-overdue" : ""}>{task.dueAt}</time>
          </article>
        );
      })}
    </section>
  );

  const tabItems = useMemo(
    () => [
      {
        key: "activity",
        label: "动态",
        children: activityHistory,
      },
      {
        key: "conversations",
        label: "对话",
        children: conversationHistory,
      },
      {
        key: "tasks",
        label: "待办任务",
        children: taskHistory,
      },
      {
        key: "files",
        label: "资源",
        children: generatedFileHistory,
      },
    ],
    [
      activities.length,
      activityHistory,
      conversationHistory,
      conversations.length,
      files.length,
      generatedFileHistory,
      pendingTaskCount,
      taskHistory,
    ],
  );

  return (
    <section className="conversation-stage project-home" aria-label={`${project.name}主页`}>
      <header className="project-home-header">
        <div className="project-home-identity">
          <span className="icon-wrapper project-home-icon-wrapper" aria-hidden="true">
            <FolderClosed size={20} />
          </span>
          <div>
            <Title level={4} style={{ color: token.colorText, fontSize: token.fontSizeHeading4 }}>
              {project.name}
            </Title>
            <Text type="secondary">{`由${currentUser.name}创建`}</Text>
          </div>
        </div>
          <div className="project-home-actions" aria-label="群组项目工具">
          <ProjectMembersButton applications={projectCatalogApplications} />
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                { key: "edit", icon: <Pencil size={14} />, label: "编辑群组项目" },
                { key: "archive", icon: <Archive size={14} />, label: "归档群组项目" },
              ],
              onClick: ({ key }) => {
                if (key === "edit") {
                  onEditProject();
                  return;
                }
                modal.confirm({
                  title: `归档“${project.name}”？`,
                  content: "归档后，群组项目及其对话会从当前群组项目列表中隐藏，之后仍可在归档群组项目中恢复。",
                  okText: "归档群组项目",
                  okButtonProps: { danger: true },
                  cancelText: "取消",
                  onOk: () => antMessage.success("群组项目已归档"),
                });
              },
            }}
          >
            <Button type="text" size="small" icon={<MoreHorizontal size={16} />} aria-label="群组项目更多操作" />
          </Dropdown>
        </div>
      </header>

      <div className="project-home-body">
        <Tabs className="project-tabs" defaultActiveKey="activity" items={tabItems} />

        <aside className="project-home-rail" aria-label="群组项目概览模块">
          <section className="project-overview-module" aria-labelledby="project-applications-title">
            <div className="project-overview-module-header">
              <Title id="project-applications-title" level={5}>当前群组项目的数字员工</Title>
              <Button
                className="project-overview-add"
                type="text"
                size="small"
                icon={<CirclePlus size={16} />}
                aria-label="添加群组项目数字员工"
                onClick={() => {
                  setManagedApplicationIds(project.applicationIds ?? []);
                  setManagedApplicationCategory("全部");
                  setManageApplicationsOpen(true);
                }}
              />
            </div>
            <div className="project-application-list">
              {projectApplications.map((application) => (
                <button
                  className="project-application-item"
                  key={application.id}
                  type="button"
                  aria-label={`使用${application.name}发起新对话`}
                  onClick={() => onCreateApplicationConversation(application.id)}
                >
                  <span className="project-overview-icon" aria-hidden="true">{application.icon}</span>
                  <span className="project-application-copy">
                    <span>{application.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="project-overview-module" aria-labelledby="project-schedules-title">
            <div className="project-overview-module-header">
              <Title id="project-schedules-title" level={5}>定时任务</Title>
              <Button
                className="project-overview-add"
                type="text"
                size="small"
                icon={<CirclePlus size={16} />}
                aria-label="新建定时任务"
                onClick={openScheduledTaskModal}
              />
            </div>
            <div className="project-schedule-list">
              {scheduledTasks.map((task) => (
                <button
                  className="project-schedule-item"
                  type="button"
                  key={task.id}
                  aria-label={`进入定时任务对话：${task.title}`}
                  onClick={() => onOpenScheduledTask(task)}
                >
                  <span
                    className="project-schedule-status"
                    data-enabled={task.enabled}
                    role="img"
                    aria-label={task.enabled ? "运行中" : "已暂停"}
                  />
                  <span className="project-schedule-copy">
                    <span>{task.title}</span>
                    <small>{task.cadence}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="project-starter-footer" aria-label={`在${project.name}中新建对话`}>
        <div className="composer-root project-starter-composer">
          {draftFiles.length ? (
            <div className="attachment-list" aria-label="待发送附件">
              {draftFiles.map((file) => (
                <Tag
                  key={file.uid}
                  bordered
                  closable
                  icon={<FileText size={13} />}
                  onClose={() => onDraftFileRemove(file)}
                >
                  {file.name}
                </Tag>
              ))}
            </div>
          ) : null}
          <Input.TextArea
            className="composer-input"
            aria-label={`在${project.name}中新建对话`}
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder={`在${project.name}中描述任务或提出问题`}
            value={starterPrompt}
            onChange={(event) => setStarterPrompt(event.target.value)}
            onPressEnter={(event) => {
              if (event.shiftKey) return;
              event.preventDefault();
              submitStarterPrompt();
            }}
          />
          <div className="composer-actions">
            <Space size={4}>
              <AttachmentSourceMenu
                uploadProps={uploadProps}
                resources={files}
                resourceConversations={conversations}
              />
              <ProjectApplicationSelector
                applicationId={starterCatalogApplicationId}
                applications={projectCatalogApplications}
                onApplicationChange={setStarterCatalogApplicationId}
              />
            </Space>
            <Button
              type="primary"
              icon={<ArrowUpFromDot size={15} />}
              disabled={!starterPrompt.trim()}
              aria-label="发送并新建群组项目对话"
              onClick={submitStarterPrompt}
            >
              发送
            </Button>
          </div>
        </div>
      </footer>

      <ScheduledTaskModal
        open={scheduleModalOpen}
        onCancel={() => setScheduleModalOpen(false)}
        onCreate={createScheduledTask}
      />

      <Modal
        className="manage-project-applications-modal"
        title="添加群组项目数字员工"
        open={manageApplicationsOpen}
        okText="保存"
        cancelText="取消"
        onCancel={() => setManageApplicationsOpen(false)}
        onOk={() => {
          onProjectApplicationsChange(managedApplicationIds);
          setManageApplicationsOpen(false);
        }}
        destroyOnHidden
      >
        <div className="manage-project-applications-form">
          <section className="create-project-field" aria-labelledby="manage-project-applications-label">
            <ResponsiveApplicationCategories
              ariaLabel="筛选数字员工分类"
              value={managedApplicationCategory}
              onChange={setManagedApplicationCategory}
            />
            <div className="create-project-application-list">
              {applicationCatalog
                .filter((application) => managedApplicationCategory === "全部"
                  || application.category === managedApplicationCategory)
                .map((application) => {
                  const checked = managedApplicationIds.includes(application.id);
                  return (
                    <div className="create-project-application" data-checked={checked} key={application.id}>
                      <img className="create-project-application-cover" src={application.avatar} alt="" />
                      <span className="create-project-application-copy">
                        <span className="font-strong">{application.name}</span>
                        <small>{application.description}</small>
                      </span>
                      <Button
                        className="create-project-application-action"
                        size="small"
                        type="default"
                        aria-label={`${checked ? "移除" : "添加"}${application.name}`}
                        onClick={() => {
                          setManagedApplicationIds((current) => checked
                            ? current.filter((itemId) => itemId !== application.id)
                            : [...current, application.id]);
                        }}
                      >
                        {checked ? "移除" : "添加"}
                      </Button>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>
      </Modal>
    </section>
  );
}

type ConversationNavigationProps = {
  collapsed: boolean;
  activeConversationId: string;
  activeProjectId: string;
  applicationsPageActive: boolean;
  newConversationActive: boolean;
  overviewPageActive: boolean;
  darkMode: boolean;
  isStandaloneConversation: boolean;
  projectNavigationActive: boolean;
  conversations: Conversation[];
  conversationTasks: ConversationTaskState[];
  viewedTaskVersions: Record<string, number>;
  projects: Project[];
  onCreateProject: (
    name: string,
    applicationIds: string[],
    administratorApplicationId: string,
    description: string,
  ) => void;
  onCreateStandaloneConversation: () => void;
  onApplicationsOpen: () => void;
  onOverviewOpen: () => void;
  onDarkModeChange: (value: boolean) => void;
  onDelete: (conversation: Conversation) => void;
  onProjectSelect: (projectId: string) => void;
  onPrototypeAction: (label: string) => void;
  onArchiveProject: (project: Project) => void;
  onRename: (conversation: Conversation) => void;
  onRenameProject: (project: Project) => void;
  onSelect: (conversationId: string) => void;
  onSidebarExpand: () => void;
  onSidebarClose: () => void;
};

function ConversationNavigation({
  collapsed,
  activeConversationId,
  activeProjectId,
  applicationsPageActive,
  newConversationActive,
  overviewPageActive,
  darkMode,
  isStandaloneConversation,
  projectNavigationActive,
  conversations,
  conversationTasks,
  viewedTaskVersions,
  projects,
  onCreateProject,
  onCreateStandaloneConversation,
  onApplicationsOpen,
  onOverviewOpen,
  onDarkModeChange,
  onDelete,
  onProjectSelect,
  onPrototypeAction,
  onArchiveProject,
  onRename,
  onRenameProject,
  onSelect,
  onSidebarExpand,
  onSidebarClose,
}: ConversationNavigationProps) {
  const { token: navigationToken } = antdTheme.useToken();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(teamOptions[0].id);
  const [navigationMode, setNavigationMode] = useState<"daily" | "app-builder">("daily");
  const [collapsedHistoryOpen, setCollapsedHistoryOpen] = useState(false);
  const [navigationContentType, setNavigationContentType] = useState<"all" | "conversation" | "project">("all");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectApplicationIds, setNewProjectApplicationIds] = useState<string[]>([]);
  const [newProjectAdministratorId, setNewProjectAdministratorId] = useState<string | null>(null);
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectApplicationSearch, setNewProjectApplicationSearch] = useState("");
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("zh-CN");
  const navigationSortNow = new Date();
  const activeTeam = teamOptions.find((team) => team.id === activeTeamId) ?? teamOptions[0];
  const teamMenu: MenuProps = {
    selectable: true,
    selectedKeys: [activeTeamId],
    onClick: ({ key }) => setActiveTeamId(key),
    items: teamOptions.map((team) => ({
      key: team.id,
      label: (
        <span className="team-switch-option">
          <InitialAvatar name={team.name} color={team.avatarColor} />
          <span>{team.name}</span>
          <Check
            className="team-switch-check"
            data-selected={team.id === activeTeamId}
            aria-hidden="true"
            size={14}
          />
        </span>
      ),
    })),
  };
  const createMenu: MenuProps = {
    items: [
      { key: "assistant", icon: <Bot size={15} />, label: "创建数字员工" },
      { key: "project", icon: <FolderKanban size={15} />, label: "创建群组项目" },
    ],
    onClick: ({ key }) => {
      if (key === "project") {
        setCreateProjectOpen(true);
        return;
      }
      onApplicationsOpen();
    },
  };
  const filteredProjects = projects.filter((project) =>
    [project.name, project.code].some((value) =>
      value.toLocaleLowerCase("zh-CN").includes(normalizedQuery),
    ),
  );
  const standaloneConversationGroups = Array.from(
    conversations
      .filter((conversation) => (
        conversation.projectId === null && !isUnsentConversationDraft(conversation)
      ))
      .reduce((groups, conversation) => {
        const application = getConversationCatalogApplication(conversation);
        const groupKey = application ? `application:${application.id}` : `conversation:${conversation.id}`;
        const existingGroup = groups.get(groupKey);
        if (existingGroup) {
          existingGroup.conversations.push(conversation);
          return groups;
        }
        groups.set(groupKey, {
          key: groupKey,
          application,
          conversations: [conversation],
        });
        return groups;
      }, new Map<string, {
        key: string;
        application: CatalogApplication | undefined;
        conversations: Conversation[];
      }>()),
  ).map(([, group]) => ({
    ...group,
    conversations: [...group.conversations].sort(
      (left, right) => getNavigationUpdatedAtSortValue(right.updatedAt, navigationSortNow) - getNavigationUpdatedAtSortValue(left.updatedAt, navigationSortNow),
    ),
  }));
  const filteredStandaloneConversationGroups = standaloneConversationGroups.filter((group) => {
    if (!normalizedQuery) return true;
    const standaloneApplicationName = group.application?.name;
    return [
      standaloneApplicationName,
      ...group.conversations.flatMap((conversation) => [
        conversation.title,
        agents.find((agent) => agent.id === conversation.agentId)?.name,
      ]),
    ]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase("zh-CN").includes(normalizedQuery));
  });
  const navigationItems = [
    ...(navigationContentType === "conversation" ? [] : filteredProjects.map((project) => {
      const latestProjectConversation = conversations
        .filter((conversation) => conversation.projectId === project.id)
        .sort(
          (left, right) => getNavigationUpdatedAtSortValue(right.updatedAt, navigationSortNow) - getNavigationUpdatedAtSortValue(left.updatedAt, navigationSortNow),
        )[0];
      return {
        type: "project" as const,
        key: `project:${project.id}`,
        project,
        latestConversation: latestProjectConversation,
        sortValue: latestProjectConversation
          ? getNavigationUpdatedAtSortValue(latestProjectConversation.updatedAt, navigationSortNow)
          : 0,
      };
    })),
    ...(navigationContentType === "project" ? [] : filteredStandaloneConversationGroups.map((group) => ({
      type: "conversation" as const,
      key: group.key,
      group,
      sortValue: getNavigationUpdatedAtSortValue(group.conversations[0].updatedAt, navigationSortNow),
    }))),
  ].sort((left, right) => right.sortValue - left.sortValue);
  const activeNavigationMessageCount = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  )?.messages.length ?? 0;

  useEffect(() => {
    if (collapsed) return;
    const frameId = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('.navigation-scroll-area .navigation-content-row[data-active="true"]')
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [activeConversationId, activeNavigationMessageCount, activeProjectId, collapsed]);

  const closeCreateProject = () => {
    setCreateProjectOpen(false);
    setNewProjectName("");
    setNewProjectApplicationIds([]);
    setNewProjectAdministratorId(null);
    setNewProjectDescription("");
    setNewProjectApplicationSearch("");
  };

  const submitCreateProject = () => {
    const projectName = newProjectName.trim();
    if (!projectName || !newProjectAdministratorId) return;
    onCreateProject(
      projectName,
      newProjectApplicationIds,
      newProjectAdministratorId,
      newProjectDescription,
    );
    closeCreateProject();
  };

  const createdDigitalEmployees = useMemo(
    () => getCreatedDigitalEmployees(conversations),
    [conversations],
  );
  const selectedProjectApplications = createdDigitalEmployees.filter((application) =>
    newProjectApplicationIds.includes(application.id),
  );
  const firstSelectedProjectApplicationId = selectedProjectApplications[0]?.id ?? null;
  const normalizedNewProjectApplicationSearch = newProjectApplicationSearch.trim().toLocaleLowerCase("zh-CN");
  const visibleNewProjectApplications = createdDigitalEmployees.filter((application) =>
    `${application.name} ${application.description}`.toLocaleLowerCase("zh-CN").includes(normalizedNewProjectApplicationSearch),
  );
  useEffect(() => {
    if (newProjectAdministratorId && newProjectApplicationIds.includes(newProjectAdministratorId)) return;
    setNewProjectAdministratorId(firstSelectedProjectApplicationId);
  }, [firstSelectedProjectApplicationId, newProjectAdministratorId, newProjectApplicationIds]);

  useEffect(() => {
    setCollapsedHistoryOpen(false);
  }, [activeConversationId, activeProjectId, applicationsPageActive, collapsed]);

  const changeNavigationMode = (value: "daily" | "app-builder") => {
    setNavigationMode(value);
    if (value === "app-builder") {
      window.location.assign(import.meta.env.VITE_APPLICATION_STUDIO_URL || "/applications/studio");
    }
  };

  const navigationItemNodes = navigationItems.map((item) => {
    if (item.type === "project") {
      const { project, latestConversation } = item;
      const projectConversationIds = new Set(
        conversations.filter((conversation) => conversation.projectId === project.id).map((conversation) => conversation.id),
      );
      const navigationTask = pickPrimaryTask(
        conversationTasks.filter((task) => (
          projectConversationIds.has(task.conversationId)
          && shouldShowNavigationTask(task, activeConversationId, viewedTaskVersions)
        )),
      );
      return (
        <div className="navigation-project-group" key={project.id}>
          <div
            className="navigation-content-row navigation-project-row"
            data-active={projectNavigationActive && project.id === activeProjectId}
          >
            <button className="navigation-content-main navigation-project-main" type="button" onClick={() => onProjectSelect(project.id)}>
              <span className="navigation-task-icon-shell"><NavigationProjectIcon project={project} /></span>
              <span className="navigation-content-copy">
                <span className="navigation-content-label">{project.name}</span>
                {latestConversation ? (
                  <span className="navigation-content-latest" title={latestConversation.title}>{latestConversation.title}</span>
                ) : null}
              </span>
            </button>
            {navigationTask ? (
              <NavigationTaskIndicator task={navigationTask} onOpen={() => onSelect(navigationTask.conversationId)} />
            ) : null}
            <Dropdown
              trigger={["click"]}
              menu={{
                items: [
                  { key: "rename", icon: <Pencil size={14} />, label: "重命名群组项目" },
                  { type: "divider" },
                  { key: "archive", danger: true, icon: <Archive size={14} />, label: "归档" },
                ],
                onClick: ({ key }) => {
                  if (key === "rename") onRenameProject(project);
                  if (key === "archive") onArchiveProject(project);
                },
              }}
            >
              <Button className="navigation-icon-button" type="text" size="small" icon={<MoreHorizontal size={14} />} aria-label={`${project.name}更多操作`} />
            </Dropdown>
          </div>
        </div>
      );
    }

    const { group } = item;
    const conversation = group.conversations[0];
    const label = group.application ? group.application.name : conversation.title;
    const groupActive = isStandaloneConversation
      && group.conversations.some((groupConversation) => groupConversation.id === activeConversationId);
    const groupConversationIds = new Set(group.conversations.map((groupConversation) => groupConversation.id));
    const navigationTask = pickPrimaryTask(
      conversationTasks.filter((task) => (
        groupConversationIds.has(task.conversationId)
        && shouldShowNavigationTask(task, activeConversationId, viewedTaskVersions)
      )),
    );
    return (
      <div
        className="navigation-content-row navigation-conversation-row"
        data-active={groupActive}
        key={group.key}
      >
        <button className="navigation-content-main" type="button" onClick={() => onSelect(conversation.id)}>
          <span className="navigation-task-icon-shell"><NavigationConversationIcon conversation={conversation} size={40} /></span>
          <span className="navigation-content-copy">
            <span className="navigation-content-label">{label}</span>
            {group.application ? (
              <span className="navigation-content-latest" title={conversation.title}>{conversation.title}</span>
            ) : null}
          </span>
          <small className="navigation-time">{formatNavigationUpdatedAt(conversation.updatedAt)}</small>
        </button>
        {navigationTask ? (
          <NavigationTaskIndicator task={navigationTask} onOpen={() => onSelect(navigationTask.conversationId)} />
        ) : null}
        <Dropdown
          trigger={["click"]}
          menu={{
            items: conversationMoreMenuItems,
            onClick: ({ key }) => {
              if (key === "rename") onRename(conversation);
              if (key === "delete") onDelete(conversation);
            },
          }}
        >
          <Button className="navigation-icon-button" type="text" size="small" icon={<MoreHorizontal size={16} />} aria-label={`${label}更多操作`} />
        </Dropdown>
      </div>
    );
  });

  const settingsPopup = (
    <div
      className="settings-popup"
      style={{ "--settings-icon-color": navigationToken.colorTextQuaternary } as React.CSSProperties}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="settings-profile">
        <InitialAvatar name={currentUser.name} color={currentUser.avatarColor} size={32} />
        <span className="font-strong">{currentUser.name}</span>
      </div>
      <div className="settings-menu">
        <button className="settings-menu-item" type="button" onClick={() => onPrototypeAction("账号设置")}>
          <UserRoundCog size={16} />
          <span>账号设置</span>
        </button>
        <div className="settings-menu-item settings-appearance-row">
          <span className="settings-menu-item-label">
            <Palette size={16} />
            <span>外观</span>
          </span>
          <Segmented<"light" | "dark">
            className="settings-appearance-switch"
            aria-label="外观"
            options={[
              { label: "浅色", value: "light" },
              { label: "深色", value: "dark" },
            ]}
            value={darkMode ? "dark" : "light"}
            onChange={(value) => onDarkModeChange(value === "dark")}
          />
        </div>
      </div>
      <Divider className="settings-popup-divider" />
      <button className="settings-menu-item settings-logout-item" type="button" onClick={() => onPrototypeAction("退出登录")}>
        <LogOut size={16} />
        <span>退出登录</span>
      </button>
    </div>
  );
  return (
    <nav
      className={collapsed ? "conversation-navigation conversation-navigation-collapsed" : "conversation-navigation"}
      aria-label="Argus 工作台导航"
      style={{ "--navigation-icon-color": navigationToken.colorTextQuaternary } as React.CSSProperties}
    >
      {collapsed ? (
        <div className="collapsed-navigation-shell">
          <div className="collapsed-navigation-top">
            <Tooltip title="展开侧边栏" placement="right">
              <button
                className="collapsed-navigation-logo"
                type="button"
                aria-label="展开侧边栏"
                onClick={onSidebarExpand}
              >
                <span className="collapsed-navigation-logo-mark" aria-hidden="true">
                  <img src={getPublicAssetPath("logo-collapsed.png")} alt="" />
                </span>
                <span className="collapsed-navigation-expand-icon" aria-hidden="true">
                  <PanelLeftOpen size={16} />
                </span>
              </button>
            </Tooltip>

            <div className="collapsed-navigation-primary">
              <Tooltip title="新对话" placement="right">
                <Button
                  className={newConversationActive ? "collapsed-navigation-action is-active" : "collapsed-navigation-action"}
                  type="text"
                  icon={<MessageCirclePlus size={16} />}
                  aria-label="新对话"
                  onClick={onCreateStandaloneConversation}
                >
                  <span className="collapsed-navigation-action-label">新对话</span>
                </Button>
              </Tooltip>
              <Tooltip title="概览" placement="right">
                <Button
                  className={overviewPageActive ? "collapsed-navigation-action is-active" : "collapsed-navigation-action"}
                  type="text"
                  icon={<Gauge size={16} />}
                  aria-label="概览"
                  onClick={onOverviewOpen}
                >
                  <span className="collapsed-navigation-action-label">概览</span>
                </Button>
              </Tooltip>
              <Tooltip title="人才与技能" placement="right">
                <Button
                  className={applicationsPageActive ? "collapsed-navigation-action is-active" : "collapsed-navigation-action"}
                  type="text"
                  icon={<Store size={16} />}
                  aria-label="人才与技能"
                  onClick={onApplicationsOpen}
                >
                  <span className="collapsed-navigation-action-label">人才与技能</span>
                </Button>
              </Tooltip>
              <Popover
                overlayClassName="collapsed-navigation-popover collapsed-navigation-history-popover"
                arrow={false}
                placement="rightTop"
                trigger={["hover"]}
                mouseEnterDelay={0.06}
                mouseLeaveDelay={0.18}
                open={collapsedHistoryOpen}
                onOpenChange={setCollapsedHistoryOpen}
                content={(
                  <div className="collapsed-navigation-history-panel">
                    <header className="collapsed-navigation-history-header">
                      <Select<"all" | "conversation" | "project">
                        className="navigation-content-filter"
                        size="small"
                        variant="borderless"
                        aria-label="筛选群组项目与数字员工"
                        value={navigationContentType}
                        options={[
                          { label: "全部对话", value: "all" },
                          { label: "数字员工", value: "conversation" },
                          { label: "群组项目", value: "project" },
                        ]}
                        popupMatchSelectWidth={120}
                        menuItemSelectedIcon={<Check size={14} color={navigationToken.colorSuccess} />}
                        suffixIcon={<ChevronDown size={12} />}
                        onChange={setNavigationContentType}
                      />
                      <Dropdown
                        classNames={{ root: "navigation-create-menu" }}
                        menu={createMenu}
                        placement="bottomRight"
                        trigger={["click"]}
                      >
                        <Button className="navigation-icon-button" type="text" size="small" icon={<CirclePlus size={16} />} aria-label="添加" />
                      </Dropdown>
                    </header>
                    <div className="navigation-item-list collapsed-navigation-history-list">
                      {navigationItemNodes}
                      {navigationItems.length === 0 ? (
                        <Text className="navigation-empty" type="secondary">暂无群组项目或对话</Text>
                      ) : null}
                    </div>
                  </div>
                )}
              >
                <Button
                  className={collapsedHistoryOpen ? "collapsed-navigation-action is-active" : "collapsed-navigation-action"}
                  type="text"
                  icon={<History size={16} />}
                  aria-label="全部对话"
                >
                  <span className="collapsed-navigation-action-label">全部对话</span>
                </Button>
              </Popover>
            </div>
          </div>

          <div className="collapsed-navigation-footer">
            <Tooltip title="切换到应用构建" placement="right">
              <Button
                className="collapsed-navigation-action"
                type="text"
                icon={<ArrowRightLeft size={16} />}
                aria-label="切换到应用构建"
                onClick={() => changeNavigationMode("app-builder")}
              >
                <span className="collapsed-navigation-action-label">应用构建</span>
              </Button>
            </Tooltip>
            <Dropdown
              trigger={["click"]}
              placement="topRight"
              menu={{ items: [] }}
              popupRender={() => settingsPopup}
            >
              <Tooltip title="设置" placement="right">
                <Button className="collapsed-navigation-action" type="text" icon={<Settings size={16} />} aria-label="设置">
                  <span className="collapsed-navigation-action-label">设置</span>
                </Button>
              </Tooltip>
            </Dropdown>
          </div>
        </div>
      ) : (
        <>
      <div className="navigation-brand-row">
        <button className="navigation-brand" type="button" onClick={() => onProjectSelect(activeProjectId)}>
          <img className="navigation-brand-logo" src={getPublicAssetPath("logo-expanded.png")} alt="朝夕智能" />
        </button>
        <Space size={12}>
          <Tooltip title="搜索">
            <Button
              className="navigation-icon-button"
              type="text"
              icon={<Search size={16} />}
              aria-label="搜索对话或群组项目"
              onClick={() => setSearchOpen((value) => !value)}
            />
          </Tooltip>
          <Tooltip title="收起侧边栏">
            <Button
              className="navigation-icon-button"
              type="text"
              icon={<PanelLeft size={16} />}
              aria-label="收起侧边栏"
              onClick={onSidebarClose}
            />
          </Tooltip>
        </Space>
      </div>

      {searchOpen ? (
        <Input
          className="navigation-search"
          autoFocus
          allowClear
          prefix={<Search size={15} />}
          placeholder="搜索对话或群组项目"
          aria-label="搜索对话或群组项目"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      ) : null}

      <div className="navigation-fixed-links" aria-label="工作区导航">
        <button
          className="navigation-primary-action"
          data-active={newConversationActive}
          type="button"
          aria-label="新对话"
          onClick={onCreateStandaloneConversation}
        >
          <MessageCirclePlus size={16} />
          <span>新对话</span>
        </button>
        <button
          className="navigation-primary-action"
          data-active={overviewPageActive}
          type="button"
          aria-label="概览"
          onClick={onOverviewOpen}
        >
          <Gauge size={16} />
          <span>概览</span>
        </button>
        <button
          className="navigation-primary-action"
          data-active={applicationsPageActive}
          type="button"
          aria-label="人才与技能"
          onClick={onApplicationsOpen}
        >
          <Store size={16} /><span>人才与技能</span>
        </button>
      </div>

      <div className="navigation-scroll-area">
        <section className="navigation-section">
          <header className="navigation-section-header">
            <Select<"all" | "conversation" | "project">
              className="navigation-content-filter"
              size="small"
              variant="borderless"
              aria-label="筛选群组项目与数字员工"
              value={navigationContentType}
              options={[
                { label: "全部对话", value: "all" },
                { label: "数字员工", value: "conversation" },
                { label: "群组项目", value: "project" },
              ]}
              popupMatchSelectWidth={120}
              menuItemSelectedIcon={<Check size={14} color={navigationToken.colorSuccess} />}
              suffixIcon={<ChevronDown size={12} />}
              onChange={setNavigationContentType}
            />
            <Tooltip title="添加">
              <Dropdown
                classNames={{ root: "navigation-create-menu" }}
                menu={createMenu}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Button className="navigation-icon-button" type="text" size="small" icon={<CirclePlus size={16} />} aria-label="添加" />
              </Dropdown>
            </Tooltip>
          </header>
          <div className="navigation-item-list">
            {navigationItems.map((item) => {
              if (item.type === "project") {
                const { project, latestConversation } = item;
                const projectConversationIds = new Set(
                  conversations.filter((conversation) => conversation.projectId === project.id).map((conversation) => conversation.id),
                );
                const navigationTask = pickPrimaryTask(
                  conversationTasks.filter((task) => (
                    projectConversationIds.has(task.conversationId)
                    && shouldShowNavigationTask(task, activeConversationId, viewedTaskVersions)
                  )),
                );
                return (
                  <div className="navigation-project-group" key={project.id}>
                    <div
                      className="navigation-content-row navigation-project-row"
                      data-active={projectNavigationActive && project.id === activeProjectId}
                    >
                      <button className="navigation-content-main navigation-project-main" type="button" onClick={() => onProjectSelect(project.id)}>
                        <span className="navigation-task-icon-shell"><NavigationProjectIcon project={project} /></span>
                        <span className="navigation-content-copy">
                          <span className="navigation-content-label">{project.name}</span>
                          {latestConversation ? (
                            <span className="navigation-content-latest" title={latestConversation.title}>{latestConversation.title}</span>
                          ) : null}
                        </span>
                      </button>
                      {navigationTask ? (
                        <NavigationTaskIndicator task={navigationTask} onOpen={() => onSelect(navigationTask.conversationId)} />
                      ) : null}
                      <Dropdown
                        trigger={["click"]}
                        menu={{
                          items: [
                            { key: "rename", icon: <Pencil size={14} />, label: "重命名群组项目" },
                            { type: "divider" },
                            { key: "archive", danger: true, icon: <Archive size={14} />, label: "归档" },
                          ],
                          onClick: ({ key }) => {
                            if (key === "rename") onRenameProject(project);
                            if (key === "archive") onArchiveProject(project);
                          },
                        }}
                      >
                        <Button className="navigation-icon-button" type="text" size="small" icon={<MoreHorizontal size={14} />} aria-label={`${project.name}更多操作`} />
                      </Dropdown>
                    </div>
                  </div>
                );
              }

              const { group } = item;
              const conversation = group.conversations[0];
              const label = group.application
                ? group.application.name
                : conversation.title;
              const groupActive = isStandaloneConversation
                && group.conversations.some((groupConversation) => groupConversation.id === activeConversationId);
              const groupConversationIds = new Set(group.conversations.map((groupConversation) => groupConversation.id));
              const navigationTask = pickPrimaryTask(
                conversationTasks.filter((task) => (
                  groupConversationIds.has(task.conversationId)
                  && shouldShowNavigationTask(task, activeConversationId, viewedTaskVersions)
                )),
              );
              return (
                <div
                  className="navigation-content-row navigation-conversation-row"
                  data-active={groupActive}
                  key={group.key}
                >
                  <button className="navigation-content-main" type="button" onClick={() => onSelect(conversation.id)}>
                    <span className="navigation-task-icon-shell"><NavigationConversationIcon conversation={conversation} size={40} /></span>
                    <span className="navigation-content-copy">
                      <span className="navigation-content-label">{label}</span>
                      {group.application ? (
                        <span className="navigation-content-latest" title={conversation.title}>{conversation.title}</span>
                      ) : null}
                    </span>
                    <small className="navigation-time">{formatNavigationUpdatedAt(conversation.updatedAt)}</small>
                  </button>
                  {navigationTask ? (
                    <NavigationTaskIndicator task={navigationTask} onOpen={() => onSelect(navigationTask.conversationId)} />
                  ) : null}
                  <Dropdown
                    trigger={["click"]}
                    menu={{
                      items: conversationMoreMenuItems,
                      onClick: ({ key }) => {
                        if (key === "rename") onRename(conversation);
                        if (key === "delete") onDelete(conversation);
                      },
                    }}
                  >
                    <Button className="navigation-icon-button" type="text" size="small" icon={<MoreHorizontal size={16} />} aria-label={`${label}更多操作`} />
                  </Dropdown>
                </div>
              );
            })}
            {navigationItems.length === 0 ? (
              <Text className="navigation-empty" type="secondary">暂无群组项目或对话</Text>
            ) : null}
          </div>
        </section>
      </div>

      <div className="navigation-mode-switch">
        <Segmented<"daily" | "app-builder">
          block
          size="middle"
          aria-label="导航模式"
          value={navigationMode}
          options={[
            { label: "日常办公", value: "daily" },
            { label: "应用构建", value: "app-builder" },
          ]}
          onChange={changeNavigationMode}
        />
      </div>

      <div className="navigation-account">
        <div className="profile-row">
          <Dropdown menu={teamMenu} placement="topLeft" trigger={["click"]}>
            <button className="navigation-team-selector" type="button" aria-label={`切换团队，当前为${activeTeam.name}`}>
              <InitialAvatar name={activeTeam.name} color={activeTeam.avatarColor} />
              <span className="navigation-team-copy">
                <span>{activeTeam.name}</span>
              </span>
              <ChevronsUpDown size={12} />
            </button>
          </Dropdown>
          <Dropdown
            trigger={["click"]}
            placement="topRight"
            menu={{ items: [] }}
            popupRender={() => settingsPopup}
          >
            <Tooltip title="设置">
              <Button className="navigation-icon-button" type="text" icon={<Settings size={16} />} aria-label="设置" />
            </Tooltip>
          </Dropdown>
        </div>
      </div>
        </>
      )}

      <Modal
        className="create-project-modal"
        title="创建群组项目"
        open={createProjectOpen}
        width={800}
        centered
        okText="创建群组项目"
        cancelText="取消"
        okButtonProps={{ disabled: !newProjectName.trim() || !newProjectAdministratorId }}
        onCancel={closeCreateProject}
        onOk={submitCreateProject}
        destroyOnHidden
      >
        <div className="create-project-form">
          <section className="create-project-applications" aria-labelledby="create-project-applications-label">
            <span id="create-project-applications-label" className="create-project-label">选择已创建的数字员工</span>
            <Input
              className="create-project-application-search"
              value={newProjectApplicationSearch}
              prefix={<Search size={14} />}
              placeholder="搜索数字员工"
              aria-label="搜索数字员工"
              allowClear
              onChange={(event) => setNewProjectApplicationSearch(event.target.value)}
            />
            <div className="create-project-application-list">
              {visibleNewProjectApplications.map((application) => {
                const checked = newProjectApplicationIds.includes(application.id);
                return (
                  <label className="create-project-application" data-checked={checked} key={application.id}>
                    <img className="create-project-application-cover" src={application.avatar} alt="" />
                    <span className="create-project-application-copy">
                      <span className="font-strong">{application.name}</span>
                      <small>{application.description}</small>
                    </span>
                    <Checkbox
                      checked={checked}
                      aria-label={`${checked ? "取消选择" : "选择"}${application.name}`}
                      onChange={() => {
                        setNewProjectApplicationIds((current) => checked
                          ? current.filter((itemId) => itemId !== application.id)
                          : [...current, application.id]);
                      }}
                    />
                  </label>
                );
              })}
              {visibleNewProjectApplications.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={normalizedNewProjectApplicationSearch
                    ? "没有匹配的已创建数字员工"
                    : "暂无已创建的数字员工"}
                />
              ) : null}
            </div>
          </section>
          <Divider type="vertical" className="create-project-divider" />
          <div className="create-project-details">
            <label className="create-project-field">
              <span className="create-project-label">群组项目名称</span>
              <Input
                autoFocus
                value={newProjectName}
                maxLength={30}
                placeholder="请输入"
                aria-label="群组项目名称"
                onChange={(event) => setNewProjectName(event.target.value)}
                onPressEnter={submitCreateProject}
              />
            </label>
            <label className="create-project-field">
              <span className="create-project-label">群组项目管理员</span>
              <Select
                value={newProjectAdministratorId}
                placeholder="请先勾选数字员工"
                aria-label="群组项目管理员"
                options={selectedProjectApplications.map((application) => ({
                  value: application.id,
                  label: application.name,
                }))}
                onChange={setNewProjectAdministratorId}
              />
            </label>
            <label className="create-project-field create-project-description-field">
              <span className="create-project-label">群组项目描述</span>
              <Input.TextArea
                value={newProjectDescription}
                maxLength={500}
                placeholder="示例：围绕业务需求协调数字员工完成分析、执行与交付，推动群组项目高效落地"
                aria-label="群组项目描述"
                onChange={(event) => setNewProjectDescription(event.target.value)}
              />
            </label>
          </div>
        </div>
      </Modal>
    </nav>
  );
}

function NavigationTaskIndicator({ task, onOpen }: { task: ConversationTaskState; onOpen: () => void }) {
  return (
    <Tooltip title={`${globalTaskStatusCopy[task.status]} · 点击返回对话`}>
      <button
        className={`navigation-task-indicator is-${task.status}`}
        type="button"
        aria-label={`${task.ownerName}${globalTaskStatusCopy[task.status]}，点击返回对话`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
      >
        <span aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

const MESSAGE_FLAGS_STORAGE_PREFIX = "argus-conversation-message-flags-v1";

function readMessageFlags(conversationId: string) {
  try {
    const value = window.localStorage.getItem(`${MESSAGE_FLAGS_STORAGE_PREFIX}:${conversationId}`);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function getQuickNavigationCopy(message: DemoMessage) {
  const text = getStoredMessageText(message).replace(/\s+/g, " ").trim();
  const fallback = message.role === "user" ? "你的消息" : "数字员工回复";
  if (!text) return { title: fallback, detail: "暂无文本内容" };

  const firstSentence = text.split(/[。！？!?\n]/)[0]?.trim() || text;
  const title = firstSentence.length > 22 ? `${firstSentence.slice(0, 22)}…` : firstSentence;
  const detailText = text.length > 64 ? `${text.slice(0, 64)}…` : text;
  return {
    title,
    detail: `${message.role === "user" ? "你" : "数字员工"} · ${detailText}`,
  };
}

function ConversationQuickNavigator({
  conversationId,
  messages,
  viewportRef,
}: {
  conversationId: string;
  messages: DemoMessage[];
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const [activeMessageId, setActiveMessageId] = useState(messages.at(-1)?.id ?? null);
  const [previewMessageId, setPreviewMessageId] = useState<string | null>(null);
  const [flaggedMessageIds, setFlaggedMessageIds] = useState<string[]>(() => readMessageFlags(conversationId));

  useEffect(() => {
    setFlaggedMessageIds(readMessageFlags(conversationId));
    setPreviewMessageId(null);
    setActiveMessageId(messages.at(-1)?.id ?? null);
  }, [conversationId, messages]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || messages.length === 0) return;

    let frameId = 0;
    const updateActiveMessage = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const viewportRect = viewport.getBoundingClientRect();
        const focusLine = viewportRect.top + Math.min(180, viewportRect.height * 0.36);
        const rows = [...viewport.querySelectorAll<HTMLElement>("[data-message-id]")];
        const nearestRow = rows.reduce<HTMLElement | null>((nearest, row) => {
          if (!nearest) return row;
          const rowDistance = Math.abs(row.getBoundingClientRect().top - focusLine);
          const nearestDistance = Math.abs(nearest.getBoundingClientRect().top - focusLine);
          return rowDistance < nearestDistance ? row : nearest;
        }, null);
        if (nearestRow?.dataset.messageId) setActiveMessageId(nearestRow.dataset.messageId);
      });
    };

    updateActiveMessage();
    viewport.addEventListener("scroll", updateActiveMessage, { passive: true });
    window.addEventListener("resize", updateActiveMessage);
    return () => {
      window.cancelAnimationFrame(frameId);
      viewport.removeEventListener("scroll", updateActiveMessage);
      window.removeEventListener("resize", updateActiveMessage);
    };
  }, [messages, viewportRef]);

  const jumpToMessage = (messageId: string) => {
    const row = [...(viewportRef.current?.querySelectorAll<HTMLElement>("[data-message-id]") ?? [])]
      .find((element) => element.dataset.messageId === messageId);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveMessageId(messageId);
  };

  const toggleMessageFlag = (messageId: string) => {
    setFlaggedMessageIds((current) => {
      const next = current.includes(messageId)
        ? current.filter((item) => item !== messageId)
        : [...current, messageId];
      window.localStorage.setItem(`${MESSAGE_FLAGS_STORAGE_PREFIX}:${conversationId}`, JSON.stringify(next));
      return next;
    });
  };

  return (
    <nav className="conversation-quick-nav" aria-label="对话快速定位">
      <div className="conversation-quick-nav-list">
        {messages.map((message, index) => {
          const active = message.id === activeMessageId;
          const previewOpen = message.id === previewMessageId;
          const flagged = flaggedMessageIds.includes(message.id);
          const copy = getQuickNavigationCopy(message);
          return (
            <div
              className={`conversation-quick-nav-item${active ? " is-active" : ""}${flagged ? " is-flagged" : ""}${previewOpen ? " is-previewing" : ""}`}
              key={message.id}
              onMouseEnter={() => setPreviewMessageId(message.id)}
              onMouseLeave={() => setPreviewMessageId(null)}
              onFocus={() => setPreviewMessageId(message.id)}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPreviewMessageId(null);
              }}
            >
              <button
                className="conversation-quick-nav-marker"
                type="button"
                aria-label={`定位到第 ${index + 1} 条消息：${copy.title}`}
                aria-current={active ? "true" : undefined}
                onClick={() => jumpToMessage(message.id)}
              >
                <span aria-hidden="true" />
              </button>
              {previewOpen ? (
                <article className="conversation-quick-nav-preview" aria-label={`${copy.title}消息预览`}>
                  <div className="conversation-quick-nav-preview-copy">
                    <strong>{copy.title}</strong>
                    <span>{copy.detail}</span>
                  </div>
                  <button
                    className={`conversation-quick-nav-flag${flagged ? " is-flagged" : ""}`}
                    type="button"
                    aria-label={flagged ? "取消旗标" : "添加旗标"}
                    aria-pressed={flagged}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleMessageFlag(message.id);
                    }}
                  >
                    <Bookmark size={16} fill={flagged ? "currentColor" : "none"} />
                  </button>
                </article>
              ) : null}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

type ThreadViewProps = {
  conversationId: string;
  messages: DemoMessage[];
  showConversationTarget: boolean;
  activeAgentName: string;
  administratorApplicationId?: string | null;
  catalogApplicationId: string | null;
  project?: Project | null;
  projectApplications?: CatalogApplication[];
  availableApplications: CatalogApplication[];
  availableProjects: Project[];
  enableApplicationMentions?: boolean;
  resourceFiles: GeneratedFile[];
  resourceConversations: Conversation[];
  files: SelectedFile[];
  insertStarterPromptRef: { current: ((prompt: string) => void) | null };
  onFileRemove: (file: SelectedFile) => void;
  onTargetApplicationSelect: (applicationId: string) => void;
  onTargetProjectSelect: (projectId: string) => void;
  uploadProps: UploadProps;
};

function ThreadView({
  conversationId,
  messages,
  showConversationTarget,
  activeAgentName,
  administratorApplicationId,
  catalogApplicationId,
  project,
  projectApplications,
  availableApplications,
  availableProjects,
  enableApplicationMentions = false,
  resourceFiles,
  resourceConversations,
  files,
  insertStarterPromptRef,
  onFileRemove,
  onTargetApplicationSelect,
  onTargetProjectSelect,
  uploadProps,
}: ThreadViewProps) {
  const isEmpty = useAuiState((state) => state.thread.isEmpty);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const insertApplicationMentionRef = useRef<((application: CatalogApplication) => void) | null>(null);
  const selectedCatalogApplication = projectApplications?.find(
    (application) => application.id === catalogApplicationId,
  );
  return (
    <ThreadPrimitive.Root className="thread-root">
      {!isEmpty ? (
        <ConversationQuickNavigator
          conversationId={conversationId}
          messages={messages}
          viewportRef={viewportRef}
        />
      ) : null}
      <ThreadPrimitive.Viewport
        ref={viewportRef}
        className={`thread-viewport${isEmpty ? " is-empty" : ""}`}
        scrollToBottomOnThreadSwitch
      >
        <div className="thread-content">
          <ThreadPrimitive.Messages>
            {({ message }) => {
              if (message.composer.isEditing) return <EditMessage />;
              return message.role === "user"
                ? <UserMessage />
                : <AssistantMessage
                    application={selectedCatalogApplication}
                    administratorApplicationId={administratorApplicationId}
                    enableApplicationMention={enableApplicationMentions}
                    fallbackName={activeAgentName}
                    onApplicationMention={(application) => insertApplicationMentionRef.current?.(application)}
                  />;
            }}
          </ThreadPrimitive.Messages>
        </div>

        <div className="empty-thread-heading" aria-hidden={!isEmpty}>
          <NewConversationPrompt
            active={isEmpty}
            application={selectedCatalogApplication}
            projectMode={enableApplicationMentions}
            project={project}
            onSuggestion={(prompt) => insertStarterPromptRef.current?.(prompt)}
          />
        </div>

        <ThreadPrimitive.ViewportFooter className="composer-footer">
          <Composer
            conversationId={conversationId}
            selectedApplication={selectedCatalogApplication}
            selectedProject={project}
            showConversationTarget={showConversationTarget}
            availableApplications={availableApplications}
            availableProjects={availableProjects}
            projectApplications={projectApplications}
            enableApplicationMentions={enableApplicationMentions}
            insertApplicationMentionRef={insertApplicationMentionRef}
            insertStarterPromptRef={insertStarterPromptRef}
            resourceFiles={resourceFiles}
            resourceConversations={resourceConversations}
            files={files}
            onFileRemove={onFileRemove}
            onTargetApplicationSelect={onTargetApplicationSelect}
            onTargetProjectSelect={onTargetProjectSelect}
            uploadProps={uploadProps}
          />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function NewConversationPrompt({
  active,
  application,
  projectMode,
  project,
  onSuggestion,
}: {
  active: boolean;
  application?: CatalogApplication;
  projectMode: boolean;
  project?: Project | null;
  onSuggestion: (prompt: string) => void;
}) {
  const prompt = application ? "你好，今天我能帮你什么？" : "我能为你做什么？";
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    if (!active) {
      setVisibleText("");
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleText(prompt);
      return;
    }

    let characterIndex = 0;
    const intervalId = window.setInterval(() => {
      characterIndex += 1;
      setVisibleText(prompt.slice(0, characterIndex));
      if (characterIndex >= prompt.length) window.clearInterval(intervalId);
    }, 45);

    return () => window.clearInterval(intervalId);
  }, [active]);

  if (!active) return null;

  if (projectMode || application) {
    const starterPrompts = projectMode && project
      ? getProjectStarterPrompts(project)
      : application
        ? getApplicationStarterPrompts(application)
        : [];
    const welcomeTitle = projectMode ? "欢迎使用群组项目" : prompt;
    const welcomeDescription = projectMode
      ? "我们随时在线，把专业工作交给专业的人"
      : `我是${application?.name}，${application?.description}。`;
    return (
      <section className="new-conversation-welcome" aria-labelledby="new-conversation-welcome-title">
        {projectMode && project ? (
          <div className="new-conversation-project-avatar">
            <NavigationProjectIcon project={project} />
          </div>
        ) : application ? (
          <Avatar
            className="new-conversation-welcome-avatar application-avatar-surface"
            size={72}
            src={application.avatar}
          />
        ) : null}
        <h1 id="new-conversation-welcome-title">{welcomeTitle}</h1>
        <p>{welcomeDescription}</p>
        <div className="new-conversation-suggestions" aria-label="推荐任务">
          {starterPrompts.map((starterPrompt) => (
            <button type="button" key={starterPrompt} onClick={() => onSuggestion(starterPrompt)}>
              <Sparkles size={17} aria-hidden="true" />
              <span>{starterPrompt}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <h1 className="new-conversation-prompt" aria-label={prompt}>
      <span aria-hidden="true">{visibleText}</span>
      {visibleText.length < prompt.length ? <span className="typewriter-caret" aria-hidden="true" /> : null}
    </h1>
  );
}

function UserMessage() {
  const messageId = useAuiState((state) => state.message.id);
  return (
    <MessagePrimitive.Root className="message-row user-message-row" data-message-id={messageId}>
      <div className="message-column">
        <div className="message-meta"><span>你</span></div>
        <div className="message-surface user-message-surface">
          <MessagePrimitive.Parts>
            {({ part }) => part.type === "text" ? <MessageTextWithMentions text={part.text} /> : null}
          </MessagePrimitive.Parts>
        </div>
        <ActionBarPrimitive.Root className="message-actions" autohide="never">
          <Tooltip title="复制">
            <ActionBarPrimitive.Copy asChild>
              <Button type="text" size="small" icon={<Copy size={14} />} aria-label="复制" />
            </ActionBarPrimitive.Copy>
          </Tooltip>
          <Tooltip title="重试">
            <ActionBarPrimitive.Edit asChild>
              <Button type="text" size="small" icon={<RefreshCw size={14} />} aria-label="重试" />
            </ActionBarPrimitive.Edit>
          </Tooltip>
        </ActionBarPrimitive.Root>
      </div>
      <span className="message-avatar">
        <InitialAvatar name={currentUser.name} color={currentUser.avatarColor} />
      </span>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage({
  application,
  administratorApplicationId,
  enableApplicationMention,
  fallbackName,
  onApplicationMention,
}: {
  application?: CatalogApplication;
  administratorApplicationId?: string | null;
  enableApplicationMention: boolean;
  fallbackName: string;
  onApplicationMention: (application: CatalogApplication) => void;
}) {
  const messageId = useAuiState((state) => state.message.id);
  const messageCatalogApplicationId = useAuiState((state) => {
    if (state.message.role !== "assistant") return undefined;
    const value = state.message.metadata.custom?.catalogApplicationId;
    return typeof value === "string" ? value : undefined;
  });
  const messageApplication = applicationCatalog.find(
    (catalogApplication) => catalogApplication.id === messageCatalogApplicationId,
  ) ?? application;
  const displayName = messageApplication?.name ?? fallbackName;
  const isAdministrator = Boolean(
    administratorApplicationId && messageApplication?.id === administratorApplicationId,
  );
  return (
    <MessagePrimitive.Root className="message-row assistant-message-row" data-message-id={messageId}>
      <Avatar
        className="message-avatar application-avatar-surface"
        size={24}
        src={messageApplication?.avatar}
        icon={messageApplication ? undefined : <Bot size={15} />}
      />
      <div className="message-column">
        <div className="message-meta">
          {enableApplicationMention && messageApplication ? (
            <button
              type="button"
              className="message-digital-employee-mention"
              aria-label={`@${displayName}，添加到对话框`}
              onClick={() => onApplicationMention(messageApplication)}
            >
              {displayName}
            </button>
          ) : (
            <span>{displayName}</span>
          )}
          {isAdministrator ? (
            <Tag className="message-administrator-tag" color="blue" variant="filled">管理员</Tag>
          ) : null}
        </div>
        <div className="message-surface assistant-message-surface">
          <MessagePrimitive.Parts>
            {({ part }) => part.type === "text" ? <MessagePartPrimitive.Text /> : null}
          </MessagePrimitive.Parts>
        </div>
        <ActionBarPrimitive.Root className="message-actions" hideWhenRunning autohide="never">
          <Tooltip title="复制">
            <ActionBarPrimitive.Copy asChild>
              <Button type="text" size="small" icon={<Copy size={14} />} aria-label="复制" />
            </ActionBarPrimitive.Copy>
          </Tooltip>
          <Tooltip title="重新生成">
            <ActionBarPrimitive.Reload asChild>
              <Button type="text" size="small" icon={<RefreshCw size={14} />} aria-label="重新生成" />
            </ActionBarPrimitive.Reload>
          </Tooltip>
        </ActionBarPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  );
}

function EditMessage() {
  return (
    <MessagePrimitive.Root className="edit-message-row">
      <ComposerPrimitive.Root className="edit-composer">
        <ComposerPrimitive.Input className="edit-composer-input" submitMode="ctrlEnter" />
        <Space size={8}>
          <ComposerPrimitive.Cancel asChild>
            <Button size="small">取消</Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="small" type="primary">保存并重新生成</Button>
          </ComposerPrimitive.Send>
        </Space>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}

const applicationMenuIcons: Record<ApplicationId, React.ReactNode> = {
  project: <FolderKanban size={15} />,
  conversation: <MessageSquare size={15} />,
  history: <Archive size={15} />,
  files: <FileText size={15} />,
  none: <X size={15} />,
};

function ProjectApplicationSelector({
  applicationId,
  applications,
  onApplicationChange,
}: {
  applicationId: string;
  applications: CatalogApplication[];
  onApplicationChange: (applicationId: string) => void;
}) {
  const [applicationSearch, setApplicationSearch] = useState("");
  const normalizedApplicationSearch = applicationSearch.trim().toLocaleLowerCase();
  const visibleApplications = applications.filter((application) => (
    !normalizedApplicationSearch
    || `${application.name} ${application.category} ${application.description}`.toLocaleLowerCase().includes(normalizedApplicationSearch)
  ));
  const selectedApplication = applications.find((application) => application.id === applicationId);
  const applicationItems: MenuProps["items"] = visibleApplications.length
    ? visibleApplications.map((application) => ({
        key: application.id,
        icon: <img className="project-application-selector-cover" src={application.avatar} alt="" />,
        label: (
          <span className="context-option">
            <span>
              <span>{application.name}</span>
              {applicationId === application.id
                ? <Check className="context-option-check" size={15} aria-label="当前应用" />
                : null}
            </span>
          </span>
        ),
      }))
    : [{ key: "no-results", label: applications.length ? "暂无匹配数字员工" : "当前群组项目暂无数字员工", disabled: true }];

  return (
    <Dropdown
      trigger={["click"]}
      onOpenChange={(open) => {
        if (!open) setApplicationSearch("");
      }}
      popupRender={(menu) => (
        <div className="context-menu-popup">
          <div className="context-menu-search" onClick={(event) => event.stopPropagation()}>
            <Input
              allowClear
              autoFocus
              prefix={<Search size={14} />}
              placeholder="搜索应用"
              value={applicationSearch}
              onChange={(event) => setApplicationSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          {menu}
        </div>
      )}
      menu={{
        items: applicationItems,
        selectable: true,
        selectedKeys: selectedApplication ? [selectedApplication.id] : [],
        onClick: ({ key }) => {
          if (key !== "no-results") onApplicationChange(key);
        },
      }}
    >
      <Button
        className={selectedApplication ? "" : "application-selector-empty"}
        type="text"
        size="small"
        icon={selectedApplication
          ? <img className="project-application-selector-cover" src={selectedApplication.avatar} alt="" />
          : undefined}
        aria-label={`应用：${selectedApplication?.name ?? "暂未添加应用"}`}
      >
        {selectedApplication?.name ?? "暂未添加应用"} <ChevronDown size={13} />
      </Button>
    </Dropdown>
  );
}

function ApplicationSelector({
  applicationId,
  onApplicationChange,
  showIcon = false,
}: {
  applicationId: ApplicationId | null;
  onApplicationChange: (applicationId: ApplicationId) => void;
  showIcon?: boolean;
}) {
  const [applicationSearch, setApplicationSearch] = useState("");
  const normalizedApplicationSearch = applicationSearch.trim().toLocaleLowerCase();
  const visibleApplicationIds = (Object.keys(applicationMeta) as ApplicationId[]).filter((itemId) => {
    if (!normalizedApplicationSearch) return true;
    const item = applicationMeta[itemId];
    return `${item.label} ${item.category} ${item.description}`.toLocaleLowerCase().includes(normalizedApplicationSearch);
  });
  const primaryApplicationIds = visibleApplicationIds.filter((itemId) => itemId !== "none");
  const includesNoContext = visibleApplicationIds.includes("none");
  const applicationItems: MenuProps["items"] = visibleApplicationIds.length
    ? [
      ...primaryApplicationIds.map((itemId) => ({
        key: itemId,
        icon: applicationMenuIcons[itemId],
        label: (
          <span className="context-option">
            <span>
              <span>{applicationMeta[itemId].label}</span>
              {applicationId === itemId
                ? <Check className="context-option-check" size={15} aria-label="当前应用" />
                : null}
            </span>
          </span>
        ),
      })),
      ...(includesNoContext
        ? [{
          key: "none",
          icon: applicationMenuIcons.none,
          label: (
            <span className="context-option">
              <span>
                <span>{applicationMeta.none.label}</span>
                {applicationId === "none"
                  ? <Check className="context-option-check" size={15} aria-label="当前应用" />
                  : null}
              </span>
            </span>
          ),
        }]
        : []),
    ]
    : [{ key: "no-results", label: "暂无匹配应用", disabled: true }];

  return (
    <Dropdown
      trigger={["click"]}
      onOpenChange={(open) => {
        if (!open) setApplicationSearch("");
      }}
      popupRender={(menu) => (
        <div className="context-menu-popup">
          <div className="context-menu-search" onClick={(event) => event.stopPropagation()}>
            <Input
              allowClear
              autoFocus
              prefix={<Search size={14} />}
              placeholder="搜索应用"
              value={applicationSearch}
              onChange={(event) => setApplicationSearch(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
          {menu}
        </div>
      )}
      menu={{
        items: applicationItems,
        selectable: true,
        selectedKeys: applicationId ? [applicationId] : [],
        onClick: ({ key }) => onApplicationChange(key as ApplicationId),
      }}
    >
      <Button
        className={applicationId ? "" : "application-selector-empty"}
        type="text"
        size="small"
        icon={showIcon && applicationId ? applicationMenuIcons[applicationId] : undefined}
        aria-label={`应用：${applicationId ? applicationMeta[applicationId].label : "请选择应用"}`}
      >
        {applicationId ? applicationMeta[applicationId].label : "请选择应用"} <ChevronDown size={13} />
      </Button>
    </Dropdown>
  );
}

function ConversationTargetSelector({
  applications,
  projects,
  selectedApplication,
  selectedProject,
  onApplicationSelect,
  onProjectSelect,
}: {
  applications: CatalogApplication[];
  projects: Project[];
  selectedApplication?: CatalogApplication;
  selectedProject?: Project | null;
  onApplicationSelect: (applicationId: string) => void;
  onProjectSelect: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [employeesExpanded, setEmployeesExpanded] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const visibleApplications = employeesExpanded ? applications : applications.slice(0, 5);
  const visibleProjects = projectsExpanded ? projects : projects.slice(0, 5);
  const selectedApplicationId = selectedProject ? null : selectedApplication?.id;
  const selectedTargetLabel = selectedProject?.name ?? selectedApplication?.name ?? "选择对话目标";

  const selectApplication = (applicationId: string) => {
    onApplicationSelect(applicationId);
    setOpen(false);
  };

  const selectProject = (projectId: string) => {
    onProjectSelect(projectId);
    setOpen(false);
  };

  const content = (
    <div className="conversation-target-menu" aria-label="选择数字员工或群组项目">
      <section className="conversation-target-section" aria-labelledby="conversation-target-employees">
        <div className="conversation-target-section-title" id="conversation-target-employees">数字员工</div>
        <div className="conversation-target-options" role="listbox" aria-label="现有数字员工">
          {visibleApplications.map((item) => (
              <button
                className="conversation-target-option"
                type="button"
                role="option"
                aria-selected={item.id === selectedApplicationId}
                key={item.id}
                onClick={() => selectApplication(item.id)}
              >
                <img className="conversation-target-avatar" src={item.avatar} alt="" />
                <span title={item.name}>{item.name}</span>
                {item.id === selectedApplicationId ? <Check className="conversation-target-check" size={12} /> : null}
              </button>
          ))}
          {applications.length === 0 ? <div className="conversation-target-empty">暂无已创建的数字员工</div> : null}
          {applications.length > 5 ? (
            <button
              className="conversation-target-more"
              type="button"
              aria-label={employeesExpanded ? "收起数字员工" : "展示更多数字员工"}
              onClick={() => setEmployeesExpanded((value) => !value)}
            >
              {employeesExpanded ? <ChevronsUp size={12} /> : <ChevronsDown size={12} />}
            </button>
          ) : null}
        </div>
      </section>
      <section className="conversation-target-section" aria-labelledby="conversation-target-projects">
        <div className="conversation-target-section-title" id="conversation-target-projects">群组项目</div>
        <div className="conversation-target-options" role="listbox" aria-label="现有群组项目">
          {visibleProjects.map((item) => (
              <button
                className="conversation-target-option"
                type="button"
                role="option"
                aria-selected={item.id === selectedProject?.id}
                key={item.id}
                onClick={() => selectProject(item.id)}
              >
                <span className="conversation-target-project-avatar" aria-hidden="true">
                  <NavigationProjectIcon project={item} />
                </span>
                <span title={item.name}>{item.name}</span>
                {item.id === selectedProject?.id ? <Check className="conversation-target-check" size={12} /> : null}
              </button>
          ))}
          {projects.length === 0 ? <div className="conversation-target-empty">暂无群组项目</div> : null}
          {projects.length > 5 ? (
            <button
              className="conversation-target-more"
              type="button"
              aria-label={projectsExpanded ? "收起群组项目" : "展示更多群组项目"}
              onClick={() => setProjectsExpanded((value) => !value)}
            >
              {projectsExpanded ? <ChevronsUp size={12} /> : <ChevronsDown size={12} />}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );

  return (
    <Popover
      arrow={false}
      placement="topLeft"
      trigger="click"
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setEmployeesExpanded(false);
          setProjectsExpanded(false);
        }
      }}
      overlayClassName="conversation-target-popover"
      content={content}
    >
      <Button
        className="conversation-target-trigger"
        data-open={open}
        type="text"
        size="small"
        aria-label="选择对话目标"
      >
        {selectedProject ? (
          <span className="conversation-target-project-avatar" aria-hidden="true">
            <NavigationProjectIcon project={selectedProject} />
          </span>
        ) : selectedApplication ? (
          <img className="conversation-target-avatar" src={selectedApplication.avatar} alt="" />
        ) : null}
        <span className="conversation-target-trigger-label">{selectedTargetLabel}</span>
        {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </Button>
    </Popover>
  );
}

function Composer({
  conversationId,
  selectedApplication,
  selectedProject,
  showConversationTarget,
  availableApplications,
  availableProjects,
  projectApplications,
  enableApplicationMentions,
  insertApplicationMentionRef,
  insertStarterPromptRef,
  resourceFiles,
  resourceConversations,
  files,
  onFileRemove,
  onTargetApplicationSelect,
  onTargetProjectSelect,
  uploadProps,
}: {
  conversationId: string;
  selectedApplication?: CatalogApplication;
  selectedProject?: Project | null;
  showConversationTarget: boolean;
  availableApplications: CatalogApplication[];
  availableProjects: Project[];
  projectApplications?: CatalogApplication[];
  enableApplicationMentions: boolean;
  insertApplicationMentionRef: { current: ((application: CatalogApplication) => void) | null };
  insertStarterPromptRef: { current: ((prompt: string) => void) | null };
  resourceFiles: GeneratedFile[];
  resourceConversations: Conversation[];
  files: SelectedFile[];
  onFileRemove: (file: SelectedFile) => void;
  onTargetApplicationSelect: (applicationId: string) => void;
  onTargetProjectSelect: (projectId: string) => void;
  uploadProps: UploadProps;
}) {
  const composerInput = unstable_useComposerInput();
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const composerHighlightRef = useRef<HTMLDivElement>(null);
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeMentionIndex, setActiveMentionIndex] = useState(-1);
  const mentionApplications = enableApplicationMentions
    ? (projectApplications ?? []).filter((application) => (
        !mentionQuery
        || `${application.name} ${application.category} ${application.description}`
          .toLocaleLowerCase()
          .includes(mentionQuery.toLocaleLowerCase())
    ))
    : [];
  const highlightedComposerParts = useMemo(() => {
    const value = composerInput.value;
    const applicationNames = enableApplicationMentions
      ? (projectApplications ?? []).map((application) => application.name).sort((left, right) => right.length - left.length)
      : [];
    if (!value || !applicationNames.length) return [{ text: value, mention: false }];

    const escapedNames = applicationNames.map(escapeRegularExpression);
    const mentionPattern = new RegExp(`(@(?:${escapedNames.join("|")})(?=$|\\s|[，。！？、,.!?;；:：]))`, "g");
    const applicationNameSet = new Set(applicationNames);
    return value
      .split(mentionPattern)
      .filter(Boolean)
      .map((text) => ({ text, mention: text.startsWith("@") && applicationNameSet.has(text.slice(1)) }));
  }, [composerInput.value, enableApplicationMentions, projectApplications]);
  const hasMentionedApplication = highlightedComposerParts.some((part) => part.mention);
  const hasConversationTarget = Boolean(selectedApplication || selectedProject);

  const closeMentionMenu = () => {
    setMentionRange(null);
    setMentionQuery("");
    setActiveMentionIndex(-1);
  };

  useEffect(() => {
    composerInput.setText("");
    closeMentionMenu();
  }, [conversationId]);

  const insertApplicationMention = useCallback((application: CatalogApplication) => {
    const mention = `@${application.name}`;
    const existingMentionPattern = new RegExp(
      `(^|\\s)${escapeRegularExpression(mention)}(?=$|\\s|[，。！？、,.!?;；:：])`,
    );
    const hasExistingMention = existingMentionPattern.test(composerInput.value);
    const needsLeadingSpace = composerInput.value.length > 0 && !/\s$/.test(composerInput.value);
    const nextValue = hasExistingMention
      ? composerInput.value
      : `${composerInput.value}${needsLeadingSpace ? " " : ""}${mention} `;

    if (!hasExistingMention) composerInput.setText(nextValue);
    closeMentionMenu();
    window.requestAnimationFrame(() => {
      composerInputRef.current?.focus();
      composerInputRef.current?.setSelectionRange(nextValue.length, nextValue.length);
    });
  }, [composerInput]);

  useEffect(() => {
    insertApplicationMentionRef.current = insertApplicationMention;
    return () => {
      if (insertApplicationMentionRef.current === insertApplicationMention) {
        insertApplicationMentionRef.current = null;
      }
    };
  }, [insertApplicationMention, insertApplicationMentionRef]);

  useEffect(() => {
    const insertStarterPrompt = (prompt: string) => {
      composerInput.setText(prompt);
      window.requestAnimationFrame(() => {
        composerInputRef.current?.focus();
        composerInputRef.current?.setSelectionRange(prompt.length, prompt.length);
      });
    };
    insertStarterPromptRef.current = insertStarterPrompt;
    return () => {
      if (insertStarterPromptRef.current === insertStarterPrompt) {
        insertStarterPromptRef.current = null;
      }
    };
  }, [composerInput, insertStarterPromptRef]);

  const selectMentionApplication = (application: CatalogApplication) => {
    if (!mentionRange) return;
    const beforeMention = composerInput.value.slice(0, mentionRange.start);
    const afterMention = composerInput.value.slice(mentionRange.end);
    const insertedMention = `@${application.name} `;
    const nextValue = `${beforeMention}${insertedMention}${afterMention}`;
    const nextCursor = beforeMention.length + insertedMention.length;
    composerInput.setText(nextValue);
    closeMentionMenu();
    window.requestAnimationFrame(() => {
      composerInputRef.current?.focus();
      composerInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const updateMentionMenu = (value: string, cursor: number) => {
    if (!enableApplicationMentions) return;
    const activeText = value.slice(0, cursor);
    const match = activeText.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match) {
      closeMentionMenu();
      return;
    }
    setMentionRange({ start: cursor - match[1].length - 1, end: cursor });
    setMentionQuery(match[1]);
    setActiveMentionIndex(-1);
  };

  return (
    <ComposerPrimitive.Root className="composer-root">
      {files.length ? (
        <div className="attachment-list" aria-label="待发送附件">
          {files.map((file) => (
            <Tag
              key={file.uid}
              bordered
              closable
              icon={<FileText size={13} />}
              onClose={() => onFileRemove(file)}
            >
              {file.name}
            </Tag>
          ))}
        </div>
      ) : null}
      <div className="composer-input-stack">
        <div className="composer-input-highlight" aria-hidden="true" ref={composerHighlightRef}>
          {highlightedComposerParts.map((part, index) => (
            <span className={part.mention ? "composer-input-mention" : undefined} key={`${index}-${part.text}`}>
              {part.text}
            </span>
          ))}
          {composerInput.value.endsWith("\n") ? "\u200b" : null}
        </div>
        <ComposerPrimitive.Input
          ref={composerInputRef}
          className="composer-input"
          placeholder={hasConversationTarget
            ? "描述任务或提出问题，Enter 发送，Shift + Enter 换行"
            : "请先选择数字员工或群组项目"}
          submitMode="enter"
          rows={2}
          onChange={(event) => {
            updateMentionMenu(
              event.currentTarget.value,
              event.currentTarget.selectionStart ?? event.currentTarget.value.length,
            );
          }}
          onScroll={(event) => {
            if (!composerHighlightRef.current) return;
            composerHighlightRef.current.scrollTop = event.currentTarget.scrollTop;
            composerHighlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
          }}
          onKeyDown={(event) => {
            if (!mentionRange) return;
            if (event.key === "Escape") {
              event.preventDefault();
              closeMentionMenu();
              return;
            }
            if (!mentionApplications.length) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              const direction = event.key === "ArrowDown" ? 1 : -1;
              setActiveMentionIndex((current) => {
                if (current < 0) return direction > 0 ? 0 : mentionApplications.length - 1;
                return (current + direction + mentionApplications.length) % mentionApplications.length;
              });
              return;
            }
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              selectMentionApplication(mentionApplications[activeMentionIndex < 0 ? 0 : activeMentionIndex]);
            }
          }}
        />
      </div>
      {mentionRange ? (
        <div className="composer-mention-menu" role="listbox" aria-label="选择应用">
          {mentionApplications.length ? mentionApplications.map((application, index) => (
            <button
              className={index === activeMentionIndex ? "composer-mention-option is-active" : "composer-mention-option"}
              type="button"
              role="option"
              aria-selected={index === activeMentionIndex}
              key={application.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectMentionApplication(application)}
            >
              <img src={application.avatar} alt="" />
              <span>
                <span>{application.name}</span>
                <small>{application.category}</small>
              </span>
            </button>
          )) : (
            <div className="composer-mention-empty">没有匹配的应用</div>
          )}
        </div>
      ) : null}
      <div className="composer-actions">
        <Space size={4}>
          <AttachmentSourceMenu
            uploadProps={uploadProps}
            resources={resourceFiles}
            resourceConversations={resourceConversations}
          />
          {showConversationTarget ? (
            <ConversationTargetSelector
              applications={availableApplications}
              projects={availableProjects}
              selectedApplication={selectedApplication}
              selectedProject={selectedProject}
              onApplicationSelect={onTargetApplicationSelect}
              onProjectSelect={onTargetProjectSelect}
            />
          ) : null}
        </Space>
        <ThreadPrimitive.If running>
          <ComposerPrimitive.Cancel asChild>
            <Button danger icon={<Square size={14} />}>停止</Button>
          </ComposerPrimitive.Cancel>
        </ThreadPrimitive.If>
        <ThreadPrimitive.If running={false}>
          <ComposerPrimitive.Send asChild>
            <Button
              disabled={!hasConversationTarget && !hasMentionedApplication}
              type="primary"
              icon={<ArrowUpFromDot size={15} />}
            >
              发送
            </Button>
          </ComposerPrimitive.Send>
        </ThreadPrimitive.If>
      </div>
    </ComposerPrimitive.Root>
  );
}
