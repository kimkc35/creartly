/** @jsxImportSource @emotion/react */
import { css } from '@emotion/react';
import type { Artist } from '../../firebase/types';

interface ArtistListViewProps {
  artists: Artist[];
}

export function ArtistListView({ artists }: ArtistListViewProps) {
  return (
    <div css={containerStyle}>
      {artists.map((artist) => (
        <div key={artist.id} css={itemStyle}>
          <div css={thumbnailContainerStyle}>
            <img
              src={artist.thumbnailUrl}
              css={thumbnailStyle}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>

          <div css={contentStyle}>
            <div css={profileImageContainerStyle}>
              <img
                src={artist.profileImageUrl}
                css={profileImageStyle}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
            <div css={infoStyle}>
              <h3 css={nameStyle}>{artist.name}</h3>
              <p css={introductionStyle}>{artist.introduction}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const containerStyle = css`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const itemStyle = css`
  display: flex;
  gap: 16px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(108, 77, 56, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 77, 56, 0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

const thumbnailContainerStyle = css`
  width: 150px;
  height: 200px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #F7F2EF;

  @media (max-width: 768px) {
    width: 100px;
    height: 150px;
  }
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

const contentStyle = css`
  flex: 1;
  display: flex;
  gap: 16px;
  align-items: center;

  @media (max-width: 768px) {
    gap: 12px;
  }
`;

const profileImageContainerStyle = css`
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid #CFB59E;
  background: #F7F2EF;

  @media (max-width: 768px) {
    width: 48px;
    height: 48px;
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
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const nameStyle = css`
  font-size: 24px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

const introductionStyle = css`
  font-size: 16px;
  color: #6C4D38;
  opacity: 0.8;
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;

  @media (max-width: 768px) {
    font-size: 14px;
    -webkit-line-clamp: 2;
  }
`;
