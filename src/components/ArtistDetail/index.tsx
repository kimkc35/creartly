/** @jsxImportSource @emotion/react */
import { useState, useRef, useEffect } from 'react';
import { css } from '@emotion/react';
import { IconButton, Rating } from '@toss/tds-mobile';
import type { Artist } from '../../firebase/types';
import { getArtistPreviewImages } from '../../firebase/firestore';

interface ArtistDetailProps {
  artist: Artist;
  onClose: () => void;
}

export function ArtistDetail({ artist, onClose }: ArtistDetailProps) {
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // ratings와 reviewers를 사용하여 평균 별점 계산 (0-5 범위)
  const getAverageRating = () => {
    const ratings = (artist as any).ratings ?? 0; // 전체 별점 합계
    const reviewers = (artist as any).reviewers ?? 0; // 리뷰어 수
    
    if (reviewers === 0) {
      return 0;
    }
    
    // 평균 별점 계산: 전체 별점 합계 / 리뷰어 수
    const average = ratings / reviewers;
    // 평균을 0-5 범위로 제한
    return Math.min(5, Math.max(0, Math.round(average * 10) / 10));
  };

  useEffect(() => {
    // 프리뷰 이미지 로드
    getArtistPreviewImages(artist.id).then((images) => {
      setPreviewImages(images);
      setLoading(false);
    });
  }, [artist.id]);

  const handleScroll = () => {
    if (scrollContainerRef.current && previewImages.length > 0) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const width = container.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setCurrentIndex(Math.min(index, previewImages.length - 1));
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [previewImages.length]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const updateWidth = () => {
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };

    const timeoutId = setTimeout(updateWidth, 0);
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(scrollContainerRef.current);
    window.addEventListener('resize', updateWidth);
    
    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [previewImages.length]);

  return (
    <div css={containerStyle}>
      <div css={headerStyle}>
        <IconButton
          src="https://static.toss.im/icons/svg/icon-arrow-left-mono.svg"
          onClick={onClose}
          aria-label="뒤로 가기"
          variant="clear"
          color="#6C4D38"
          iconSize={32}
        />
      </div>

      <div css={contentStyle}>
        <div css={profileSectionStyle}>
          <img
            src={artist.profileImageUrl}
            alt={artist.name}
            css={profileImageStyle}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div css={profileInfoStyle}>
            <h2 css={nameStyle}>{artist.name}</h2>
            <p css={introductionStyle}>{artist.introduction}</p>
            <Rating
              readOnly={true}
              value={getAverageRating()}
              max={5}
              size="large"
              variant="full"
              aria-label="별점"
            />
          </div>
        </div>

        {loading ? (
          <div css={loadingStyle}>이미지를 불러오는 중...</div>
        ) : previewImages.length > 0 ? (
          <>
            <div 
              css={previewImagesScrollContainerStyle}
              ref={scrollContainerRef}
            >
              <div css={previewImagesContainerStyle}>
                {previewImages.map((url, index) => (
                  <div
                    key={index}
                    css={previewImageWrapperStyle}
                    style={containerWidth > 0 ? { 
                      width: `${containerWidth}px`, 
                      minWidth: `${containerWidth}px`,
                      maxWidth: `${containerWidth}px`
                    } : undefined}
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      css={previewImageStyle}
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div css={previewIndicatorsStyle}>
              {previewImages.map((_, index) => (
                <span
                  key={index}
                  css={previewIndicatorDotStyle(index === currentIndex)}
                />
              ))}
            </div>
          </>
        ) : (
          <div css={emptyStyle}>프리뷰 이미지가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

const containerStyle = css`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #F7F2EF 0%, #ECF5FF 50%, #D7EAFF 100%);
  padding: 20px;
  padding-top: 60px;
`;

const headerStyle = css`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const contentStyle = css`
  max-width: 1200px;
  margin: 0 auto;
`;

const profileSectionStyle = css`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
`;

const profileImageStyle = css`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #CFB59E;
  background: #F7F2EF;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  flex-shrink: 0;
`;

const profileInfoStyle = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`;

const nameStyle = css`
  font-size: 32px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0;
`;

const introductionStyle = css`
  font-size: 16px;
  color: #6C4D38;
  line-height: 1.6;
  margin: 0;
`;

const previewImagesScrollContainerStyle = css`
  width: 100%;
  height: 500px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 16px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x mandatory;
  position: relative;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    height: 400px;
  }
`;

const previewImagesContainerStyle = css`
  display: flex;
  gap: 0;
  height: 100%;
  align-items: center;
`;

const previewImageWrapperStyle = css`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: start;
  flex-shrink: 0;
  padding: 0 12px;
  box-sizing: border-box;

  &:first-child {
    padding-left: 0;
  }

  &:last-child {
    padding-right: 0;
  }

  @media (max-width: 768px) {
    padding: 0 8px;

    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      padding-right: 0;
    }
  }
`;

const previewImageStyle = css`
  max-height: 100%;
  max-width: 100%;
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
  background: #F7F2EF;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
`;

const previewIndicatorsStyle = css`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
`;

const previewIndicatorDotStyle = (active: boolean) => css`
  width: ${active ? '12px' : '8px'};
  height: ${active ? '12px' : '8px'};
  border-radius: 50%;
  background: ${active ? '#6C4D38' : '#CFB59E'};
  transition: all 0.3s ease;
`;

const loadingStyle = css`
  text-align: center;
  padding: 60px 20px;
  color: #6C4D38;
  font-size: 18px;
`;

const emptyStyle = css`
  text-align: center;
  padding: 60px 20px;
  color: #6C4D38;
  opacity: 0.6;
  font-size: 18px;
`;
