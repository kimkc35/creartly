/** @jsxImportSource @emotion/react */
import { useEffect, useState } from 'react';
import { css, keyframes } from '@emotion/react';
import type { ReactNode } from 'react';

interface RallyProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
`;

export function Rally({ children, delay = 0, duration = 0.7 }: RallyProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 컴포넌트가 마운트되면 애니메이션 시작
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [delay]);

  const animationStyle = css`
    opacity: ${isVisible ? 1 : 0};
    transform: translateY(${isVisible ? 0 : '30px'}) scale(${isVisible ? 1 : 0.95});
    filter: ${isVisible ? 'blur(0)' : 'blur(4px)'};
    animation: ${isVisible ? fadeInUp : 'none'} ${duration}s cubic-bezier(0.4, 0, 0.2, 1);
    animation-fill-mode: both;
  `;

  return <div css={animationStyle}>{children}</div>;
}
