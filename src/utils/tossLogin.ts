import { appLogin } from '@apps-in-toss/web-framework';

const BASE_URL = 'https://apps-in-toss-api.toss.im';

interface TokenResponse {
  resultType: 'SUCCESS' | 'FAIL';
  success?: {
    tokenType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    scope: string;
  };
  error?: {
    errorCode: string;
    reason: string;
  };
}

/**
 * 토스 로그인을 수행하고 AccessToken을 받아옵니다.
 * @returns AccessToken 또는 null (실패 시)
 */
export async function performTossLogin(): Promise<string | null> {
  try {
    // 1. 인가 코드 받기
    const { authorizationCode, referrer } = await appLogin();

    // 2. AccessToken 받기
    const response = await fetch(
      `${BASE_URL}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorizationCode,
          referrer,
        }),
      }
    );

    const data: TokenResponse = await response.json();

    if (data.resultType === 'SUCCESS' && data.success?.accessToken) {
      return data.success.accessToken;
    } else {
      console.error('토스 로그인 실패:', data.error);
      return null;
    }
  } catch (error) {
    console.error('토스 로그인 중 오류 발생:', error);
    return null;
  }
}
