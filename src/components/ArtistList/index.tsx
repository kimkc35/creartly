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
  userKey?: number | null;
  onChatStart?: (chatId: string) => void;
}

export function ArtistList({ onViewArtist, userKey, onChatStart }: ArtistListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [displayedViewMode, setDisplayedViewMode] = useState<ViewMode>('grid');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { artists, loading, error, refresh } = useArtists(50, userKey);

  // Pull to Refresh 상태
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const lastVelocityY = useRef(0); // 양수: 아래로, 음수: 위로
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Pull to Refresh 핸들러 (팝업이 열려있을 때 비활성화)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isPopupOpen) return; // 팝업이 열려있으면 비활성화
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      const y = e.touches[0].clientY;
      touchStartY.current = y;
      lastTouchY.current = y;
      lastTouchTime.current = Date.now();
      lastVelocityY.current = 0;
    }
  }, [isPopupOpen]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPopupOpen) return; // 팝업이 열려있으면 비활성화
    if (containerRef.current && containerRef.current.scrollTop === 0 && !refreshing) {
      const touchY = e.touches[0].clientY;
      const now = Date.now();
      const dt = now - lastTouchTime.current;
      if (dt > 0) {
        lastVelocityY.current = (touchY - lastTouchY.current) / dt; // px/ms
      }
      lastTouchY.current = touchY;
      lastTouchTime.current = now;

      const distance = touchY - touchStartY.current;

      if (distance > 0 && distance < 150) {
        setPullDistance(distance);
      }
    }
  }, [refreshing, isPopupOpen]);

  const handleTouchEnd = useCallback(async () => {
    if (isPopupOpen) return; // 팝업이 열려있으면 비활성화
    // 세게 위로 올린 플릭(음수 속도가 큼)이면 새로고침 트리거 안 함
    const isFlickUp = lastVelocityY.current < -0.3;
    if (pullDistance > 80 && !isFlickUp) {
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
    lastVelocityY.current = 0;
  }, [pullDistance, refresh, isPopupOpen]);

  if (loading) {
    return (
      <div css={containerStyle}>
        <div css={loadingStyle}>작가 목록을 불러오는 중이에요.</div>
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
              const nextMode = viewMode === 'grid' ? 'list' : 'grid';
              setIsTransitioning(true);
              setViewMode(nextMode);
              const TRANSITION_DURATION = 400;
              const SWAP_AT = 200;
              setTimeout(() => setDisplayedViewMode(nextMode), SWAP_AT);
              setTimeout(() => {
                setIsTransitioning(false);
              }, TRANSITION_DURATION);
            }}
            aria-label={viewMode === 'grid' ? '리스트 보기로 전환' : '그리드 보기로 전환'}
            type="button"
          >
            <span css={toggleSlidingPillStyle(viewMode === 'list')} aria-hidden />
            <div css={toggleSectionStyle}>
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
            <div css={toggleSectionStyle}>
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
          <div css={emptyStyle}>등록된 작가가 없어요.</div>
        ) : (
          <div css={viewContainerStyle}>
            <div css={fadeInStyle(isTransitioning)}>
              {displayedViewMode === 'list' ? (
                <ArtistListView
                  artists={artists}
                  onViewArtist={onViewArtist}
                  userKey={userKey}
                  onChatStart={onChatStart}
                />
              ) : (
                <ArtistGridView 
                  artists={artists} 
                  onPopupStateChange={setIsPopupOpen}
                  onViewProfile={onViewArtist ? (artistId: string) => {
                    const artist = artists.find(a => a.id === artistId);
                    if (artist) {
                      onViewArtist(artist);
                    }
                  } : undefined}
                  userKey={userKey}
                  onChatStart={onChatStart}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle = css`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #faf9f7 0%, #f5f3f0 50%, #ffffff 100%);
  position: relative;
  overflow: hidden;
`;

const scrollContainerStyle = (isPopupOpen: boolean) => css`
  width: 100%;
  min-height: 100vh;
  padding: 24px 20px;
  padding-bottom: 120px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: ${isPopupOpen ? 'hidden' : 'auto'};
  touch-action: ${isPopupOpen ? 'none' : 'auto'};
  animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes fadeInUp {
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

const viewContainerStyle = css`
  position: relative;
  min-height: 200px;
`;

const fadeInStyle = (isTransitioning: boolean) => css`
  animation: ${isTransitioning ? 'fadeScaleTransition 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'};
  opacity: ${isTransitioning ? 0 : 1};
  
  @keyframes fadeScaleTransition {
    0% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0;
      transform: scale(0.98);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const refreshIndicatorStyle = (distance: number, refreshing: boolean) => css`
  position: absolute;
  top: ${refreshing ? '16px' : `${Math.min(distance * 0.4, 50)}px`};
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(108, 77, 56, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
`;

const spinnerStyle = css`
  width: 20px;
  height: 20px;
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
  width: 20px;
  height: 20px;
  transform: rotate(${Math.min(distance * 2, 180)}deg);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  filter: brightness(0) saturate(100%) invert(26%) sepia(37%) saturate(1081%) hue-rotate(346deg) brightness(96%) contrast(88%);
`;

const headerStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  width: 100%;
  padding: 0 4px;
`;

const titleStyle = css`
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.5px;
  animation: fadeInLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

const toggleContainerStyle = css`
  position: relative;
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 28px;
  padding: 6px;
  border: 1px solid rgba(108, 77, 56, 0.1);
  gap: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  &:hover {
    box-shadow: 0 4px 16px rgba(108, 77, 56, 0.12);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &:focus {
    outline: none;
    box-shadow: 0 4px 16px rgba(108, 77, 56, 0.15);
  }

  &:focus-visible {
    outline: none;
  }
`;

const toggleSlidingPillStyle = (isList: boolean) => css`
  position: absolute;
  left: 6px;
  top: 6px;
  bottom: 6px;
  width: calc(50% - 6px);
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%);
  border-radius: 22px;
  box-shadow: 0 2px 8px rgba(108, 77, 56, 0.2);
  z-index: 0;
  transform: translateX(${isList ? '100%' : '0'});
  transition: transform 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
  pointer-events: none;
`;

const toggleSectionStyle = css`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 22px;
  background: transparent;
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 52px;
  height: 44px;
  flex: 1;
`;

const toggleIconStyle = css`
  width: 24px;
  height: 24px;
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const loadingStyle = css`
  text-align: center;
  padding: 80px 20px;
  color: #6C4D38;
  font-size: 18px;
  font-weight: 500;
  opacity: 0.7;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  
  &::before {
    content: '✨';
    font-size: 48px;
    opacity: 0.5;
  }
`;

const errorStyle = css`
  text-align: center;
  padding: 80px 20px;
  color: #e53935;
  font-size: 18px;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  
  &::before {
    content: '⚠️';
    font-size: 48px;
  }
`;

const emptyStyle = css`
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
    content: '🎨';
    font-size: 56px;
    opacity: 0.4;
  }
`;
