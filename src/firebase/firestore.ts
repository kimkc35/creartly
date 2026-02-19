import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './init';
import type {
  Artist,
  PortfolioItem,
  Commission,
  TossUser,
  Review,
  ArtistFormField,
  ArtistInformationItem,
  ChatRequestField,
  ChatSenderRole,
  ChatThread
} from './types';

const getAllArtistsInFlight = new Map<string, Promise<Artist[]>>();

/**
 * 작가 프로필 생성
 * @param artistId - 작가 ID (보통 Auth UID 사용)
 * @param data - 작가 정보
 */
export async function createArtist(
  artistId: string,
  data: Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const artistRef = doc(db, 'artists', artistId);
  
  await setDoc(artistRef, {
    ...data,
    isActive: data.isActive ?? true, // 기본값 true
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * 작가 정보 조회
 * @param artistId - 작가 ID
 * @returns 작가 정보 또는 null
 */
export async function getArtist(artistId: string): Promise<Artist | null> {
  const artistRef = doc(db, 'artists', artistId);
  const snapshot = await getDoc(artistRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return {
    id: snapshot.id,
    ...snapshot.data()
  } as Artist;
}

/**
 * userKey로 작가 정보 조회
 * @param userKey - 토스 userKey
 * @returns 작가 정보 또는 null
 */
export async function getArtistByUserKey(userKey: number): Promise<Artist | null> {
  const artistsRef = collection(db, 'artists');
  const q = query(artistsRef, where('userKey', '==', userKey), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Artist;
}

/**
 * 작가 정보 업데이트
 * @param artistId - 작가 ID
 * @param data - 업데이트할 데이터
 */
export async function updateArtist(
  artistId: string,
  data: Partial<Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const artistRef = doc(db, 'artists', artistId);
  
  await updateDoc(artistRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

/**
 * 포트폴리오 아이템 추가
 * @param artistId - 작가 ID
 * @param portfolioItem - 포트폴리오 아이템
 */
export async function addPortfolioItem(
  artistId: string,
  portfolioItem: PortfolioItem
): Promise<void> {
  const artistRef = doc(db, 'artists', artistId);
  
  await updateDoc(artistRef, {
    portfolio: arrayUnion(portfolioItem),
    'stats.portfolioCount': increment(1),
    updatedAt: serverTimestamp()
  });
}

/**
 * 포트폴리오 아이템 삭제
 * @param artistId - 작가 ID
 * @param portfolioItem - 삭제할 포트폴리오 아이템
 */
export async function removePortfolioItem(
  artistId: string,
  portfolioItem: PortfolioItem
): Promise<void> {
  const artistRef = doc(db, 'artists', artistId);
  
  await updateDoc(artistRef, {
    portfolio: arrayRemove(portfolioItem),
    'stats.portfolioCount': increment(-1),
    updatedAt: serverTimestamp()
  });
}

/**
 * 포트폴리오 좋아요 증가
 * @param artistId - 작가 ID
 * @param portfolioId - 포트폴리오 ID
 */
export async function incrementPortfolioLikes(
  artistId: string,
  portfolioId: string
): Promise<void> {
  const artistRef = doc(db, 'artists', artistId);
  const artist = await getArtist(artistId);
  
  if (!artist) return;
  
  const updatedPortfolio = artist.portfolio.map(item => 
    item.id === portfolioId 
      ? { ...item, likes: item.likes + 1 }
      : item
  );
  
  await updateDoc(artistRef, {
    portfolio: updatedPortfolio,
    // totalLikes 제거됨 - ratings와 reviewers로 대체
    updatedAt: serverTimestamp()
  });
}

/**
 * 모든 작가 조회
 * @param limitCount - 조회할 최대 개수
 * @param currentUserKey - 현재 로그인한 사용자의 키 (본인 예외 처리를 위해 사용)
 * @returns 작가 목록
 */
export async function getAllArtists(limitCount = 20, currentUserKey?: number | null): Promise<Artist[]> {
  const cacheKey = `${limitCount}_${currentUserKey ?? 'guest'}`;
  const cached = getAllArtistsInFlight.get(cacheKey);
  if (cached) {
    console.log('⏳ getAllArtists 중복 요청 차단:', cacheKey);
    return cached;
  }

  console.log('🔍 getAllArtists 시작, limitCount:', limitCount, 'currentUserKey:', currentUserKey);

  const request = (async () => {
    const artistsRef = collection(db, 'artists');
    
    const q = query(
      artistsRef,
      orderBy('ratings', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    const artists = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    }) as Artist[];

    // 필터링: isActive가 true이거나, 본인인 경우만 포함
    const filteredArtists = artists.filter(artist => {
      if (artist.isActive === true) return true;
      if (currentUserKey != null && Number(artist.userKey) === Number(currentUserKey)) return true;
      return false;
    });

    return filteredArtists;
  })();

  getAllArtistsInFlight.set(cacheKey, request);

  try {
    return await request;
  } catch (error) {
    console.error('❌ getAllArtists 에러:', error);
    throw error;
  } finally {
    getAllArtistsInFlight.delete(cacheKey);
  }
}

/**
 * 가격대로 작가 검색
 * @param minPrice - 최소 가격
 * @param maxPrice - 최대 가격
 * @returns 작가 목록
 */
export async function searchArtistsByPrice(
  minPrice: number,
  maxPrice: number
): Promise<Artist[]> {
  const artistsRef = collection(db, 'artists');
  const q = query(
    artistsRef,
    where('pricing.minPrice', '>=', minPrice),
    where('pricing.maxPrice', '<=', maxPrice)
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Artist[];
}

/**
 * 커미션 요청 생성
 * @param data - 커미션 데이터
 * @returns 생성된 커미션 ID
 */
export async function createCommission(
  data: Omit<Commission, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const commissionsRef = collection(db, 'commissions');
  const commissionRef = doc(commissionsRef);
  
  await setDoc(commissionRef, {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return commissionRef.id;
}

/**
 * 커미션 상태 업데이트
 * @param commissionId - 커미션 ID
 * @param status - 새로운 상태
 */
export async function updateCommissionStatus(
  commissionId: string,
  status: Commission['status']
): Promise<void> {
  const commissionRef = doc(db, 'commissions', commissionId);
  
  await updateDoc(commissionRef, {
    status,
    updatedAt: serverTimestamp()
  });
}

/**
 * 작가의 커미션 목록 조회
 * @param artistId - 작가 ID
 * @returns 커미션 목록
 */
export async function getArtistCommissions(artistId: string): Promise<Commission[]> {
  const commissionsRef = collection(db, 'commissions');
  const q = query(
    commissionsRef,
    where('artistId', '==', artistId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Commission[];
}

/**
 * 작가의 미리보기 이미지 목록 조회
 * @param artistId - 작가 ID
 * @returns 미리보기 이미지 URL 배열
 */
export async function getArtistPreviewImages(artistId: string): Promise<string[]> {
  try {
    const previewsRef = collection(db, 'artists', artistId, 'previews');
    const snapshot = await getDocs(previewsRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return data.url as string;
    }).filter(Boolean);
  } catch (error) {
    console.error('Failed to fetch preview images:', error);
    return [];
  }
}

/**
 * 작가 정보 탭 항목 조회 (artists/{artistId}/information 서브컬렉션)
 * @param artistId - 작가 ID
 * @returns 정보 항목 목록 (title, context, images) - rank 순으로 정렬됨
 */
export async function getArtistInformation(artistId: string): Promise<ArtistInformationItem[]> {
  try {
    const informationRef = collection(db, 'artists', artistId, 'information');
    const q = query(informationRef, orderBy('rank', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: (data.title as string) ?? '',
        context: (data.context as string) ?? '',
        images: Array.isArray(data.images) ? (data.images as string[]) : [],
        rank: (data.rank as number) ?? 0,
      };
    });
  } catch (error) {
    console.error('Failed to fetch artist information:', error);
    return [];
  }
}

/**
 * 토스 사용자 정보 저장 (문서 ID는 user_key)
 * @param userKey - 사용자 키 (문서 ID)
 * @param data - 사용자 정보
 */
export async function saveTossUser(
  userKey: number,
  data: Omit<TossUser, 'updatedAt'>
): Promise<void> {
  const userRef = doc(db, 'users', String(userKey));
  
  await setDoc(
    userRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    {merge: true}
  );
}

/**
 * 토스 사용자 정보 조회
 * @param userKey - 사용자 키 (문서 ID)
 * @returns 사용자 정보 또는 null
 */
export async function getTossUser(userKey: number): Promise<TossUser | null> {
  const userRef = doc(db, 'users', String(userKey));
  const snapshot = await getDoc(userRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return {
    ...snapshot.data(),
  } as TossUser;
}

/**
 * 토스 사용자 토큰 업데이트
 * @param userKey - 사용자 키 (문서 ID)
 * @param accessToken - 새로운 AccessToken
 * @param refreshToken - 새로운 RefreshToken
 */
export async function updateTossUserTokens(
  userKey: number,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const userRef = doc(db, 'users', String(userKey));
  
  await updateDoc(userRef, {
    accessToken,
    refreshToken,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 토스 사용자 정보 삭제 (로그아웃 시)
 * @param userKey - 사용자 키 (문서 ID)
 */
export async function deleteTossUser(userKey: number): Promise<void> {
  const userRef = doc(db, 'users', String(userKey));
  await deleteDoc(userRef);
}

/**
 * 리뷰 생성
 * @param artistId - 작가 ID
 * @param data - 리뷰 데이터
 * @returns 생성된 리뷰 ID
 */
export async function createReview(
  artistId: string,
  data: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const reviewsRef = collection(db, 'artists', artistId, 'reviews');
  const reviewRef = doc(reviewsRef);
  const artistRef = doc(db, 'artists', artistId);

  // undefined 값 제거
  const cleanData: any = {};
  Object.keys(data).forEach((key) => {
    const value = (data as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });

  await setDoc(reviewRef, {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const rating = typeof data.rating === 'number' ? data.rating : 0;
  await updateDoc(artistRef, {
    ratings: increment(rating),
    updatedAt: serverTimestamp(),
  });

  return reviewRef.id;
}

/**
 * 리뷰 업데이트
 * @param artistId - 작가 ID
 * @param reviewId - 리뷰 ID
 * @param data - 업데이트할 데이터
 */
export async function updateReview(
  artistId: string,
  reviewId: string,
  data: Partial<Omit<Review, 'id' | 'artistId' | 'userKey' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const reviewRef = doc(db, 'artists', artistId, 'reviews', reviewId);
  const artistRef = doc(db, 'artists', artistId);

  // undefined 값 제거
  const cleanData: any = {};
  Object.keys(data).forEach((key) => {
    const value = (data as any)[key];
    if (value !== undefined) {
      cleanData[key] = value;
    }
  });

  if (typeof data.rating === 'number') {
    const reviewSnap = await getDoc(reviewRef);
    const oldRating = (reviewSnap.data()?.rating as number) ?? 0;
    const delta = data.rating - oldRating;
    await updateDoc(reviewRef, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    });
    if (delta !== 0) {
      await updateDoc(artistRef, {
        ratings: increment(delta),
        updatedAt: serverTimestamp(),
      });
    }
  } else {
    await updateDoc(reviewRef, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * 리뷰 삭제
 * @param artistId - 작가 ID
 * @param reviewId - 리뷰 ID
 */
export async function deleteReview(
  artistId: string,
  reviewId: string
): Promise<void> {
  const reviewRef = doc(db, 'artists', artistId, 'reviews', reviewId);
  const artistRef = doc(db, 'artists', artistId);

  const reviewSnap = await getDoc(reviewRef);
  const rating = (reviewSnap.data()?.rating as number) ?? 0;

  await deleteDoc(reviewRef);

  if (rating !== 0) {
    await updateDoc(artistRef, {
      ratings: increment(-rating),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * 작가의 리뷰 목록 조회
 * @param artistId - 작가 ID
 * @returns 리뷰 목록
 */
/**
 * 작가의 리뷰 개수 조회 (artists/{artistId}/reviews 서브컬렉션 문서 개수)
 * @param artistId - 작가 ID
 * @returns 리뷰 문서 개수
 */
export async function getArtistReviewCount(artistId: string): Promise<number> {
  try {
    const reviewsRef = collection(db, 'artists', artistId, 'reviews');
    const snapshot = await getDocs(reviewsRef);
    return snapshot.size;
  } catch (error) {
    console.error('Failed to fetch review count:', error);
    return 0;
  }
}

export async function getArtistReviews(artistId: string): Promise<Review[]> {
  try {
    const reviewsRef = collection(db, 'artists', artistId, 'reviews');
    const q = query(
      reviewsRef,
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
  } catch (error: any) {
    // BloomFilter 에러나 인덱스 관련 에러 발생 시 정렬 없이 조회 시도
    if (error?.code === 'failed-precondition' || error?.message?.includes('index') || error?.name === 'BloomFilterError') {
      console.warn('Firestore 인덱스 에러 발생, 정렬 없이 조회합니다:', error);
      try {
        const reviewsRef = collection(db, 'artists', artistId, 'reviews');
        const snapshot = await getDocs(reviewsRef);
        
        // 클라이언트 측에서 정렬
        const reviews = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Review[];
        
        // createdAt 기준으로 내림차순 정렬 (클라이언트 측)
        return reviews.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.toDate?.().getTime() || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.toDate?.().getTime() || 0;
          return bTime - aTime;
        });
      } catch (fallbackError) {
        console.error('리뷰 조회 실패 (fallback):', fallbackError);
        return [];
      }
    }
    
    console.error('리뷰 조회 실패:', error);
    return [];
  }
}

/**
 * 작가 신청서 항목 조회 (artists/{artistId}/form 서브컬렉션, rank 순 정렬)
 * Firestore 경로: artists / {artistId} / form / {문서들}
 * 각 문서 필드: title, context, type('textField'|'imageField'), rank (정렬용)
 * @param artistId - 작가 ID (artists 컬렉션의 문서 ID)
 * @returns 신청서 항목 목록 (실패 시 빈 배열, 콘솔에 에러 로그)
 */
export async function getArtistForms(artistId: string): Promise<ArtistFormField[]> {
  try {
    if (!artistId || typeof artistId !== 'string') {
      console.warn('[getArtistForms] artistId가 비어 있거나 문자열이 아닙니다.', artistId);
      return [];
    }
    const formsRef = collection(db, 'artists', artistId, 'form');
    const q = query(formsRef, orderBy('rank', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as ArtistFormField[];
  } catch (error) {
    console.error('[getArtistForms] 신청서 항목 조회 실패:', { artistId, error });
    return [];
  }
}

/**
 * 작가 정보 항목 추가
 */
export async function addArtistInformation(
  artistId: string,
  data: Omit<ArtistInformationItem, 'id'>
): Promise<string> {
  const informationRef = collection(db, 'artists', artistId, 'information');
  const docRef = await addDoc(informationRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * 작가 정보 항목 수정
 */
export async function updateArtistInformation(
  artistId: string,
  itemId: string,
  data: Partial<Omit<ArtistInformationItem, 'id'>>
): Promise<void> {
  const itemRef = doc(db, 'artists', artistId, 'information', itemId);
  await updateDoc(itemRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 작가 정보 항목 삭제
 */
export async function deleteArtistInformation(
  artistId: string,
  itemId: string
): Promise<void> {
  const itemRef = doc(db, 'artists', artistId, 'information', itemId);
  await deleteDoc(itemRef);
}

/**
 * 작가 정보 순서 변경
 */
export async function reorderArtistInformation(
  artistId: string,
  items: { id: string; rank: number }[]
): Promise<void> {
  const batch: Promise<void>[] = items.map((item) => {
    const itemRef = doc(db, 'artists', artistId, 'information', item.id);
    return updateDoc(itemRef, { rank: item.rank });
  });
  await Promise.all(batch);
}

/**
 * 작가 신청 항목 추가
 */
export async function addArtistForm(
  artistId: string,
  data: Omit<ArtistFormField, 'id'>
): Promise<string> {
  const formsRef = collection(db, 'artists', artistId, 'form');
  const docRef = await addDoc(formsRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * 작가 신청 항목 수정
 */
export async function updateArtistForm(
  artistId: string,
  itemId: string,
  data: Partial<Omit<ArtistFormField, 'id'>>
): Promise<void> {
  const itemRef = doc(db, 'artists', artistId, 'form', itemId);
  await updateDoc(itemRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 작가 신청 항목 삭제
 */
export async function deleteArtistForm(
  artistId: string,
  itemId: string
): Promise<void> {
  const itemRef = doc(db, 'artists', artistId, 'form', itemId);
  await deleteDoc(itemRef);
}

/**
 * 작가 신청 항목 순서 변경
 */
export async function reorderArtistForm(
  artistId: string,
  items: { id: string; rank: number }[]
): Promise<void> {
  const batch: Promise<void>[] = items.map((item) => {
    const itemRef = doc(db, 'artists', artistId, 'form', item.id);
    return updateDoc(itemRef, { rank: item.rank });
  });
  await Promise.all(batch);
}

export function buildChatId(artistUserKey: number, clientUserKey: number): string {
  return `${encodeURIComponent(String(artistUserKey))}__${encodeURIComponent(String(clientUserKey))}`;
}

export async function createChatFromRequest(
  artistId: string,
  artistUserKey: number,
  clientUserKey: number,
  requestFields: ChatRequestField[]
): Promise<string> {
  const chatId = buildChatId(artistUserKey, clientUserKey);
  const chatRef = doc(db, 'chats', chatId);
  const snapshot = await getDoc(chatRef);
  const summaryText = '신청서가 전달되었습니다.';

  if (!snapshot.exists()) {
    await setDoc(chatRef, {
      artistId,
      artistUserKey,
      clientUserKey,
      status: 'active',
      lastMessage: summaryText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'client' as ChatSenderRole,
      clientLastReadAt: serverTimestamp(),
      artistLastReadAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(chatRef, {
      status: 'active',
      lastMessage: summaryText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'client' as ChatSenderRole,
      clientLastReadAt: serverTimestamp(),
      artistLastReadAt: serverTimestamp(),
      artistUserKey,
      updatedAt: serverTimestamp(),
    });
  }

  const messagesRef = collection(chatRef, 'messages');
  await addDoc(messagesRef, {
    chatId,
    senderId: clientUserKey,
    senderRole: 'client' as ChatSenderRole,
    type: 'request',
    text: summaryText,
    requestFields,
    createdAt: serverTimestamp(),
  });

  return chatId;
}

/**
 * 작가 신청 채팅 생성
 * @param artistId - 작가 ID
 * @param artistUserKey - 작가 userKey (개발자 userKey)
 * @param clientUserKey - 신청자 userKey
 * @param requestFields - 신청서 필드들
 * @returns 생성된 채팅 ID
 */
export async function createChatFromArtistApplication(
  artistId: string,
  artistUserKey: number,
  clientUserKey: number,
  requestFields: ChatRequestField[]
): Promise<string> {
  const chatId = buildChatId(artistUserKey, clientUserKey);
  const chatRef = doc(db, 'chats', chatId);
  const snapshot = await getDoc(chatRef);
  const summaryText = '작가 신청서가 전달되었습니다.';

  if (!snapshot.exists()) {
    await setDoc(chatRef, {
      artistId,
      artistUserKey,
      clientUserKey,
      status: 'active',
      lastMessage: summaryText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'client' as ChatSenderRole,
      clientLastReadAt: serverTimestamp(),
      artistLastReadAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(chatRef, {
      status: 'active',
      lastMessage: summaryText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'client' as ChatSenderRole,
      clientLastReadAt: serverTimestamp(),
      artistLastReadAt: serverTimestamp(),
      artistUserKey,
      updatedAt: serverTimestamp(),
    });
  }

  const messagesRef = collection(chatRef, 'messages');
  await addDoc(messagesRef, {
    chatId,
    senderId: clientUserKey,
    senderRole: 'client' as ChatSenderRole,
    type: 'request',
    text: summaryText,
    requestFields,
    createdAt: serverTimestamp(),
  });

  return chatId;
}

/** 관리자(문의하기) userKey */
export const SUPPORT_ADMIN_USER_KEY = 316659802;

export const SUPPORT_ARTIST_ID = 'admin';

/**
 * 문의하기용 관리자 채팅 생성 또는 조회
 * @param clientUserKey - 문의하는 사용자 userKey
 * @returns 채팅 ID (dev__userKey 형식)
 */
export async function createOrGetSupportChat(clientUserKey: number): Promise<string> {
  const chatId = `dev__${clientUserKey}`;
  const chatRef = doc(db, 'chats', chatId);
  const snapshot = await getDoc(chatRef);

  if (!snapshot.exists()) {
    await setDoc(chatRef, {
      artistId: SUPPORT_ARTIST_ID,
      artistUserKey: SUPPORT_ADMIN_USER_KEY,
      clientUserKey,
      status: 'active',
      lastMessage: '문의하기 채팅이 시작됐어요.',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'system' as ChatSenderRole,
      clientLastReadAt: serverTimestamp(),
      artistLastReadAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const messagesRef = collection(chatRef, 'messages');
    await addDoc(messagesRef, {
      chatId,
      senderId: SUPPORT_ARTIST_ID,
      senderRole: 'system' as ChatSenderRole,
      type: 'text',
      text: '문의하기 채팅이 시작됐어요. 궁금한 점을 남겨 주세요.',
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
}

export async function markChatRead(
  chatId: string,
  role: ChatSenderRole
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  if (role === 'artist') {
    await updateDoc(chatRef, {
      artistLastReadAt: serverTimestamp(),
    });
  } else if (role === 'client') {
    await updateDoc(chatRef, {
      clientLastReadAt: serverTimestamp(),
    });
  }
}

export async function acceptChatIfPending(
  chatId: string,
  artistId: string,
  clientUserKey: number
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  const snapshot = await getDoc(chatRef);
  const data = snapshot.data() as ChatThread | undefined;
  const shouldStart = !snapshot.exists() || data?.status !== 'active';

  if (!snapshot.exists()) {
    await setDoc(chatRef, {
      artistId,
      clientUserKey,
      status: 'active',
      lastMessage: '채팅이 시작되었습니다.',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'system' as ChatSenderRole,
      artistLastReadAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else if (data?.status !== 'active') {
    await updateDoc(chatRef, {
      status: 'active',
      lastMessage: '채팅이 시작되었습니다.',
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'system' as ChatSenderRole,
      artistLastReadAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  if (shouldStart) {
    const messagesRef = collection(chatRef, 'messages');
    await addDoc(messagesRef, {
      chatId,
      senderId: artistId,
      senderRole: 'system' as ChatSenderRole,
      type: 'text',
      text: '채팅이 시작되었습니다.',
      createdAt: serverTimestamp(),
    });
  }
}

export async function sendChatMessage(
  chatId: string,
  artistId: string,
  artistUserKey: number | undefined,
  clientUserKey: number,
  senderId: string | number,
  senderRole: ChatSenderRole,
  text: string,
  images?: Array<{ name: string; url: string }>,
  paymentRequest?: { type: string; amount: number; orderNo?: string; isTestPayment?: boolean; cancelled?: boolean },
  supportFields?: { title?: string; content?: string; images?: Array<{ name: string; url: string }> }
): Promise<void> {
  const chatRef = doc(db, 'chats', chatId);
  const snapshot = await getDoc(chatRef);
  const summaryText = text.trim() || (images && images.length > 0 ? '이미지' : text);

  if (!snapshot.exists()) {
    await setDoc(chatRef, {
      artistId,
      artistUserKey,
      clientUserKey,
      lastMessage: summaryText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: 'client' as ChatSenderRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await updateDoc(chatRef, {
      lastMessage: summaryText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderRole: senderRole,
      ...(artistUserKey ? { artistUserKey } : {}),
      updatedAt: serverTimestamp(),
    });
  }

  const messagesRef = collection(chatRef, 'messages');
  
  // supportFields에서 undefined 필드 제거
  const cleanedSupportFields = supportFields
    ? Object.fromEntries(
        Object.entries(supportFields).filter(([_, value]) => value !== undefined)
      )
    : undefined;
  
  await addDoc(messagesRef, {
    chatId,
    senderId,
    senderRole,
    type: paymentRequest ? 'payment_request' : 'text',
    text,
    ...(images && images.length > 0 ? { images } : {}),
    ...(paymentRequest ? { paymentRequest } : {}),
    ...(cleanedSupportFields && Object.keys(cleanedSupportFields).length > 0 ? { supportFields: cleanedSupportFields } : {}),
    createdAt: serverTimestamp(),
  });
}