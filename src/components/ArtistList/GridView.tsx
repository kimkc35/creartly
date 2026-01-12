/** @jsxImportSource @emotion/react */
import { useState, useRef, useEffect } from 'react';
import { css } from '@emotion/react';
import { Button, IconButton, Rating } from '@toss/tds-mobile';
import type { Artist } from '../../firebase/types';
import { getArtistPreviewImages } from '../../firebase/firestore';

interface ArtistGridViewProps {
  artists: Artist[];
  onPopupStateChange?: (isOpen: boolean) => void;
  onViewProfile?: (artistId: string) => void;
}

interface PreviewPopupProps {
  artist: Artist;
  previewImages: string[];
  onClose: () => void;
  onViewProfile?: (artistId: string) => void;
  onPopupStateChange?: (isOpen: boolean) => void;
}

function PreviewPopup({ artist, previewImages, onClose, onViewProfile, onPopupStateChange }: PreviewPopupProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  // 팝업이 열릴 때 body 스크롤 방지 및 상태 전달
  useEffect(() => {
    // body 스크롤 방지
    document.body.style.overflow = 'hidden';
    // 부모 컴포넌트에 팝업 상태 전달
    onPopupStateChange?.(true);

    return () => {
      // 팝업이 닫힐 때 body 스크롤 복원
      document.body.style.overflow = '';
      onPopupStateChange?.(false);
    };
  }, [onPopupStateChange]);

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

  const averageRating = getAverageRating();

  const handleViewProfile = () => {
    if (onViewProfile) {
      onViewProfile(artist.id);
    } else {
      // 기본 동작: 경고 표시 (나중에 라우팅 구현 가능)
      console.log('프로필 페이지로 이동:', artist.id);
    }
    onClose();
  };

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
        // getBoundingClientRect로 정확한 너비 계산 (padding 포함)
        const rect = scrollContainerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };

    // 초기 너비 설정 (약간의 지연으로 렌더링 완료 후 계산)
    const timeoutId = setTimeout(updateWidth, 0);
    
    // ResizeObserver를 사용하여 더 정확하게 너비 추적
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
    <div css={popupOverlayStyle} onClick={onClose}>
      <div css={popupContainerStyle} onClick={(e) => e.stopPropagation()}>
        <IconButton
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE4IDZMNiAxOE02IDZMMTggMTgiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K"
          onClick={onClose}
          aria-label="닫기"
          variant="clear"
          color="#CFB59E"
          css={closeButtonStyle}
        />
        
        <div css={popupHeaderStyle}>
          <div css={popupHeaderTopStyle}>
            <img
              src={artist.profileImageUrl}
              alt={artist.name}
              css={popupProfileImageStyle}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
            <h2 css={popupNameStyle}>{artist.name}</h2>
          </div>
          <Rating
            readOnly={true}
            value={averageRating}
            max={5}
            size="large"
            variant="full"
            aria-label="별점"
          />
        </div>
        
        <p css={popupIntroductionStyle}>{artist.introduction}</p>
        
        {previewImages.length > 0 && (
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
        )}

        <Button
          onClick={handleViewProfile}
          size="large"
          css={viewProfileButtonStyle}
        >
          <span css={buttonContentStyle}>
            상세 정보
            <img
              src="https://static.toss.im/icons/svg/icon-arrow-right-mono.svg"
              alt=""
              css={arrowIconStyle}
            />
          </span>
        </Button>
      </div>
    </div>
  );
}

