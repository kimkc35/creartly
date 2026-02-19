import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable, listAll } from 'firebase/storage';
import type { UploadTaskSnapshot } from 'firebase/storage';
import { storage } from './init';

/**
 * 포트폴리오 이미지 업로드
 * @param artistId - 작가 ID
 * @param file - 업로드할 파일
 * @param imageId - 이미지 ID
 * @returns 업로드된 이미지의 경로와 다운로드 URL
 */
export async function uploadPortfolioImage(
  artistId: string,
  file: File,
  imageId: string
): Promise<{ path: string; downloadUrl: string }> {
  const storageRef = ref(storage, `artists/${artistId}/portfolio/${imageId}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return {
    path: snapshot.ref.fullPath,
    downloadUrl
  };
}

/**
 * 포트폴리오 이미지 업로드 (진행률 추적)
 * @param artistId - 작가 ID
 * @param file - 업로드할 파일
 * @param imageId - 이미지 ID
 * @param onProgress - 진행률 콜백 함수
 * @returns 업로드된 이미지의 경로와 다운로드 URL
 */
export async function uploadPortfolioImageWithProgress(
  artistId: string,
  file: File,
  imageId: string,
  onProgress?: (progress: number) => void
): Promise<{ path: string; downloadUrl: string }> {
  const storageRef = ref(storage, `artists/${artistId}/portfolio/${imageId}`);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          path: uploadTask.snapshot.ref.fullPath,
          downloadUrl
        });
      }
    );
  });
}

/**
 * 프로필 이미지 업로드
 * @param artistId - 작가 ID
 * @param file - 업로드할 파일
 * @returns 업로드된 이미지의 다운로드 URL
 */
export async function uploadProfileImage(
  artistId: string,
  file: File
): Promise<string> {
  const storageRef = ref(storage, `artists/${artistId}/profile.jpg`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  
  return downloadUrl;
}

/**
 * Storage에서 이미지 삭제
 * @param path - Storage 경로
 */
export async function deleteImage(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * 포트폴리오 이미지 삭제
 * @param artistId - 작가 ID
 * @param imageId - 이미지 ID
 */
export async function deletePortfolioImage(
  artistId: string,
  imageId: string
): Promise<void> {
  const path = `artists/${artistId}/portfolio/${imageId}`;
  await deleteImage(path);
}

/**
 * 신청서 이미지 업로드
 * @param userKey - 사용자 키
 * @param artistId - 작가 ID
 * @param file - 업로드할 파일
 * @param imageId - 이미지 ID
 * @returns 업로드된 이미지의 경로와 다운로드 URL
 */
export async function uploadRequestImage(
  userKey: number,
  artistId: string,
  file: File,
  imageId: string
): Promise<{ path: string; downloadUrl: string }> {
  const storageRef = ref(storage, `${String(userKey)}/${artistId}/Images/${imageId}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    path: snapshot.ref.fullPath,
    downloadUrl
  };
}

/**
 * 작가별 images 폴더에서 이미지 하나의 다운로드 URL 반환
 * @param artistId - 작가 ID
 * @returns 이미지 URL 또는 null (폴더가 비어 있거나 실패 시)
 */
export async function getOneImageFromArtistImages(artistId: string): Promise<string | null> {
  try {
    const listRef = ref(storage, `artists/${artistId}/images`);
    const result = await listAll(listRef);
    if (!result.items.length) return null;
    const firstRef = result.items[0];
    return await getDownloadURL(firstRef);
  } catch {
    return null;
  }
}

/**
 * 작가별 images 폴더에서 이미지 URL 목록 반환 (미리보기용)
 * @param artistId - 작가 ID
 * @param maxCount - 최대 개수 (기본 5)
 * @returns 다운로드 URL 배열
 */
export async function getArtistImagesUrls(artistId: string, maxCount = 5): Promise<string[]> {
  try {
    const listRef = ref(storage, `artists/${artistId}/images`);
    const result = await listAll(listRef);
    const items = result.items.slice(0, maxCount);
    const urls = await Promise.all(items.map((itemRef) => getDownloadURL(itemRef)));
    return urls;
  } catch {
    return [];
  }
}

/**
 * 채팅 이미지 업로드
 * @param userKey - 사용자 키
 * @param chatId - 채팅 ID
 * @param file - 업로드할 파일
 * @param imageId - 이미지 ID
 * @returns 업로드된 이미지의 경로와 다운로드 URL
 */
export async function uploadChatImage(
  userKey: number,
  chatId: string,
  file: File,
  imageId: string
): Promise<{ path: string; downloadUrl: string }> {
  const storageRef = ref(storage, `chats/${chatId}/${String(userKey)}/images/${imageId}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    path: snapshot.ref.fullPath,
    downloadUrl
  };
}

/**
 * 리뷰 이미지 업로드
 * @param artistId - 작가 ID
 * @param userKey - 사용자 키
 * @param file - 업로드할 파일
 * @param imageId - 이미지 ID
 * @returns 업로드된 이미지의 경로와 다운로드 URL
 */
export async function uploadReviewImage(
  artistId: string,
  userKey: number,
  file: File,
  imageId: string
): Promise<{ path: string; downloadUrl: string }> {
  const storageRef = ref(storage, `artists/${artistId}/reviews/${String(userKey)}/${imageId}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  return {
    path: snapshot.ref.fullPath,
    downloadUrl
  };
}