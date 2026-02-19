/** @jsxImportSource @emotion/react */
import { useState, useRef, useEffect, createElement } from 'react';
import { createPortal } from 'react-dom';
import type { TouchEvent } from 'react';
import { css, keyframes } from '@emotion/react';
import { Asset, Rating as TDSRating } from '@toss/tds-mobile';
import { Analytics, graniteEvent } from '@apps-in-toss/web-framework';
import type { Artist, ArtistInformationItem } from '../../firebase/types';
import { getArtistInformation, getArtistReviewCount, updateArtist, addArtistInformation, updateArtistInformation, deleteArtistInformation, reorderArtistInformation } from '../../firebase/firestore';
import { uploadPortfolioImage } from '../../firebase/storage';
import { ReviewTab } from './ReviewTab';
import { RequestTab } from './RequestTab';
import { AlbumPhotoPicker } from '../AlbumPhotoPicker';
import { TextField, TextArea, Button, TextButton } from '@toss/tds-mobile';
import type { PendingImage } from '../../utils/albumPhotos';
type DetailTabType = 'info' | 'request' | 'review' | 'more';
type TransitionDirection = 'forward' | 'backward';

interface ArtistDetailProps {
  artist: Artist;
  userKey: number | null;
  onClose: () => void;
  onTabChange: (tab: DetailTabType) => void;
  activeTab: DetailTabType;
  tabDirection: TransitionDirection;
  isClosing: boolean;
  onChatStart?: (chatId: string) => void;
}

