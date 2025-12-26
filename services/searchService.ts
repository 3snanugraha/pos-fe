import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEBUG_MODE } from './config';
import { SearchHistory } from './types';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_SEARCH_HISTORY = 50; // Maximum number of search items to store

export class SearchService {
  private static instance: SearchService;
  private searchHistory: SearchHistory[] = [];

  private constructor() {
    this.loadSearchHistory();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  // Load search history from storage
  private async loadSearchHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        this.searchHistory = JSON.parse(stored);
        if (DEBUG_MODE) {
          console.log('🔍 Search history loaded:', this.searchHistory.length, 'items');
        }
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to load search history:', error);
      }
    }
  }

  // Save search history to storage
  private async saveSearchHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(this.searchHistory));
      if (DEBUG_MODE) {
        console.log('💾 Search history saved:', this.searchHistory.length, 'items');
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.warn('Failed to save search history:', error);
      }
    }
  }

  // Add search query to history
  async addSearchQuery(query: string, resultsCount: number = 0): Promise<void> {
    if (!query || query.trim().length < 2) {
      return; // Don't save very short queries
    }

    const normalizedQuery = query.trim().toLowerCase();
    
    // Remove existing entry for this query
    this.searchHistory = this.searchHistory.filter(
      item => item.query.toLowerCase() !== normalizedQuery
    );

    // Add new entry at the beginning
    const newEntry: SearchHistory = {
      id: Date.now().toString(),
      query: query.trim(),
      timestamp: Date.now(),
      results_count: resultsCount,
    };

    this.searchHistory.unshift(newEntry);

    // Keep only the most recent searches
    this.searchHistory = this.searchHistory.slice(0, MAX_SEARCH_HISTORY);

    await this.saveSearchHistory();

    if (DEBUG_MODE) {
      console.log('🔍 Added search query:', query, 'with', resultsCount, 'results');
    }
  }

  // Get search history
  async getSearchHistory(limit?: number): Promise<SearchHistory[]> {
    if (this.searchHistory.length === 0) {
      await this.loadSearchHistory();
    }

    const history = [...this.searchHistory];
    return limit ? history.slice(0, limit) : history;
  }

  // Get popular searches (most frequent)
  async getPopularSearches(limit: number = 10): Promise<{
    query: string;
    count: number;
    lastSearched: number;
    avgResults: number;
  }[]> {
    const history = await this.getSearchHistory();
    const queryMap = new Map<string, {
      count: number;
      lastSearched: number;
      totalResults: number;
    }>();

    // Aggregate search data
    history.forEach(item => {
      const normalizedQuery = item.query.toLowerCase();
      const existing = queryMap.get(normalizedQuery);

      if (existing) {
        existing.count++;
        existing.lastSearched = Math.max(existing.lastSearched, item.timestamp);
        existing.totalResults += item.results_count;
      } else {
        queryMap.set(normalizedQuery, {
          count: 1,
          lastSearched: item.timestamp,
          totalResults: item.results_count,
        });
      }
    });

    // Convert to array and sort by frequency, then by recency
    return Array.from(queryMap.entries())
      .map(([query, data]) => ({
        query,
        count: data.count,
        lastSearched: data.lastSearched,
        avgResults: Math.round(data.totalResults / data.count),
      }))
      .sort((a, b) => {
        // Sort by frequency first, then by recency
        if (a.count === b.count) {
          return b.lastSearched - a.lastSearched;
        }
        return b.count - a.count;
      })
      .slice(0, limit);
  }

  // Get recent searches (by time)
  async getRecentSearches(limit: number = 10): Promise<SearchHistory[]> {
    const history = await this.getSearchHistory();
    return history
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Search within history
  async searchInHistory(query: string, limit: number = 5): Promise<SearchHistory[]> {
    const history = await this.getSearchHistory();
    const normalizedQuery = query.toLowerCase();

    return history
      .filter(item => item.query.toLowerCase().includes(normalizedQuery))
      .slice(0, limit);
  }

  // Get suggestions based on search history
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.length < 1) {
      // Return recent searches if no query
      const recent = await this.getRecentSearches(limit);
      return recent.map(item => item.query);
    }

    const history = await this.getSearchHistory();
    const normalizedQuery = query.toLowerCase();
    const suggestions = new Set<string>();

    // Find matches that start with the query
    history.forEach(item => {
      if (item.query.toLowerCase().startsWith(normalizedQuery)) {
        suggestions.add(item.query);
      }
    });

    // Find matches that contain the query
    if (suggestions.size < limit) {
      history.forEach(item => {
        if (item.query.toLowerCase().includes(normalizedQuery) && 
            !item.query.toLowerCase().startsWith(normalizedQuery)) {
          suggestions.add(item.query);
        }
      });
    }

    return Array.from(suggestions).slice(0, limit);
  }

  // Remove specific search from history
  async removeSearchHistory(id: string): Promise<void> {
    this.searchHistory = this.searchHistory.filter(item => item.id !== id);
    await this.saveSearchHistory();

    if (DEBUG_MODE) {
      console.log('🗑️ Removed search history item:', id);
    }
  }

  // Clear all search history
  async clearSearchHistory(): Promise<void> {
    this.searchHistory = [];
    await this.saveSearchHistory();

    if (DEBUG_MODE) {
      console.log('🧹 Cleared all search history');
    }
  }

  // Get search statistics
  async getSearchStats(): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    avgResultsPerSearch: number;
    mostSearchedQuery: string | null;
    searchesThisWeek: number;
    searchesToday: number;
  }> {
    const history = await this.getSearchHistory();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;

    const uniqueQueries = new Set(history.map(item => item.query.toLowerCase())).size;
    const totalResults = history.reduce((sum, item) => sum + item.results_count, 0);
    const avgResults = history.length > 0 ? totalResults / history.length : 0;

    // Find most searched query
    const queryCount = new Map<string, number>();
    history.forEach(item => {
      const normalized = item.query.toLowerCase();
      queryCount.set(normalized, (queryCount.get(normalized) || 0) + 1);
    });

    let mostSearched = null;
    let maxCount = 0;
    queryCount.forEach((count, query) => {
      if (count > maxCount) {
        maxCount = count;
        mostSearched = query;
      }
    });

    // Count searches by time period
    const searchesToday = history.filter(item => 
      now - item.timestamp < dayMs
    ).length;

    const searchesThisWeek = history.filter(item => 
      now - item.timestamp < weekMs
    ).length;

    return {
      totalSearches: history.length,
      uniqueQueries,
      avgResultsPerSearch: Math.round(avgResults * 10) / 10,
      mostSearchedQuery: mostSearched,
      searchesThisWeek,
      searchesToday,
    };
  }

  // Clean old search history (older than 30 days)
  async cleanOldHistory(): Promise<number> {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const oldCount = this.searchHistory.length;
    
    this.searchHistory = this.searchHistory.filter(
      item => item.timestamp > thirtyDaysAgo
    );

    const removedCount = oldCount - this.searchHistory.length;
    
    if (removedCount > 0) {
      await this.saveSearchHistory();
      
      if (DEBUG_MODE) {
        console.log('🧹 Cleaned', removedCount, 'old search history items');
      }
    }

    return removedCount;
  }

  // Export search history
  async exportSearchHistory(): Promise<string> {
    const history = await this.getSearchHistory();
    const stats = await this.getSearchStats();
    
    const exportData = {
      exportDate: new Date().toISOString(),
      statistics: stats,
      history: history,
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Import search history
  async importSearchHistory(data: string): Promise<boolean> {
    try {
      const importData = JSON.parse(data);
      
      if (importData.history && Array.isArray(importData.history)) {
        // Validate and merge with existing history
        const validHistory = importData.history.filter((item: any) => 
          item.id && item.query && item.timestamp
        );

        // Remove duplicates and merge
        const existingIds = new Set(this.searchHistory.map(item => item.id));
        const newItems = validHistory.filter((item: SearchHistory) => 
          !existingIds.has(item.id)
        );

        this.searchHistory = [...this.searchHistory, ...newItems]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_SEARCH_HISTORY);

        await this.saveSearchHistory();

        if (DEBUG_MODE) {
          console.log('📥 Imported', newItems.length, 'new search history items');
        }

        return true;
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.error('Failed to import search history:', error);
      }
    }

    return false;
  }
}

