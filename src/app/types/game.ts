export type GameButton = 'green' | 'red' | 'yellow' | 'blue';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameState {
  sequence: GameButton[];
  userSequence: GameButton[];
  score: number;
  isPlaying: boolean;
  isPlayingSequence: boolean;
  gameOver: boolean;
  difficulty: Difficulty;
  currentSpeed: number;
}

export interface DifficultySettings {
  initialSequenceDelay: number;
  minSequenceDelay: number;
  speedIncreaseRate: number;
  buttonActiveTime: number;
  scoreMultiplier: number;
} 