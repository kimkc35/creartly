import { css, keyframes } from '@emotion/react';

export const containerStyle = (isClosing: boolean) => css`
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #faf9f7 0%, #f5f3f0 50%, #ffffff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  animation: ${isClosing ? 'slideOutToLeft' : 'slideInFromLeft'} 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: ${isClosing ? 'none' : 'auto'};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(108, 77, 56, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(108, 77, 56, 0.03) 0%, transparent 50%);
    pointer-events: none;
  }

  @keyframes slideInFromLeft {
    from {
      transform: translateX(-100%) scale(0.98);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) scale(1);
      opacity: 1;
      filter: blur(0);
    }
  }

  @keyframes slideOutToLeft {
    from {
      transform: translateX(0) scale(1);
      opacity: 1;
      filter: blur(0);
    }
    to {
      transform: translateX(-100%) scale(0.98);
      opacity: 0;
      filter: blur(4px);
    }
  }
`;

export const contentStyle = css`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 28px 20px 0;
  max-width: 500px;
  width: 100%;
  text-align: center;
  position: relative;
  z-index: 1;
`;

/** 버튼만 하단으로 내리기 위한 패딩 컨테이너 */
export const bottomButtonContainerStyle = css`
  width: 100%;
  max-width: 500px;
  padding: 20px 20px 64px;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  z-index: 1;
`;

/** 와이어프레임 상단 아이콘 영역 (granite.config brand.icon) - 크게 표시 */
export const topIconStyle = css`
  width: 150px;
  height: 150px;
  object-fit: contain;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(108, 77, 56, 0.12);
  flex-shrink: 0;
`;

export const titleStyle = css`
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.3;
  margin: 0;
  white-space: pre-line;
  letter-spacing: -1px;
  font-size: 26px;
`;

/** 둥둥 떠다니는 애니메이션 (각 이미지별로 위상 차이) */
const floatKeyframes = keyframes`
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(0deg);
  }
  25% {
    transform: translateY(-12px) translateX(8px) rotate(2deg);
  }
  50% {
    transform: translateY(-6px) translateX(-6px) rotate(-1deg);
  }
  75% {
    transform: translateY(-16px) translateX(4px) rotate(1deg);
  }
`;

export const floatingImagesWrapperStyle = css`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
`;

export const floatingImageStyle = (index: number) => {
  const positions: Array<{ top: string; left?: string; right?: string }> = [
    { top: '14%', left: '8%' },
    { top: '52%', right: '6%' },
    { top: '24%', right: '10%' },
  ];
  const pos = positions[index % 3];
  const delay = index * 0.4;
  return css`
    position: absolute;
    width: 96px;
    height: 96px;
    object-fit: cover;
    border-radius: 18px;
    box-shadow: 0 6px 20px rgba(108, 77, 56, 0.2);
    top: ${pos.top};
    left: ${pos.left ?? 'auto'};
    right: ${pos.right ?? 'auto'};
    animation: ${floatKeyframes} ${4 + index * 0.5}s ease-in-out ${delay}s infinite;
    width: 72px;
    height: 72px;
    border-radius: 14px;
  `;
};

export const imageStyle = css`
  width: 180px;
  height: 180px;
  object-fit: contain;
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(108, 77, 56, 0.15);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  padding: 16px;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: scale(1.05) rotate(2deg);
  }
`;

export const descriptionStyle = css`
  font-size: 18px;
  color: #6C4D38;
  opacity: 0.85;
  line-height: 1.7;
  margin: 0;
  font-weight: 400;
`;

export const buttonStyle = css`
  width: 100%;
  max-width: 400px;
  padding: 20px;
  border-radius: 100px;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #6C4D38 0%, #8B6F5A 100%) !important;
  border: none !important;
  box-shadow: 0 4px 20px rgba(108, 77, 56, 0.3) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 24px rgba(108, 77, 56, 0.4) !important;
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

export const errorButtonStyle = css`
  width: 100%;
  max-width: 400px;
  padding: 20px;
  border-radius: 100px;
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%) !important;
  color: #c62828 !important;
  border: 2px solid #ffcdd2 !important;
  box-shadow: 0 4px 16px rgba(198, 40, 40, 0.2) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(198, 40, 40, 0.3) !important;
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    background: linear-gradient(135deg, #ef9a9a 0%, #e57373 100%) !important;
  }
`;

export const errorMessageStyle = css`
  color: #c62828;
  font-size: 14px;
  margin: 0 0 12px 0;
  text-align: center;
  line-height: 1.5;
  font-weight: 500;
  padding: 10px 12px;
  background: rgba(255, 235, 238, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(198, 40, 40, 0.2);
`;