// Singleton instance
export const searchService = SearchService.getInstance();

// Helper functions for search-related operations
export const searchHelpers = {
  // Normalize search query
  normalizeQuery: (query: string): string => {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  },

  // Highlight search terms in text
  highlightSearchTerms: (text: string, searchQuery: string): string => {
    if (!searchQuery) return text;
    
    const query = searchQuery.trim();
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  },

  // Get search term variations
  getSearchVariations: (query: string): string[] => {
    const variations = new Set<string>();
    const normalized = searchHelpers.normalizeQuery(query);
    
    variations.add(normalized);
    variations.add(normalized.replace(/s$/, '')); // Remove plural 's'
    variations.add(normalized + 's'); // Add plural 's'
    
    // Split compound words
    const words = normalized.split(' ');
    if (words.length > 1) {
      words.forEach(word => variations.add(word));
    }
    
    return Array.from(variations);
  },

  // Format search results count
  formatResultsCount: (count: number): string => {
    if (count === 0) return 'Tidak ada hasil';
    if (count === 1) return '1 hasil';
    if (count < 1000) return `${count} hasil`;
    if (count < 1000000) return `${Math.round(count / 1000 * 10) / 10}K hasil`;
    return `${Math.round(count / 1000000 * 10) / 10}M hasil`;
  },

  // Calculate search relevance score
  calculateRelevance: (item: any, query: string): number => {
    const normalizedQuery = searchHelpers.normalizeQuery(query);
    const normalizedTitle = searchHelpers.normalizeQuery(item.nama_produk || '');
    const normalizedDescription = searchHelpers.normalizeQuery(item.deskripsi || '');
    
    let score = 0;
    
    // Exact match in title (highest score)
    if (normalizedTitle === normalizedQuery) score += 100;
    
    // Title starts with query
    if (normalizedTitle.startsWith(normalizedQuery)) score += 80;
    
    // Title contains query
    if (normalizedTitle.includes(normalizedQuery)) score += 60;
    
    // Description contains query
    if (normalizedDescription.includes(normalizedQuery)) score += 40;
    
    // Boost score for popular items (if available)
    if (item.rating && item.rating > 4) score += 10;
    if (item.sales_count && item.sales_count > 100) score += 5;
    
    return score;
  },
};
