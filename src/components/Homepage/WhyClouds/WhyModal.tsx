import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IoClose, IoRefreshOutline } from 'react-icons/io5';
import { useTranslation } from 'react-i18next';

interface WhyModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onReplay: () => void;
  children: ReactNode;
}

const WhyModal: React.FC<WhyModalProps> = ({ isOpen, title, onClose, onReplay, children }) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Rendered into <body>, not in place.
  //
  // `z-50` on the overlay is only ever compared against *siblings inside the
  // same stacking context*. Rendered in place, this modal's nearest ancestor
  // with a z-index is the clouds wrapper in the hero — so the whole overlay,
  // z-50 and all, collapses to that ancestor's z-10, and any later sibling of
  // it at the same z-10 (the CTA buttons, the scroll cue) paints straight
  // through the dim layer. No z-index written *here* can ever win that fight,
  // because the comparison never reaches this element.
  //
  // A portal moves the DOM node to <body>, where it competes at the top level
  // and z-50 means what it looks like it means. It also makes the modal
  // immune to a second failure mode this hero is one property away from: an
  // ancestor with `transform`/`filter`/`will-change` becomes the containing
  // block for `position: fixed` descendants, which would break `inset-0` and
  // let the section's `overflow-hidden` clip the overlay.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl p-6 sm:p-8
              max-h-[85vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t('homepage.why.close')}
              className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors cursor-pointer"
            >
              <IoClose size={22} />
            </button>

            <h3 className="text-xl sm:text-2xl font-bold text-black mb-6 pr-8">{title}</h3>

            <div className="min-h-[220px] flex items-center justify-center">{children}</div>

            <button
              type="button"
              onClick={onReplay}
              className="mt-6 mx-auto flex items-center gap-2 text-xs font-bold tracking-[0.15em]
                uppercase text-gray-400 hover:text-black transition-colors cursor-pointer"
            >
              <IoRefreshOutline size={14} />
              {t('homepage.why.replay')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default WhyModal;
