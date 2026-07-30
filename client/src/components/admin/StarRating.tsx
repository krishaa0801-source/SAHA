type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number; // rem
};

// Display-only when `onChange` is omitted (review table, list cards);
// an interactive 1-5 picker when it's passed (the review form). Same
// "star" Material Symbols glyph either way, toggled solid via the FILL
// variation axis rather than swapping icons.
export default function StarRating({ value, onChange, size = 1 }: StarRatingProps) {
  const interactive = Boolean(onChange);

  return (
    <div className={`star-rating${interactive ? ' interactive' : ''}`} role={interactive ? 'radiogroup' : undefined} aria-label={interactive ? 'Rating' : `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="star-rating-star"
          style={{ fontSize: `${size}rem` }}
          disabled={!interactive}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={interactive ? value === n : undefined}
          onClick={() => onChange?.(n)}
        >
          <span className="material-symbols-outlined" style={n <= value ? { fontVariationSettings: "'FILL' 1" } : { opacity: 0.35 }} aria-hidden="true">
            star
          </span>
        </button>
      ))}
    </div>
  );
}
