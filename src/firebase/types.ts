import type { Timestamp } from 'firebase/firestore';

/**
 * 포트폴리오 아이템 타입
 */
export interface PortfolioItem {
  id: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  downloadUrl: string;
  title: string;
  description: string;
  uploadedAt: Timestamp;
  likes: number;
  tags: string[];
}

/**
 * 작가 프로필 타입
 */
export interface Artist {
  id: string;
  name: string;
  introduction: string;
  bio: string;
  profileImageUrl: string;
  thumbnailUrl: string;
  portfolio: PortfolioItem[];
  stats: {
    portfolioCount: number;
    completedCommissions: number;
  };
  ratings: number;
  reviewers: number;
  pricing: {
    minPrice: number;
    maxPrice: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 커미션 요청 타입
 */
export interface Commission {
  id: string;
  artistId: string;
  clientId: string;
  title: string;
  description: string;
  budget: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
