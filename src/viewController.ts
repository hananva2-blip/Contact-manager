/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contact, StorageModel, SortField } from './model.ts';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const AVATAR_PALETTES = [
  { bg: 'bg-indigo-600 dark:bg-indigo-500', text: 'text-white' },
  { bg: 'bg-violet-600 dark:bg-violet-500', text: 'text-white' },
  { bg: 'bg-emerald-600 dark:bg-emerald-500', text: 'text-white' },
  { bg: 'bg-rose-600 dark:bg-rose-500', text: 'text-white' },
  { bg: 'bg-amber-600 dark:bg-amber-500', text: 'text-white' },
  { bg: 'bg-cyan-600 dark:bg-cyan-500', text: 'text-white' },
  { bg: 'bg-fuchsia-600 dark:bg-fuchsia-500', text: 'text-white' },
  { bg: 'bg-teal-600 dark:bg-teal-500', text: 'text-white' },
  { bg: 'bg-sky-600 dark:bg-sky-500', text: 'text-white' },
];

function getAvatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function getInitials(firstName: string, lastName: string): string {
  const f = (firstName || '').trim().charAt(0).toUpperCase();
  const l = (lastName || '').trim().charAt(0).toUpperCase();
  return `${f}${l}` || '?';
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export class ViewController {
  private model: StorageModel;
  private root: HTMLElement;

  // State
  private searchQuery: string = '';
  private activeTag: string = 'all';
  private favoriteOnly: boolean = false;
  private sortBy: SortField = 'name';
  private viewMode: 'grid' | 'table' = 'grid';
  private currentTheme: 'dark' | 'light' = 'light';

  // Modal active states
  private editingContactId: string | null = null;
  private deletingContactId: string | null = null;
  private viewingContactId: string | null = null;

  constructor(model: StorageModel, rootElement: HTMLElement) {
    this.model = model;
    this.root = rootElement;
    this.currentTheme = this.model.getTheme();
    this.viewMode = this.model.getViewMode();

    this.applyTheme();
    this.init();
  }

  /**
   * Initial DOM setup & event attachment
   */
  public init(): void {
    this.renderAppShell();
    this.bindDelegatedEvents();
    this.renderContactsList();
    this.renderFilterChips();
    this.updateStats();
  }

  /**
   * Applies dark/light class on document
   */
  private applyTheme(): void {
    const html = document.documentElement;
    if (this.currentTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }

  /**
   * Toggle between dark and light themes
   */
  public toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.model.setTheme(this.currentTheme);
    this.applyTheme();
    this.renderThemeButton();
    this.showToast(
      `Switched to ${this.currentTheme === 'dark' ? 'Dark' : 'Light'} Mode`,
      'info'
    );
  }

  /**
   * Renders the master App Layout
   */
  private renderAppShell(): void {
    this.root.innerHTML = `
      <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
        <!-- Sticky Header -->
        <header class="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <!-- Brand -->
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h1 class="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Nexus Contacts</h1>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">Vanilla ES6+</span>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Zero-dependency contact manager with localStorage</p>
              </div>
            </div>

            <!-- Top Right Action Controls -->
            <div class="flex items-center gap-2 sm:gap-3">
              <!-- Import / Export Actions -->
              <div class="relative inline-block text-left">
                <button
                  id="btn-data-menu"
                  type="button"
                  data-action="toggle-data-menu"
                  class="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-medium flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition"
                  title="Import/Export Database"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span class="hidden md:inline">Data</span>
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div id="data-dropdown" class="hidden absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/10 z-50 py-1 text-sm divide-y divide-slate-100 dark:divide-slate-700">
                  <div class="py-1">
                    <button
                      type="button"
                      data-action="export-json"
                      class="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export to JSON
                    </button>
                    <label
                      class="w-full text-left px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                      </svg>
                      Import JSON
                      <input id="json-file-input" type="file" accept=".json,application/json" class="hidden" />
                    </label>
                  </div>
                  <div class="py-1">
                    <button
                      type="button"
                      data-action="reset-seeds"
                      class="w-full text-left px-4 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-xs"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset to Sample Seeds
                    </button>
                  </div>
                </div>
              </div>

              <!-- Theme Toggle Button -->
              <button
                id="btn-theme-toggle"
                type="button"
                data-action="toggle-theme"
                class="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                title="Toggle Dark / Light Mode"
              >
                <!-- SVG dynamically injected -->
              </button>

              <!-- View Mode Toggle (Cards / Table) -->
              <div class="hidden sm:flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  data-action="switch-view"
                  data-view="grid"
                  class="p-1.5 rounded-md ${this.viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}"
                  title="Grid Cards View"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  data-action="switch-view"
                  data-view="table"
                  class="p-1.5 rounded-md ${this.viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}"
                  title="Table View"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>

              <!-- Add Contact Button -->
              <button
                type="button"
                data-action="open-add-modal"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium text-sm bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-600/30 transition transform active:scale-95 cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Contact</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Body -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <!-- Summary Metrics Cards -->
          <div id="stats-banner" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <!-- Injected by updateStats() -->
          </div>

          <!-- Controls Bar (Live Search, Sorting, Favorite quick filter) -->
          <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <!-- Live Search Box -->
              <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search by name, email, phone, company, or tags... (Press / to focus)"
                  value="${escapeHtml(this.searchQuery)}"
                  class="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
                />
                <button
                  id="btn-clear-search"
                  type="button"
                  data-action="clear-search"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ${this.searchQuery ? '' : 'hidden'}"
                  title="Clear search"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Filter Options: Sort & Favorites Toggle -->
              <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
                <!-- Sort Select -->
                <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span class="hidden sm:inline">Sort by:</span>
                  <select
                    id="sort-select"
                    class="py-2 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="name" ${this.sortBy === 'name' ? 'selected' : ''}>Name (A-Z)</option>
                    <option value="name-desc" ${this.sortBy === 'name-desc' ? 'selected' : ''}>Name (Z-A)</option>
                    <option value="created-desc" ${this.sortBy === 'created-desc' ? 'selected' : ''}>Recently Added</option>
                    <option value="created-asc" ${this.sortBy === 'created-asc' ? 'selected' : ''}>Oldest First</option>
                    <option value="company" ${this.sortBy === 'company' ? 'selected' : ''}>Company</option>
                  </select>
                </div>

                <!-- Favorites Only Toggle Button -->
                <button
                  type="button"
                  data-action="toggle-fav-filter"
                  class="px-3 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                    this.favoriteOnly
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }"
                  title="Show only favorites"
                >
                  <svg class="w-4 h-4 ${this.favoriteOnly ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}" fill="${this.favoriteOnly ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>Favorites</span>
                </button>
              </div>
            </div>

            <!-- Filter Chips (Tags) -->
            <div id="filter-chips" class="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Contacts Container (Grid or Table) -->
          <div id="contacts-container" class="min-h-[300px]">
            <!-- Injected by renderContactsList() -->
          </div>
        </main>

        <!-- Footer -->
        <footer class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
          <p>Nexus Contacts • Pure Vanilla JavaScript (ES6+), HTML5, & Tailwind CSS • 100% Client-side LocalStorage</p>
        </footer>

        <!-- Modals and Toasts Containers -->
        <div id="modal-container"></div>
        <div id="toast-container" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>
      </div>
    `;

    this.renderThemeButton();
  }

  /**
   * Render theme switch icon
   */
  private renderThemeButton(): void {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;
    if (this.currentTheme === 'dark') {
      btn.innerHTML = `
        <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      `;
    } else {
      btn.innerHTML = `
        <svg class="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      `;
    }
  }

  /**
   * Render summary stats at top
   */
  private updateStats(): void {
    const statsBanner = document.getElementById('stats-banner');
    if (!statsBanner) return;
    const stats = this.model.getStats();

    statsBanner.innerHTML = `
      <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${stats.total}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Total Contacts</div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          <svg class="w-5 h-5 fill-amber-400" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${stats.favorites}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Starred Favorites</div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${stats.companies}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Companies</div>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
        <div class="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div>
          <div class="text-xl font-bold text-slate-900 dark:text-white leading-tight">${stats.tagsCount}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">Custom Tags</div>
        </div>
      </div>
    `;
  }

  /**
   * Render Tag Chips filter
   */
  private renderFilterChips(): void {
    const chipsContainer = document.getElementById('filter-chips');
    if (!chipsContainer) return;

    const allContacts = this.model.getAll();
    const tags = this.model.getAllTags();

    let html = `
      <span class="text-xs font-medium text-slate-400 dark:text-slate-500 mr-1">Tags:</span>
      <button
        type="button"
        data-action="filter-tag"
        data-tag="all"
        class="px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
          this.activeTag === 'all'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }"
      >
        <span>All</span>
        <span class="text-[10px] px-1.5 py-0.2 rounded-full ${this.activeTag === 'all' ? 'bg-indigo-800/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}">${allContacts.length}</span>
      </button>
    `;

    tags.forEach(({ tag, count }) => {
      const isSelected = this.activeTag.toLowerCase() === tag.toLowerCase();
      html += `
        <button
          type="button"
          data-action="filter-tag"
          data-tag="${escapeHtml(tag)}"
          class="px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            isSelected
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }"
        >
          <span>${escapeHtml(tag)}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-indigo-800/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}">${count}</span>
        </button>
      `;
    });

    chipsContainer.innerHTML = html;
  }

  /**
   * Render contacts either as responsive Grid Cards or Table View
   */
  public renderContactsList(): void {
    const container = document.getElementById('contacts-container');
    if (!container) return;

    const contacts = this.model.query({
      search: this.searchQuery,
      tag: this.activeTag,
      favoriteOnly: this.favoriteOnly,
      sortBy: this.sortBy,
    });

    if (contacts.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    if (this.viewMode === 'table') {
      container.innerHTML = this.renderTableView(contacts);
    } else {
      container.innerHTML = this.renderGridView(contacts);
    }
  }

  /**
   * Empty state template
   */
  private renderEmptyState(): string {
    const isFiltered = this.searchQuery || this.activeTag !== 'all' || this.favoriteOnly;
    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center max-w-lg mx-auto">
        <div class="h-16 w-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white mb-1">
          ${isFiltered ? 'No matching contacts found' : 'No contacts yet'}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-6">
          ${
            isFiltered
              ? 'Try modifying your search query or clearing active tag and favorite filters.'
              : 'Start building your directory by creating your first contact or importing a JSON backup.'
          }
        </p>
        <div class="flex items-center justify-center gap-3">
          ${
            isFiltered
              ? `
              <button
                type="button"
                data-action="reset-filters"
                class="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Reset All Filters
              </button>
            `
              : `
              <button
                type="button"
                data-action="open-add-modal"
                class="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer shadow-xs"
              >
                + Add First Contact
              </button>
            `
          }
        </div>
      </div>
    `;
  }

  /**
   * Grid Cards View
   */
  private renderGridView(contacts: Contact[]): string {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${contacts.map((c) => this.renderContactCard(c)).join('')}
      </div>
    `;
  }

  /**
   * Single Contact Card template
   */
  private renderContactCard(c: Contact): string {
    const fullName = `${c.firstName} ${c.lastName}`.trim();
    const initials = getInitials(c.firstName, c.lastName);
    const palette = getAvatarPalette(fullName);

    return `
      <div
        data-contact-id="${escapeHtml(c.id)}"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition duration-150 flex flex-col justify-between group relative"
      >
        <!-- Top Row: Avatar, Name, Favorite Star -->
        <div>
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 cursor-pointer" data-action="view-contact" data-id="${escapeHtml(c.id)}">
              <div class="h-12 w-12 rounded-xl ${palette.bg} ${palette.text} flex items-center justify-center font-bold text-base shadow-xs select-none">
                ${escapeHtml(initials)}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <h3 class="text-base font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    ${escapeHtml(fullName)}
                  </h3>
                </div>
                ${
                  c.company
                    ? `<p class="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                        </svg>
                        <span>${escapeHtml(c.company)}</span>
                      </p>`
                    : '<p class="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">No company listed</p>'
                }
              </div>
            </div>

            <!-- Star Favorite Button -->
            <button
              type="button"
              data-action="toggle-favorite"
              data-id="${escapeHtml(c.id)}"
              class="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400 transition cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
              title="${c.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}"
            >
              <svg class="w-5 h-5 ${c.isFavorite ? 'fill-amber-400 text-amber-400' : ''}" fill="${c.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>

          <!-- Tags List -->
          <div class="flex items-center gap-1.5 flex-wrap mb-4 min-h-[24px]">
            ${
              c.tags && c.tags.length > 0
                ? c.tags
                    .map(
                      (t) => `
                <span
                  data-action="filter-tag"
                  data-tag="${escapeHtml(t)}"
                  class="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-400 cursor-pointer transition"
                >
                  ${escapeHtml(t)}
                </span>
              `
                    )
                    .join('')
                : '<span class="text-[11px] text-slate-400 italic">No tags</span>'
            }
          </div>

          <!-- Contact Details (Email & Phone) with Quick Copy -->
          <div class="space-y-2 text-xs">
            <!-- Email -->
            <div class="flex items-center justify-between group/row p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
              <a
                href="mailto:${escapeHtml(c.email)}"
                class="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate flex-1"
                title="Send email"
              >
                <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span class="truncate">${escapeHtml(c.email)}</span>
              </a>
              <button
                type="button"
                data-action="copy-email"
                data-value="${escapeHtml(c.email)}"
                class="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer rounded"
                title="Copy email to clipboard"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <!-- Phone -->
            <div class="flex items-center justify-between group/row p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
              <a
                href="tel:${escapeHtml(c.phone)}"
                class="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 truncate flex-1 font-mono text-[11px]"
                title="Call phone"
              >
                <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span class="truncate">${escapeHtml(c.phone)}</span>
              </a>
              <button
                type="button"
                data-action="copy-phone"
                data-value="${escapeHtml(c.phone)}"
                class="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer rounded"
                title="Copy phone to clipboard"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Row: Meta & Card Action Buttons -->
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span class="text-[11px] text-slate-400 dark:text-slate-500">
            Added ${formatDate(c.createdAt)}
          </span>
          <div class="flex items-center gap-1">
            <button
              type="button"
              data-action="view-contact"
              data-id="${escapeHtml(c.id)}"
              class="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="View full details"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              type="button"
              data-action="edit-contact"
              data-id="${escapeHtml(c.id)}"
              class="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Edit contact"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              data-action="delete-contact"
              data-id="${escapeHtml(c.id)}"
              class="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              title="Delete contact"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Table View Template
   */
  private renderTableView(contacts: Contact[]): string {
    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th class="py-3 px-4 w-10 text-center">Fav</th>
                <th class="py-3 px-4">Contact</th>
                <th class="py-3 px-4">Company</th>
                <th class="py-3 px-4">Email</th>
                <th class="py-3 px-4">Phone</th>
                <th class="py-3 px-4">Tags</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              ${contacts
                .map((c) => {
                  const fullName = `${c.firstName} ${c.lastName}`.trim();
                  const initials = getInitials(c.firstName, c.lastName);
                  const palette = getAvatarPalette(fullName);

                  return `
                  <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group">
                    <td class="py-3 px-4 text-center">
                      <button
                        type="button"
                        data-action="toggle-favorite"
                        data-id="${escapeHtml(c.id)}"
                        class="p-1 text-slate-300 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400 transition cursor-pointer"
                      >
                        <svg class="w-4 h-4 ${c.isFavorite ? 'fill-amber-400 text-amber-400' : ''}" fill="${c.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-3 cursor-pointer" data-action="view-contact" data-id="${escapeHtml(c.id)}">
                        <div class="h-9 w-9 rounded-lg ${palette.bg} ${palette.text} flex items-center justify-center font-bold text-xs select-none">
                          ${escapeHtml(initials)}
                        </div>
                        <div>
                          <span class="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            ${escapeHtml(fullName)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      ${c.company ? escapeHtml(c.company) : '<span class="text-slate-400 italic">—</span>'}
                    </td>
                    <td class="py-3 px-4 text-xs font-mono">
                      <div class="flex items-center gap-1.5">
                        <a href="mailto:${escapeHtml(c.email)}" class="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 underline decoration-slate-300 dark:decoration-slate-700">
                          ${escapeHtml(c.email)}
                        </a>
                        <button
                          type="button"
                          data-action="copy-email"
                          data-value="${escapeHtml(c.email)}"
                          class="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          title="Copy email"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                      <div class="flex items-center gap-1.5">
                        <a href="tel:${escapeHtml(c.phone)}" class="hover:text-indigo-600 dark:hover:text-indigo-400">
                          ${escapeHtml(c.phone)}
                        </a>
                        <button
                          type="button"
                          data-action="copy-phone"
                          data-value="${escapeHtml(c.phone)}"
                          class="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                          title="Copy phone"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-1 flex-wrap">
                        ${
                          c.tags && c.tags.length > 0
                            ? c.tags
                                .map(
                                  (t) => `
                            <span
                              data-action="filter-tag"
                              data-tag="${escapeHtml(t)}"
                              class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                            >
                              ${escapeHtml(t)}
                            </span>
                          `
                                )
                                .join('')
                            : '<span class="text-xs text-slate-400 italic">—</span>'
                        }
                      </div>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          data-action="view-contact"
                          data-id="${escapeHtml(c.id)}"
                          class="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="View"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          data-action="edit-contact"
                          data-id="${escapeHtml(c.id)}"
                          class="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          data-action="delete-contact"
                          data-id="${escapeHtml(c.id)}"
                          class="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Modal: Add or Edit Contact Modal
   */
  public openContactFormModal(contactId?: string): void {
    this.editingContactId = contactId || null;
    const contact = contactId ? this.model.getById(contactId) : null;
    const isEdit = Boolean(contact);

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const existingTags = contact ? contact.tags.join(', ') : '';

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          id="contact-form-dialog"
          class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
                    isEdit
                      ? 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                      : 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
                  }" />
                </svg>
              </div>
              <h2 class="text-base font-semibold text-slate-900 dark:text-white">
                ${isEdit ? 'Edit Contact' : 'Add New Contact'}
              </h2>
            </div>
            <button
              type="button"
              data-action="close-modal"
              class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition cursor-pointer"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Form Body -->
          <form id="contact-modal-form" class="p-6 space-y-4 overflow-y-auto">
            <input type="hidden" name="contactId" value="${contact ? escapeHtml(contact.id) : ''}" />

            <!-- Row 1: First Name & Last Name -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="input-first-name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  First Name <span class="text-rose-500">*</span>
                </label>
                <input
                  id="input-first-name"
                  type="text"
                  name="firstName"
                  required
                  minlength="2"
                  value="${contact ? escapeHtml(contact.firstName) : ''}"
                  placeholder="e.g. Jane"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <p id="error-firstName" class="text-[11px] text-rose-500 mt-1 hidden"></p>
              </div>
              <div>
                <label for="input-last-name" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Last Name <span class="text-rose-500">*</span>
                </label>
                <input
                  id="input-last-name"
                  type="text"
                  name="lastName"
                  required
                  value="${contact ? escapeHtml(contact.lastName) : ''}"
                  placeholder="e.g. Doe"
                  class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
                <p id="error-lastName" class="text-[11px] text-rose-500 mt-1 hidden"></p>
              </div>
            </div>

            <!-- Row 2: Email Address (Regex validation) -->
            <div>
              <label for="input-email" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address <span class="text-rose-500">*</span>
              </label>
              <input
                id="input-email"
                type="email"
                name="email"
                required
                pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
                value="${contact ? escapeHtml(contact.email) : ''}"
                placeholder="e.g. jane.doe@example.com"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Must be a valid format: name@domain.com</p>
              <p id="error-email" class="text-[11px] text-rose-500 mt-1 hidden"></p>
            </div>

            <!-- Row 3: Phone (Regex validation) -->
            <div>
              <label for="input-phone" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number <span class="text-rose-500">*</span>
              </label>
              <input
                id="input-phone"
                type="tel"
                name="phone"
                required
                pattern="^[\\+]?[(]?[0-9]{1,4}[)]?[-\\s\\./0-9]{6,15}$"
                value="${contact ? escapeHtml(contact.phone) : ''}"
                placeholder="e.g. +1 (555) 123-4567"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <p class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Standard national or international phone format</p>
              <p id="error-phone" class="text-[11px] text-rose-500 mt-1 hidden"></p>
            </div>

            <!-- Row 4: Company / Organization -->
            <div>
              <label for="input-company" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company / Organization <span class="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="input-company"
                type="text"
                name="company"
                value="${contact ? escapeHtml(contact.company) : ''}"
                placeholder="e.g. Acme Innovations"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <!-- Row 5: Tags Chips input -->
            <div>
              <label for="input-tags" class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tags <span class="text-slate-400 font-normal">(comma-separated)</span>
              </label>
              <input
                id="input-tags"
                type="text"
                name="tags"
                value="${escapeHtml(existingTags)}"
                placeholder="e.g. Work, VIP, Friends, Tech"
                class="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
              <!-- Quick tag suggestions -->
              <div class="flex items-center gap-1.5 flex-wrap mt-2">
                <span class="text-[11px] text-slate-400">Quick add:</span>
                ${['Work', 'Family', 'Friends', 'Clients', 'VIP']
                  .map(
                    (qt) => `
                  <button
                    type="button"
                    data-action="add-tag-suggestion"
                    data-tag="${qt}"
                    class="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-950 transition cursor-pointer"
                  >
                    + ${qt}
                  </button>
                `
                  )
                  .join('')}
              </div>
            </div>

            <!-- Row 6: Favorite Toggle Checkbox -->
            <div class="pt-2">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="isFavorite"
                  ${contact && contact.isFavorite ? 'checked' : ''}
                  class="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Mark as Favorite Contact
                </span>
              </label>
            </div>

            <!-- Footer actions -->
            <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                data-action="close-modal"
                class="px-4 py-2 text-xs font-medium rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm shadow-indigo-600/30 transition cursor-pointer"
              >
                ${isEdit ? 'Save Changes' : 'Create Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Focus first input automatically
    setTimeout(() => {
      document.getElementById('input-first-name')?.focus();
    }, 50);
  }

  /**
   * Modal: Confirmation Before Deleting
   */
  public openDeleteModal(contactId: string): void {
    const contact = this.model.getById(contactId);
    if (!contact) return;

    this.deletingContactId = contactId;
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const fullName = `${contact.firstName} ${contact.lastName}`.trim();

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 text-center">
          <div class="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Contact?</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Are you sure you want to remove <span class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(fullName)}</span> from your address book? This action cannot be undone.
          </p>
          <div class="flex items-center justify-center gap-3">
            <button
              type="button"
              data-action="close-modal"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              data-action="confirm-delete"
              data-id="${escapeHtml(contact.id)}"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-600/30 transition cursor-pointer flex-1"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Modal: Full Contact Details Card / View
   */
  public openViewDetailsModal(contactId: string): void {
    const contact = this.model.getById(contactId);
    if (!contact) return;

    this.viewingContactId = contactId;
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const fullName = `${contact.firstName} ${contact.lastName}`.trim();
    const initials = getInitials(contact.firstName, contact.lastName);
    const palette = getAvatarPalette(fullName);

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
          <!-- Banner Hero -->
          <div class="h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative flex items-end justify-between p-4">
            <button
              type="button"
              data-action="close-modal"
              class="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center backdrop-blur-xs transition cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Profile Info Container -->
          <div class="px-6 pb-6 pt-0 relative">
            <!-- Floating Avatar -->
            <div class="-mt-12 mb-4 flex items-end justify-between">
              <div class="h-20 w-20 rounded-2xl ${palette.bg} ${palette.text} border-4 border-white dark:border-slate-900 flex items-center justify-center font-bold text-2xl shadow-lg select-none">
                ${escapeHtml(initials)}
              </div>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  data-action="toggle-favorite"
                  data-id="${escapeHtml(contact.id)}"
                  class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition cursor-pointer"
                  title="${contact.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}"
                >
                  <svg class="w-5 h-5 ${contact.isFavorite ? 'fill-amber-400 text-amber-400' : ''}" fill="${contact.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
                <button
                  type="button"
                  data-action="download-vcard"
                  data-id="${escapeHtml(contact.id)}"
                  class="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  title="Export .vcf contact card"
                >
                  <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>vCard (.vcf)</span>
                </button>
              </div>
            </div>

            <!-- Full Name & Company -->
            <div class="mb-5">
              <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                ${escapeHtml(fullName)}
                ${
                  contact.isFavorite
                    ? '<span class="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium">Favorite</span>'
                    : ''
                }
              </h2>
              ${
                contact.company
                  ? `<p class="text-sm text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                      </svg>
                      ${escapeHtml(contact.company)}
                    </p>`
                  : ''
              }
            </div>

            <!-- Tags -->
            <div class="flex items-center gap-1.5 flex-wrap mb-6">
              ${
                contact.tags && contact.tags.length > 0
                  ? contact.tags
                      .map(
                        (t) => `
                    <span class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      ${escapeHtml(t)}
                    </span>
                  `
                      )
                      .join('')
                  : '<span class="text-xs text-slate-400 italic">No assigned tags</span>'
              }
            </div>

            <!-- Contact Information Grid -->
            <div class="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-sm mb-6">
              <!-- Email -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-white dark:bg-slate-800 text-indigo-500 shadow-2xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Email</div>
                    <a href="mailto:${escapeHtml(contact.email)}" class="text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium">
                      ${escapeHtml(contact.email)}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  data-action="copy-email"
                  data-value="${escapeHtml(contact.email)}"
                  class="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Copy email"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              <!-- Phone -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-white dark:bg-slate-800 text-indigo-500 shadow-2xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Phone</div>
                    <a href="tel:${escapeHtml(contact.phone)}" class="text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium font-mono">
                      ${escapeHtml(contact.phone)}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  data-action="copy-phone"
                  data-value="${escapeHtml(contact.phone)}"
                  class="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Copy phone"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>

              <!-- Added Date -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                <span class="text-slate-400">Created:</span>
                <span class="text-slate-600 dark:text-slate-300 font-medium">${formatDate(contact.createdAt)}</span>
              </div>
            </div>

            <!-- Bottom Actions -->
            <div class="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                data-action="delete-contact"
                data-id="${escapeHtml(contact.id)}"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  data-action="close-modal"
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  data-action="edit-contact"
                  data-id="${escapeHtml(contact.id)}"
                  class="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Close any open modal
   */
  public closeModal(): void {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.innerHTML = '';
    }
    this.editingContactId = null;
    this.deletingContactId = null;
    this.viewingContactId = null;
  }

  /**
   * Generates and triggers download of standard vCard (.vcf)
   */
  public downloadVCard(contactId: string): void {
    const c = this.model.getById(contactId);
    if (!c) return;

    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.firstName} ${c.lastName}`.trim(),
      `N:${c.lastName};${c.firstName};;;`,
      c.company ? `ORG:${c.company}` : '',
      `EMAIL;TYPE=INTERNET,PREF:${c.email}`,
      `TEL;TYPE=CELL,VOICE:${c.phone}`,
      c.tags && c.tags.length > 0 ? `CATEGORIES:${c.tags.join(',')}` : '',
      'END:VCARD',
    ].filter(Boolean);

    const blob = new Blob([vCardLines.join('\r\n')], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.firstName}_${c.lastName}`.toLowerCase().replace(/\s+/g, '_') + '.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast(`vCard for ${c.firstName} downloaded`, 'success');
  }

  /**
   * Export JSON Database download
   */
  public exportJSON(): void {
    const jsonStr = this.model.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `nexus_contacts_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showToast('Contacts database successfully exported to JSON', 'success');
  }

  /**
   * Handle File reader for importing JSON
   */
  public handleJSONImport(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const res = this.model.importJSON(text, 'merge');
        if (res.success) {
          this.renderContactsList();
          this.renderFilterChips();
          this.updateStats();
          this.showToast(`Imported ${res.count} contacts successfully`, 'success');
        } else {
          this.showToast(res.error || 'Failed to import JSON file', 'error');
        }
      } catch (err) {
        this.showToast('Error reading import file', 'error');
      }
    };
    reader.readAsText(file);
  }

  /**
   * Show toast feedback notification
   */
  public showToast(message: string, type: 'success' | 'info' | 'error' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-600 text-white',
      info: 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900',
      error: 'bg-rose-600 text-white',
    }[type];

    toast.className = `${colors} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-200`;
    toast.innerHTML = `
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Animate out
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, 2800);
  }

  /**
   * Central Event Delegation Setup
   */
  private bindDelegatedEvents(): void {
    // 1. Delegated click handler on the entire document root
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Close data dropdown if clicking outside
      const dataDropdown = document.getElementById('data-dropdown');
      const dataMenuBtn = document.getElementById('btn-data-menu');
      if (
        dataDropdown &&
        !dataDropdown.classList.contains('hidden') &&
        !target.closest('#data-dropdown') &&
        !target.closest('#btn-data-menu')
      ) {
        dataDropdown.classList.add('hidden');
      }

      // Check for actions
      const actionEl = target.closest('[data-action]') as HTMLElement | null;
      if (!actionEl) return;

      const action = actionEl.getAttribute('data-action');

      switch (action) {
        case 'toggle-theme':
          this.toggleTheme();
          break;

        case 'toggle-data-menu':
          if (dataDropdown) {
            dataDropdown.classList.toggle('hidden');
          }
          break;

        case 'export-json':
          if (dataDropdown) dataDropdown.classList.add('hidden');
          this.exportJSON();
          break;

        case 'reset-seeds':
          if (dataDropdown) dataDropdown.classList.add('hidden');
          if (confirm('Reset contact book with default sample contacts?')) {
            localStorage.removeItem('nexus_contacts_db_v1');
            this.model.seedIfEmpty();
            this.renderContactsList();
            this.renderFilterChips();
            this.updateStats();
            this.showToast('Reset to sample contacts', 'info');
          }
          break;

        case 'switch-view': {
          const view = actionEl.getAttribute('data-view') as 'grid' | 'table';
          if (view && view !== this.viewMode) {
            this.viewMode = view;
            this.model.setViewMode(view);
            this.renderAppShell();
            this.renderContactsList();
            this.renderFilterChips();
            this.updateStats();
          }
          break;
        }

        case 'open-add-modal':
          this.openContactFormModal();
          break;

        case 'edit-contact': {
          const id = actionEl.getAttribute('data-id');
          if (id) {
            this.closeModal();
            this.openContactFormModal(id);
          }
          break;
        }

        case 'view-contact': {
          const id = actionEl.getAttribute('data-id');
          if (id) this.openViewDetailsModal(id);
          break;
        }

        case 'delete-contact': {
          const id = actionEl.getAttribute('data-id');
          if (id) {
            this.closeModal();
            this.openDeleteModal(id);
          }
          break;
        }

        case 'confirm-delete': {
          const id = actionEl.getAttribute('data-id');
          if (id) {
            const success = this.model.delete(id);
            this.closeModal();
            if (success) {
              this.renderContactsList();
              this.renderFilterChips();
              this.updateStats();
              this.showToast('Contact successfully deleted', 'info');
            }
          }
          break;
        }

        case 'toggle-favorite': {
          const id = actionEl.getAttribute('data-id');
          if (id) {
            const updated = this.model.toggleFavorite(id);
            if (updated) {
              this.renderContactsList();
              this.updateStats();
              this.showToast(
                updated.isFavorite ? `Starred ${updated.firstName}` : `Unstarred ${updated.firstName}`,
                'info'
              );
            }
          }
          break;
        }

        case 'copy-email': {
          const val = actionEl.getAttribute('data-value');
          if (val) {
            navigator.clipboard.writeText(val).then(() => {
              this.showToast(`Copied email "${val}"`, 'success');
            });
          }
          break;
        }

        case 'copy-phone': {
          const val = actionEl.getAttribute('data-value');
          if (val) {
            navigator.clipboard.writeText(val).then(() => {
              this.showToast(`Copied phone "${val}"`, 'success');
            });
          }
          break;
        }

        case 'download-vcard': {
          const id = actionEl.getAttribute('data-id');
          if (id) this.downloadVCard(id);
          break;
        }

        case 'filter-tag': {
          const tag = actionEl.getAttribute('data-tag') || 'all';
          this.activeTag = tag;
          this.renderFilterChips();
          this.renderContactsList();
          break;
        }

        case 'toggle-fav-filter': {
          this.favoriteOnly = !this.favoriteOnly;
          this.renderAppShell();
          this.renderContactsList();
          this.renderFilterChips();
          this.updateStats();
          break;
        }

        case 'clear-search': {
          const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.value = '';
            this.searchQuery = '';
            document.getElementById('btn-clear-search')?.classList.add('hidden');
            this.renderContactsList();
          }
          break;
        }

        case 'reset-filters': {
          this.searchQuery = '';
          this.activeTag = 'all';
          this.favoriteOnly = false;
          const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
          if (searchInput) searchInput.value = '';
          document.getElementById('btn-clear-search')?.classList.add('hidden');
          this.renderFilterChips();
          this.renderContactsList();
          break;
        }

        case 'close-modal':
          this.closeModal();
          break;

        case 'add-tag-suggestion': {
          const tagToAdd = actionEl.getAttribute('data-tag');
          const tagsInput = document.getElementById('input-tags') as HTMLInputElement | null;
          if (tagToAdd && tagsInput) {
            const current = tagsInput.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
            if (!current.includes(tagToAdd)) {
              current.push(tagToAdd);
              tagsInput.value = current.join(', ');
            }
          }
          break;
        }
      }
    });

    // 2. Real-time Live Search Input Event
    document.addEventListener('input', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.id === 'search-input') {
        const val = (target as HTMLInputElement).value;
        this.searchQuery = val;

        const clearBtn = document.getElementById('btn-clear-search');
        if (clearBtn) {
          if (val.trim()) {
            clearBtn.classList.remove('hidden');
          } else {
            clearBtn.classList.add('hidden');
          }
        }

        // Live DOM filter without full page reload
        this.renderContactsList();
      }
    });

    // 3. Sort Select Change Event
    document.addEventListener('change', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.id === 'sort-select') {
        this.sortBy = (target as HTMLSelectElement).value as SortField;
        this.renderContactsList();
      }

      if (target.id === 'json-file-input') {
        const fileInput = target as HTMLInputElement;
        if (fileInput.files && fileInput.files[0]) {
          this.handleJSONImport(fileInput.files[0]);
          fileInput.value = ''; // Reset input
        }
      }
    });

    // 4. Modal Form Submit Handling with HTML5 & regex validation
    document.addEventListener('submit', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (target.id === 'contact-modal-form') {
        e.preventDefault();
        const form = target as HTMLFormElement;
        const formData = new FormData(form);

        const contactId = (formData.get('contactId') as string) || '';
        const firstName = (formData.get('firstName') as string) || '';
        const lastName = (formData.get('lastName') as string) || '';
        const email = (formData.get('email') as string) || '';
        const phone = (formData.get('phone') as string) || '';
        const company = (formData.get('company') as string) || '';
        const tagsRaw = (formData.get('tags') as string) || '';
        const isFavorite = form.querySelector<HTMLInputElement>('input[name="isFavorite"]')?.checked ?? false;

        const tags = tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

        const contactPayload = {
          firstName,
          lastName,
          email,
          phone,
          company,
          tags,
          isFavorite,
        };

        // Validate via StorageModel
        const validation = this.model.validate(contactPayload);
        if (!validation.valid) {
          // Display validation errors
          Object.keys(validation.errors).forEach((key) => {
            const errEl = document.getElementById(`error-${key}`);
            if (errEl) {
              errEl.textContent = validation.errors[key];
              errEl.classList.remove('hidden');
            }
          });
          return;
        }

        if (contactId) {
          // Update
          const res = this.model.update(contactId, contactPayload);
          if (res.contact) {
            this.closeModal();
            this.renderContactsList();
            this.renderFilterChips();
            this.updateStats();
            this.showToast(`Updated ${res.contact.firstName} ${res.contact.lastName}`, 'success');
          } else {
            this.showToast('Failed to update contact', 'error');
          }
        } else {
          // Create
          const res = this.model.create(contactPayload);
          if (res.contact) {
            this.closeModal();
            this.renderContactsList();
            this.renderFilterChips();
            this.updateStats();
            this.showToast(`Added ${res.contact.firstName} ${res.contact.lastName}`, 'success');
          } else {
            this.showToast('Failed to create contact', 'error');
          }
        }
      }
    });

    // 5. Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // Escape closes open modals
      if (e.key === 'Escape') {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer && modalContainer.children.length > 0) {
          this.closeModal();
        }
      }

      // '/' or 'Ctrl+K' focuses search input
      if (
        (e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
        searchInput?.focus();
      }

      // 'N' or 'n' opens New Contact modal if not typing in an input
      if (
        (e.key === 'n' || e.key === 'N') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        this.openContactFormModal();
      }
    });
  }
}
