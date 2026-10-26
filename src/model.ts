/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
}

export type SortField = 'name' | 'name-desc' | 'created-desc' | 'created-asc' | 'company';

export interface QueryFilter {
  search?: string;
  tag?: string;
  favoriteOnly?: boolean;
  sortBy?: SortField;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export class StorageModel {
  private readonly STORAGE_KEY = 'nexus_contacts_db_v1';
  private readonly THEME_KEY = 'nexus_contacts_theme';
  private readonly VIEW_KEY = 'nexus_contacts_view_mode';

  constructor() {
    this.seedIfEmpty();
  }

  /**
   * Generates a unique UUID v4 string with fallback
   */
  public generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Validates contact fields using regex and constraints
   */
  public validate(data: Partial<Contact>): ValidationResult {
    const errors: Record<string, string> = {};

    const firstName = (data.firstName || '').trim();
    if (!firstName) {
      errors.firstName = 'First name is required.';
    } else if (firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters.';
    }

    const lastName = (data.lastName || '').trim();
    if (!lastName) {
      errors.lastName = 'Last name is required.';
    }

    const email = (data.email || '').trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email) {
      errors.email = 'Email address is required.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    const phone = (data.phone || '').trim();
    // Allows international formats: +1 (555) 000-0000, +44 20 7123 4567, 555-123-4567, etc.
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]{6,15}$/;
    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(phone)) {
      errors.phone = 'Please enter a valid phone number (at least 7 digits, digits/dashes/spaces/plus only).';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Read raw array from localStorage
   */
  private readStorage(): Contact[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Failed to parse contacts from localStorage', err);
      return [];
    }
  }

