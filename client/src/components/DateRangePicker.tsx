import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

type DateRangePickerProps = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!hostRef.current) return;
    const fp = flatpickr(hostRef.current, {
      mode: 'range',
      inline: true,
      minDate: 'today',
      dateFormat: 'Y-m-d',
      defaultDate: from && to ? [from, to] : undefined,
      onChange: (dates) => {
        if (dates.length === 2) {
          onChangeRef.current(dates[0].toISOString().slice(0, 10), dates[1].toISOString().slice(0, 10));
        }
      },
    });
    return () => fp.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} />;
}
