/**
 * DOM utility functions for manipulating meta tags and scripts
 */

/**
 * Set or create a meta tag in the document head
 * @param options - Meta tag configuration
 */
export function setOrCreateMetaTag(options: {
  name?: string;
  property?: string;
  content: string;
}): void {
  const { name, property, content } = options;
  
  // Build selector based on name or property
  const selector = property 
    ? `meta[property="${property}"]` 
    : `meta[name="${name}"]`;
  
  // Try to find existing meta tag
  let metaElement = document.querySelector(selector);
  
  if (metaElement) {
    // Update existing meta tag
    metaElement.setAttribute('content', content);
  } else {
    // Create new meta tag
    metaElement = document.createElement('meta');
    
    if (property) {
      metaElement.setAttribute('property', property);
    }
    
    if (name) {
      metaElement.setAttribute('name', name);
    }
    
    metaElement.setAttribute('content', content);
    document.head.appendChild(metaElement);
  }
}

/**
 * Inject a script tag into the document
 * @param scriptContent - Script content to inject
 * @param target - Target location ('head' or 'body')
 * @returns The created script element
 */
export function injectScript(scriptContent: string, target: 'head' | 'body'): HTMLScriptElement {
  const scriptElement = document.createElement('script');
  scriptElement.innerHTML = scriptContent;
  scriptElement.setAttribute('data-injected', 'true');
  
  const targetElement = target === 'head' ? document.head : document.body;
  targetElement.appendChild(scriptElement);
  
  return scriptElement;
}

/**
 * Remove all injected scripts (marked with data-injected="true")
 */
export function removeInjectedScripts(): void {
  document.querySelectorAll('script[data-injected="true"]').forEach((element) => {
    element.remove();
  });
}
