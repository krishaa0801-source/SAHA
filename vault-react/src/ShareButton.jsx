import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { WhatsAppIcon, TelegramIcon, XIcon, FacebookIcon, InstagramIcon, LinkIcon } from './shareIcons.jsx';

/* Builds the same ?product=<id> URL vault.html already knows how to open
   on load (see the `requestedId` handling near the bottom of the inline
   script) — so this never needs its own routing, and a shared link always
   reopens straight into this exact product's sidebar. */
function buildShareUrl(product) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.searchParams.set('product', product.id);
  return url.toString();
}

function buildShareText(product) {
  return product.description ? `${product.name} — ${product.description}` : `Check out ${product.name} on Saha's Style Vault`;
}

async function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Last-resort path for browsers without the async Clipboard API (or
  // where it's blocked, e.g. insecure context) — a hidden, selected
  // textarea + the legacy synchronous copy command.
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(ta);
  if (!ok) throw new Error('copy command was not successful');
}

const SHARE_TARGETS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    Icon: WhatsAppIcon,
    buildUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    key: 'x',
    label: 'X (Twitter)',
    Icon: XIcon,
    buildUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    Icon: FacebookIcon,
    buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    Icon: TelegramIcon,
    buildUrl: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
];

const TOAST_MS = 3200;

/* <ShareButton product={{id, name, description}} />
   Self-contained: owns its own popup menu, toast, and copy-failure modal,
   so mounting it (see index.jsx's mountShare) is the only integration
   point vault.html needs — it never reaches into the sidebar's own DOM or
   state. Reuses the page's existing .btn/.btn-ghost classes so it's
   pixel-identical to the Add-to-Cart button next to it (same size, same
   hover lift, same global delegated ripple-on-click listener already
   wired to any .btn). */
export default function ShareButton({ product }) {
  const [status, setStatus] = useState('idle'); // idle | busy | copied
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const firstItemRef = useRef(null);
  const toastTimerRef = useRef(null);
  const menuId = useId();

  const shareUrl = buildShareUrl(product);
  const shareText = buildShareText(product);

  const showToast = useCallback((message) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  // Close the popup on outside click / Escape, and return focus to the
  // share button so keyboard users never lose their place.
  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    firstItemRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const doCopy = useCallback(
    async (message, { closeMenu = true } = {}) => {
      setStatus('busy');
      try {
        await copyToClipboard(shareUrl);
        setStatus('copied');
        showToast(message);
        if (closeMenu) setMenuOpen(false);
        setTimeout(() => setStatus((s) => (s === 'copied' ? 'idle' : s)), 1500);
      } catch {
        setStatus('idle');
        setMenuOpen(false);
        setModalOpen(true);
      }
    },
    [shareUrl, showToast],
  );

  async function handleShareClick() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    if (typeof navigator.share === 'function') {
      setStatus('busy');
      try {
        await navigator.share({ title: product.name, text: shareText, url: shareUrl });
        setStatus('idle');
      } catch (err) {
        setStatus('idle');
        // AbortError = the visitor closed the native sheet themselves —
        // that's not a failure, so it shouldn't fall back to anything.
        if (err && err.name !== 'AbortError') setMenuOpen(true);
      }
      return;
    }
    setMenuOpen(true);
  }

  function handleInstagram() {
    doCopy("Link copied! Instagram doesn't support direct sharing from the web — paste it into a DM or story.");
  }

  function handleSocial(target) {
    window.open(target.buildUrl(shareUrl, shareText), '_blank', 'noopener,noreferrer,width=600,height=640');
    setMenuOpen(false);
    showToast(`Opening ${target.label}…`);
  }

  async function handleModalCopy() {
    try {
      await copyToClipboard(shareUrl);
      showToast('Link copied! Share this outfit with your friends.');
      setModalOpen(false);
    } catch {
      // Leave the modal open — the URL is right there, selectable by hand.
    }
  }

  return (
    <div className="share-btn-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`btn btn-ghost share-btn${status === 'copied' ? ' share-btn--success' : ''}`}
        aria-label={`Share ${product.name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuOpen ? menuId : undefined}
        disabled={status === 'busy'}
        onClick={handleShareClick}
      >
        {status === 'busy' ? (
          <span className="share-spinner" aria-hidden="true" />
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '1.15rem', display: 'block' }} aria-hidden="true">
            {status === 'copied' ? 'check' : 'share'}
          </span>
        )}
      </button>

      {menuOpen && (
        <div id={menuId} className="share-popup" role="menu" aria-label="Share this product">
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            className="share-popup-item"
            onClick={() => doCopy('Link copied! Share this outfit with your friends.')}
          >
            <LinkIcon />
            Copy Link
          </button>
          {SHARE_TARGETS.map((target) => (
            <button key={target.key} type="button" role="menuitem" className="share-popup-item" onClick={() => handleSocial(target)}>
              <target.Icon />
              {target.label}
            </button>
          ))}
          <button type="button" role="menuitem" className="share-popup-item" onClick={handleInstagram}>
            <InstagramIcon />
            Instagram
          </button>
        </div>
      )}

      <div className={`share-toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast}
      </div>

      {modalOpen && (
        <div
          className="share-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="share-modal" role="dialog" aria-modal="true" aria-label="Copy share link">
            <button type="button" className="share-modal-close" aria-label="Close" onClick={() => setModalOpen(false)}>
              ✕
            </button>
            <p className="share-modal-label">Copy this link to share:</p>
            <div className="share-modal-row">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                aria-label="Product share link"
              />
              <button type="button" className="btn btn-gold share-modal-copy" onClick={handleModalCopy}>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
