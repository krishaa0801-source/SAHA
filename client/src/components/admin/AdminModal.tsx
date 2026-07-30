import { ReactNode, useEffect, useRef } from 'react';

type AdminModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
};

// The one reusable modal for the admin panel (Reviews and Coupons forms) —
// nothing like this existed before; every prior confirmation was a plain
// window.confirm() and every prior form was a full page. Escape and a
// click on the backdrop both close it; focus moves to the first field on
// open and back to whatever triggered it on close, same interaction shape
// as the product-sidebar Share button's fallback modal built earlier for
// the public site, translated into this app's own CSS variables.
export default function AdminModal({ title, onClose, children, wide }: AdminModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  useEffect(() => {
    triggerRef.current = document.activeElement;
    const firstField = bodyRef.current?.querySelector<HTMLElement>('input, select, textarea, button');
    firstField?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="admin-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`admin-modal ${wide ? 'admin-modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">{title}</h2>
          <button type="button" className="admin-modal-close" aria-label="Close" onClick={onClose}>
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <div className="admin-modal-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
  );
}
