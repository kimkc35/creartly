/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import { Button } from '@toss/tds-mobile';
import { Rally } from './Rally';
import { performTossLogin } from '../../utils/tossLogin';
import {
  containerStyle,
  contentStyle,
  titleStyle,
  imageStyle,
  descriptionStyle,
  buttonStyle,
  errorButtonStyle,
  errorMessageStyle,
} from './styles';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(false);

    try {
      const accessToken = await performTossLogin();

      if (accessToken) {
        // 로그인 성공
        onComplete();
      } else {
        // 로그인 실패
        setError(true);
      }
    } catch (err) {
      console.error('로그인 중 오류:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div css={containerStyle}>
      <div css={contentStyle}>
        <Rally delay={0.1}>
          <h1 css={titleStyle}>원하는 그림을{'\n'}원하는 스타일로</h1>
        </Rally>

        <Rally delay={0.3}>
          <img
            src="https://firebasestorage.googleapis.com/v0/b/creartly-326fe.firebasestorage.app/o/source%2Ficon.png?alt=media&token=771269a6-e9ae-4f82-a293-6b3673a8e7a7"
            alt="Creartly"
            css={imageStyle}
          />
        </Rally>

        <Rally delay={0.7}>
          <div>
            {error && (
              <p css={errorMessageStyle}>
                로그인에 실패했어요. 다시 시도해 주세요.
              </p>
            )}
            <Button
              css={error ? errorButtonStyle : buttonStyle}
              onClick={handleLogin}
              size="large"
              disabled={loading}
            >
              {loading ? '로그인 중...' : error ? '다시 시도하기' : '로그인하여 시작하기'}
            </Button>
          </div>
        </Rally>
      </div>
    </div>
  );
}
