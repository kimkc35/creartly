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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './init';
import type { Artist, PortfolioItem, Commission } from './types';

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
 * @returns 작가 목록
 */
export async function getAllArtists(limitCount = 20): Promise<Artist[]> {
  console.log('🔍 getAllArtists 시작, limitCount:', limitCount);

  try {
    const artistsRef = collection(db, 'artists');
    console.log('📁 artists 컬렉션 참조 생성 완료');

    const q = query(
      artistsRef,
      orderBy('ratings', 'desc'),
      limit(limitCount)
    );
    console.log('🔎 쿼리 생성 완료 (정렬: ratings desc)');

    console.log('📡 Firestore에 요청 중...');
    const snapshot = await getDocs(q);
    console.log('✅ Firestore 응답 받음, 문서 개수:', snapshot.size);
    console.log('📄 문서 ID 목록:', snapshot.docs.map(d => d.id));

    const artists = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`📝 문서 "${doc.id}" 데이터:`, data);
      return {
        id: doc.id,
        ...data
      };
    }) as Artist[];

    console.log('🎉 getAllArtists 완료, 총 작가 수:', artists.length);
    console.log('👥 작가 목록:', artists);

    return artists;
  } catch (error) {
    console.error('❌ getAllArtists 에러:', error);
    throw error;
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