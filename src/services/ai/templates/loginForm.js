// ========================================
// LOGIN FORM TEMPLATE
// ========================================

import {
  createCard,
  createAccentStrip,
  createInputField,
  createButton,
  createDivider,
  createSocialButton
} from './helpers.js';
import {
  extractColor,
  extractSize,
  extractStyle,
  extractFields,
  extractSocialAuth
} from './extractors.js';

export const LOGIN_FORM_TEMPLATE = {
  name: 'login_form',
  
  patterns: [
    // Matches: "create a login form", "create a purple login screen", "make a minimal login", etc.
    /\b(create|make|build|design|generate|add)\s+(a|an)?\s*(?:\w+\s+)*(login|signin|sign-in|sign\s+in)(\s+(?:form|page|screen|ui))?\b/i,
  ],
  
  defaults: {
    primaryColor: '#0D99FF',
    cardWidth: 442,
    cardHeight: 580,
    titleText: 'Welcome Back',
    subtitleText: 'Sign in to continue',
    fields: ['email', 'password'],
    socialProviders: [],
    showSignupLink: true,
    cornerRadius: 16,
    fontSize: 56,
    style: 'modern'
  },
  
  extract(message, userStyleGuide = null) {
    const params = { ...this.defaults };
    
    // Extract customizations
    const color = extractColor(message, userStyleGuide);
    if (color) params.primaryColor = color;
    
    const size = extractSize(message);
    if (size === 'large') {
      params.cardWidth = 520;
      params.cardHeight = 680;
      params.fontSize = 64;
    } else if (size === 'small') {
      params.cardWidth = 380;
      params.cardHeight = 500;
      params.fontSize = 48;
    }
    
    const style = extractStyle(message, userStyleGuide);
    params.style = style;
    if (style === 'minimal') {
      params.cornerRadius = 8;
      params.showSignupLink = false;
    }
    
    // Extract fields
    const fields = extractFields(message);
    if (fields.length > 0) {
      params.fields = fields;
    }
    
    // Extract social providers
    const socialProviders = extractSocialAuth(message);
    if (socialProviders.length > 0) {
      params.socialProviders = socialProviders;
    }
    
    // Calculate actual height based on content
    let calculatedHeight = 150; // Base (title + subtitle + padding)
    calculatedHeight += params.fields.length * 90; // Fields
    calculatedHeight += 80; // Submit button
    if (params.socialProviders.length > 0) {
      calculatedHeight += params.socialProviders.length * 60; // Social buttons
      calculatedHeight += 40; // Divider
    }
    if (params.showSignupLink) {
      calculatedHeight += 40; // Signup link
    }
    
    params.cardHeight = calculatedHeight;
    
    return params;
  },
  
  generate(params, position) {
    const operations = [];
    const cardX = position.x;
    let cardY = position.y;
    
    // Background
    operations.push({
      type: 'create',
      shape: {
        type: 'rectangle',
        x: cardX - 100,
        y: cardY - 50,
        width: params.cardWidth + 200,
        height: params.cardHeight + 100,
        fill: '#F8F9FA'
      }
    });
    
    // Card with shadows and border
    const cardOps = createCard({
      x: cardX,
      y: cardY,
      width: params.cardWidth,
      height: params.cardHeight,
      cornerRadius: params.cornerRadius,
      shadowLayers: 3
    });
    operations.push(...cardOps);
    
    // Accent strip
    operations.push({
      type: 'create',
      shape: createAccentStrip({
        x: cardX,
        y: cardY,
        height: params.cardHeight,
        color: params.primaryColor
      })
    });
    
    // Content area
    const cardContentLeft = cardX + 40;
    const contentWidth = params.cardWidth - 80;
    let contentY = cardY + 48;
    
    // Title
    operations.push({
      type: 'create',
      shape: {
        type: 'text',
        x: cardContentLeft,
        y: contentY,
        text: params.titleText,
        fontSize: params.fontSize,
        fill: '#1A1A1A'
      }
    });
    contentY += params.fontSize + 16;
    
    // Subtitle
    operations.push({
      type: 'create',
      shape: {
        type: 'text',
        x: cardContentLeft,
        y: contentY,
        text: params.subtitleText,
        fontSize: 18,
        fill: '#666666'
      }
    });
    contentY += 50;
    
    // Social sign-in buttons
    if (params.socialProviders.length > 0) {
      const providerConfig = {
        google: { text: 'Continue with Google', color: '#4285F4' },
        facebook: { text: 'Continue with Facebook', color: '#1877F2' },
        twitter: { text: 'Continue with Twitter', color: '#1DA1F2' },
        github: { text: 'Continue with GitHub', color: '#24292E' }
      };
      
      for (const provider of params.socialProviders) {
        const config = providerConfig[provider];
        const { operations: socialOps, height } = createSocialButton({
          x: cardContentLeft,
          y: contentY,
          width: contentWidth,
          provider,
          config
        });
        operations.push(...socialOps);
        contentY += height;
      }
      
      // Divider
      const { operations: dividerOps, height: dividerHeight } = createDivider({
        x: cardContentLeft,
        y: contentY,
        width: contentWidth,
        text: 'or'
      });
      operations.push(...dividerOps);
      contentY += dividerHeight;
    }
    
    // Form fields
    const fieldConfig = {
      username: { label: 'USERNAME', placeholder: 'Enter your username' },
      email: { label: 'EMAIL', placeholder: 'you@example.com' },
      password: { label: 'PASSWORD', placeholder: '••••••••••' },
      phone: { label: 'PHONE NUMBER', placeholder: '+1 (555) 000-0000' },
      name: { label: 'NAME', placeholder: 'Enter your name' }
    };
    
    for (const fieldType of params.fields) {
      const config = fieldConfig[fieldType] || {
        label: fieldType.toUpperCase(),
        placeholder: `Enter ${fieldType}`
      };
      
      const { operations: fieldOps, height: fieldHeight } = createInputField({
        x: cardContentLeft,
        y: contentY,
        width: contentWidth,
        label: config.label,
        placeholder: config.placeholder,
        style: params.style
      });
      operations.push(...fieldOps);
      contentY += fieldHeight + 16;
    }
    
    // Submit button
    const { operations: buttonOps } = createButton({
      x: cardContentLeft,
      y: contentY,
      width: contentWidth,
      text: 'Sign In',
      color: params.primaryColor,
      style: params.style,
      withShadow: true
    });
    operations.push(...buttonOps);
    contentY += 72;
    
    // Signup link
    if (params.showSignupLink) {
      operations.push({
        type: 'create',
        shape: {
          type: 'text',
          x: cardContentLeft + 50,
          y: contentY,
          text: "Don't have an account? Sign up",
          fontSize: 14,
          fill: params.primaryColor
        }
      });
    }
    
    return {
      plan: [{
        step: 1,
        tool: 'batch_operations',
        args: {
          tool: 'batch_operations',
          operations
        },
        description: `Create ${params.style} login form with ${params.fields.length} fields`
      }],
      reasoning: `I've created a ${params.style} login form with ${params.fields.join(', ')} fields${params.socialProviders.length > 0 ? ` and ${params.socialProviders.join(', ')} sign-in options` : ''}!`
    };
  }
};

