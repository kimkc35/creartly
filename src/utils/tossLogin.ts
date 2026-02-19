import { appLogin } from '@apps-in-toss/web-framework';
import { saveTossUser, getTossUser, updateTossUserTokens, deleteTossUser } from '../firebase/firestore';
import { decrypt } from './aesDecrypt';

// Firebase Functions URL (환경 변수 또는 기본값)
const FUNCTIONS_BASE_URL = import.meta.env.VITE_FUNCTIONS_BASE_URL || 'https://asia-northeast3-creartly-326fe.cloudfunctions.net';

interface TokenResponse {
  statusCode: number;
  data: {
    success?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: string;
      tokenType: string;
      scope: string;
    };
    error?: {
      errorCode: string;
      reason: string;
    };
  };
}

interface UserInfoResponse {
  statusCode: number;
  data: {
    resultType: 'SUCCESS' | 'FAIL';
    success?: {
      name: string;
      userKey: string;
      [key: string]: unknown;
    };
    error?: {
      errorCode: string;
      reason: string;
    };
  };
}

/**
 * 토스 로그인을 수행하고 AccessToken과 RefreshToken을 받아옵니다.
 * 사용자 정보를 Firestore에 저장합니다.
 * @returns { userKey: number, name: string } 또는 null (실패 시)
 */
export async function performTossLogin(): Promise<{
  userKey: number;
  name: string;
} | null> {
  try {
    // 1. 인가 코드 받기
    const { authorizationCode, referrer } = await appLogin();

    // 2. Firebase Functions를 통해 AccessToken 받기
    const tokenResponse = await fetch(`${FUNCTIONS_BASE_URL}/getTossAccessToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        authorizationCode,
        referrer,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('토스 로그인 실패:', errorData);
      return null;
    }

    const tokenData: TokenResponse = await tokenResponse.json();

    if (tokenData.statusCode !== 200 || !tokenData.data.success) {
      console.error('토스 로그인 실패:', tokenData.data.error);
      return null;
    }

    const { accessToken, refreshToken } = tokenData.data.success;

    // 3. 사용자 정보 가져오기
    const userInfoResponse = await fetch(`${FUNCTIONS_BASE_URL}/getTossUserInfo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('사용자 정보 조회 실패');
      return null;
    }

    const userInfoData: UserInfoResponse = await userInfoResponse.json();

    if (userInfoData.statusCode !== 200 || !userInfoData.data.success) {
      console.error('사용자 정보 조회 실패:', userInfoData.data.error);
      return null;
    }

    const successData = userInfoData.data.success;
    
    if (!successData.name || !successData.userKey) {
      console.error('사용자 정보에 name 또는 userKey가 없습니다.');
      return null;
    }

    // 환경 변수에서 복호화 키와 AAD 가져오기
    const aesKey = import.meta.env.VITE_AES_DECRYPT_KEY;
    const aad = import.meta.env.VITE_AES_DECRYPT_AAD;

    if (!aesKey || !aad) {
      console.error('복호화에 필요한 환경 변수가 설정되지 않았습니다. VITE_AES_DECRYPT_KEY와 VITE_AES_DECRYPT_AAD를 설정해주세요.');
      return null;
    }

    // 4. 암호화된 데이터 복호화 (name만 암호화된 문자열로 전달됨, userKey는 그대로 사용)
    let name: string;
    const userKey = Number(successData.userKey); // userKey는 복호화하지 않고 숫자로 사용

    try {
      name = await decrypt(successData.name, aesKey, aad);
    } catch (error) {
      console.error('복호화 실패:', error);
      return null;
    }

    if (!name || Number.isNaN(userKey)) {
      console.error('복호화 후 사용자 정보에 name 또는 userKey가 없습니다.');
      return null;
    }

    // 5. Firestore에 사용자 정보 저장
    await saveTossUser(userKey, {
      name,
      accessToken,
      refreshToken,
    });

    return {
      userKey,
      name,
    };
  } catch (error) {
    console.error('토스 로그인 중 오류 발생:', error);
    return null;
  }
}

/**
 * RefreshToken을 사용하여 새로운 AccessToken을 받아옵니다.
 * @param refreshToken RefreshToken
 * @returns { accessToken: string, refreshToken: string } 또는 null (실패 시)
 */
