import type { GeneratedCode } from '@/types';
import { logger, LOG_CATEGORIES } from '@/utils/logger';

/**
 * Represents a syntax error with context
 */
export interface SyntaxError {
  type: 'html' | 'css' | 'js';
  message: string;
  context: string; // The problematic code snippet
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: SyntaxError[];
}

/**
 * Extracts HTML, CSS, and JS code blocks from AI response
 */
export function extractCode(response: string): GeneratedCode {
  logger.debug(LOG_CATEGORIES.CODE, 'Extracting code blocks from response', {
    responseLength: response.length,
  });

  const htmlMatch = response.match(/```html\n([\s\S]*?)```/);
  const cssMatch = response.match(/```css\n([\s\S]*?)```/);
  const jsMatch = response.match(/```(?:javascript|js)\n([\s\S]*?)```/);

  const html = htmlMatch?.[1]?.trim() || '';
  const css = cssMatch?.[1]?.trim() || '';
  const js = jsMatch?.[1]?.trim() || '';

  logger.info(LOG_CATEGORIES.CODE, 'Code blocks extracted', {
    foundHtml: !!htmlMatch,
    foundCss: !!cssMatch,
    foundJs: !!jsMatch,
    htmlLength: html.length,
    cssLength: css.length,
    jsLength: js.length,
  });

  if (!html && !css && !js) {
    logger.warn(LOG_CATEGORIES.CODE, 'No code blocks found in response', {
      responsePreview: response.slice(0, 200),
    });
  }

  const combined = generateCombinedHTML(html, css, js);
  
  logger.debug(LOG_CATEGORIES.CODE, 'Combined HTML generated', {
    combinedLength: combined.length,
    combinedPreview: combined.slice(0, 200) + '...',
  });

  return { html, css, js, combined };
}

/**
 * Generates a complete HTML document with embedded CSS and JS
 */
