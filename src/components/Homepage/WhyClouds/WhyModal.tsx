import { ReactNode, useEffect } from 'react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
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
    </AnimatePresence>
  );
};

export default WhyModal;