export async function refreshTossToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const response = await fetch(`${FUNCTIONS_BASE_URL}/refreshTossToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('토큰 갱신 실패:', errorData);
      return null;
    }

    const data: TokenResponse = await response.json();

    if (data.statusCode === 200 && data.data.success) {
      return {
        accessToken: data.data.success.accessToken,
        refreshToken: data.data.success.refreshToken,
      };
    } else {
      console.error('토큰 갱신 실패:', data.data.error);
      return null;
    }
  } catch (error) {
    console.error('토큰 갱신 중 오류 발생:', error);
    return null;
  }
}

/**
 * Firestore에서 현재 사용자의 AccessToken을 가져옵니다.
 * 토큰이 만료된 경우 자동으로 RefreshToken으로 갱신합니다.
 * @param userKey 사용자 키
 * @returns AccessToken 또는 null (실패 시)
 */
export async function getAccessToken(userKey: number): Promise<string | null> {
  try {
    const user = await getTossUser(userKey);
    
    if (!user) {
      console.error('사용자 정보를 찾을 수 없습니다.');
      return null;
    }

    // AccessToken을 사용하여 API 호출 시도
    // 만료된 경우 401 에러가 발생하므로, 그때 RefreshToken으로 갱신
    return user.accessToken;
  } catch (error) {
    console.error('AccessToken 가져오기 실패:', error);
    return null;
  }
}

/**
 * AccessToken이 만료된 경우 RefreshToken으로 갱신합니다.
 * @param userKey 사용자 키
 * @returns 갱신된 AccessToken 또는 null (실패 시)
 */
export async function refreshAccessTokenIfNeeded(userKey: number): Promise<string | null> {
  try {
    const user = await getTossUser(userKey);
    
    if (!user) {
      console.error('사용자 정보를 찾을 수 없습니다.');
      return null;
    }

    // RefreshToken으로 새 토큰 발급
    const newTokens = await refreshTossToken(user.refreshToken);
    
    if (!newTokens) {
      console.error('토큰 갱신 실패');
      return null;
    }

    // Firestore에 새 토큰 저장
    await updateTossUserTokens(userKey, newTokens.accessToken, newTokens.refreshToken);

    return newTokens.accessToken;
  } catch (error) {
    console.error('토큰 갱신 중 오류 발생:', error);
    return null;
  }
}

/**
 * API 호출 시 사용할 AccessToken을 가져옵니다.
 * 만료된 경우 자동으로 갱신합니다.
 * @param userKey 사용자 키
 * @returns AccessToken 또는 null (실패 시)
 */
export async function getValidAccessToken(userKey: number): Promise<string | null> {
  try {
    // 먼저 현재 AccessToken 가져오기
    const accessToken = await getAccessToken(userKey);
    
    if (!accessToken) {
      return null;
    }

    return accessToken;
  } catch (error) {
    console.error('유효한 AccessToken 가져오기 실패:', error);
    return null;
  }
}

/**
 * 토스 API 호출 시 사용하는 fetch 래퍼 함수.
 * AccessToken을 자동으로 헤더에 추가하고, 401 에러 시 자동으로 토큰을 갱신합니다.
 * @param userKey 사용자 키
 * @param url API URL
 * @param options fetch 옵션
 * @returns fetch 응답
 */
export async function fetchWithTossAuth(
  userKey: number,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // AccessToken 가져오기
  let accessToken = await getValidAccessToken(userKey);
  
  if (!accessToken) {
    throw new Error('AccessToken을 가져올 수 없습니다.');
  }

  // 첫 번째 시도
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  // 401 에러가 발생하면 토큰 갱신 후 재시도
  if (response.status === 401) {
    const newAccessToken = await refreshAccessTokenIfNeeded(userKey);
    
    if (!newAccessToken) {
      throw new Error('토큰 갱신에 실패했습니다.');
    }

    // 갱신된 토큰으로 재시도
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${newAccessToken}`,
      },
    });
  }

  return response;
}

/**
 * 로그아웃 시 Firestore에서 사용자 정보를 삭제합니다.
 * @param userKey 사용자 키
 */
export async function logoutTossUser(userKey: number): Promise<void> {
  try {
    await deleteTossUser(userKey);
  } catch (error) {
    console.error('로그아웃 중 오류 발생:', error);
  }
}
