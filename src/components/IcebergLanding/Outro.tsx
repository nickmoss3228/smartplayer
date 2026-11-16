import type { ReactNode } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

/**
 * The closing line of an iceberg layer: what the problem costs the student.
 * Set apart from the examples as a note: the icon in line with the cards, the text indented after it,
 * its left, in italics.
 */
export default function Outro({ children }: { children: ReactNode }) {
  return (
    <p className="ib-outro">
      <ExclamationCircleIcon className="ib-outro-ico" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
