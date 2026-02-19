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
  userKey?: number;
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
  isActive?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 커미션 요청 타입
 */
export interface Commission {
  id: string;
  artistId: string;
  clientUserKey: number;
  title: string;
  description: string;
  budget: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 토스 사용자 정보 타입
 */
export interface TossUser {
  name: string;
  accessToken: string;
  refreshToken: string;
  artistId?: string;
  updatedAt: Timestamp;
}

/**
 * 리뷰 타입
 */
export interface Review {
  id: string;
  artistId: string;
  userKey: number;
  content: string;
  rating: number; // 0-5
  imageUrls?: string[]; // 리뷰에 첨부된 이미지 URL 배열
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * 작가 정보 탭 항목 (artists/{id}/information 서브컬렉션 문서)
 */
export interface ArtistInformationItem {
  id: string;
  title: string;
  context: string;
  images: string[];
  rank: number;
}

export type ArtistFormFieldType = 'textField' | 'imageField';

/**
 * 작가 신청서 항목 타입
 */
export interface ArtistFormField {
  id: string;
  title: string;
  context: string;
  type: ArtistFormFieldType;
  rank: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ChatMessageType = 'text' | 'request' | 'payment_request';
export type ChatSenderRole = 'client' | 'artist' | 'system';

export interface ChatRequestField {
  id: string;
  title: string;
  type: ArtistFormFieldType;
  text: string;
  images?: Array<{ name: string; url: string }>;
}

export interface ChatThread {
  id: string;
  artistId: string;
  artistUserKey?: number;
  clientUserKey: number;
  status: 'pending' | 'active';
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderRole?: ChatSenderRole;
  clientLastReadAt?: Timestamp;
  artistLastReadAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string | number;
  senderRole: ChatSenderRole;
  type: ChatMessageType;
  text: string;
  images?: Array<{ name: string; url: string }>;
  requestFields?: ChatRequestField[];
  paymentRequest?: {
    type: string; // 종류
    amount: number; // 가격
    orderNo?: string; // 주문번호 (결제 완료 후)
    isTestPayment?: boolean; // 테스트 결제 여부
    cancelled?: boolean; // 취소 여부
  };
  supportFields?: {
    title?: string;
    content?: string;
    images?: Array<{ name: string; url: string }>;
  };
  createdAt: Timestamp;
}
