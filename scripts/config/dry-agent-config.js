/**
 * Configuration for DRY Analysis Agent
 * 
 * This agent analyzes the codebase for duplication opportunities using:
 * 1. Fast embedding-based pre-filtering
 * 2. Claude 3.5 Haiku for semantic analysis
 * 3. Project-specific rules from .cursor/rules/dry-enforcement.mdc
 */

export default {
  // ============================================
  // What to Analyze
  // ============================================
  include: [
    'src/components/**/*.{js,jsx}',
    'src/hooks/**/*.{js,jsx}',
    'src/services/**/*.{js,jsx}',
    'src/contexts/**/*.{js,jsx}',
    'src/utils/**/*.{js,jsx}',
  ],
  
  exclude: [
    '**/*.test.{js,jsx}',
    '**/*.spec.{js,jsx}',
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.config.{js,ts}',
  ],

  // High-priority directories (analyzed first)
  priorityDirectories: [
    'src/components/Canvas',
    'src/hooks',
    'src/services',
  ],

  // ============================================
  // Analysis Thresholds
  // ============================================
  thresholds: {
    // Embedding similarity (0-1, cosine similarity)
    minSimilarity: 0.75,
    
    // Minimum lines of code to consider for analysis
    minLines: 10,
    
    // Maximum lines to extract per function/block
    maxLines: 100,
    
    // Minimum occurrences to flag as duplication
    minOccurrences: 2,
  },

  // ============================================
  // AI Model Settings
  // ============================================
  ai: {
    // Primary analysis model
    // Options: 'openai' or 'anthropic'
    provider: 'openai',
    
    // OpenAI models (if provider: 'openai')
    // - 'gpt-4o': Best quality, $2.50/$10 per M tokens
    // - 'gpt-4o-mini': Fast & cheap, $0.15/$0.60 per M tokens (recommended)
    model: 'gpt-4o-mini',
    
    // Anthropic models (if provider: 'anthropic')
    // - 'claude-3-5-haiku-20241022': Good quality, $1/$5 per M tokens
    // anthropicModel: 'claude-3-5-haiku-20241022',
    
    temperature: 0.1,  // Low for consistency
    maxTokens: 4000,
    
    // Embeddings for pre-filtering
    embeddingsProvider: 'openai',
    embeddingsModel: 'text-embedding-3-small',
    
    // Cost controls
    maxCostPerRun: 2.00,  // Stop if exceeding $2
    enableCaching: true,   // Use prompt caching (OpenAI supports this)
  },

  // ============================================
  // Severity Levels
  // ============================================
  severity: {
    CRITICAL: {
      color: '🔴',
      minOccurrences: 3,
      keywords: ['firebase', 'auth', 'security', 'database', 'createShape'],
    },
    HIGH: {
      color: '🟡',
      minOccurrences: 2,
      keywords: ['geometry', 'coordinate', 'calculation', 'validation'],
    },
    MEDIUM: {
      color: '🟢',
      minOccurrences: 2,
      keywords: ['component', 'hook', 'event', 'handler'],
    },
    LOW: {
      color: '⚪',
      minOccurrences: 2,
      keywords: [],
    },
  },

  // ============================================
  // Project-Specific Patterns
  // ============================================
  patterns: {
    // Firebase operations
    firebaseOps: [
      'db.collection(',
      '.doc(',
      '.get()',
      '.set(',
      '.update(',
      '.delete(',
      'writeBatch(',
    ],
    
    // Shape operations
    shapeOps: [
      'createShape',
      'updateShape',
      'deleteShape',
      'addShape',
      'shape.x',
      'shape.y',
      'shape.width',
      'shape.height',
    ],
    
    // Geometry/math
    geometryOps: [
      'Math.sqrt',
      'Math.pow',
      'Math.atan2',
      '+ width / 2',
      '+ height / 2',
      'CANVAS_WIDTH',
      'CANVAS_HEIGHT',
      'CANVAS_CENTER',
    ],
    
    // React patterns
    reactPatterns: [
      'useState(',
      'useEffect(',
      'useCallback(',
      'useContext(',
      'setShapes(',
      'prev =>',
    ],

    // Constants
    constants: [
      '5000',
      '2500',
      '#3B82F6',
      '0.8',
    ],
  },

  // ============================================
  // Output Configuration
  // ============================================
  output: {
    file: 'DRY_OPPORTUNITIES.md',
    includeCodeSnippets: true,
    maxSnippetLines: 20,
    groupBy: 'severity',  // 'severity' | 'category' | 'file'
    sortBy: 'priority',   // 'priority' | 'severity' | 'occurrences'
  },

  // ============================================
  // Performance Settings
  // ============================================
  performance: {
    maxConcurrentAnalyses: 3,
    batchSize: 10,  // Files to process at once
    enableCache: true,
    cacheDir: '.cache/dry-agent',
  },

  // ============================================
  // Reporting Settings
  // ============================================
  reporting: {
    verbose: true,
    showProgress: true,
    logLevel: 'info',  // 'debug' | 'info' | 'warn' | 'error'
  },
};

