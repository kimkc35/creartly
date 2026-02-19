/** @jsxImportSource @emotion/react */
import { useState, useEffect } from 'react';
import { Button } from '@toss/tds-mobile';
import { Rally } from './Rally';
import { performTossLogin } from '../../utils/tossLogin';
import { getAllArtists } from '../../firebase/firestore';
import { getOneImageFromArtistImages } from '../../firebase/storage';
import { appBrand } from '../../constants/brand';
import {
  containerStyle,
  contentStyle,
  titleStyle,
  topIconStyle,
  bottomButtonContainerStyle,
  buttonStyle,
  errorButtonStyle,
  errorMessageStyle,
  floatingImagesWrapperStyle,
  floatingImageStyle,
} from './styles';

interface OnboardingProps {
  onComplete: (userKey: number) => void;
  isClosing: boolean;
}

export function Onboarding({ onComplete, isClosing }: OnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [floatingImageUrls, setFloatingImageUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const artists = await getAllArtists(10, null);
        const urls: string[] = [];
        for (const artist of artists) {
          if (urls.length >= 3 || cancelled) break;
          const url = await getOneImageFromArtistImages(artist.id);
          if (url) urls.push(url);
        }
        if (!cancelled) setFloatingImageUrls(urls);
      } catch {
        if (!cancelled) setFloatingImageUrls([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(false);

    try {
      const result = await performTossLogin();

      if (result && result.userKey && result.name) {
        console.log('로그인 성공 - userKey:', result.userKey, 'name:', result.name);
        // 로그인 성공 - Firestore에 이미 저장됨
        onComplete(result.userKey);
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
    <div css={containerStyle(isClosing)}>
      {floatingImageUrls.length > 0 && (
        <div css={floatingImagesWrapperStyle} aria-hidden>
          {floatingImageUrls.map((url, index) => (
            <img
              key={url}
              src={url}
              alt=""
              css={floatingImageStyle(index)}
            />
          ))}
        </div>
      )}
      <div css={contentStyle}>
        <Rally delay={0.1}>
          <img
            src={appBrand.icon}
            alt="크리아틀리"
            css={topIconStyle}
          />
        </Rally>
        <Rally delay={0.25}>
          <h1 css={titleStyle}>원하는 그림을{'\n'}원하는 스타일로</h1>
        </Rally>
      </div>
      <div css={bottomButtonContainerStyle}>
        <Rally delay={0.5}>
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
              {loading ? '로그인하는 중이에요' : error ? '다시 시도할게요' : '로그인하고 시작할게요'}
            </Button>
          </div>
        </Rally>
      </div>
    </div>
  );
}
