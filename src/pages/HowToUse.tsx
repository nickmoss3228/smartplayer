import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
// import guide1 from "../assets/guide/guide1.png";
import guide2 from "../assets/guide/guide2.png";
// import guide3 from "../assets/guide/guide3.png";
import guide4 from "../assets/guide/guide4.png";
// import guide5 from "../assets/guide/guide5.png";
// import guide6 from "../assets/guide/guide6.png";
// import guide7 from "../assets/guide/guide7.png";
import guide8 from "../assets/guide/guide8.png";
import guide9 from "../assets/guide/guide9.png";
import guide10 from "../assets/guide/guide10.png";

const HowToUse: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeSections, setActiveSections] = useState<number[]>([]);

  const toggleSection = (section: number) => {
    setActiveSections(
      (prev) =>
        prev.includes(section)
          ? prev.filter((s) => s !== section) // Remove if already active
          : [...prev, section] // Add if not active
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-red-400 to-blue-700 pt-30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text ">
            {t("howToUse.title")}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t("howToUse.subtitle")}
          </p>
        </div>

        {/* Overview Section */}
        <section className="bg-white flex flex-col items-center justify-center rounded-2xl shadow-xl p-8 mb-12 border border-gray-100">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t("howToUse.overview.title")}
          </h2>
          <img src={guide10} alt="img" className="w-160 mb-4" />
          <p className="text-2xl text-gray-700 leading-relaxed">
            {t("howToUse.overview.description")}
          </p>
        </section>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-6xl mx-auto items-start">
          {/* Feature 1: Sentence Mode */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              {t("howToUse.features.sentenceMode.title")}
            </h3>
            <div className="w-full h-48 mb-4 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50">
              <img
                src={guide2}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-gray-600 mb-4 text-center flex-grow">
              {t("howToUse.features.sentenceMode.description")}
            </p>
            <button
              className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
              onClick={() => toggleSection(1)}
            >
              {activeSections.includes(1)
                ? t("howToUse.features.sentenceMode.showLess")
                : t("howToUse.features.sentenceMode.learnMore")}
            </button>
            {activeSections.includes(1) && (
              <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100 animate-fadeIn">
                <h4 className="font-bold text-gray-900 mb-3 text-lg text-center">
                  {t("howToUse.features.sentenceMode.howItWorks")}
                </h4>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong className="text-purple-700">
                        {t("howToUse.features.sentenceMode.autoPause")}
                      </strong>{" "}
                      {t("howToUse.features.sentenceMode.autoPauseDesc")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong className="text-purple-700">
                        {t("howToUse.features.sentenceMode.nextButton")}
                      </strong>{" "}
                      {t("howToUse.features.sentenceMode.nextButtonDesc")}{" "}
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">
                        →
                      </kbd>{" "}
                      {t("howToUse.features.sentenceMode.nextButtonDesc2")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong className="text-purple-700">
                        {t("howToUse.features.sentenceMode.repeatButton")}
                      </strong>{" "}
                      {t("howToUse.features.sentenceMode.repeatButtonDesc")}{" "}
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">
                        R
                      </kbd>{" "}
                      {t("howToUse.features.sentenceMode.repeatButtonDesc2")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong className="text-purple-700">
                        {t("howToUse.features.sentenceMode.whyHelps")}
                      </strong>{" "}
                      {t("howToUse.features.sentenceMode.whyHelpsDesc")}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Feature 2: Time Markers */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              {t("howToUse.features.timeMarkers.title")}
            </h3>
            <div className="w-full h-48 mb-4 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50">
              <img
                src={guide9}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-gray-600 mb-4 text-center flex-grow">
              {t("howToUse.features.timeMarkers.description")}
            </p>
            <button
              className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
              onClick={() => toggleSection(2)}
            >
              {activeSections.includes(2)
                ? t("howToUse.features.sentenceMode.showLess")
                : t("howToUse.features.sentenceMode.learnMore")}
            </button>
            {activeSections.includes(2) && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 animate-fadeIn">
                <h4 className="font-bold text-gray-900 mb-3 text-lg text-center">
                  {t("howToUse.features.timeMarkers.understanding")}
                </h4>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t("howToUse.features.timeMarkers.point1")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t("howToUse.features.timeMarkers.point2")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t("howToUse.features.timeMarkers.point3")}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t("howToUse.features.timeMarkers.point4")}</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Feature 3: Quiz Game */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              {t("howToUse.features.speedControl.title")}
            </h3>
            <div className="w-full h-48 mb-4 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50">
              <img
                src={guide8}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-gray-600 mb-4 text-center flex-grow">
              {t("howToUse.features.speedControl.description")}
            </p>
            <button
              className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
              onClick={() => toggleSection(3)}
            >
              {activeSections.includes(3)
                ? t("howToUse.features.sentenceMode.showLess")
                : t("howToUse.features.sentenceMode.learnMore")}
            </button>
            {activeSections.includes(3) && (
              <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100 animate-fadeIn">
                <h4 className="font-bold text-gray-900 mb-3 text-lg text-center">
                  {t("howToUse.features.speedControl.speedOptions")}
                </h4>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">🎧</span>
                    <span>
                      <strong className="text-green-700">
                        {t("howToUse.features.speedControl.slow")}
                      </strong>{" "}
                      {t("howToUse.features.speedControl.slowDesc")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">✏️</span>
                    <span>
                      <strong className="text-green-700">
                        {t("howToUse.features.speedControl.normal")}
                      </strong>{" "}
                      {t("howToUse.features.speedControl.normalDesc")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">❓</span>
                    <span>
                      <strong className="text-green-700">
                        {t("howToUse.features.speedControl.fast")}
                      </strong>{" "}
                      {t("howToUse.features.speedControl.fastDesc")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">💡</span>
                    <span>
                      <strong className="text-green-700">
                        {t("howToUse.features.speedControl.tip")}
                      </strong>{" "}
                      {t("howToUse.features.speedControl.tipDesc")}
                    </span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Feature 4: Subtitles */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              {t("howToUse.features.subtitles.title")}
            </h3>
            <div className="w-full h-48 mb-4 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50">
              <img
                src={guide4}
                alt=""
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-gray-600 mb-4 text-center flex-grow">
              {t("howToUse.features.subtitles.description")}
            </p>
            <button
              className="w-full py-2 px-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
              onClick={() => toggleSection(4)}
            >
              {activeSections.includes(4)
                ? t("howToUse.features.sentenceMode.showLess")
                : t("howToUse.features.sentenceMode.learnMore")}
            </button>
            {activeSections.includes(4) && (
              <div className="mt-6 p-4 bg-pink-50 rounded-xl border border-pink-100 animate-fadeIn">
                <h4 className="font-bold text-gray-900 mb-3 text-lg text-center">
                  {t("howToUse.features.subtitles.usingEffectively")}
                </h4>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong className="text-pink-700">
                        {t("howToUse.features.subtitles.firstListen")}
                      </strong>{" "}
                      {t("howToUse.features.subtitles.firstListenDesc")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong className="text-pink-700">
                        {t("howToUse.features.subtitles.secondListen")}
                      </strong>{" "}
                      {t("howToUse.features.subtitles.secondListenDesc")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      <strong className="text-pink-700">
                        {t("howToUse.features.subtitles.thirdListen")}
                      </strong>{" "}
                      {t("howToUse.features.subtitles.thirdListenDesc")}
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t("howToUse.features.subtitles.allStories")}</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Levels Section */}
        <section className="mb-12">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">
            {t("howToUse.levelsSection.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-400 via-emerald-400 to-teal-300 rounded-2xl shadow-lg p-8 text-center transition-transform duration-300 border-2 border-green-300">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {t("howToUse.levelsSection.easy.title")}
              </h3>
              <p className="text-xl font-semibold text-gray-800 mb-3">
                {t("howToUse.levelsSection.easy.stories")}
              </p>
              <p className="text-gray-700">
                {t("howToUse.levelsSection.easy.description")}
              </p>
            </div>
            <div className="bg-gradient-to-br from-yellow-400 via-orange-400 to-red-300 rounded-2xl shadow-lg p-8 text-center transition-transform duration-300 border-2 border-yellow-300">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {t("howToUse.levelsSection.medium.title")}
              </h3>
              <p className="text-xl font-semibold text-gray-800 mb-3">
                {t("howToUse.levelsSection.medium.stories")}
              </p>
              <p className="text-gray-700">
                {t("howToUse.levelsSection.medium.description")}
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-400 via-purple-400 to-pink-300 rounded-2xl shadow-lg p-8 text-center  transition-transform duration-300 border-2 border-red-300">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                {t("howToUse.levelsSection.hard.title")}
              </h3>
              <p className="text-xl font-semibold text-gray-800 mb-3">
                {t("howToUse.levelsSection.hard.stories")}
              </p>
              <p className="text-gray-700">
                {t("howToUse.levelsSection.hard.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="mb-12">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">
            {t("howToUse.quickStart.title")}
          </h2>
          <div className="space-y-6">
            {[
              {
                number: "1",
                title: t("howToUse.quickStart.step1.title"),
                description: t("howToUse.quickStart.step1.description"),
              },
              {
                number: "2",
                title: t("howToUse.quickStart.step2.title"),
                description: t("howToUse.quickStart.step2.description"),
              },
              {
                number: "3",
                title: t("howToUse.quickStart.step3.title"),
                description: t("howToUse.quickStart.step3.description"),
              },
              {
                number: "4",
                title: t("howToUse.quickStart.step4.title"),
                description: t("howToUse.quickStart.step4.description"),
              },
            ].map((step, index) => (
              <div
                key={index}
                className="flex items-start gap-6 bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl hover:translate-x-2 transition-all duration-300 border border-gray-100"
              >
                <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  {step.number}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {step.title}
                  </h4>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="mb-12">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">
            {t("howToUse.keyboardShortcuts.title")}
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="text-center">
              <kbd className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg text-2xl font-bold shadow-lg mb-3">
                →
              </kbd>
              <p className="text-gray-700 font-medium">
                {t("howToUse.keyboardShortcuts.next")}
              </p>
            </div>
            <div className="text-center">
              <kbd className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg text-2xl font-bold shadow-lg mb-3">
                R
              </kbd>
              <p className="text-gray-700 font-medium">
                {t("howToUse.keyboardShortcuts.repeat")}
              </p>
            </div>
            <div className="text-center">
              <kbd className="inline-block px-6 py-3 bg-gray-800 text-white rounded-lg text-2xl font-bold shadow-lg mb-3">
                Space
              </kbd>
              <p className="text-gray-700 font-medium">
                {t("howToUse.keyboardShortcuts.playPause")}
              </p>
            </div>
          </div>
        </section>

        {/* Tips Section */}
        <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 mb-12 border border-blue-100">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-8">
            {t("howToUse.learningTips.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: "👂",
                title: t("howToUse.learningTips.activeListen.title"),
                description: t(
                  "howToUse.learningTips.activeListen.description"
                ),
              },
              {
                icon: "🔄",
                title: t("howToUse.learningTips.repetition.title"),
                description: t("howToUse.learningTips.repetition.description"),
              },
              {
                icon: "📈",
                title: t("howToUse.learningTips.progressive.title"),
                description: t("howToUse.learningTips.progressive.description"),
              },
              {
                icon: "⏱️",
                title: t("howToUse.learningTips.adjustSpeed.title"),
                description: t("howToUse.learningTips.adjustSpeed.description"),
              },
            ].map((tip, index) => (
              <div
                key={index}
                className="flex items-start gap-4 bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <span className="text-4xl">{tip.icon}</span>
                <div>
                  <p className="text-gray-800">
                    <strong className="text-purple-700">{tip.title}</strong>{" "}
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            onClick={() => navigate("/levels")}
          >
            {t("howToUse.cta.startLearning")}
          </button>
          <button
            className="px-8 py-4 bg-white text-purple-600 text-lg font-bold rounded-full shadow-lg hover:shadow-xl border-2 border-purple-600 hover:bg-purple-50 transition-all duration-300"
            onClick={() => navigate("/")}
          >
            {t("howToUse.cta.backHome")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;
