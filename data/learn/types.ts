export type LearnItemType = 'method' | 'exercise';

export type LearnItem = {
  id: string;
  name: string;
  type: LearnItemType;
  description: string;
  long_description: string;
  level: string;
  days_per_week: string;
  goal: string;
  equipment: string[];
  dos: string[];
  donts: string[];
  tags: string[];
  image: string;
  videoUrl?: string;
  isFavorite?: boolean;
};

export type LearnData = LearnItem[];
