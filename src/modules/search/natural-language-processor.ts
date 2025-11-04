export interface EntityMapping {
  locations: Record<string, LocationEntity>;
  cuisines: Record<string, string>;
  categories: Record<string, string>;
  contentTypes: Record<string, string>;
  temporal: Record<string, TemporalEntity>;
}

export interface LocationEntity {
  country?: string;
  state?: string;
  city?: string;
}

export interface TemporalEntity {
  type: 'relative' | 'absolute';
  value: Date | number; // Date for absolute, days for relative
}

export interface ExtractedEntities {
  locations: LocationEntity[];
  cuisines: string[];
  categories: string[];
  contentTypes: string[];
  temporal: TemporalEntity[];
  unrecognized: string[];
}

export interface QueryInterpretation {
  yamlProperties: Record<string, any>;
  arrayMode?: 'exact' | 'contains' | 'any';
  matchMode?: 'all' | 'any';
  dateFilters?: {
    modifiedAfter?: Date;
    modifiedBefore?: Date;
    createdAfter?: Date;
    createdBefore?: Date;
  };
  confidence: number; // 0-1 scale
  interpretation: string; // Human-readable explanation
  suggestions?: string[];
  unrecognized?: string[];
  resilient?: boolean; // Indicates graceful handling of parsing errors
}

export class NaturalLanguageProcessor {
  private static entityMapping: EntityMapping = {
    locations: {
      // Countries
      'canada': { country: 'Canada [CA]' },
      'united states': { country: 'United States [US]' },
      'usa': { country: 'United States [US]' },
      'us': { country: 'United States [US]' },
      'france': { country: 'France [FR]' },
      'italy': { country: 'Italy [IT]' },
      'japan': { country: 'Japan [JP]' },
      'uk': { country: 'United Kingdom [UK]' },
      'united kingdom': { country: 'United Kingdom [UK]' },
      
      // Canadian Provinces
      'quebec': { state: 'Quebec' },
      'ontario': { state: 'Ontario' },
      'british columbia': { state: 'British Columbia' },
      'alberta': { state: 'Alberta' },
      'manitoba': { state: 'Manitoba' },
      'saskatchewan': { state: 'Saskatchewan' },
      'nova scotia': { state: 'Nova Scotia' },
      'new brunswick': { state: 'New Brunswick' },
      'newfoundland': { state: 'Newfoundland and Labrador' },
      'prince edward island': { state: 'Prince Edward Island' },
      'pei': { state: 'Prince Edward Island' },
      
      // US States (major ones)
      'california': { state: 'California' },
      'new york': { state: 'New York' },
      'texas': { state: 'Texas' },
      'florida': { state: 'Florida' },
      'illinois': { state: 'Illinois' },
      'washington': { state: 'Washington' },
      'oregon': { state: 'Oregon' },
      'nevada': { state: 'Nevada' },
      'arizona': { state: 'Arizona' },
      
      // Major Cities
      'montreal': { city: 'Montreal' },
      'toronto': { city: 'Toronto' },
      'vancouver': { city: 'Vancouver' },
      'ottawa': { city: 'Ottawa' },
      'calgary': { city: 'Calgary' },
      'edmonton': { city: 'Edmonton' },
      'quebec city': { city: 'Quebec City' },
      'new york city': { city: 'New York' },
      'nyc': { city: 'New York' },
      'los angeles': { city: 'Los Angeles' },
      'san francisco': { city: 'San Francisco' },
      'chicago': { city: 'Chicago' },
      'boston': { city: 'Boston' },
      'seattle': { city: 'Seattle' },
      'portland': { city: 'Portland' },
      'miami': { city: 'Miami' },
      'las vegas': { city: 'Las Vegas' },
      'paris': { city: 'Paris' },
      'london': { city: 'London' },
      'tokyo': { city: 'Tokyo' },
      'rome': { city: 'Rome' },
    },
    
    cuisines: {
      'barbecue': 'Barbecue',
      'bbq': 'Barbecue',
      'italian': 'Italian',
      'sushi': 'Japanese',
      'japanese': 'Japanese',
      'chinese': 'Chinese',
      'thai': 'Thai',
      'mexican': 'Mexican',
      'indian': 'Indian',
      'french': 'French',
      'mediterranean': 'Mediterranean',
      'greek': 'Greek',
      'korean': 'Korean',
      'vietnamese': 'Vietnamese',
      'pizza': 'Pizza',
      'burger': 'American',
      'american': 'American',
      'seafood': 'Seafood',
      'vegetarian': 'Vegetarian',
      'vegan': 'Vegan',
      'steakhouse': 'Steakhouse',
      'cafe': 'Cafe',
      'coffee': 'Coffee',
      'bakery': 'Bakery',
      'dessert': 'Dessert'
    },
    
    categories: {
      'restaurants': 'Restaurant',
      'restaurant': 'Restaurant',
      'articles': 'Article',
      'article': 'Article',
      'recipes': 'Recipe',
      'recipe': 'Recipe',
      'books': 'Book',
      'book': 'Book',
      'movies': 'Movie',
      'movie': 'Movie',
      'people': 'Person',
      'person': 'Person',
      'tasks': 'Task',
      'task': 'Task',
      'projects': 'Project',
      'project': 'Project',
      'notes': 'Note',
      'note': 'Note'
    },
    
    contentTypes: {
      'daily note': 'Daily Note',
      'daily notes': 'Daily Note',
      'meeting': 'Meeting',
      'meetings': 'Meeting',
      'journal': 'Journal',
      'journals': 'Journal',
      'review': 'Review',
      'reviews': 'Review'
    },
    
    temporal: {
      'recent': { type: 'relative', value: 7 },
      'recently': { type: 'relative', value: 7 },
      'last week': { type: 'relative', value: 7 },
      'past week': { type: 'relative', value: 7 },
      'last month': { type: 'relative', value: 30 },
      'past month': { type: 'relative', value: 30 },
      'today': { type: 'relative', value: 0 },
      'yesterday': { type: 'relative', value: 1 },
      'this week': { type: 'relative', value: 7 },
      'this month': { type: 'relative', value: 30 }
    }
  };

