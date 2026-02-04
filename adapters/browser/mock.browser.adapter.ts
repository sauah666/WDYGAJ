// Layer: ADAPTERS
// Purpose: Implementation of ports. External world details.

import { BrowserPort } from '../../core/ports/browser.port';

export class MockBrowserAdapter implements BrowserPort {
  private currentUrlVal: string = 'about:blank';

  async launch(): Promise<void> {
    console.log('[BrowserAdapter] Launching virtual browser session...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async navigateTo(url: string): Promise<void> {
    console.log(`[BrowserAdapter] Navigating to ${url}...`);
    this.currentUrlVal = url;
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  async waitForHumanInteraction(message: string): Promise<void> {
    console.log(`[BrowserAdapter] PAUSED: ${message}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async getDomSnapshot(): Promise<string> {
    console.log('[BrowserAdapter] SNAPSHOT: Capturing DOM...');
    await new Promise(resolve => setTimeout(resolve, 500));
    return "<html><body><mock>Skeleton Content</mock></body></html>";
  }

  async getCurrentUrl(): Promise<string> {
    return this.currentUrlVal;
  }

  async getPageTextMinimal(): Promise<string> {
    // Stub: messy text to prove normalization
    return `
      Mock Profile Content:    Senior Engineer
      
      10 years exp...
      
      Stack: React,    Node,   AI.
    `;
  }

  async findLinksByTextKeywords(keywords: string[]): Promise<{ text: string; href: string }[]> {
    console.log(`[BrowserAdapter] Scanning for links matching: [${keywords.join(', ')}]...`);
    // Mock logic: If we are NOT on a search page, pretend we found one.
    if (!this.currentUrlVal.includes('search')) {
      return [{ text: 'Расширенный поиск', href: '/search/vacancy/advanced' }];
    }
    return [];
  }

  async clickLink(href: string): Promise<void> {
    console.log(`[BrowserAdapter] Clicking link: ${href}`);
    // Simulate navigation via click
    this.currentUrlVal = href.startsWith('/') ? `https://hh.ru${href}` : href;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async close(): Promise<void> {
    console.log('[BrowserAdapter] Closing session.');
  }
}