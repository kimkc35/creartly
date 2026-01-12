/** @jsxImportSource @emotion/react */
import { useState, useRef, useCallback } from 'react';
import { css } from '@emotion/react';
import { useArtists } from '../../hooks/useArtistPortfolio';
import { ArtistListView } from './ListView';
import { ArtistGridView } from './GridView';
import type { Artist } from '../../firebase/types';

type ViewMode = 'list' | 'grid';

interface ArtistListProps {
  onViewArtist?: (artist: Artist) => void;
}

export function ArtistList({ onViewArtist }: ArtistListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { artists, loading, error, refresh } = useArtists(50);

  // Pull to Refresh 상태
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Pull to Refresh 핸들러 (팝업이 열려있을 때 비활성화)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isPopupOpen) return; // 팝업이 열려있으면 비활성화
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, [isPopupOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPopupOpen) return; // 팝업이 열려있으면 비활성화
    if (containerRef.current && containerRef.current.scrollTop === 0 && !refreshing) {
      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      if (distance > 0 && distance < 150) {
        setPullDistance(distance);
      }
    }
  }, [refreshing, isPopupOpen]);

  const handleTouchEnd = useCallback(async () => {
    if (isPopupOpen) return; // 팝업이 열려있으면 비활성화
    if (pullDistance > 80) {
      setRefreshing(true);
      setPullDistance(0);

      try {
        await refresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    touchStartY.current = 0;
  }, [pullDistance, refresh, isPopupOpen]);

  if (loading) {
    return (
      <div css={containerStyle}>
        <div css={loadingStyle}>작가 목록을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div css={containerStyle}>
        <div css={errorStyle}>{error}</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      css={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh 인디케이터 */}
      {(pullDistance > 0 || refreshing) && (
        <div css={refreshIndicatorStyle(pullDistance, refreshing)}>
          {refreshing ? (
            <img
              src="https://static.toss.im/icons/svg/icon-refresh-mono.svg"
              alt="Refreshing"
              css={spinnerStyle}
            />
          ) : (
            <img
              src="https://static.toss.im/icons/svg/icon-arrow-down-mono.svg"
              alt="Pull to refresh"
              css={pullIconStyle(pullDistance)}
            />
          )}
        </div>
      )}

      <div
        ref={containerRef}
        css={scrollContainerStyle(isPopupOpen)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateY(${Math.min(pullDistance * 0.5, 40)}px)` }}
      >
        <div css={headerStyle}>
          <h1 css={titleStyle}>작가 찾기</h1>
          <button
            css={toggleContainerStyle}
            onClick={() => {
              setIsTransitioning(true);
              setTimeout(() => {
                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                setTimeout(() => setIsTransitioning(false), 50);
              }, 200);
            }}
            aria-label={viewMode === 'grid' ? '리스트 보기로 전환' : '그리드 보기로 전환'}
            type="button"
          >
            <div css={toggleSectionStyle(viewMode === 'grid')}>
              <img
                src="https://static.toss.im/icons/svg/icon-gridview-color.svg"
                alt="그리드"
                css={toggleIconStyle}
                style={{ 
                  filter: viewMode === 'grid' 
                    ? 'brightness(0) saturate(100%) invert(100%)' 
                    : 'brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(90%)'
                }}
              />
            </div>
            <div css={toggleSectionStyle(viewMode === 'list')}>
              <img
                src="https://static.toss.im/icons/svg/icon-line-three-dots-mono.svg"
                alt="리스트"
                css={toggleIconStyle}
                style={{ 
                  filter: viewMode === 'list' 
                    ? 'brightness(0) saturate(100%) invert(100%)' 
                    : 'brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(90%)'
                }}
              />
            </div>
          </button>
        </div>

        {artists.length === 0 ? (
          <div css={emptyStyle}>등록된 작가가 없습니다.</div>
        ) : (
          <div css={viewContainerStyle}>
            {viewMode === 'list' ? (
              <div css={fadeInStyle(isTransitioning)}>
          <ArtistListView artists={artists} />
              </div>
            ) : (
              <div css={fadeInStyle(isTransitioning)}>
                <ArtistGridView 
                  artists={artists} 
                  onPopupStateChange={setIsPopupOpen}
                  onViewProfile={onViewArtist ? (artistId: string) => {
                    const artist = artists.find(a => a.id === artistId);
                    if (artist) {
                      onViewArtist(artist);
                    }
                  } : undefined}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle = css`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #F7F2EF 0%, #ECF5FF 50%, #D7EAFF 100%);
  position: relative;
  overflow: hidden;
`;

const scrollContainerStyle = (isPopupOpen: boolean) => css`
  width: 100%;
  min-height: 100vh;
  padding: 20px;
  transition: transform 0.2s ease-out;
  overflow: ${isPopupOpen ? 'hidden' : 'auto'};
  touch-action: ${isPopupOpen ? 'none' : 'auto'};
`;

const viewContainerStyle = css`
  position: relative;
  min-height: 200px;
`;

const fadeInStyle = (isTransitioning: boolean) => css`
  animation: ${isTransitioning ? 'fadeOutIn 0.4s ease-in-out' : 'none'};
  opacity: ${isTransitioning ? 0 : 1};
  
  @keyframes fadeOutIn {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
`;

const refreshIndicatorStyle = (distance: number, refreshing: boolean) => css`
  position: absolute;
  top: ${refreshing ? '20px' : Math.max(-40, -40 + distance * 0.5)}px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  opacity: ${refreshing ? 1 : Math.min(distance / 80, 1)};
  transition: ${refreshing ? 'top 0.3s ease, opacity 0.3s ease' : 'none'};
`;

const spinnerStyle = css`
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  filter: brightness(0) saturate(100%) invert(26%) sepia(37%) saturate(1081%) hue-rotate(346deg) brightness(96%) contrast(88%);

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const pullIconStyle = (distance: number) => css`
  width: 24px;
  height: 24px;
  transform: rotate(${Math.min(distance * 2, 180)}deg);
  transition: transform 0.1s ease-out;
  filter: brightness(0) saturate(100%) invert(26%) sepia(37%) saturate(1081%) hue-rotate(346deg) brightness(96%) contrast(88%);
`;

const headerStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const titleStyle = css`
  font-size: 28px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0;
`;

const toggleContainerStyle = css`
  display: flex;
  background: white;
  border-radius: 24px;
  padding: 4px;
  border: 1px solid #E0E0E0;
  gap: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus {
    outline: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: none;
  }
`;

const toggleSectionStyle = (active: boolean) => css`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 20px;
  background: ${active ? '#6C4D38' : 'transparent'};
  transition: all 0.2s ease;
  min-width: 48px;
  height: 40px;
  flex: 1;
`;

const toggleIconStyle = css`
  width: 24px;
  height: 24px;
  pointer-events: none;
`;

const loadingStyle = css`
  text-align: center;
  padding: 60px 20px;
  color: #6C4D38;
  font-size: 18px;
`;

const errorStyle = css`
  text-align: center;
  padding: 60px 20px;
  color: #c00;
  font-size: 18px;
`;

const emptyStyle = css`
  text-align: center;
  padding: 60px 20px;
  color: #6C4D38;
  opacity: 0.6;
  font-size: 18px;
`;
