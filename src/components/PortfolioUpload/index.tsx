/** @jsxImportSource @emotion/react */
import { useState } from 'react';
import { css } from '@emotion/react';
import { Button, IconButton, TextField, TextArea } from '@toss/tds-mobile';
import { useImageUpload } from '../../hooks/useImageUpload';
import { AlbumPhotoPicker } from '../AlbumPhotoPicker';
import { ErrorAlertDialog } from '../ErrorAlertDialog';

interface PortfolioUploadProps {
  artistId: string;
  onSuccess?: () => void;
}

export function PortfolioUpload({ artistId, onSuccess }: PortfolioUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [alertState, setAlertState] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const { uploadImage, uploading, progress, error, reset } = useImageUpload(artistId);

  const handleAlbumPhotosSelected = (selected: { file: File; previewUrl: string }[]) => {
    const first = selected[0];
    if (first) {
      setFile(first.file);
      setPreviewUrl(first.previewUrl);
    }
    setShowAlbumPicker(false);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setAlertState({ open: true, message: '이미지와 제목을 입력해 주세요.' });
      return;
    }

    const result = await uploadImage(file, {
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });

    if (result.success) {
      setAlertState({ open: true, message: '올렸어요!' });
      setFile(null);
      setPreviewUrl(null);
      setTitle('');
      setDescription('');
      setTags('');
      reset();
      onSuccess?.();
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreviewUrl(null);
    setTitle('');
    setDescription('');
    setTags('');
    reset();
  };

  return (
    <div css={containerStyle}>
      <h2 css={titleStyle}>포트폴리오 업로드</h2>

      <div css={uploadAreaStyle}>
        {previewUrl ? (
          <div css={previewContainerStyle}>
            <img src={previewUrl} alt="Preview" css={previewImageStyle} />
            <IconButton
              src="https://static.toss.im/icons/svg/icon-close-mono.svg"
              onClick={handleCancel}
              aria-label="이미지 제거"
              variant="clear"
              css={removeButtonStyle}
            />
          </div>
        ) : (
          <>
            {showAlbumPicker && (
              <AlbumPhotoPicker
                isOpen={showAlbumPicker}
                onClose={() => setShowAlbumPicker(false)}
                onSelect={handleAlbumPhotosSelected}
                maxSelection={1}
              />
            )}
            <button
              type="button"
              css={fileLabelStyle}
              onClick={() => setShowAlbumPicker(true)}
              aria-label="이미지 선택"
            >
              <div css={uploadPromptStyle}>
                <span css={uploadIconStyle}>📸</span>
                <p>클릭해서 이미지를 선택해 주세요</p>
                <p css={uploadHintStyle}>JPG, PNG, GIF (최대 10MB)</p>
              </div>
            </button>
          </>
        )}
      </div>

      {file && (
        <div css={formStyle}>
          <div css={fieldStyle}>
            <label css={labelStyle}>제목 *</label>
            <TextField
              variant="box"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="작품 제목을 입력해 주세요"
              css={inputStyle}
              maxLength={50}
            />
          </div>

          <div css={fieldStyle}>
            <label css={labelStyle}>설명</label>
            <TextArea
              variant="box"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="작품 설명을 입력해 주세요"
              css={textareaStyle}
              rows={4}
              maxLength={500}
            />
          </div>

          <div css={fieldStyle}>
            <label css={labelStyle}>태그 (쉼표로 구분)</label>
            <TextField
              variant="box"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: 웨딩, 야외, 자연광"
              css={inputStyle}
            />
          </div>

          {error && (
            <div css={errorStyle}>
              {error}
            </div>
          )}

          {uploading && (
            <div css={progressContainerStyle}>
              <div css={progressBarStyle}>
                <div css={progressFillStyle(progress)} />
              </div>
              <p css={progressTextStyle}>{Math.round(progress)}%</p>
            </div>
          )}

          <div css={buttonGroupStyle}>
            <Button
              onClick={handleCancel}
              disabled={uploading}
              css={cancelButtonStyle}
            >
              취소
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !title.trim()}
              size="large"
            >
              {uploading ? '업로드하는 중이에요' : '업로드'}
            </Button>
          </div>
        </div>
      )}

      <ErrorAlertDialog
        open={alertState.open}
        message={alertState.message}
        onClose={() => setAlertState({ open: false, message: '' })}
      />
    </div>
  );
}

// Styles
const containerStyle = css`
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
`;

const titleStyle = css`
  font-size: 24px;
  font-weight: 700;
  color: #6C4D38;
  margin: 0 0 24px 0;
`;

const uploadAreaStyle = css`
  margin-bottom: 24px;
`;

const fileLabelStyle = css`
  display: block;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  padding: 0;
`;

const uploadPromptStyle = css`
  border: 2px dashed #CFB59E;
  border-radius: 12px;
  padding: 60px 20px;
  text-align: center;
  background: #F7F2EF;
  transition: all 0.3s ease;

  &:hover {
    border-color: #6C4D38;
    background: #ECF5FF;
  }

  p {
    margin: 8px 0;
    color: #6C4D38;
  }
`;

const uploadIconStyle = css`
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
`;

const uploadHintStyle = css`
  font-size: 14px;
  color: #6C4D38;
  opacity: 0.7;
`;

const previewContainerStyle = css`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
`;

const previewImageStyle = css`
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
  background: #F7F2EF;
`;

const removeButtonStyle = css`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6) !important;
  color: white !important;

  &:hover {
    background: rgba(0, 0, 0, 0.8) !important;
  }
`;

const formStyle = css`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const fieldStyle = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const labelStyle = css`
  font-size: 14px;
  font-weight: 600;
  color: #6C4D38;
`;

const inputStyle = css`
  padding: 12px 16px;
  border: 1px solid #CFB59E;
  border-radius: 8px;
  font-size: 16px;
  color: #6C4D38;
  background: white;

  &:focus {
    outline: none;
    border-color: #6C4D38;
  }

  &::placeholder {
    color: #CFB59E;
  }
`;

const textareaStyle = css`
  ${inputStyle};
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
`;

const errorStyle = css`
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  color: #c00;
  font-size: 14px;
`;

const progressContainerStyle = css`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const progressBarStyle = css`
  flex: 1;
  height: 8px;
  background: #F7F2EF;
  border-radius: 4px;
  overflow: hidden;
`;

const progressFillStyle = (progress: number) => css`
  height: 100%;
  width: ${progress}%;
  background: linear-gradient(90deg, #6C4D38, #CFB59E);
  transition: width 0.3s ease;
`;

const progressTextStyle = css`
  font-size: 14px;
  font-weight: 600;
  color: #6C4D38;
  min-width: 50px;
  text-align: right;
`;

const buttonGroupStyle = css`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

const cancelButtonStyle = css`
  flex: 1;
  background: #F7F2EF !important;
  color: #6C4D38 !important;
`;
