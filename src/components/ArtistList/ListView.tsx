/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import { css } from '@emotion/react';
import { Asset, ListRow, Text } from '@toss/tds-mobile';
import type { Artist } from '../../firebase/types';
import { ArtistApplicationPopup } from './ArtistApplicationPopup';

interface ArtistListViewProps {
  artists: Artist[];
  onViewArtist?: (artist: Artist) => void;
  userKey?: number | null;
  onChatStart?: (chatId: string) => void;
}

export function ArtistListView({ artists, onViewArtist, userKey, onChatStart }: ArtistListViewProps) {
  const [showApplicationPopup, setShowApplicationPopup] = useState(false);
  const [isApplicationClosing, setIsApplicationClosing] = useState(false);

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

  return (
    <>
      <div css={containerStyle}>
        {artists.map((artist) => (
          <ListRow
            key={artist.id}
            border="indented"
            verticalPadding="medium"
            horizontalPadding="medium"
            withTouchEffect={true}
            onClick={() => onViewArtist?.(artist)}
            left={
              <div css={thumbnailContainerStyle}>
                <img
                  src={artist.thumbnailUrl}
                  css={thumbnailStyle}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            }
            contents={
              <div css={contentStyle}>
                <div css={headerRowStyle}>
                  <div css={profileImageContainerStyle}>
                    <img
                      src={artist.profileImageUrl}
                      css={profileImageStyle}
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>
                  <ListRow.Texts
                    type="1RowTypeA"
                    top={artist.name}
                  />
                </div>
                <ListRow.Texts
                  type="1RowTypeB"
                  top={artist.introduction}
                />
              </div>
            }
          />
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
        </div>
      </div>

      {showApplicationPopup && (
        <ArtistApplicationPopup
          userKey={userKey ?? null}
          onClose={handleApplicationClose}
          onSuccess={handleApplicationSuccess}
          isClosing={isApplicationClosing}
        />
      )}
    </>
  );
}

const containerStyle = css`
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeInList 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  
  @keyframes fadeInList {
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

const thumbnailContainerStyle = css`
  width: 100px;
  height: 150px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, #F7F2EF 0%, #ffffff 100%);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const thumbnailStyle = css`
  width: 100%;
  height: 100%;
  object-fit: cover;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: scale(1.05);
  }
`;

const contentStyle = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
`;

const headerRowStyle = css`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const profileImageContainerStyle = css`
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #CFB59E;
  background: linear-gradient(135deg, #F7F2EF 0%, #ffffff 100%);
  box-shadow: 0 2px 12px rgba(108, 77, 56, 0.15);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
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

const applicationCardStyle = css`
  background: white;
  border-radius: 16px;
  border: 2px dashed rgba(108, 77, 56, 0.3);
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(108, 77, 56, 0.12);
    border-color: rgba(108, 77, 56, 0.5);
    background: linear-gradient(135deg, #faf9f7 0%, #ffffff 100%);
  }

  &:active {
    transform: translateY(0);
  }
`;

const applicationCardContentStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
`;

const applicationIconStyle = css`
  width: 56px;
  height: 56px;
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