  /**
   * Process natural language query and extract structured search parameters
   */
  static processQuery(query: string): QueryInterpretation {
    const normalizedQuery = query.toLowerCase().trim();
    const entities = this.extractEntities(normalizedQuery);
    const yamlProperties: Record<string, any> = {};
    const dateFilters: any = {};
    let confidence = 0;
    const interpretationParts: string[] = [];
    
    // Process locations
    if (entities.locations.length > 0) {
      entities.locations.forEach(location => {
        if (location.country) {
          yamlProperties.country = location.country;
          interpretationParts.push(`Country: ${location.country}`);
          confidence += 0.2;
        }
        if (location.state) {
          yamlProperties.state = location.state;
          interpretationParts.push(`State/Province: ${location.state}`);
          confidence += 0.2;
        }
        if (location.city) {
          yamlProperties.city = location.city;
          interpretationParts.push(`City: ${location.city}`);
          confidence += 0.2;
        }
      });
    }
    
    // Process cuisines
    if (entities.cuisines.length > 0) {
      if (entities.cuisines.length === 1) {
        yamlProperties.cuisine = entities.cuisines[0];
        interpretationParts.push(`Cuisine: ${entities.cuisines[0]}`);
      } else {
        yamlProperties.cuisine = entities.cuisines;
        interpretationParts.push(`Cuisines: ${entities.cuisines.join(', ')}`);
      }
      confidence += 0.3;
    }
    
    // Process categories
    if (entities.categories.length > 0) {
      yamlProperties.category = entities.categories[0]; // Use first match
      interpretationParts.push(`Category: ${entities.categories[0]}`);
      confidence += 0.3;
    }
    
    // Process content types
    if (entities.contentTypes.length > 0) {
      yamlProperties['content type'] = entities.contentTypes[0];
      interpretationParts.push(`Content Type: ${entities.contentTypes[0]}`);
      confidence += 0.3;
    }
    
    // Process temporal entities
    if (entities.temporal.length > 0) {
      const temporal = entities.temporal[0]; // Use first match
      if (temporal.type === 'relative') {
        const date = new Date();
        date.setDate(date.getDate() - (temporal.value as number));
        dateFilters.modifiedAfter = date;
        interpretationParts.push(`Modified after: ${date.toLocaleDateString()}`);
        confidence += 0.2;
      }
    }
    
    // Generate suggestions for unrecognized entities
    const suggestions: string[] = [];
    if (entities.unrecognized.length > 0) {
      suggestions.push(`Unrecognized terms: ${entities.unrecognized.join(', ')}`);
      suggestions.push('Try being more specific with location, cuisine, or category terms');
    }
    
    // Determine array mode based on query complexity
    let arrayMode: 'exact' | 'contains' | 'any' = 'contains';
    if (entities.cuisines.length > 1) {
      arrayMode = 'any'; // Multiple cuisines = any match
    }
    
    // Calculate final confidence
    confidence = Math.min(confidence, 1.0);
    if (Object.keys(yamlProperties).length === 0 && Object.keys(dateFilters).length === 0) {
      confidence = 0;
    }
    
    const interpretation = interpretationParts.length > 0 
      ? `Searching for: ${interpretationParts.join(' • ')}`
      : 'No specific entities recognized - using general text search';
    
    return {
      yamlProperties,
      arrayMode,
      matchMode: 'all',
      dateFilters: Object.keys(dateFilters).length > 0 ? dateFilters : undefined,
      confidence,
      interpretation,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      unrecognized: entities.unrecognized.length > 0 ? entities.unrecognized : undefined,
      resilient: true // Always resilient with graceful error handling
    };
  }

