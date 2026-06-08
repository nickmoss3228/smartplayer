import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router';
import { FREE_TRIAL_STORIES } from '../../constants/trial';
import type { Theme } from '../../types/LevelProgress';

interface Props {
  isOpen: boolean;
  theme: Theme;
  onClose: () => void;
}

export const TrialGateModal: React.FC<Props> = ({ isOpen, theme, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${theme.progressGradient} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('trial.unlockTitle')}</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          {t('trial.unlockDescription', { count: FREE_TRIAL_STORIES })}
        </p>

        <button
          onClick={() => navigate('/signup', { state: { fromTrial: true, returnTo: location.pathname } })}
          className={`w-full py-3 rounded-xl bg-gradient-to-r ${theme.progressGradient} text-white font-semibold mb-3 hover:opacity-90 active:scale-95 transition-all shadow-md`}
        >
          {t('trial.createAccount')}
        </button>
        <button
          onClick={() => navigate('/login', { state: { returnTo: location.pathname } })}
          className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 active:scale-95 transition-all mb-4"
        >
          {t('trial.login')}
        </button>
        <button onClick={onClose} className="text-gray-400 text-sm hover:text-gray-600 transition-colors">
          {t('trial.maybeLater')}
        </button>
      </div>
    </div>
  );
};