  /**
   * Write raw array to localStorage
   */
  private writeStorage(contacts: Contact[]): boolean {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
      return true;
    } catch (err) {
      console.error('Failed to save contacts to localStorage', err);
      return false;
    }
  }

  /**
   * Seed initial contacts if localStorage is empty
   */
  public seedIfEmpty(): void {
    const existing = this.readStorage();
    if (existing && existing.length > 0) return;

    const initialSeeds: Contact[] = [
      {
        id: this.generateUUID(),
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'elena.rostova@auroraresearch.io',
        phone: '+1 (415) 890-2341',
        company: 'Aurora BioTech',
        tags: ['Work', 'VIP'],
        isFavorite: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
      },
      {
        id: this.generateUUID(),
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'marcus.vance@solardrive.dev',
        phone: '+1 (650) 412-8876',
        company: 'SolarDrive Dynamics',
        tags: ['Work', 'Clients'],
        isFavorite: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      },
      {
        id: this.generateUUID(),
        firstName: 'Sarah',
        lastName: 'Jenkins',
        email: 'sjenkins@cloudmatrix.co',
        phone: '+1 (206) 555-0199',
        company: 'CloudMatrix Inc.',
        tags: ['Friends', 'Work'],
        isFavorite: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
      },
      {
        id: this.generateUUID(),
        firstName: 'Kenji',
        lastName: 'Takahashi',
        email: 'k.takahashi@tokyodesign.jp',
        phone: '+81 3 5555 0142',
        company: 'Kuro Studio',
        tags: ['Clients'],
        isFavorite: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      },
      {
        id: this.generateUUID(),
        firstName: 'Chloe',
        lastName: 'Dupont',
        email: 'chloe.dupont@parisart.fr',
        phone: '+33 1 42 68 55 00',
        company: 'Atelier Dupont',
        tags: ['Family'],
        isFavorite: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      },
      {
        id: this.generateUUID(),
        firstName: 'David',
        lastName: 'O’Connor',
        email: 'david.oc@dublinfintech.ie',
        phone: '+353 1 496 0123',
        company: 'Emerald Ledger',
        tags: ['Friends'],
        isFavorite: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ];

    this.writeStorage(initialSeeds);
  }

  /**
   * Get all contacts
   */
  public getAll(): Contact[] {
    return this.readStorage();
  }

  /**
   * Get contact by ID
   */
  public getById(id: string): Contact | null {
    const list = this.readStorage();
    return list.find((c) => c.id === id) || null;
  }

  /**
   * Create a new contact
   */
  public create(data: Omit<Contact, 'id' | 'createdAt'>): { contact?: Contact; errors?: Record<string, string> } {
    const validation = this.validate(data);
    if (!validation.valid) {
      return { errors: validation.errors };
    }

    const cleanTags = Array.from(
      new Set(
        (data.tags || [])
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      )
    );

    const newContact: Contact = {
      id: this.generateUUID(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      company: (data.company || '').trim(),
      tags: cleanTags,
      isFavorite: Boolean(data.isFavorite),
      createdAt: new Date().toISOString(),
    };

    const contacts = this.readStorage();
    contacts.unshift(newContact);
    this.writeStorage(contacts);

    return { contact: newContact };
  }

  /**
   * Update an existing contact
   */
  public update(
    id: string,
    updates: Partial<Omit<Contact, 'id' | 'createdAt'>>
  ): { contact?: Contact; errors?: Record<string, string> } {
    const contacts = this.readStorage();
    const index = contacts.findIndex((c) => c.id === id);
    if (index === -1) {
      return { errors: { general: 'Contact not found' } };
    }

    const current = contacts[index];
    const merged: Partial<Contact> = {
      ...current,
      ...updates,
    };

    const validation = this.validate(merged);
    if (!validation.valid) {
      return { errors: validation.errors };
    }

    let cleanTags = current.tags;
    if (updates.tags) {
      cleanTags = Array.from(
        new Set(
          updates.tags
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        )
      );
    }

    const updatedContact: Contact = {
      ...current,
      firstName: updates.firstName !== undefined ? updates.firstName.trim() : current.firstName,
      lastName: updates.lastName !== undefined ? updates.lastName.trim() : current.lastName,
      email: updates.email !== undefined ? updates.email.trim().toLowerCase() : current.email,
      phone: updates.phone !== undefined ? updates.phone.trim() : current.phone,
      company: updates.company !== undefined ? updates.company.trim() : current.company,
      tags: cleanTags,
      isFavorite: updates.isFavorite !== undefined ? Boolean(updates.isFavorite) : current.isFavorite,
    };

    contacts[index] = updatedContact;
    this.writeStorage(contacts);
    return { contact: updatedContact };
  }

  /**
   * Delete a contact by ID
   */
  public delete(id: string): boolean {
    const contacts = this.readStorage();
    const initialLen = contacts.length;
    const filtered = contacts.filter((c) => c.id !== id);
    if (filtered.length !== initialLen) {
      this.writeStorage(filtered);
      return true;
    }
    return false;
  }

  /**
   * Toggle favorite state
   */
  public toggleFavorite(id: string): Contact | null {
    const contacts = this.readStorage();
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return null;

    contact.isFavorite = !contact.isFavorite;
    this.writeStorage(contacts);
    return contact;
  }

  /**
   * Filter and sort query
   */
  public query(filters: QueryFilter = {}): Contact[] {
    let result = this.readStorage();

    // Live search filter across firstName, lastName, email, phone, company, tags
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((c) => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
        const email = c.email.toLowerCase();
        const phone = c.phone.toLowerCase();
        const company = (c.company || '').toLowerCase();
        const tags = (c.tags || []).join(' ').toLowerCase();

        return (
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          company.includes(q) ||
          tags.includes(q)
        );
      });
    }

    // Tag filter
    if (filters.tag && filters.tag !== 'all') {
      result = result.filter((c) => (c.tags || []).some((t) => t.toLowerCase() === filters.tag?.toLowerCase()));
    }

    // Favorite only filter
    if (filters.favoriteOnly) {
      result = result.filter((c) => c.isFavorite);
    }

    // Sorting
    const sortBy = filters.sortBy || 'name';
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case 'name-desc': {
          const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
          return nameB.localeCompare(nameA);
        }
        case 'created-desc': {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        case 'created-asc': {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        case 'company': {
          const compA = (a.company || '').toLowerCase();
          const compB = (b.company || '').toLowerCase();
          if (!compA && compB) return 1;
          if (compA && !compB) return -1;
          return compA.localeCompare(compB);
        }
        default:
          return 0;
      }
    });

    return result;
  }

  /**
   * Get all unique tags and their usage count
   */
  public getAllTags(): { tag: string; count: number }[] {
    const contacts = this.readStorage();
    const tagMap = new Map<string, number>();

    contacts.forEach((c) => {
      (c.tags || []).forEach((t) => {
        const normalized = t.trim();
        if (normalized) {
          tagMap.set(normalized, (tagMap.get(normalized) || 0) + 1);
        }
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /**
   * Get metrics summary
   */
  public getStats() {
    const list = this.readStorage();
    const favorites = list.filter((c) => c.isFavorite).length;
    const companySet = new Set(list.map((c) => c.company.trim()).filter(Boolean));
    const tagSet = new Set(list.flatMap((c) => c.tags || []).map((t) => t.trim()).filter(Boolean));

    return {
      total: list.length,
      favorites,
      companies: companySet.size,
      tagsCount: tagSet.size,
    };
  }

  /**
   * Export all contacts to JSON string
   */
  public exportJSON(): string {
    const list = this.readStorage();
    const payload = {
      app: 'Nexus Contacts',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      contactCount: list.length,
      contacts: list,
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Import contacts from JSON string
   */
  public importJSON(
    jsonString: string,
    mode: 'merge' | 'replace' = 'merge'
  ): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      const rawList = Array.isArray(parsed) ? parsed : parsed.contacts;

      if (!Array.isArray(rawList)) {
        return { success: false, count: 0, error: 'Invalid JSON format: missing contacts array.' };
      }

      const validContacts: Contact[] = [];
      for (const item of rawList) {
        if (!item || typeof item !== 'object') continue;
        const validation = this.validate({
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          phone: item.phone,
        });

        if (validation.valid) {
          validContacts.push({
            id: item.id && typeof item.id === 'string' ? item.id : this.generateUUID(),
            firstName: String(item.firstName).trim(),
            lastName: String(item.lastName).trim(),
            email: String(item.email).trim().toLowerCase(),
            phone: String(item.phone).trim(),
            company: String(item.company || '').trim(),
            tags: Array.isArray(item.tags) ? item.tags.map(String).map((t: string) => t.trim()).filter(Boolean) : [],
            isFavorite: Boolean(item.isFavorite),
            createdAt: item.createdAt ? String(item.createdAt) : new Date().toISOString(),
          });
        }
      }

      if (validContacts.length === 0) {
        return { success: false, count: 0, error: 'No valid contact records found in imported file.' };
      }

      if (mode === 'replace') {
        this.writeStorage(validContacts);
        return { success: true, count: validContacts.length };
      } else {
        // Merge mode: update duplicates by email or add new
        const current = this.readStorage();
        let addedCount = 0;
        let updatedCount = 0;

        validContacts.forEach((imported) => {
          const existingIdx = current.findIndex(
            (c) => c.email.toLowerCase() === imported.email.toLowerCase() || c.id === imported.id
          );
          if (existingIdx !== -1) {
            current[existingIdx] = { ...current[existingIdx], ...imported };
            updatedCount++;
          } else {
            current.unshift(imported);
            addedCount++;
          }
        });

        this.writeStorage(current);
        return { success: true, count: addedCount + updatedCount };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown parsing error';
      return { success: false, count: 0, error: `JSON Parse error: ${message}` };
    }
  }

  /**
   * Theme persistence
   */
  public getTheme(): 'dark' | 'light' {
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    // Check system preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  public setTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(this.THEME_KEY, theme);
  }

  /**
   * View mode persistence (cards vs table)
   */
  public getViewMode(): 'grid' | 'table' {
    const saved = localStorage.getItem(this.VIEW_KEY);
    return saved === 'table' ? 'table' : 'grid';
  }

  public setViewMode(mode: 'grid' | 'table'): void {
    localStorage.setItem(this.VIEW_KEY, mode);
  }
}