export function generateCombinedHTML(html: string, css: string, js: string): string {
  // If HTML already has a full document structure, inject CSS/JS into it
  if (html.includes('<!DOCTYPE') || html.includes('<html')) {
    return injectIntoExistingHTML(html, css, js);
  }

  // Otherwise, create a new document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    /* Reset */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    
    img, picture, video, canvas, svg {
      display: block;
      max-width: 100%;
    }
    
    /* User Styles */
    ${css}
  </style>
</head>
<body>
  ${html}
  ${js ? `<script>\n${js}\n</script>` : ''}
</body>
</html>`;
}

/**
 * Injects CSS and JS into an existing HTML document
 */
function injectIntoExistingHTML(html: string, css: string, js: string): string {
  let result = html;

  // Inject CSS before </head>
  if (css && result.includes('</head>')) {
    result = result.replace('</head>', `<style>\n${css}\n</style>\n</head>`);
  }

  // Inject JS before </body>
  if (js && result.includes('</body>')) {
    result = result.replace('</body>', `<script>\n${js}\n</script>\n</body>`);
  }

  return result;
}

/**
 * Validates that the code has at least some HTML content and checks for syntax errors
 */
export function validateCode(code: GeneratedCode): ValidationResult {
  const errors: SyntaxError[] = [];

  if (!code.html && !code.combined) {
    errors.push({
      type: 'html',
      message: 'No HTML content was generated',
      context: 'Empty response',
      suggestion: 'Please provide a more specific UI description',
    });
    return { valid: false, errors };
  }

  // Check HTML syntax
  const htmlErrors = checkHTMLSyntax(code.html);
  errors.push(...htmlErrors);

  // Check CSS syntax
  const cssErrors = checkCSSSyntax(code.css);
  errors.push(...cssErrors);

  // Check JS syntax
  const jsErrors = checkJSSyntax(code.js);
  errors.push(...jsErrors);

  return { valid: errors.length === 0, errors };
}

/**
 * Check HTML for common syntax errors
 */
function checkHTMLSyntax(html: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  if (!html) return errors;

  // Track opening and closing tags
  const tagStack: { tag: string; line: number; content: string }[] = [];
  const selfClosingTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  const lines = html.split('\n');
  const openTagRegex = /<([a-zA-Z][a-zA-Z0-9]*)[^>]*(?<!\/)>/g;
  const closeTagRegex = /<\/([a-zA-Z][a-zA-Z0-9]*)>/g;

  lines.forEach((line, lineIndex) => {
    // Find opening tags
    let match;
    while ((match = openTagRegex.exec(line)) !== null) {
      const tagName = match[1].toLowerCase();
      if (!selfClosingTags.has(tagName)) {
        tagStack.push({ tag: tagName, line: lineIndex + 1, content: line.trim() });
      }
    }

    // Find closing tags
    while ((match = closeTagRegex.exec(line)) !== null) {
      const tagName = match[1].toLowerCase();
      const lastOpen = tagStack.findIndex(t => t.tag === tagName);
      if (lastOpen === -1) {
        errors.push({
          type: 'html',
          message: `Unexpected closing tag </${tagName}> at line ${lineIndex + 1}`,
          context: line.trim(),
          suggestion: `Remove the extra </${tagName}> tag or add a matching opening tag`,
        });
      } else {
        // Remove from stack (handle nested tags)
        tagStack.splice(lastOpen, 1);
      }
    }
  });

  // Report unclosed tags
  tagStack.forEach(({ tag, line, content }) => {
    errors.push({
      type: 'html',
      message: `Unclosed <${tag}> tag starting at line ${line}`,
      context: content,
      suggestion: `Add a closing </${tag}> tag`,
    });
  });

  return errors;
}

/**
 * Check CSS for common syntax errors
 */
function checkCSSSyntax(css: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  if (!css) return errors;

  const lines = css.split('\n');
  let braceDepth = 0;
  let lastOpenBraceLine = 0;
  let lastOpenBraceContent = '';

  lines.forEach((line, lineIndex) => {
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;

    if (openBraces > 0) {
      lastOpenBraceLine = lineIndex + 1;
      lastOpenBraceContent = line.trim();
    }

    braceDepth += openBraces - closeBraces;

    if (braceDepth < 0) {
      errors.push({
        type: 'css',
        message: `Extra closing brace at line ${lineIndex + 1}`,
        context: line.trim(),
        suggestion: 'Remove the extra closing brace }',
      });
      braceDepth = 0; // Reset to continue checking
    }
  });

  if (braceDepth > 0) {
    errors.push({
      type: 'css',
      message: `Unclosed brace starting at line ${lastOpenBraceLine}`,
      context: lastOpenBraceContent,
      suggestion: `Add ${braceDepth} closing brace(s) }`,
    });
  }

  // Check for missing semicolons in property values
  const propertyRegex = /^\s*[a-zA-Z-]+\s*:\s*[^;{}]+$/;
  lines.forEach((line, lineIndex) => {
    if (propertyRegex.test(line) && !line.trim().endsWith('{') && !line.trim().endsWith('}')) {
      // Check if next line is not a closing brace
      const nextLine = lines[lineIndex + 1]?.trim();
      if (nextLine && !nextLine.startsWith('}') && !nextLine.startsWith('/*')) {
        errors.push({
          type: 'css',
          message: `Possible missing semicolon at line ${lineIndex + 1}`,
          context: line.trim(),
          suggestion: 'Add a semicolon at the end of the property value',
        });
      }
    }
  });

  return errors;
}

/**
 * Check JavaScript for common syntax errors
 */
function checkJSSyntax(js: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  if (!js) return errors;

  const lines = js.split('\n');

  // Check brace balance
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let lastOpenBraceLine = 0;
  let lastOpenBraceContent = '';

  lines.forEach((line, lineIndex) => {
    // Skip comments
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('//')) return;

    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    const openBrackets = (line.match(/\[/g) || []).length;
    const closeBrackets = (line.match(/\]/g) || []).length;

    if (openBraces > 0) {
      lastOpenBraceLine = lineIndex + 1;
      lastOpenBraceContent = line.trim();
    }

    braceDepth += openBraces - closeBraces;
    parenDepth += openParens - closeParens;
    bracketDepth += openBrackets - closeBrackets;
  });

  if (braceDepth !== 0) {
    errors.push({
      type: 'js',
      message: braceDepth > 0 
        ? `Unclosed brace starting at line ${lastOpenBraceLine}` 
        : 'Extra closing brace found',
      context: lastOpenBraceContent || js.slice(0, 100),
      suggestion: braceDepth > 0 
        ? `Add ${braceDepth} closing brace(s) }` 
        : 'Remove the extra closing brace(s)',
    });
  }

  if (parenDepth !== 0) {
    errors.push({
      type: 'js',
      message: parenDepth > 0 ? 'Unclosed parenthesis' : 'Extra closing parenthesis',
      context: js.slice(0, 100),
      suggestion: parenDepth > 0 
        ? `Add ${parenDepth} closing parenthesis )` 
        : 'Remove the extra closing parenthesis',
    });
  }

  if (bracketDepth !== 0) {
    errors.push({
      type: 'js',
      message: bracketDepth > 0 ? 'Unclosed bracket' : 'Extra closing bracket',
      context: js.slice(0, 100),
      suggestion: bracketDepth > 0 
        ? `Add ${bracketDepth} closing bracket(s) ]` 
        : 'Remove the extra closing bracket(s)',
    });
  }

  return errors;
}

/**
 * Format errors for display in chat
 */
export function formatErrorsForDisplay(errors: SyntaxError[]): string {
  if (errors.length === 0) return '';

  return errors.map((error, index) => {
    return `**Error ${index + 1}** (${error.type.toUpperCase()}):
- ${error.message}
- Code: \`${error.context.slice(0, 80)}${error.context.length > 80 ? '...' : ''}\`
- Fix: ${error.suggestion || 'Review and correct the syntax'}`;
  }).join('\n\n');
}

/**
 * Format errors for the AI to understand and fix
 */
export function formatErrorsForAI(errors: SyntaxError[], code: GeneratedCode): string {
  const errorDescriptions = errors.map(error => {
    return `- ${error.type.toUpperCase()} Error: ${error.message}
  Context: "${error.context}"
  Suggested fix: ${error.suggestion}`;
  }).join('\n');

  return `The generated code has the following syntax errors that need to be fixed:

${errorDescriptions}

Please regenerate the code with these errors fixed. Here's the original code for reference:

HTML:
\`\`\`html
${code.html}
\`\`\`

CSS:
\`\`\`css
${code.css}
\`\`\`

JavaScript:
\`\`\`javascript
${code.js}
\`\`\`

Please provide the corrected version with all syntax errors fixed.`;
}

/**
 * Extracts any text content that's not code (explanations, etc.)
 */
export function extractExplanation(response: string): string {
  // Remove all code blocks
  const withoutCode = response
    .replace(/```[\s\S]*?```/g, '')
    .trim();

  return withoutCode;
}
