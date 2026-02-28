export interface Score {
  communication: number;
  intimacy: number;
  vision: number;
  trust: number;
  fun: number;
}

export interface Choice {
  text: string;
  scores: Partial<Score>;
}

export interface Question {
  id: number;
  category: string;
  text: string;
  choices: Choice[];
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  auraTip: string;
}

export interface SparkChallenge {
  id: number;
  title: string;
  description: string;
  tip: string;
  icon: string;
  points: number;
  level: 'Easy' | 'Medium' | 'Bold';
}

export type View = 'intro' | 'quiz' | 'analyzing' | 'results' | 'success' | 'dashboard' | 'spark-lab';