export function ArtistDetail({
  artist,
  userKey,
  onClose,
  onTabChange,
  activeTab,
  tabDirection,
  isClosing,
  onChatStart,
}: ArtistDetailProps) {
  const [informationItems, setInformationItems] = useState<ArtistInformationItem[]>([]);
  const [infoLoading, setInfoLoading] = useState(true);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sectionImageIndices, setSectionImageIndices] = useState<Record<string, number>>({});
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isLightboxClosing, setIsLightboxClosing] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxTranslate, setLightboxTranslate] = useState({ x: 0, y: 0 });
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false);
  const lightboxTouchRef = useRef({
    lastPinchDistance: 0,
    lastScale: 1,
    lastPanX: 0,
    lastPanY: 0,
  });
  const lightboxWrapRef = useRef<HTMLDivElement>(null);
  const lightboxImageRef = useRef<HTMLImageElement>(null);
  const savedScrollLeftRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number; target: EventTarget | null } | null>(null);
  
  const [isActive, setIsActive] = useState(artist.isActive ?? true);
  const [isToggling, setIsToggling] = useState(false);

  // 정보 편집 상태
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isReorderingInfo, setIsReorderingInfo] = useState(false);
  const [isSavingReorder, setIsSavingReorder] = useState(false);
  const [showAddInfoPopup, setShowAddInfoPopup] = useState(false);
  const [editingInfoItem, setEditingInfoItem] = useState<ArtistInformationItem | null>(null);
  const [newInfoTitle, setNewInfoTitle] = useState('');
  const [newInfoContext, setNewInfoContext] = useState('');
  const [newInfoImages, setNewInfoImages] = useState<{ url: string; uploading: boolean }[]>([]);
  const [showInfoAlbumPicker, setShowInfoAlbumPicker] = useState(false);

  // 현재 작가가 본인인지 확인
  const isOwner = artist.userKey != null && userKey != null && Number(artist.userKey) === Number(userKey);

  // 상세 화면 진입 로깅 (어떤 작가를 많이 보는지 분석용)
  useEffect(() => {
    Analytics.screen({
      log_name: 'artist_detail_screen',
      artist_id: artist.id,
      artist_name: artist.name,
    });
  }, [artist.id, artist.name]);

  // artist prop이 변경될 때 isActive 동기화 (필요한 경우)
  useEffect(() => {
    setIsActive(artist.isActive ?? true);
  }, [artist.isActive]);

  const handleToggleActive = async () => {
    if (isToggling) return;
    
    const nextActive = !isActive;
    setIsToggling(true);
    
    try {
      await updateArtist(artist.id, { isActive: nextActive });
      setIsActive(nextActive);
      
      // 사용자 피드백 (선택 사항)
      Analytics.click({
        log_name: 'artist_active_toggle',
        artist_id: artist.id,
        is_active: nextActive,
      });
    } catch (error) {
      console.error('상태 업데이트 실패:', error);
      // 에러 시 상태 복구는 하지 않음 (UI에서 이미 변경된 것으로 보이므로)
    } finally {
      setIsToggling(false);
    }
  };

  // 뒤로가기 이벤트 처리
  useEffect(() => {
    const unsubscription = graniteEvent.addEventListener('backEvent', {
      onEvent: () => {
        onClose();
      },
      onError: (error) => {
        console.error('뒤로가기 이벤트 에러:', error);
      },
    });

    const handlePageHide = () => {
      unsubscription();
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      unsubscription();
    };
  }, [onClose]);

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

  useEffect(() => {
    getArtistInformation(artist.id).then((items) => {
      setInformationItems(items);
      setInfoLoading(false);
    });
  }, [artist.id]);

  const handleInfoSectionScroll = (sectionId: string, imageCount: number) => {
    const el = scrollContainerRefs.current[sectionId];
    if (!el || imageCount === 0) return;
    const scrollLeft = el.scrollLeft;
    const width = el.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setSectionImageIndices((prev) => ({
      ...prev,
      [sectionId]: Math.min(index, imageCount - 1),
    }));
  };

  useEffect(() => {
    if (activeTab !== 'info') return;
    Object.keys(scrollContainerRefs.current).forEach((id) => {
      const el = scrollContainerRefs.current[id];
      if (el) el.scrollLeft = savedScrollLeftRef.current;
    });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'info') return;
    const firstKey = Object.keys(scrollContainerRefs.current)[0];
    const el = scrollContainerRefs.current[firstKey];
    if (el) savedScrollLeftRef.current = el.scrollLeft;
  }, [activeTab]);

  // 확대/축소 시 드래그 범위에 맞게 translate 클램프
  useEffect(() => {
    if (!lightboxImageUrl || !lightboxWrapRef.current || !lightboxImageRef.current) return;
    const wrap = lightboxWrapRef.current;
    const img = lightboxImageRef.current;
    if (img.naturalWidth === 0 || img.naturalHeight === 0) return;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const aspect = img.naturalWidth / img.naturalHeight;
    const fitW = aspect >= wrapW / wrapH ? wrapW : wrapH * aspect;
    const fitH = aspect >= wrapW / wrapH ? wrapW / aspect : wrapH;
    const scaledW = fitW * lightboxScale;
    const scaledH = fitH * lightboxScale;
    const marginX = Math.max(0, (scaledW - wrapW) / 2);
    const marginY = Math.max(0, (scaledH - wrapH) / 2);
    setLightboxTranslate((t) => ({
      x: Math.max(-marginX, Math.min(marginX, t.x)),
      y: Math.max(-marginY, Math.min(marginY, t.y)),
    }));
  }, [lightboxImageUrl, lightboxScale, lightboxImageLoaded]);

  useEffect(() => {
    if (activeTab !== 'info') return;
    const firstEl = Object.values(scrollContainerRefs.current).find(Boolean);
    if (!firstEl) return;

    const updateWidth = () => {
      const first = Object.values(scrollContainerRefs.current).find(Boolean);
      if (first) {
        const rect = first.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };

    const timeoutId = setTimeout(updateWidth, 0);
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(firstEl);
    window.addEventListener('resize', updateWidth);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [informationItems.length, activeTab]);

  const handleTabTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (isClosing) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      target: e.target,
    };
  };

  const handleTabTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (isReorderingInfo) return; // 순서 변경 중에는 스와이프 금지
    if (!touchStartRef.current || isClosing) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (
      activeTab === 'info' &&
      start.target instanceof Node &&
      Object.values(scrollContainerRefs.current).some(
        (el) => el && el.contains(start.target as Node)
      )
    ) {
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - start.x;
    const dy = endY - start.y;

    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2) {
      return;
    }

    const tabs: DetailTabType[] = ['info', 'request', 'review', 'more'];
    const currentIndex = tabs.indexOf(activeTab);
    if (dx < 0 && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1]);
    }
    if (dx > 0 && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1]);
    }
  };

  const handleAddInfoItem = async () => {
    if (!newInfoTitle.trim() && !newInfoContext.trim() && newInfoImages.length === 0) return;
    
    try {
      const imageUrls = newInfoImages.map(img => img.url);
      const nextRank = informationItems.length > 0 
        ? Math.max(...informationItems.map(i => i.rank)) + 1 
        : 1;

      if (editingInfoItem) {
        await updateArtistInformation(artist.id, editingInfoItem.id, {
          title: newInfoTitle,
          context: newInfoContext,
          images: imageUrls,
        });
      } else {
        await addArtistInformation(artist.id, {
          title: newInfoTitle,
          context: newInfoContext,
          images: imageUrls,
          rank: nextRank,
        });
      }

      // 목록 새로고침
      const updatedItems = await getArtistInformation(artist.id);
      setInformationItems(updatedItems);
      
      // 상태 초기화 및 팝업 닫기
      setShowAddInfoPopup(false);
      setEditingInfoItem(null);
      setNewInfoTitle('');
      setNewInfoContext('');
      setNewInfoImages([]);
    } catch (error) {
      console.error('정보 저장 실패:', error);
    }
  };

  const handleDeleteInfoItem = async (itemId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteArtistInformation(artist.id, itemId);
      setInformationItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('정보 삭제 실패:', error);
    }
  };

  const handleInfoImagePick = () => {
    setShowInfoAlbumPicker(true);
  };

  const handleInfoImagesSelected = async (pendingImages: PendingImage[]) => {
    setShowInfoAlbumPicker(false);
    
    // 업로드 중 표시를 위해 상태 추가
    const uploadItems = pendingImages.map(img => ({ url: '', uploading: true }));
    setNewInfoImages(prev => [...prev, ...uploadItems]);

    try {
      const uploadedUrls = await Promise.all(
        pendingImages.map(async (img) => {
          const result = await uploadPortfolioImage(artist.id, img.file);
          return result.url;
        })
      );

      setNewInfoImages(prev => {
        const filtered = prev.filter(img => !img.uploading);
        return [...filtered, ...uploadedUrls.map(url => ({ url, uploading: false }))];
      });
    } catch (error) {
      console.error('이미지 업로드 실패:', error);
      setNewInfoImages(prev => prev.filter(img => !img.uploading));
    }
  };

  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent | React.TouchEvent, index: number) => {
    if ('dataTransfer' in e) {
      e.dataTransfer.setData('index', index.toString());
    }
    setDragStartIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartIndex === null) return;
    
    // 터치 중인 요소 찾기
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropItem = target?.closest('[data-index]');
    
    if (dropItem) {
      const dropIndex = parseInt(dropItem.getAttribute('data-index') || '-1');
      if (dropIndex !== -1 && dropIndex !== dragStartIndex) {
        // 실시간으로 시각적 피드백을 주거나 순서를 변경할 수 있습니다.
        // 여기서는 부드러운 UI를 위해 드롭 시에만 변경하도록 유지합니다.
      }
    }
    // 스크롤 방지
    if (e.cancelable) e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent, currentIndex: number) => {
    if (dragStartIndex !== null) {
      const touch = e.changedTouches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const dropItem = target?.closest('[data-index]');
      
      if (dropItem) {
        const dropIndex = parseInt(dropItem.getAttribute('data-index') || '-1');
        if (dropIndex !== -1 && dropIndex !== dragStartIndex) {
          performReorder(dragStartIndex, dropIndex);
        }
      }
    }
    setDragStartIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    const dragIndex = parseInt(e.dataTransfer.getData('index'));
    if (isNaN(dragIndex) || dragIndex === dropIndex) return;
    performReorder(dragIndex, dropIndex);
  };

  const performReorder = async (dragIndex: number, dropIndex: number) => {
    const newItems = [...informationItems];
    const [movedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, movedItem);

    // rank 재할당
    const updatedWithRank = newItems.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    setInformationItems(updatedWithRank);
    setIsSavingReorder(true);
    
    try {
      await reorderArtistInformation(artist.id, updatedWithRank.map(i => ({ id: i.id, rank: i.rank })));
    } catch (error) {
      console.error('순서 저장 실패:', error);
    } finally {
      setIsSavingReorder(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <>
            {isOwner && (
              <div css={ownerEditActionsStyle}>
                <TextButton 
                  size="small" 
                  onClick={() => {
                    setEditingInfoItem(null);
                    setNewInfoTitle('');
                    setNewInfoContext('');
                    setNewInfoImages([]);
                    setShowAddInfoPopup(true);
                  }}
                >
                  항목 추가
                </TextButton>
                <TextButton 
                  size="small" 
                  onClick={() => setIsReorderingInfo(!isReorderingInfo)}
                >
                  {isReorderingInfo ? '완료' : '순서 변경'}
                </TextButton>
              </div>
            )}
            {infoLoading ? (
              <div css={loadingStyle}>정보를 불러오는 중이에요.</div>
            ) : informationItems.length === 0 ? (
              <div css={emptyStyle}>등록된 정보가 없어요.</div>
            ) : isReorderingInfo ? (
              <div css={infoSectionsWrapperStyle}>
                {informationItems.map((item, index) => (
                  <div
                    key={item.id}
                    css={reorderItemStyle}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, index)}
                    onTouchStart={(e) => handleDragStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={(e) => handleTouchEnd(e, index)}
                    data-index={index}
                  >
                    <span css={reorderTitleStyle}>{item.title || '제목 없음'}</span>
                    <Asset.Icon
                      frameShape={Asset.frameShape.CleanW24}
                      name="icon-hamburger-mono"
                      size={20}
                      color="#CCCCCC"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div css={infoSectionsWrapperStyle}>
                {informationItems.map((item) => (
                  <section key={item.id} css={infoSectionStyle}>
                    <div css={infoSectionHeaderStyle}>
                      {item.title && (
                        <h3 css={infoTitleStyle}>{item.title}</h3>
                      )}
                      {isOwner && (
                        <div css={itemEditActionsStyle}>
                          <button onClick={() => {
                            setEditingInfoItem(item);
                            setNewInfoTitle(item.title);
                            setNewInfoContext(item.context);
                            setNewInfoImages(item.images.map(url => ({ url, uploading: false })));
                            setShowAddInfoPopup(true);
                          }}>수정</button>
                          <button onClick={() => handleDeleteInfoItem(item.id)}>삭제</button>
                        </div>
                      )}
                    </div>
                    {item.context && (
                      <p css={infoContextStyle}>{item.context}</p>
                    )}
                    {item.images && item.images.length > 0 ? (
                      <div css={previewImagesSectionStyle}>
                        <div
                          css={previewImagesScrollContainerStyle}
                          ref={(el: HTMLDivElement | null) => {
                            scrollContainerRefs.current[item.id] = el;
                          }}
                          onScroll={() =>
                            handleInfoSectionScroll(item.id, item.images.length)
                          }
                        >
                          <div css={previewImagesContainerStyle}>
                            {item.images.map((url, index) => (
                              <div
                                key={index}
                                css={previewImageWrapperStyle}
                                style={
                                  containerWidth > 0
                                    ? {
                                        width: `${containerWidth}px`,
                                        minWidth: `${containerWidth}px`,
                                        maxWidth: `${containerWidth}px`,
                                      }
                                    : undefined
                                }
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                  setLightboxImageLoaded(false);
                                  setLightboxImageUrl(url);
                                  setIsLightboxClosing(false);
                                  setLightboxScale(1);
                                  setLightboxTranslate({ x: 0, y: 0 });
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && (setLightboxImageLoaded(false), setLightboxImageUrl(url), setIsLightboxClosing(false), setLightboxScale(1), setLightboxTranslate({ x: 0, y: 0 }))}
                                aria-label="원본 이미지 보기"
                              >
                                <img
                                  src={url}
                                  alt={`${item.title || '정보'} ${index + 1}`}
                                  css={previewImageStyle}
                                  draggable={false}
                                  onContextMenu={(e: React.MouseEvent<HTMLImageElement>) => e.preventDefault()}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div css={previewIndicatorsStyle}>
                          {item.images.map((_, index) => (
                            <span
                              key={index}
                              css={previewIndicatorDotStyle(
                                index === (sectionImageIndices[item.id] ?? 0)
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                ))}
              </div>
            )}
          </>
        );
      case 'request':
        return (
          <RequestTab
            artistId={artist.id}
            userKey={userKey}
            onChatStart={(chatId) => {
              onClose();
              onChatStart?.(chatId);
            }}
          />
        );
      case 'review':
        return <ReviewTab artistId={artist.id} userKey={userKey} />;
      case 'more':
        return (
          <div css={moreTabWrapperStyle}>
            {isOwner ? (
              <div css={ownerToggleWrapperStyle}>
                <h3 css={moreSectionTitleStyle}>작가 활동 설정</h3>
                <button
                  css={toggleContainerStyle}
                  onClick={handleToggleActive}
                  aria-label={isActive ? '작가 활동 비활성화' : '작가 활동 활성화'}
                  type="button"
                >
                  <span css={toggleSlidingPillStyle(!isActive)} aria-hidden />
                  <div css={toggleSectionStyle}>
                    <span css={toggleTextStyle(isActive)}>활동 중</span>
                  </div>
                  <div css={toggleSectionStyle}>
                    <span css={toggleTextStyle(!isActive)}>휴식 중</span>
                  </div>
                </button>
                <p css={toggleHintStyle}>
                  {isActive ? '현재 작가 목록에 노출되고 있어요.' : '현재 작가 목록에서 보이지 않아요.'}
                </p>
              </div>
            ) : (
              <div css={emptyStyle}>사용 가능한 메뉴가 없어요.</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div css={containerStyle(isClosing)}>
      {/* 정보 추가 팝업 */}
      {showAddInfoPopup && createPortal(
        <div css={modalOverlayStyle}>
          <div css={modalContentStyle}>
            <h3 css={modalTitleStyle}>{editingInfoItem ? '정보 수정' : '정보 추가'}</h3>
            <div css={modalFormStyle}>
              <TextField
                label="제목"
                placeholder="제목을 입력하세요"
                value={newInfoTitle}
                onChange={(e) => setNewInfoTitle(e.target.value)}
              />
              <TextArea
                label="내용"
                placeholder="내용을 입력하세요"
                value={newInfoContext}
                onChange={(e) => setNewInfoContext(e.target.value)}
                minHeight={120}
              />
              <div css={modalImageSectionStyle}>
                <div css={modalSectionHeaderStyle}>
                  <span>이미지 ({newInfoImages.length})</span>
                  <TextButton size="small" onClick={handleInfoImagePick}>추가</TextButton>
                </div>
                <div css={modalImageListStyle}>
                  {newInfoImages.map((img, idx) => (
                    <div key={idx} css={modalImageItemStyle}>
                      <img src={img.url} alt="preview" />
                      {img.uploading && <div css={uploadingOverlayStyle}>...</div>}
                      <button 
                        css={imageDeleteButtonStyle}
                        onClick={() => setNewInfoImages(prev => prev.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div css={modalActionsStyle}>
              <Button size="medium" variant="secondary" onClick={() => setShowAddInfoPopup(false)}>취소</Button>
              <Button size="medium" onClick={handleAddInfoItem}>저장</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showInfoAlbumPicker && (
        <AlbumPhotoPicker
          onClose={() => setShowInfoAlbumPicker(false)}
          onSelect={handleInfoImagesSelected}
          maxSelect={10}
        />
      )}
      {lightboxImageUrl &&
        createPortal(
          <div
            css={lightboxOverlayStyle(isLightboxClosing)}
            onClick={() => {
              if (isLightboxClosing) return;
              setIsLightboxClosing(true);
              window.setTimeout(() => {
                setLightboxImageUrl(null);
                setIsLightboxClosing(false);
                setLightboxScale(1);
                setLightboxTranslate({ x: 0, y: 0 });
                setLightboxImageLoaded(false);
              }, 350);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="이미지 원본 보기"
          >
            <button
              type="button"
              css={lightboxCloseButtonStyle}
              onClick={(e) => {
                e.stopPropagation();
                if (isLightboxClosing) return;
                setIsLightboxClosing(true);
                window.setTimeout(() => {
                  setLightboxImageUrl(null);
                  setIsLightboxClosing(false);
                  setLightboxScale(1);
                  setLightboxTranslate({ x: 0, y: 0 });
                  setLightboxImageLoaded(false);
                }, 350);
              }}
              aria-label="닫기"
            >
              <Asset.Icon
                frameShape={Asset.frameShape.CleanW20}
                name="icon-appsintoss-close-mono"
                color="#ffffff"
                aria-hidden={true}
              />
            </button>
            <div
              ref={lightboxWrapRef}
              css={lightboxImageWrapStyle(isLightboxClosing)}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                const touches = e.touches;
                if (touches.length === 2) {
                  const d = Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
                  lightboxTouchRef.current.lastPinchDistance = d;
                  lightboxTouchRef.current.lastScale = lightboxScale;
                } else if (touches.length === 1) {
                  lightboxTouchRef.current.lastPanX = touches[0].clientX;
                  lightboxTouchRef.current.lastPanY = touches[0].clientY;
                }
              }}
              onTouchMove={(e) => {
                const touches = e.touches;
                if (touches.length === 2) {
                  e.preventDefault();
                  const d = Math.hypot(touches[1].clientX - touches[0].clientX, touches[1].clientY - touches[0].clientY);
                  const { lastPinchDistance, lastScale } = lightboxTouchRef.current;
                  if (lastPinchDistance > 0) {
                    const next = Math.min(3, Math.max(0.5, lastScale * (d / lastPinchDistance)));
                    setLightboxScale(next);
                    lightboxTouchRef.current.lastPinchDistance = d;
                    lightboxTouchRef.current.lastScale = next;
                  }
                } else if (touches.length === 1 && lightboxScale > 1) {
                  e.preventDefault();
                  const dx = touches[0].clientX - lightboxTouchRef.current.lastPanX;
                  const dy = touches[0].clientY - lightboxTouchRef.current.lastPanY;
                  lightboxTouchRef.current.lastPanX = touches[0].clientX;
                  lightboxTouchRef.current.lastPanY = touches[0].clientY;
                  const wrap = lightboxWrapRef.current;
                  const img = lightboxImageRef.current;
                  setLightboxTranslate((t) => {
                    let nextX = t.x + dx;
                    let nextY = t.y + dy;
                    if (wrap && img && img.naturalWidth > 0 && img.naturalHeight > 0) {
                      const wrapW = wrap.clientWidth;
                      const wrapH = wrap.clientHeight;
                      const aspect = img.naturalWidth / img.naturalHeight;
                      const fitW = aspect >= wrapW / wrapH ? wrapW : wrapH * aspect;
                      const fitH = aspect >= wrapW / wrapH ? wrapW / aspect : wrapH;
                      const scaledW = fitW * lightboxScale;
                      const scaledH = fitH * lightboxScale;
                      const marginX = Math.max(0, (scaledW - wrapW) / 2);
                      const marginY = Math.max(0, (scaledH - wrapH) / 2);
                      nextX = Math.max(-marginX, Math.min(marginX, nextX));
                      nextY = Math.max(-marginY, Math.min(marginY, nextY));
                    }
                    return { x: nextX, y: nextY };
                  });
                }
              }}
              onTouchEnd={(e) => {
                const touches = e.touches;
                if (touches.length === 2) {
                  lightboxTouchRef.current.lastPinchDistance = Math.hypot(
                    touches[1].clientX - touches[0].clientX,
                    touches[1].clientY - touches[0].clientY
                  );
                  lightboxTouchRef.current.lastScale = lightboxScale;
                } else if (touches.length === 1) {
                  lightboxTouchRef.current.lastPanX = touches[0].clientX;
                  lightboxTouchRef.current.lastPanY = touches[0].clientY;
                }
              }}
            >
              <img
                ref={lightboxImageRef}
                src={lightboxImageUrl}
                alt="원본"
                css={lightboxImageStyle(lightboxScale, lightboxTranslate)}
                draggable={false}
                onLoad={() => setLightboxImageLoaded(true)}
              />
            </div>
          </div>,
          document.body
        )}
      <div css={contentStyle}>
        <div css={profileSectionStyle}>
          <div css={leftProfileSideStyle}>
            <img
              src={artist.profileImageUrl}
              alt={artist.name}
              css={profileImageStyle}
              draggable={false}
              onContextMenu={(e: React.MouseEvent<HTMLImageElement>) => e.preventDefault()}
            />
          </div>
          <div css={profileInfoStyle}>
            <h2 css={nameStyle}>{artist.name}</h2>
            <p css={introductionStyle}>{artist.introduction}</p>
            <div css={ratingWrapperStyle} role="img" aria-label="별점">
              {createElement(TDSRating, {
                readOnly: true,
                value: getAverageRating(),
                max: 5,
                size: 'large',
                variant: 'iconOnly',
              })}
            </div>
          </div>
        </div>

        <div
          key={activeTab}
          css={tabContentStyle(tabDirection)}
          onTouchStart={handleTabTouchStart}
          onTouchEnd={handleTabTouchEnd}
        >
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

const containerStyle = (isClosing: boolean) => css`
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #faf9f7 0%, #f5f3f0 50%, #ffffff 100%);
  padding: 24px 20px;
  padding-top: 40px;
  padding-bottom: 120px;
  animation: ${isClosing ? 'slideOutToRight' : 'slideInFromRight'} 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${isClosing ? 'none' : 'auto'};

  @keyframes slideInFromRight {
    from {
      transform: translateX(100%) scale(0.98);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) scale(1);
      opacity: 1;
      filter: blur(0);
    }
  }

  @keyframes slideOutToRight {
    from {
      transform: translateX(0) scale(1);
      opacity: 1;
      filter: blur(0);
    }
    to {
      transform: translateX(100%) scale(0.98);
      opacity: 0;
      filter: blur(4px);
    }
  }
`;

const contentStyle = css`
  width: 100%;
  margin: 0 auto;
  animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
  
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

const profileSectionStyle = css`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 36px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(108, 77, 56, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 4px 24px rgba(108, 77, 56, 0.1);
    transform: translateY(-2px);
  }
`;

const leftProfileSideStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const profileImageStyle = css`
  width: 128px;
  height: 128px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #CFB59E;
  background: linear-gradient(135deg, #F7F2EF 0%, #ffffff 100%);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(108, 77, 56, 0.15);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: scale(1.05);
  }
`;

const profileInfoStyle = css`
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
  padding-top: 8px;
`;

const nameStyle = css`
  font-size: 36px;
  font-weight: 800;
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.5px;
`;

const introductionStyle = css`
  font-size: 17px;
  color: #6C4D38;
  line-height: 1.7;
  margin: 0;
  opacity: 0.9;
  font-weight: 400;
`;

const ratingWrapperStyle = css`
  /* Rating 컴포넌트의 숫자 텍스트 숨기기 */
  [class*="Rating"] {
    span:not([class*="Star"]) {
      display: none !important;
    }
  }
  
  /* 숫자 텍스트가 있는 경우 숨기기 */
  > * > span:last-child {
    display: none;
  }
`;

/** 이미지 스크롤 + 인디케이터를 한 컨테이너로 묶음 */
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
  height: 320px;
  overflow-x: auto;
  overflow-y: hidden;
  margin-bottom: 36px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-snap-type: x mandatory;
  position: relative;
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
  justify-content: flex-start;
  min-height: 100%;
`;

const previewImageWrapperStyle = css`
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  scroll-snap-align: center;
  flex-shrink: 0;
  padding: 0 6px;
  box-sizing: border-box;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 100%;
  cursor: pointer;

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
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 auto;
  display: block;
  
  &:hover {
    transform: scale(1.02);
  }
`;

const ownerToggleWrapperStyle = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
`;

const toggleContainerStyle = css`
  position: relative;
  display: flex;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 28px;
  padding: 4px;
  border: 1px solid rgba(108, 77, 56, 0.1);
  gap: 0;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  width: fit-content;

  &:hover {
    box-shadow: 0 4px 16px rgba(108, 77, 56, 0.12);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &:focus {
    outline: none;
  }
`;

const toggleSlidingPillStyle = (isRight: boolean) => css`
  position: absolute;
  left: 4px;
  top: 4px;
  bottom: 4px;
  width: calc(50% - 4px);
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%);
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(108, 77, 56, 0.2);
  z-index: 0;
  transform: translateX(${isRight ? '100%' : '0'});
  transition: transform 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
  pointer-events: none;
`;

const toggleSectionStyle = css`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 24px;
  background: transparent;
  min-width: 80px;
  height: 36px;
  flex: 1;
`;

const toggleTextStyle = (active: boolean) => css`
  font-size: 14px;
  font-weight: 600;
  color: ${active ? '#ffffff' : '#8E6F5A'};
  transition: color 0.3s ease;
`;

const toggleHintStyle = css`
  font-size: 13px;
  color: #8E6F5A;
  margin: 0;
  opacity: 0.8;
  text-align: left;
`;

const previewIndicatorsStyle = css`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 0;
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

const infoSectionsWrapperStyle = css`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const infoSectionStyle = css`
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(108, 77, 56, 0.08);
`;

const infoTitleStyle = css`
  font-size: 20px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0;
  letter-spacing: -0.3px;
`;

const infoSectionHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ownerEditActionsStyle = css`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 16px;
  padding: 0 20px;
`;

const itemEditActionsStyle = css`
  display: flex;
  gap: 8px;

  button {
    border: none;
    background: none;
    font-size: 13px;
    color: #6C4D38;
    opacity: 0.5;
    cursor: pointer;
    padding: 4px;

    &:hover {
      opacity: 1;
    }
  }
`;

const reorderItemStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #EEE;
  cursor: grab;
  touch-action: none;

  &:active {
    cursor: grabbing;
    background: #F9F9F9;
  }
`;

const reorderTitleStyle = css`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const modalOverlayStyle = css`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
`;

const modalContentStyle = css`
  background: white;
  width: 100%;
  max-width: 480px;
  border-radius: 24px;
  padding: 24px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
`;

const modalTitleStyle = css`
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px 0;
  text-align: center;
`;

const modalFormStyle = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-bottom: 20px;
`;

const modalImageSectionStyle = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const modalSectionHeaderStyle = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
`;

const modalImageListStyle = css`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
`;

const modalImageItemStyle = css`
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
`;

const imageDeleteButtonStyle = css`
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #333;
  color: white;
  border: none;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const uploadingOverlayStyle = css`
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-radius: 8px;
`;

const modalActionsStyle = css`
  display: flex;
  gap: 12px;
  margin-top: 24px;

  button {
    flex: 1;
  }
`;

const infoContextStyle = css`
  font-size: 16px;
  color: #6C4D38;
  line-height: 1.65;
  margin: 0 0 20px 0;
  opacity: 0.9;

  &:last-child {
    margin-bottom: 0;
  }
`;

const lightboxOverlayOpen = keyframes`
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
`;

const lightboxOverlayClose = keyframes`
  from {
    opacity: 1;
    backdrop-filter: blur(8px);
  }
  to {
    opacity: 0;
    backdrop-filter: blur(0);
  }
`;

const lightboxImageOpen = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const lightboxImageClose = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
`;

const lightboxOverlayStyle = (isClosing: boolean) => css`
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 80px;
  box-sizing: border-box;
  pointer-events: ${isClosing ? 'none' : 'auto'};
  animation: ${isClosing ? lightboxOverlayClose : lightboxOverlayOpen} 0.35s cubic-bezier(0.4, 0, 0.2, 1) ${isClosing ? 'forwards' : 'both'};
`;

const lightboxCloseButtonStyle = css`
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.2s;
  outline: none;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }

  &:focus,
  &:focus-visible {
    outline: none;
  }
`;

const lightboxImageWrapStyle = (isClosing: boolean) => css`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  animation: ${isClosing ? lightboxImageClose : lightboxImageOpen} 0.35s cubic-bezier(0.4, 0, 0.2, 1) ${isClosing ? 'forwards' : 'both'};
`;

const lightboxImageStyle = (scale: number, translate: { x: number; y: number }) => css`
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  user-select: none;
  -webkit-user-drag: none;
  touch-action: none;
  transform: translate(${translate.x}px, ${translate.y}px) scale(${scale});
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
    content: '🖼️';
    font-size: 56px;
    opacity: 0.4;
  }
`;

const tabContentStyle = (direction: TransitionDirection) => css`
  margin-top: 24px;
  animation: ${direction === 'forward' ? 'fadeSlideInRight' : 'fadeSlideInLeft'} 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  @keyframes fadeSlideInRight {
    from {
      opacity: 0;
      transform: translateX(20px) scale(0.98);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
      filter: blur(0);
    }
  }

  @keyframes fadeSlideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px) scale(0.98);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
      filter: blur(0);
    }
  }
`;

const moreTabWrapperStyle = css`
  padding: 0 4px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const moreSectionTitleStyle = css`
  font-size: 18px;
  font-weight: 700;
  color: #333d4b;
  margin-bottom: 12px;
`;

