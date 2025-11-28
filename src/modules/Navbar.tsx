import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  CogIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from 'react-router-dom';
import Infinity from '../assets/infinity.svg'
import { useTranslation } from 'react-i18next';
import { ImBook } from "react-icons/im";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language.toUpperCase());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth(); 

  const navigate = useNavigate();
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleLanguageChange = (language: string) => {
    const langCode = language === 'EN' ? 'en' : 'ru';
    i18n.changeLanguage(langCode); 
    setCurrentLanguage(language);
    setIsDropdownOpen(false);
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    console.log("Navigate to settings");
  };

const handleLogoClick = () => {
    if (user) {
      navigate('/levels');
    } else {
      navigate('/');
    }
  };

  const handleGuideClick = () => {
    navigate('/how-to-use');
    setIsDropdownOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 h-16 right-0 w-full bg-white/60 backdrop-blur-xl border-b border-gray-200/50 shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <button
              onClick={handleLogoClick}
              className="text-3xl font-bold cursor-pointer text-black hover:text-red-800 transition-colors duration-200"
            >
              <img src={Infinity} alt="Haila Logo" className="w-12 h-12 inline-block mr-2 -mt--5" />
            </button>
          </div>

          {/* Right side - Dashboard & Dropdown Menu */}
          <div className="flex items-center space-x-6">
            {/* Dashboard Button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer text-base font-medium text-black hover:text-gray-700 transition-colors duration-200 px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              {t('navbar.dashboard')}
            </button>

            {/* Dropdown Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="cursor-pointer flex items-center space-x-1 px-3 py-2 rounded-lg text-black hover:bg-gray-100 transition-colors duration-200"
              >
                <span className="text-sm font-medium">{currentLanguage}</span>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[10000]">
                  {/* Settings */}
                  <button
                    onClick={handleSettingsClick}
                    className="w-full flex items-center px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors duration-200"
                  >
                    <CogIcon className="w-4 h-4 mr-3" />
                    {t('navbar.settings')}
                  </button>

                   <button
                    onClick={handleGuideClick}
                    className="w-full flex items-center px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors duration-200"
                  >
                    <ImBook className="w-4 h-4 mr-3" />
                    {t('navbar.guide')}
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-1"></div>

                  {/* Language Section */}
                  <div className="px-4 py-2">
                    <div className="flex items-center text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                      <GlobeAltIcon className="w-3 h-3 mr-2" />
                      {t('navbar.language')}
                    </div>

                    <button
                      onClick={() => handleLanguageChange("EN")}
                      className={`w-full text-left px-2 py-1 text-sm rounded transition-colors duration-200 ${
                        currentLanguage === "EN"
                          ? "bg-black text-white"
                          : "text-black hover:bg-gray-100"
                      }`}
                    >
                      English
                    </button>

                    <button
                      onClick={() => handleLanguageChange("RU")}
                      className={`w-full text-left px-2 py-1 text-sm rounded transition-colors duration-200 ${
                        currentLanguage === "RU"
                          ? "bg-black text-white"
                          : "text-black hover:bg-gray-100"
                      }`}
                    >
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
  );
};

export default Navbar;