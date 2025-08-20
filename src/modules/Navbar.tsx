import { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  CogIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("EN");
    const dropdownRef = useRef(null);
    
    const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
    setIsDropdownOpen(false);
    // Add your language change logic here
    console.log(`Language changed to: ${language}`);
  };

  const handleSettingsClick = () => {
    setIsDropdownOpen(false);
    // Add your settings navigation logic here
    console.log("Navigate to settings");
  };

  const handleLogoClick = () => {
    navigate('/levels/')
    };
    
    const handleDashboardNavigation = () => {
        
    }

  return (
    <nav className="relative w-full bg-[#1f1f1f] backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - can add menu items here if needed */}
          <div className="flex-1">
            {/* Empty for now, you can add navigation items here */}
          </div>

          {/* Center - Logo */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={handleLogoClick}
              className="text-2xl font-bold cursor-pointer text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
            >
              Haila
            </button>
          </div>

          {/* Right side - Dropdown Menu */}
          <div className="flex-1 flex justify-end">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={toggleDropdown}
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
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
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {/* Settings */}
                  <button
                    onClick={handleSettingsClick}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <CogIcon className="w-4 h-4 mr-3" />
                    Settings
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>

                  {/* Language Section */}
                  <div className="px-4 py-2">
                    <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      <GlobeAltIcon className="w-3 h-3 mr-2" />
                      Language
                    </div>

                    <button
                      onClick={() => handleLanguageChange("EN")}
                      className={`w-full text-left px-2 py-1 text-sm rounded transition-colors duration-200 ${
                        currentLanguage === "EN"
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      English
                    </button>

                    <button
                      onClick={() => handleLanguageChange("RU")}
                      className={`w-full text-left px-2 py-1 text-sm rounded transition-colors duration-200 ${
                        currentLanguage === "RU"
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      Русский
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button className="cursor-pointer" onClick={()=> navigate('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
