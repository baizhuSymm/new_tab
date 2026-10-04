import type { ToolSelection } from "./types";

export const toolIds = [
  "openclaw",
  "calculator",
  "translator",
  "document-converter",
] as const;

export type ToolId = (typeof toolIds)[number];

export function isToolId(value: string): value is ToolId {
  return (toolIds as readonly string[]).includes(value);
}

export const defaultToolSelection: ToolSelection = {
  version: 1,
  ids: ["openclaw"],
};
