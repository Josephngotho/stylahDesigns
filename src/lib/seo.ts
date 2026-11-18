export interface SeoMetaPayload {
  title: string;
  description: string;
  path?: string;
  jsonLd?: Record<string, unknown>;
}

export function applySeoMeta({ title, description, path, jsonLd }: SeoMetaPayload) {
  document.title = title;

  const setMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMeta('meta[name="description"]', 'name', 'description', description);
  setMeta('meta[property="og:title"]', 'property', 'og:title', title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

  const canonicalUrl = `${window.location.origin}${path || window.location.pathname}`;
  let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', canonicalUrl);
  setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);

  const scriptId = 'stylah-dynamic-jsonld';
  const existing = document.getElementById(scriptId);
  if (jsonLd) {
    const script = existing || document.createElement('script');
    script.id = scriptId;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(jsonLd);
    if (!existing) document.head.appendChild(script);
  } else if (existing) {
    existing.remove();
  }
}
