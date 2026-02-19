import { useState, useEffect } from 'react';
import { getArtist, getAllArtists } from '../firebase/firestore';
import type { Artist } from '../firebase/types';

/**
 * 작가 포트폴리오 조회 훅
 * @param artistId - 작가 ID
 * @returns 작가 정보와 로딩 상태
 */
export function useArtistPortfolio(artistId: string | null) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setLoading(false);
      return;
    }

    const fetchArtist = async () => {
      setLoading(true);
      setError(null);

      try {
        const artistData = await getArtist(artistId);
        setArtist(artistData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '작가 정보를 불러오는데 실패했습니다.';
        setError(errorMessage);
        console.error('Failed to fetch artist:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistId]);

  const refresh = async () => {
    if (!artistId) return;
    
    try {
      const artistData = await getArtist(artistId);
      setArtist(artistData);
    } catch (err) {
      console.error('Failed to refresh artist:', err);
    }
  };

  return {
    artist,
    loading,
    error,
    refresh
  };
}

/**
 * 전체 작가 목록 조회 훅
 * @param limitCount - 조회할 최대 개수
 * @param userKey - 현재 로그인한 사용자 키
 * @returns 작가 목록과 로딩 상태
 */
export function useArtists(limitCount = 20, userKey?: number | null) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtists = async () => {
      setLoading(true);
      setError(null);

      try {
        const artistsData = await getAllArtists(limitCount, userKey);
        setArtists(artistsData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '작가 목록을 불러오는데 실패했습니다.';
        setError(errorMessage);
        console.error('Failed to fetch artists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [limitCount, userKey]);

  const refresh = async () => {
    try {
      const artistsData = await getAllArtists(limitCount, userKey);
      setArtists(artistsData);
    } catch (err) {
      console.error('Failed to refresh artists:', err);
    }
  };

  return {
    artists,
    loading,
    error,
    refresh
  };
}
