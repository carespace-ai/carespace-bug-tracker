'use client';

import { useTranslation } from './useTranslation';
import { LANGUAGES, SupportedLanguage } from './config';

export default function LanguageSelector() {
  const { language, setLanguage } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as SupportedLanguage;
    setLanguage(newLanguage);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="text-sm font-medium text-gray-700">
        🌐 Language:
      </label>
      <select
        id="language-select"
        name="language"
        value={language}
        onChange={handleLanguageChange}
        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 cursor-pointer hover:border-gray-400 transition-colors"
      >
        {Object.values(LANGUAGES).map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
