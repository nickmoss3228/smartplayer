// components/TabBar/TabBar.tsx
//
// The signed-in student's bottom bar on phones and tablets: Главная, Уровни,
// Слова, Школа. From lg up the same four sit in the navbar instead (Navbar.tsx),
// so this is lg:hidden.
//
// While it is on screen it puts `has-tabbar` on <html>. App.css turns that into
// --tabbar-h (the bar's height, 0 wherever the bar is not drawn) and pads the
// body by it, so ordinary pages scroll clear of the bar; fixed screens, like
// the school, stand on it with `bottom-(--tabbar-h)`.
//
// Behind HUB_ENABLED; Layout decides where it shows.

import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HUB_TABS } from './hubTabs';

const TabBar = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    document.documentElement.classList.add('has-tabbar');
    return () => document.documentElement.classList.remove('has-tabbar');
  }, []);

  return (
    <nav
      aria-label={t('tabs.label')}
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="m-0 p-0 list-none grid grid-cols-4 h-14 max-w-xl mx-auto">
        {HUB_TABS.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="h-full">
              <Link
                to={tab.to()}
                aria-current={active ? 'page' : undefined}
                className={`relative h-full flex flex-col items-center justify-center gap-0.5
                  text-[11px] font-semibold leading-none transition-colors
                  focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal
                  ${active ? 'text-ink' : 'text-dim hover:text-ink'}`}
              >
                {/* "You are here" is the signal colour's job (design manifest §2). */}
                {active && (
                  <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-signal" />
                )}
                <Icon size={22} />
                <span>{t(tab.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default TabBar;