export function ArtistGridView({ artists, onPopupStateChange, onViewProfile }: ArtistGridViewProps) {
  const [activeArtistId, setActiveArtistId] = useState<string | null>(null);
  const [previewImagesMap, setPreviewImagesMap] = useState<Record<string, string[]>>({});

  const handleClick = (artistId: string) => {
    setActiveArtistId(artistId);
    
    // 미리보기 이미지가 없으면 로드
    if (!previewImagesMap[artistId]) {
      getArtistPreviewImages(artistId).then((images) => {
        setPreviewImagesMap((prev) => ({ ...prev, [artistId]: images }));
      });
    }
  };

  const handleClose = () => {
    setActiveArtistId(null);
  };

  const activeArtist = activeArtistId ? artists.find(a => a.id === activeArtistId) : null;
  const activePreviewImages = activeArtistId ? (previewImagesMap[activeArtistId] || []) : [];

  return (
    <>
      <div css={containerStyle}>
        {artists.map((artist) => (
          <div key={artist.id} css={cardStyle}>
            <div css={thumbnailContainerStyle}>
              <img
                src={artist.thumbnailUrl}
                css={thumbnailStyle}
                alt={artist.name}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onClick={() => {
                  if (onViewProfile) {
                    onViewProfile(artist.id);
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
              <button
                css={magnifyingGlassButtonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(artist.id);
                }}
                type="button"
                aria-label="미리보기"
              >
                <img
                  src="https://static.toss.im/icons/svg/icon-search-mono.svg"
                  alt="미리보기"
                  css={magnifyingGlassIconStyle}
                />
              </button>
            </div>

            <div css={profileSectionStyle}>
              <div css={profileImageContainerStyle}>
                <img
                  src={artist.profileImageUrl}
                  css={profileImageStyle}
                  alt={artist.name}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>

              <div css={infoStyle}>
                <h3 css={nameStyle}>{artist.name}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeArtist && (
        <PreviewPopup
          artist={activeArtist}
          previewImages={activePreviewImages}
          onClose={handleClose}
          onPopupStateChange={onPopupStateChange}
          onViewProfile={onViewProfile}
        />
      )}
    </>
  );
}

const containerStyle = css`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
`;

const cardStyle = css`
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(108, 77, 56, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 16px rgba(108, 77, 56, 0.2);
  }

  &:active {
    transform: translateY(-2px);
  }
`;

const thumbnailContainerStyle = css`
  width: 100%;
  aspect-ratio: 0.7;
  overflow: hidden;
  background: #F7F2EF;
  position: relative;
`;

const thumbnailStyle = css`
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
`;

const magnifyingGlassButtonStyle = css`
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  padding: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: scale(1.1);
  }

  &:active {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    bottom: 8px;
    right: 8px;
  }
`;

const magnifyingGlassIconStyle = css`
  width: 20px;
  height: 20px;
  filter: brightness(0) saturate(100%) invert(100%);

  @media (max-width: 768px) {
    width: 18px;
    height: 18px;
  }
`;

const profileSectionStyle = css`
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  position: relative;
  z-index: 1;
  background: white;

  @media (max-width: 768px) {
    padding: 12px;
    gap: 8px;
  }
`;

const profileImageContainerStyle = css`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #CFB59E;
  background: #F7F2EF;
  margin-top: -40px;
  box-shadow: 0 2px 8px rgba(108, 77, 56, 0.1);

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
    margin-top: -30px;
  }
`;

const profileImageStyle = css`
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
`;

const infoStyle = css`
  text-align: center;
  width: 100%;
`;

const nameStyle = css`
  font-size: 18px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0 0 8px 0;

  @media (max-width: 768px) {
    font-size: 16px;
    margin: 0 0 4px 0;
  }
`;

// Preview Popup Styles
const popupOverlayStyle = css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const popupContainerStyle = css`
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;

  @media (max-width: 768px) {
    padding: 20px;
    max-height: 85vh;
  }
`;

const closeButtonStyle = css`
  position: absolute !important;
  top: 16px;
  right: 16px;
  z-index: 10;

  @media (max-width: 768px) {
    top: 12px;
    right: 12px;
  }
`;

const popupHeaderStyle = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const popupHeaderTopStyle = css`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const popupProfileImageStyle = css`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #CFB59E;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;

  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
  }
`;

const popupNameStyle = css`
  font-size: 24px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 20px;
  }
`;

const popupIntroductionStyle = css`
  font-size: 16px;
  color: #6C4D38;
  line-height: 1.6;
  margin: 0 0 24px 0;

  @media (max-width: 768px) {
    font-size: 14px;
    margin-bottom: 20px;
  }
`;

const previewImagesScrollContainerStyle = css`
  width: 100%;
  height: 400px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 12px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x mandatory;
  position: relative;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    height: 300px;
    margin-bottom: 10px;
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
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    margin-bottom: 20px;
    gap: 6px;
  }
`;

const previewIndicatorDotStyle = (active: boolean) => css`
  width: ${active ? '8px' : '6px'};
  height: ${active ? '8px' : '6px'};
  border-radius: 50%;
  background-color: ${active ? '#CFB59E' : '#E0E0E0'};
  transition: all 0.2s ease;
  cursor: pointer;

  @media (max-width: 768px) {
    width: ${active ? '7px' : '5px'};
    height: ${active ? '7px' : '5px'};
  }
`;

const viewProfileButtonStyle = css`
  width: 100%;
  margin-top: 8px;
  background: #CFB59E !important;
  border-color: #CFB59E !important;

  &:hover {
    background: #B8A18E !important;
    border-color: #B8A18E !important;
  }
`;

const buttonContentStyle = css`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const arrowIconStyle = css`
  width: 20px;
  height: 20px;
  filter: brightness(0) saturate(100%) invert(100%);
`;