  /**
   * Extract entities from normalized query text
   */
  private static extractEntities(normalizedQuery: string): ExtractedEntities {
    const entities: ExtractedEntities = {
      locations: [],
      cuisines: [],
      categories: [],
      contentTypes: [],
      temporal: [],
      unrecognized: []
    };
    
    // Extract locations (prioritize longer matches first)
    const locationKeys = Object.keys(this.entityMapping.locations)
      .sort((a, b) => b.length - a.length);
    
    for (const locationKey of locationKeys) {
      if (normalizedQuery.includes(locationKey)) {
        entities.locations.push(this.entityMapping.locations[locationKey]);
        // Remove matched text to avoid double-matching
        normalizedQuery = normalizedQuery.replace(locationKey, ' ');
      }
    }
    
    // Extract cuisines
    const cuisineKeys = Object.keys(this.entityMapping.cuisines)
      .sort((a, b) => b.length - a.length);
    
    for (const cuisineKey of cuisineKeys) {
      if (normalizedQuery.includes(cuisineKey)) {
        const cuisineValue = this.entityMapping.cuisines[cuisineKey];
        if (!entities.cuisines.includes(cuisineValue)) {
          entities.cuisines.push(cuisineValue);
        }
        normalizedQuery = normalizedQuery.replace(cuisineKey, ' ');
      }
    }
    
    // Extract categories
    const categoryKeys = Object.keys(this.entityMapping.categories)
      .sort((a, b) => b.length - a.length);
    
    for (const categoryKey of categoryKeys) {
      if (normalizedQuery.includes(categoryKey)) {
        const categoryValue = this.entityMapping.categories[categoryKey];
        if (!entities.categories.includes(categoryValue)) {
          entities.categories.push(categoryValue);
        }
        normalizedQuery = normalizedQuery.replace(categoryKey, ' ');
      }
    }
    
    // Extract content types
    const contentTypeKeys = Object.keys(this.entityMapping.contentTypes)
      .sort((a, b) => b.length - a.length);
    
    for (const contentTypeKey of contentTypeKeys) {
      if (normalizedQuery.includes(contentTypeKey)) {
        const contentTypeValue = this.entityMapping.contentTypes[contentTypeKey];
        if (!entities.contentTypes.includes(contentTypeValue)) {
          entities.contentTypes.push(contentTypeValue);
        }
        normalizedQuery = normalizedQuery.replace(contentTypeKey, ' ');
      }
    }
    
    // Extract temporal entities
    const temporalKeys = Object.keys(this.entityMapping.temporal)
      .sort((a, b) => b.length - a.length);
    
    for (const temporalKey of temporalKeys) {
      if (normalizedQuery.includes(temporalKey)) {
        entities.temporal.push(this.entityMapping.temporal[temporalKey]);
        normalizedQuery = normalizedQuery.replace(temporalKey, ' ');
      }
    }
    
    // Collect unrecognized meaningful terms (filter out common words)
    const commonWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'i', 'me', 'my', 'you', 'your', 'he', 'she', 'it', 'we', 'they', 'them', 'their',
      'find', 'show', 'get', 'give', 'want', 'need', 'looking', 'search', 'some', 'any',
      'that', 'this', 'these', 'those', 'what', 'where', 'when', 'why', 'how',
      'next', 'week', 'there', 'out', 'visit', 'try', 'tried', 'new', 'good', 'best'
    ]);
    
    const remainingWords = normalizedQuery
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .filter(word => word.trim().length > 0);
    
    entities.unrecognized = [...new Set(remainingWords)]; // Remove duplicates
    
    return entities;
  }

  /**
   * Generate helpful suggestions based on query analysis
   */
  static generateSuggestions(query: string, interpretation: QueryInterpretation): string[] {
    const suggestions: string[] = [];
    
    if (interpretation.confidence < 0.3) {
      suggestions.push('Try using specific location names (e.g., "Montreal", "Quebec", "Toronto")');
      suggestions.push('Include cuisine types (e.g., "Italian", "Japanese", "barbecue")');
      suggestions.push('Specify categories (e.g., "restaurants", "articles", "recipes")');
    }
    
    if (interpretation.unrecognized && interpretation.unrecognized.length > 0) {
      suggestions.push('Some terms were not recognized - check spelling or try synonyms');
    }
    
    if (Object.keys(interpretation.yamlProperties).length === 0) {
      suggestions.push('No specific filters detected - result will use general text search');
    }
    
    return suggestions;
  }

  /**
   * Format interpretation for user display
   */
  static formatInterpretation(interpretation: QueryInterpretation): string {
    let output = `🔍 ${interpretation.interpretation}\n`;
    
    if (interpretation.confidence > 0) {
      output += `📋 Search filters:\n`;
      Object.entries(interpretation.yamlProperties).forEach(([key, value]) => {
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        output += `   • ${key}: ${displayValue}\n`;
      });
      
      if (interpretation.dateFilters) {
        Object.entries(interpretation.dateFilters).forEach(([key, value]) => {
          if (value instanceof Date) {
            output += `   • ${key}: ${value.toLocaleDateString()}\n`;
          }
        });
      }
      
      output += `\n💡 Confidence: ${Math.round(interpretation.confidence * 100)}%\n`;
    }
    
    if (interpretation.suggestions && interpretation.suggestions.length > 0) {
      output += `\n💭 Suggestions:\n`;
      interpretation.suggestions.forEach(suggestion => {
        output += `   • ${suggestion}\n`;
      });
    }
    
    return output;
  }
}