import { ActionType } from "../constants/wikipediaGame";

export interface OllamaResponse {
  response: string;
}

export interface LLMJudgeResponse {
  score: number;
}

export interface TestCaseInput {
  actionType: ActionType;
  node: string;
}

export interface TestCaseWithResponse extends TestCaseInput {
  response: string;
}

export interface TestCaseWithScore extends TestCaseWithResponse {
  score: number;
}
