export interface User {
  id: string;           // uuid
  username: string;     // required
  age: number;          // required
  hobbies: string[];    // required
  friends: string[];    // ids of other users
  createdAt: string;    // ISO date string
  popularityScore: number; // computed
}

export interface CreateUserDto {
  username: string;
  age: number;
  hobbies: string[];
}

export interface UpdateUserDto {
  username?: string;
  age?: number;
  hobbies?: string[];
}

export interface LinkDto {
  targetUserId: string;
}

export interface UnlinkDto {
  targetUserId: string;
}

export interface FeedbackDto {
  targetId: string;
  type: 'friend' | 'hobby';
  feedback: 'accepted' | 'rejected';
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

// Raw DB row type (hobbies and friends stored as JSON strings)
export interface UserRow {
  id: string;
  username: string;
  age: number;
  hobbies: string;
  friends: string;
  createdAt: string;
  popularityScore: number;
}
