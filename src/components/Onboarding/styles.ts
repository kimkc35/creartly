import { css } from '@emotion/react';

export const containerStyle = css`
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #F7F2EF 0%, #ECF5FF 50%, #D7EAFF 100%);
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const contentStyle = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 40px 24px;
  max-width: 500px;
  width: 100%;
  text-align: center;

  @media (max-width: 768px) {
    padding: 40px 20px;
    gap: 32px;
  }
`;

export const titleStyle = css`
  font-size: 48px;
  font-weight: 700;
  color: #6C4D38;
  line-height: 1.3;
  margin: 0;
  white-space: pre-line;

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

export const imageStyle = css`
  width: 200px;
  height: 200px;
  object-fit: contain;
  border-radius: 24px;

  @media (max-width: 768px) {
    width: 160px;
    height: 160px;
  }
`;

export const descriptionStyle = css`
  font-size: 20px;
  color: #6C4D38;
  opacity: 0.85;
  line-height: 1.6;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 18px;
  }
`;

export const buttonStyle = css`
  width: 100%;
  max-width: 400px;
  padding: 18px;
  border-radius: 100px;
  font-size: 17px;
  font-weight: 600;
`;

export const errorButtonStyle = css`
  width: 100%;
  max-width: 400px;
  padding: 18px;
  border-radius: 100px;
  font-size: 17px;
  font-weight: 600;
  background-color: #ffebee !important;
  color: #c62828 !important;
  border: 1px solid #ffcdd2 !important;

  &:hover:not(:disabled) {
    background-color: #ffcdd2 !important;
  }

  &:active:not(:disabled) {
    background-color: #ef9a9a !important;
  }
`;

export const errorMessageStyle = css`
  color: #c62828;
  font-size: 14px;
  margin-bottom: 12px;
  text-align: center;
  line-height: 1.5;
`;