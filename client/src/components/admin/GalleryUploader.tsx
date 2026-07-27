import { useEffect, useRef, useState } from 'react';
import { GalleryEntry } from '../../lib/admin/products';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGES = 12;

type Props = {
  value: GalleryEntry[];
  onChange: (entries: GalleryEntry[]) => void;
  error?: string;
};

function entryKey(entry: GalleryEntry, index: number): string {
  return entry.type === 'existing' ? entry.url : `new-${index}-${entry.file.name}-${entry.file.lastModified}`;
}

export default function GalleryUploader({ value, onChange, error }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<Map<File, string>>(new Map());

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function displayUrl(entry: GalleryEntry): string {
    if (entry.type === 'existing') return entry.thumbnailUrl;
    let url = objectUrls.current.get(entry.file);
    if (!url) {
      url = URL.createObjectURL(entry.file);
      objectUrls.current.set(entry.file, url);
    }
    return url;
  }

  function fullSizeUrl(entry: GalleryEntry): string {
    if (entry.type === 'existing') return entry.url;
    return displayUrl(entry);
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const room = MAX_IMAGES - value.length;
    if (room <= 0) {
      setFileError(`You can add up to ${MAX_IMAGES} gallery images.`);
      return;
    }
    const accepted: File[] = [];
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) continue;
      accepted.push(file);
      if (accepted.length >= room) break;
    }
    if (!accepted.length) {
      setFileError('Only PNG, JPG, JPEG, and WebP images are allowed.');
      return;
    }
    setFileError('');
    onChange([...value, ...accepted.map((file) => ({ type: 'new' as const, file }))]);
  }

  function removeAt(index: number) {
    const entry = value[index];
    if (entry.type === 'new') {
      const url = objectUrls.current.get(entry.file);
      if (url) {
        URL.revokeObjectURL(url);
        objectUrls.current.delete(entry.file);
      }
    }
    onChange(value.filter((_, i) => i !== index));
  }

  function moveTo(from: number, to: number) {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <span className="field-label">Product Gallery Images</span>
      <div
        className={`admin-hanger-dropzone admin-gallery-dropzone ${dragOver ? 'drag-over' : ''} ${error || fileError ? 'field-invalid' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload gallery images"
      >
        <div className="admin-dropzone-empty">
          <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
          <p>Drag &amp; drop images, or click to browse ({value.length}/{MAX_IMAGES})</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {value.length > 0 && (
        <div className="admin-gallery-grid">
          {value.map((entry, index) => (
            <div
              key={entryKey(entry, index)}
              className={`admin-gallery-item ${draggingIndex === index ? 'dragging' : ''}`}
              draggable
              onDragStart={() => setDraggingIndex(index)}
              onDragEnd={() => setDraggingIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingIndex !== null) moveTo(draggingIndex, index);
                setDraggingIndex(null);
              }}
            >
              {index === 0 && <span className="admin-gallery-badge">Thumbnail</span>}
              <img src={displayUrl(entry)} alt={`Gallery image ${index + 1}`} />
              <div className="admin-gallery-actions">
                <button type="button" aria-label="Zoom image" onClick={() => setZoomSrc(fullSizeUrl(entry))}>
                  <span className="material-symbols-outlined text-base">zoom_in</span>
                </button>
                <button type="button" aria-label="Remove image" onClick={() => removeAt(index)}>
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="admin-hint">Drag images to reorder — the first image becomes the product thumbnail.</p>
      {(error || fileError) && <p className="field-error">{error || fileError}</p>}

      {zoomSrc && (
        <div className="admin-zoom-overlay" onClick={() => setZoomSrc(null)}>
          <img src={zoomSrc} alt="Zoomed gallery image" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
