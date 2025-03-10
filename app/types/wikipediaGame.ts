import { Node, Edge } from "reactflow";
import { ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam } from "@mlc-ai/web-llm";

export interface NodeData {
  label: string;
  isBold?: boolean;
  borderColor?: string;
}

export type LLMMessage = ChatCompletionSystemMessageParam | ChatCompletionUserMessageParam;

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNode: Node<NodeData> | null;
  secondarySelectedNode: Node<NodeData> | null;
  isIntersectionMode: boolean;
  loading: boolean;
  error: string | null;
  hasWon: boolean;
} 