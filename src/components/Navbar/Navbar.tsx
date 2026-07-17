import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  GlobeAltIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import Infinity from "../../assets/infinity.svg";
import { useTranslation } from "react-i18next";
import { ImBook } from "react-icons/im";
import { useAuth } from "../../context/AuthContext";
import { useProfile } from "../../context/ProfileContext";
import { getAvatarById } from "../../config/avatars";
import FeedbackModal from "../Feedback/FeedbackModal";

const FLAG_URLS: Record<string, string> = {
  EN: "https://flagcdn.com/w40/gb.png",
  RU: "https://flagcdn.com/w40/ru.png",
};

const FlagImg = ({ lang }: { lang: string }) => (
  <img
    src={FLAG_URLS[lang]}
    alt={lang}
    className="w-5 h-3.5 object-cover rounded-sm"
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
  const { profile } = useProfile();
  const navigate = useNavigate();

  const avatar = profile?.avatar ? getAvatarById(profile.avatar) : null;

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
      <nav className="fixed top-0 left-0 h-13 right-0 w-full bg-white/60 backdrop-blur-xl border-b border-gray-200/50 shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-13">

            <div className="flex items-center">
              <button
                onClick={handleLogoClick}
                className="text-3xl font-bold cursor-pointer text-black hover:text-red-800 transition-colors duration-200"
              >
                <img
                  src={Infinity}
                  alt="Haila Logo"
                  className="w-12 h-12 inline-block mr-2 -mt--5"
                />
              </button>
            </div>

            <div className="flex items-center space-x-2">

              <button
                onClick={() => navigate("/dashboard")}
                title={t("navbar.dashboard")}
                className="cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                {avatar ? (
                  <img
                    src={avatar.url}
                    alt={avatar.label}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-200"
                  />
                ) : (
                  <UserCircleIcon className="w-7 h-7 text-gray-600 hover:text-black transition-colors" />
                )}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="cursor-pointer flex items-center space-x-1.5 px-3 py-2 rounded-lg text-black hover:bg-gray-100 transition-colors duration-200"
                >
                  <FlagImg lang={currentLanguage === "EN" ? "EN" : "RU"} />
                  <ChevronDownIcon
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[10000]">
                    <button
                      onClick={handleGuideClick}
                      className="w-full flex cursor-pointer items-center px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors duration-200"
                    >
                      <ImBook className="w-4 h-4 mr-3" />
                      {t("navbar.guide")}
                    </button>

                    <button
                      onClick={handleFeedbackClick}
                      className="w-full flex cursor-pointer items-center px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors duration-200"
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-3" />
                      {t("navbar.feedback", "Feedback")}
                    </button>

                    <div className="border-t border-gray-200 my-1" />

                    <div className="px-4 py-2">
                      <div className="flex items-center text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                        <GlobeAltIcon className="w-3 h-3 mr-2" />
                        {t("navbar.language")}
                      </div>
                      <button
                        onClick={() => handleLanguageChange("EN")}
                        className={`w-full text-left cursor-pointer flex items-center gap-2.5 px-2 py-1.5 text-sm rounded transition-colors duration-200 ${
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
                        className={`w-full text-left cursor-pointer flex items-center gap-2.5 px-2 py-1.5 text-sm rounded transition-colors duration-200 ${
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