import type { ComponentType } from "react";
import { Bot, Calculator, Languages, FileOutput, type LucideIcon } from "lucide-react";
import type { ToolId } from "../../domain/tools";
import { OpenClawPanel } from "./panels/OpenClawPanel";
import { CalculatorPanel } from "./panels/CalculatorPanel";
import { TranslatorPanel } from "./panels/TranslatorPanel";
import { DocumentConverterPanel } from "./panels/DocumentConverterPanel";

export interface ToolPanelProps {
  onClose?: () => void;
}

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
  category: "utility" | "text" | "file";
  Icon: LucideIcon;
  Panel: ComponentType<ToolPanelProps>;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    id: "openclaw",
    label: "OpenClaw",
    description: "打开本机控制台，查看连接入口",
    category: "utility",
    Icon: Bot,
    Panel: OpenClawPanel,
  },
  {
    id: "calculator",
    label: "计算器",
    description: "预览日常计算的输入方式",
    category: "utility",
    Icon: Calculator,
    Panel: CalculatorPanel,
  },
  {
    id: "translator",
    label: "翻译",
    description: "预览语言选择和文本输入",
    category: "text",
    Icon: Languages,
    Panel: TranslatorPanel,
  },
  {
    id: "document-converter",
    label: "文档转换",
    description: "预览文档与目标格式选择",
    category: "file",
    Icon: FileOutput,
    Panel: DocumentConverterPanel,
  },
];

export function getToolDefinition(id: ToolId): ToolDefinition {
  return toolDefinitions.find((tool) => tool.id === id)!;
}
