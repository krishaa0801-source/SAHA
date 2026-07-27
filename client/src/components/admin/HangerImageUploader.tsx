import { useEffect, useRef, useState } from 'react';
// Reused directly from the live site (not reimplemented) so this preview
// is pixel-identical to how the product will actually hang on the Style
// Vault rods — see public/vault.html / vault-react/src/Card.jsx for the
// other place this exact component renders.
import HangingGarment from '../../../../vault-react/src/HangingGarment.jsx';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type Props = {
  existingUrl?: string;
  categorySlug: string;
  onFileSelected: (file: File) => void;
  error?: string;
};

export default function HangerImageUploader({ existingUrl, categorySlug, onFileSelected, error }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(existingUrl);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setPreviewUrl(existingUrl);
  }, [existingUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function acceptFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError('Only PNG, JPG, JPEG, and WebP images are allowed.');
      return;
    }
    setFileError('');
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    onFileSelected(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  }

  return (
    <div>
      <span className="field-label">Hanger Image (transparent PNG recommended)</span>
      <div
        className={`admin-hanger-dropzone ${dragOver ? 'drag-over' : ''} ${error || fileError ? 'field-invalid' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload hanger image"
      >
        {previewUrl ? (
          <div className="admin-hanger-preview">
            <div className="admin-hanger-preview-rod" aria-hidden="true" />
            <div className="admin-hanger-preview-stage">
              <HangingGarment garment={{ image: previewUrl, name: 'Hanger preview', category: categorySlug }} />
            </div>
          </div>
        ) : (
          <div className="admin-dropzone-empty">
            <span className="material-symbols-outlined text-3xl">checkroom</span>
            <p>Drag &amp; drop a hanger image, or click to browse</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) acceptFile(file);
            e.target.value = '';
          }}
        />
      </div>
      <p className="admin-hint">Preview shows exactly how this item will hang on the Style Vault rack.</p>
      {(error || fileError) && <p className="field-error">{error || fileError}</p>}
    </div>
  );
}
