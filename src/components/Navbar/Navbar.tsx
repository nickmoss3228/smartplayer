import { useState, useRef, useEffect } from "react";
import { SHOP_ENABLED } from "../../config/features";
import {
  IoChevronDown,
  IoGlobeOutline,
  IoPersonCircleOutline,
  IoChatbubblesOutline,
  IoHomeOutline,
  // IoPeopleOutline,
  IoBookOutline,
} from "react-icons/io5";
import { useLocation, useNavigate } from "react-router-dom";
import BrandMark from "../Brand/BrandMark";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { useCharacter } from "../../context/CharacterContext";
import { useCharacterPortrait } from "../../modules/character/useCharacterPortrait";
import FeedbackModal from "../Feedback/FeedbackModal";
import WalletChips from "./WalletChips";
import { useCart } from "../../context/CartContext";
import gbFlag from "../../assets/flags/gb.svg";
import ruFlag from "../../assets/flags/ru.svg";

// Bundled rather than hotlinked: flagcdn.com being slow or blocked used to
// leave the language switcher with broken images.
const FLAG_URLS: Record<string, string> = {
  EN: gbFlag,
  RU: ruFlag,
};

const FlagImg = ({ lang }: { lang: string }) => (
  <img
    src={FLAG_URLS[lang]}
    alt={lang}
    className="w-5 h-3.5 object-cover rounded-[2px]"
  />
);

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(
    i18n.language.toUpperCase()
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { character } = useCharacter();
  const { count: cartCount } = useCart();
  const navigate = useNavigate();

  // The homepage hero already renders the brand name at full size directly
  // below the navbar, so repeating it here just prints it twice. The mark
  // itself stays — it is the "go home" control, not decoration.
  const { pathname } = useLocation();
  const isHomepage = pathname === "/";

  const portrait = useCharacterPortrait(character);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language === "EN" ? "en" : "ru");
    setCurrentLanguage(language);
    setIsDropdownOpen(false);
  };

  const handleLogoClick = () => navigate(user ? "/levels" : "/");
  const handleGuideClick = () => {
    navigate("/how-to-use");
    setIsDropdownOpen(false);
  };
  const handleFeedbackClick = () => {
    setIsFeedbackOpen(true);
    setIsDropdownOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 h-13 right-0 w-full bg-white/60 backdrop-blur-xl border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13">

            <div className="flex items-center">
              <button
                onClick={handleLogoClick}
                className="flex items-center gap-2 cursor-pointer text-black hover:text-gray-500 transition-colors duration-200"
                aria-label={t("brand")}
              >
                <BrandMark className="w-8 h-8" />
                {/* aria-label on the button already names this control, so
                    dropping the visible text costs nothing to a screen reader. */}
                {!isHomepage && (
                  <span className="text-2xl font-extrabold lowercase tracking-tight">
                    {t("brand")}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center space-x-2">

              {user && <WalletChips />}

              {user && (
                <button
                  onClick={() => navigate("/room")}
                  title={t("navbar.room")}
                  className="cursor-pointer p-1.5 rounded-[3px] hover:bg-gray-100 transition-colors duration-200"
                >
                  <IoHomeOutline className="w-6 h-6 text-gray-600 hover:text-black transition-colors" />
                </button>
              )}

              {/* {user && (
                <button
                  onClick={() => navigate("/players")}
                  title={t("navbar.players")}
                  className="cursor-pointer p-1.5 rounded-[3px] hover:bg-gray-100 transition-colors duration-200"
                >
                  <IoPeopleOutline className="w-6 h-6 text-gray-600 hover:text-black transition-colors" />
                </button>
              )} */}

              {/* One entry, because there is now one surface. Shop and
                  library were merged into /stories — ownership is a state on
                  each card and "mine" is a filter, so two buttons would lead to
                  the same page twice.

                  Ungated: a visitor browses and fills a basket before signing
                  up, and only checkout needs an account.

                  Kept away from WalletChips deliberately. Those are BitAward /
                  BitWord / BitPhrase, earned by studying; this leads to stories
                  bought with rubles. Adjacency is most of what makes two
                  balances read as one. */}
              {SHOP_ENABLED && (
              <button
                onClick={() => navigate("/stories")}
                title={t("navbar.stories")}
                aria-label={
                  cartCount > 0
                    ? `${t("navbar.stories")} (${cartCount})`
                    : t("navbar.stories")
                }
                className="relative cursor-pointer p-1.5 rounded-[3px] hover:bg-gray-100 transition-colors duration-200"
              >
                <IoBookOutline className="w-6 h-6 text-gray-600 hover:text-black transition-colors" />
                {/* A basket you cannot see is a basket you forget. The count is
                    also in the aria-label above, since a badge is decorative to
                    a screen reader. */}
                {cartCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold leading-none text-white tabular-nums"
                  >
                    {cartCount}
                  </span>
                )}
              </button>
              )}

              <button
                onClick={() => navigate("/dashboard")}
                title={t("navbar.dashboard")}
                className="cursor-pointer p-1.5 rounded-[3px] hover:bg-gray-100 transition-colors duration-200"
              >
                {portrait ? (
                  <img
                    src={portrait}
                    alt={t("navbar.dashboard")}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200"
                  />
                ) : (
                  <IoPersonCircleOutline className="w-7 h-7 text-gray-600 hover:text-black transition-colors" />
                )}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="cursor-pointer flex items-center space-x-1.5 px-3 py-2 rounded-[3px] text-black hover:bg-gray-100 transition-colors duration-200"
                >
                  <FlagImg lang={currentLanguage === "EN" ? "EN" : "RU"} />
                  <IoChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-[3px] shadow-xl border border-gray-200 py-1 z-[10000]">
                    {/* Wallet — sm:hidden because the navbar row (WalletChips
                        default variant) already shows this on desktop; on
                        mobile there's no space for it up top, so it lives
                        here instead. */}
                    {user && (
                      <>
                        <div className="sm:hidden px-4 py-2">
                          <div className="font-mono flex items-center text-[10px] text-gray-600 uppercase tracking-[0.16em] mb-2">
                            {t("navbar.wallet")}
                          </div>
                          <WalletChips variant="dropdown" />
                        </div>
                        <div className="sm:hidden border-t border-gray-200 my-1" />
                      </>
                    )}

                    <button
                      onClick={handleGuideClick}
                      className="w-full flex cursor-pointer items-center px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors duration-200"
                    >
                      <IoBookOutline className="w-4 h-4 mr-3" />
                      {t("navbar.guide")}
                    </button>

                    <button
                      onClick={handleFeedbackClick}
                      className="w-full flex cursor-pointer items-center px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors duration-200"
                    >
                      <IoChatbubblesOutline className="w-4 h-4 mr-3" />
                      {t("navbar.feedback")}
                    </button>

                    <div className="border-t border-gray-200 my-1" />

                    <div className="px-4 py-2">
                      <div className="font-mono flex items-center text-[10px] text-gray-600 uppercase tracking-[0.16em] mb-2">
                        <IoGlobeOutline className="w-3 h-3 mr-2" />
                        {t("navbar.language")}
                      </div>
                      <button
                        onClick={() => handleLanguageChange("EN")}
                        className={`w-full text-left cursor-pointer flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-[3px] transition-colors duration-200 ${
                          currentLanguage === "EN"
                            ? "bg-black text-white"
                            : "text-black hover:bg-gray-100"
                        }`}
                      >
                        <FlagImg lang="EN" />
                        English
                      </button>
                      <button
                        onClick={() => handleLanguageChange("RU")}
                        className={`w-full text-left cursor-pointer flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-[3px] transition-colors duration-200 ${
                          currentLanguage === "RU"
                            ? "bg-black text-white"
                            : "text-black hover:bg-gray-100"
                        }`}
                      >
                        <FlagImg lang="RU" />
                        Русский
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </nav>

      {isFeedbackOpen && (
        <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />
      )}
    </>
  );
};

export default Navbar;