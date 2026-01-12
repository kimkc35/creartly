import { useState } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { uploadPortfolioImageWithProgress } from '../firebase/storage';
import { addPortfolioItem } from '../firebase/firestore';
import type { PortfolioItem } from '../firebase/types';

interface UploadMetadata {
  title: string;
  description: string;
  tags: string[];
}

interface UploadResult {
  success: boolean;
  downloadUrl?: string;
  error?: unknown;
}

/**
 * 이미지 업로드 커스텀 훅
 * @param artistId - 작가 ID
 * @returns 업로드 함수와 상태
 */
export function useImageUpload(artistId: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (
    file: File,
    metadata: UploadMetadata
  ): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 이미지 파일 검증
      if (!file.type.startsWith('image/')) {
        throw new Error('이미지 파일만 업로드 가능합니다.');
      }

      // 파일 크기 제한 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('파일 크기는 10MB를 초과할 수 없습니다.');
      }

      // 고유 이미지 ID 생성
      const imageId = `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Storage에 업로드 (진행률 추적)
      const { downloadUrl, path } = await uploadPortfolioImageWithProgress(
        artistId,
        file,
        imageId,
        (progressValue) => {
          setProgress(progressValue);
        }
      );

      // Firestore에 메타데이터 저장
      const portfolioItem: PortfolioItem = {
        id: imageId,
        thumbnailUrl: path,
        previewUrl: path,
        originalUrl: path,
        downloadUrl,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        uploadedAt: serverTimestamp() as any,
        likes: 0
      };

      await addPortfolioItem(artistId, portfolioItem);

      setProgress(100);
      return { success: true, downloadUrl };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('Upload failed:', err);
      return { success: false, error: err };
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setProgress(0);
    setError(null);
  };

  return {
    uploadImage,
    uploading,
    progress,
    error,
    reset
  };
}
