/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Sun,
  Moon,
  Trash2,
} from 'lucide-react';
import { ChallengerView, PlayerStats } from './components/ChallengerView';
import { CalculatorView } from './components/CalculatorView';
import { VlsmArchitectView } from './components/VlsmArchitectView';
import { AcademyView } from './components/AcademyView';

type ActiveSection = 'challenger' | 'calculator' | 'vlsm' | 'academy';

const STORAGE_KEY = 'subnetlab_ufees_stats_v1';
const THEME_KEY = 'subnetlab_ufees_theme_v1';

const INITIAL_STATS: PlayerStats = {
  totalSolved: 0,
  totalAttempts: 0,
  currentStreak: 0,
  bestStreak: 0,
  highScore60: 0,
  highScore180: 0,
  totalScore: 0,
  history: [],
};

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('challenger');
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...INITIAL_STATS, ...JSON.parse(raw) };
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_STATS;
  });

  const [logoError, setLogoError] = useState<boolean>(false);
  const logoSrc = `${import.meta.env.BASE_URL}assets/aistudio/icono_81a3db5b.png`;

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDark]);

  const handleUpdateStats = (updater: (prev: PlayerStats) => PlayerStats) => {
    setStats((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetStats = () => {
    setStats(INITIAL_STATS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-3.5">
          {/* Zone 1: Single-line Brand Title with Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('challenger');
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 font-display"
          >
            {!logoError ? (
              <img
                src={logoSrc}
                alt="Logo Un Fantasma en el Sistema"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-8 h-8 object-contain rounded-lg bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <span className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-mono font-bold">
                IP
              </span>
            )}
            <span>SubnetLab IPv4</span>
          </a>

          {/* Zone 2: 4 Clean Single-Line Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setActiveSection('challenger')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === 'challenger'
                  ? 'text-sky-600 dark:text-sky-400 border-sky-500 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Retador Contra Reloj
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('calculator')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === 'calculator'
                  ? 'text-sky-600 dark:text-sky-400 border-sky-500 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Calculadora & Binario
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('vlsm')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === 'vlsm'
                  ? 'text-sky-600 dark:text-sky-400 border-sky-500 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Arquitecto VLSM
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('academy')}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeSection === 'academy'
                  ? 'text-sky-600 dark:text-sky-400 border-sky-500 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Academia & Chuleta
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
            >
              <span>unfantasmaenelsistema.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Workspace Brand Banner & Utility Controls */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4">
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 group"
              title="Visitar Un Fantasma en el Sistema"
            >
              {!logoError ? (
                <img
                  src={logoSrc}
                  alt="Un Fantasma en el Sistema"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl bg-white dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 group-hover:border-sky-500 transition-colors"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-sky-600 text-white flex items-center justify-center font-mono font-bold">
                  UFEES
                </div>
              )}
            </a>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <a
                  href="https://www.unfantasmaenelsistema.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Un Fantasma en el Sistema
                </a>
                <span aria-hidden="true">·</span>
                <span>Entrenador de Redes & Subnetting IPv4</span>
                <span aria-hidden="true">·</span>
                <span>Edición GitHub Pages</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
                Calculadora, Laboratorio Binario y Retador Contra Reloj IPv4
              </h1>
            </div>
          </div>

          {/* Mobile Section Selector + Theme & Stats Controls */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
            {/* Mobile-only navigation segmented control */}
            <div className="flex md:hidden flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              {(
                [
                  { id: 'challenger', label: 'Retador' },
                  { id: 'calculator', label: 'Calculadora' },
                  { id: 'vlsm', label: 'VLSM' },
                  { id: 'academy', label: 'Chuleta' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    activeSection === tab.id
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {stats.totalAttempts > 0 && (
                <button
                  type="button"
                  onClick={handleResetStats}
                  title="Reiniciar estadísticas guardadas"
                  className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reiniciar Récords
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                aria-label="Cambiar tema claro u oscuro"
                className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isDark ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Modo Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                    <span>Modo Oscuro</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeSection === 'challenger' && (
          <ChallengerView stats={stats} onUpdateStats={handleUpdateStats} />
        )}
        {activeSection === 'calculator' && <CalculatorView />}
        {activeSection === 'vlsm' && <VlsmArchitectView />}
        {activeSection === 'academy' && <AcademyView />}
      </main>

      {/* Quiet Editorial Footer with User Brand & Website Link */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            {!logoError && (
              <img
                src={logoSrc}
                alt="Logo Un Fantasma en el Sistema"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-7 h-7 object-contain rounded-md bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700"
              />
            )}
            <span>
              Desarrollado para{' '}
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
              >
                Un Fantasma en el Sistema
              </a>{' '}
              · Herramienta didáctica de redes y subnetting IPv4 lista para GitHub Pages.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveSection('challenger')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Retador
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('calculator')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Calculadora
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setActiveSection('vlsm')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              VLSM
            </button>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.unfantasmaenelsistema.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-sky-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              unfantasmaenelsistema.com
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
