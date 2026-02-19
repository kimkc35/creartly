/** @jsxImportSource @emotion/react */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import { Asset, Button, Rating, Text } from '@toss/tds-mobile';
import type { Artist } from '../../firebase/types';
import { getArtistReviewCount } from '../../firebase/firestore';
import { getArtistImagesUrls } from '../../firebase/storage';
import { ArtistApplicationPopup } from './ArtistApplicationPopup';

interface ArtistGridViewProps {
  artists: Artist[];
  onPopupStateChange?: (isOpen: boolean) => void;
  onViewProfile?: (artistId: string) => void;
  userKey?: number | null;
  onChatStart?: (chatId: string) => void;
}

interface PreviewPopupProps {
  artist: Artist;
  previewImages: string[];
  previewImagesLoading: boolean;
  onClose: () => void;
  onViewProfile?: (artistId: string) => void;
  onPopupStateChange?: (isOpen: boolean) => void;
  isClosing?: boolean;
}

function PreviewPopup({ artist, previewImages, previewImagesLoading, onClose, onViewProfile, onPopupStateChange, isClosing = false }: PreviewPopupProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

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

  // 리뷰 개수 로드
  useEffect(() => {
    getArtistReviewCount(artist.id).then((count) => {
      setReviewCount(count);
    });
  }, [artist.id]);

  // ratings와 reviewCount를 사용하여 평균 별점 계산 (0-5 범위)
  const getAverageRating = () => {
    const ratings = artist.ratings ?? 0; // 전체 별점 합계
    
    if (reviewCount === 0) {
      return 0;
    }
    
    // 평균 별점 계산: 전체 별점 합계 / 리뷰 문서 개수
    const average = ratings / reviewCount;
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

  return (
    <div css={popupOverlayStyle(isClosing)} onClick={onClose}>
      <div css={popupContainerStyle(isClosing)} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          css={closeButtonStyle}
          onClick={onClose}
          aria-label="닫기"
        >
          <Asset.Icon
            frameShape={Asset.frameShape.CleanW20}
            name="icon-appsintoss-close-mono"
            color="#CFB59E"
            aria-hidden={true}
          />
        </button>
        
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
        
        {previewImagesLoading ? (
          <div css={previewImagesLoadingStyle}>이미지를 불러오는 중이에요.</div>
        ) : previewImages.length > 0 ? (
          <div css={previewImagesSectionStyle}>
            <div
              css={previewImagesScrollContainerStyle}
              ref={scrollContainerRef}
            >
              <div css={previewImagesContainerStyle}>
                {previewImages.map((url, index) => (
                  <div key={index} css={previewImageWrapperStyle}>
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
          </div>
        ) : (
          <div css={previewImagesEmptyStyle}>등록된 이미지가 없어요.</div>
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

export function ArtistGridView({ artists, onPopupStateChange, onViewProfile, userKey, onChatStart }: ArtistGridViewProps) {
  const [activeArtistId, setActiveArtistId] = useState<string | null>(null);
  const [previewImagesMap, setPreviewImagesMap] = useState<Record<string, string[]>>({});
  const [previewImagesLoadingId, setPreviewImagesLoadingId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showApplicationPopup, setShowApplicationPopup] = useState(false);
  const [isApplicationClosing, setIsApplicationClosing] = useState(false);

  const handleClick = (artistId: string) => {
    setActiveArtistId(artistId);
    setIsClosing(false);
    
    // 미리보기 이미지가 없으면 Storage artists/{id}/images에서 로드 (최대 5개)
    if (!previewImagesMap[artistId]) {
      setPreviewImagesLoadingId(artistId);
      getArtistImagesUrls(artistId, 5).then((images) => {
        setPreviewImagesMap((prev) => ({ ...prev, [artistId]: images }));
        setPreviewImagesLoadingId((id) => (id === artistId ? null : id));
      }).catch(() => {
        setPreviewImagesLoadingId((id) => (id === artistId ? null : id));
      });
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveArtistId(null);
      setPreviewImagesLoadingId(null);
      setIsClosing(false);
    }, 350); // 애니메이션 시간과 맞춤
  };

  const handleApplicationClose = () => {
    setIsApplicationClosing(true);
    setTimeout(() => {
      setShowApplicationPopup(false);
      setIsApplicationClosing(false);
    }, 350);
  };

  const handleApplicationSuccess = (chatId: string) => {
    onChatStart?.(chatId);
    handleApplicationClose();
  };

  const activeArtist = activeArtistId ? artists.find(a => a.id === activeArtistId) : null;
  const activePreviewImages = activeArtistId ? (previewImagesMap[activeArtistId] || []) : [];
  const activePreviewImagesLoading = activeArtistId !== null && previewImagesLoadingId === activeArtistId;

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
        
        {/* 작가 신청 카드 */}
        <div css={applicationCardStyle} onClick={() => setShowApplicationPopup(true)}>
          <div css={applicationCardContentStyle}>
            <div css={applicationIconStyle}>
              <Asset.Icon
                frameShape={Asset.frameShape.CleanW40}
                name="icon-plus-mono"
                color="#6C4D38"
                aria-hidden={true}
              />
            </div>
            <Text typography="st13" fontWeight="bold" color="#6C4D38" css={applicationTextStyle}>
              직접 작가가 되어 보세요!
            </Text>
          </div>
          <div css={thumbnailContainerStyle} style={{ background: 'transparent' }} />
          {/* 다른 카드들과 높이를 맞추기 위한 빈 프로필 섹션 */}
          <div css={profileSectionStyle} style={{ background: 'transparent' }}>
            <div css={profileImageContainerStyle} style={{ visibility: 'hidden' }} />
            <div css={infoStyle} style={{ visibility: 'hidden' }}>
              <h3 css={nameStyle}>Placeholder</h3>
            </div>
          </div>
        </div>
      </div>

      {activeArtist &&
        createPortal(
          <PreviewPopup
            artist={activeArtist}
            previewImages={activePreviewImages}
            previewImagesLoading={activePreviewImagesLoading}
            onClose={handleClose}
            onPopupStateChange={onPopupStateChange}
            onViewProfile={onViewProfile}
            isClosing={isClosing}
          />,
          document.body,
        )}

      {showApplicationPopup && (
        <ArtistApplicationPopup
          userKey={userKey ?? null}
          onClose={handleApplicationClose}
          onSuccess={handleApplicationSuccess}
          onPopupStateChange={onPopupStateChange}
          isClosing={isApplicationClosing}
        />
      )}
    </>
  );
}

const containerStyle = css`
  width: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  animation: fadeInGrid 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes fadeInGrid {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const cardStyle = css`
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(108, 77, 56, 0.06);
  position: relative;
  animation: cardFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
  
  @keyframes cardFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 8px 24px rgba(108, 77, 56, 0.15);
    border-color: rgba(108, 77, 56, 0.12);
  }

  &:active {
    transform: translateY(-2px) scale(1);
  }
`;

const thumbnailContainerStyle = css`
  width: 100%;
  aspect-ratio: 1 / 1.7;
  overflow: hidden;
  background: linear-gradient(135deg, #F7F2EF 0%, #ffffff 100%);
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
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  ${cardStyle}:hover & {
    transform: scale(1.05);
  }
`;

const magnifyingGlassButtonStyle = css`
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.15) rotate(5deg);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: scale(1.05) rotate(0deg);
  }
`;

const magnifyingGlassIconStyle = css`
  width: 18px;
  height: 18px;
  filter: brightness(0) saturate(100%) invert(26%) sepia(37%) saturate(1081%)
    hue-rotate(346deg) brightness(96%) contrast(88%);
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
  padding: 12px;
  gap: 8px;
`;

const profileImageContainerStyle = css`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #CFB59E;
  background: linear-gradient(135deg, #F7F2EF 0%, #ffffff 100%);
  margin-top: -32px;
  box-shadow: 0 4px 16px rgba(108, 77, 56, 0.2);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  ${cardStyle}:hover & {
    transform: scale(1.1);
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
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 4px 0;
  letter-spacing: -0.3px;
  font-size: 17px;
`;

// Preview Popup Styles
const popupOverlayStyle = (isClosing: boolean) => css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(8px);
  animation: ${isClosing ? 'fadeOutOverlay' : 'fadeInOverlay'} 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${isClosing ? 'none' : 'auto'};
  
  @keyframes fadeInOverlay {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(8px);
    }
  }
  
  @keyframes fadeOutOverlay {
    from {
      opacity: 1;
      backdrop-filter: blur(8px);
    }
    to {
      opacity: 0;
      backdrop-filter: blur(0px);
    }
  }
`;

const popupContainerStyle = (isClosing: boolean) => css`
  background: white;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  position: relative;
  animation: ${isClosing ? 'popupSlideOut' : 'popupSlideIn'} 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  @keyframes popupSlideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
      filter: blur(0);
    }
  }
  
  @keyframes popupSlideOut {
    from {
      opacity: 1;
      transform: scale(1) translateY(0);
      filter: blur(0);
    }
    to {
      opacity: 0;
      transform: scale(0.95) translateY(20px);
      filter: blur(4px);
    }
  }
`;

const closeButtonStyle = css`
  position: absolute !important;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  outline: none;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }

  &:focus,
  &:focus-visible {
    outline: none;
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #CFB59E;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
`;

const popupNameStyle = css`
  font-size: 20px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0;
`;

const popupIntroductionStyle = css`
  font-size: 14px;
  color: #6C4D38;
  line-height: 1.6;
  margin: 0 0 20px 0;
`;

const previewImagesLoadingStyle = css`
  text-align: center;
  padding: 48px 20px;
  color: #6C4D38;
  font-size: 18px;
  font-weight: 500;
  opacity: 0.85;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  &::before {
    content: '✨';
    font-size: 40px;
    opacity: 0.5;
  }
  padding: 40px 16px;
  font-size: 16px;
`;

/** 이미지 없음 - 세부사항 정보 탭 emptyStyle과 동일한 톤 */
const previewImagesEmptyStyle = css`
  text-align: center;
  padding: 80px 20px;
  color: #6C4D38;
  opacity: 0.6;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  &::before {
    content: '🖼️';
    font-size: 48px;
    opacity: 0.4;
  }
  padding: 60px 16px;
  font-size: 16px;
`;

/** 미리보기: 이미지 스크롤 + 인디케이터 한 컨테이너 (세부사항 정보 탭과 동일 디자인, 크기만 축소) */
const previewImagesSectionStyle = css`
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 8px;
  margin-bottom: 0;
`;

const previewImagesScrollContainerStyle = css`
  width: 100%;
  height: 280px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 10px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  position: relative;
  box-sizing: border-box;
  border-radius: 12px;
  display: flex;
  align-items: center;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const previewImagesContainerStyle = css`
  display: flex;
  gap: 0;
  height: 100%;
  align-items: center;
  min-height: 100%;
`;

const previewImageWrapperStyle = css`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  flex-shrink: 0;
  min-width: 100%;
  width: 100%;
  padding: 0 6px;
  box-sizing: border-box;

  &:first-of-type {
    padding-left: 8px;
  }

  &:last-child {
    padding-right: 8px;
  }
`;

const previewImageStyle = css`
  width: 100%;
  height: auto;
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  object-position: center;
  border-radius: 16px;
  background: linear-gradient(135deg, #F7F2EF 0%, #ffffff 100%);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin: 0 auto;
  display: block;
`;

const previewIndicatorsStyle = css`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px 0 0;
  margin: 0;
`;

const previewIndicatorDotStyle = (active: boolean) => css`
  width: ${active ? '14px' : '10px'};
  height: ${active ? '14px' : '10px'};
  border-radius: 50%;
  background: ${active
    ? 'linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%)'
    : '#CFB59E'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${active ? '0 2px 8px rgba(108, 77, 56, 0.3)' : 'none'};
  cursor: pointer;

  &:hover {
    transform: scale(1.2);
  }
`;

const viewProfileButtonStyle = css`
  width: 100%;
  margin-top: 12px;
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%) !important;
  border-color: transparent !important;
  box-shadow: 0 4px 16px rgba(108, 77, 56, 0.3) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #8B6F5A 0%, #6C4D38 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(108, 77, 56, 0.4) !important;
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
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

const applicationCardStyle = css`
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px dashed rgba(108, 77, 56, 0.3);
  position: relative;
  animation: cardFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;

  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: 0 8px 24px rgba(108, 77, 56, 0.15);
    border-color: rgba(108, 77, 56, 0.5);
    background: linear-gradient(135deg, #faf9f7 0%, #ffffff 100%);
  }

  &:active {
    transform: translateY(-2px) scale(1);
  }
`;

const applicationCardContentStyle = css`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
`;

const applicationIconStyle = css`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(108, 77, 56, 0.1) 0%, rgba(108, 77, 56, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  ${applicationCardStyle}:hover & {
    transform: scale(1.1) rotate(90deg);
    background: linear-gradient(135deg, rgba(108, 77, 56, 0.15) 0%, rgba(108, 77, 56, 0.08) 100%);
  }
`;

const applicationTextStyle = css`
  letter-spacing: -0.2px;
`;
