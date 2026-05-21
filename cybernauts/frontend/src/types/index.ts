export interface User {
  id: string;
  username: string;
  age: number;
  hobbies: string[];
  friends: string[];
  createdAt: string;
  popularityScore: number;
}

export interface GraphNode {
  id: string;
  username: string;
  age: number;
  popularityScore: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface FriendRecommendation {
  id: string;
  username: string;
  score: number;
  reason: string;
  sourceSignals: string[];
}

export interface HobbyRecommendation {
  hobby: string;
  score: number;
  reason: string;
  sourceSignals: string[];
}

export interface RecommendationsResponse {
  friends: FriendRecommendation[];
  hobbies: HobbyRecommendation[];
}

export type ToastType = 'success' | 'error' | 'info';
