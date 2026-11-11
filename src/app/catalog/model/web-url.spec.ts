import { MAX_WEB_URL_LENGTH, httpUrlOrNull } from './web-url';

describe('httpUrlOrNull', () => {
  it('keeps an absolute http or https address', () => {
    expect(httpUrlOrNull('https://example.com/watch?v=1')).toBe('https://example.com/watch?v=1');
    expect(httpUrlOrNull('http://example.com/trailer')).toBe('http://example.com/trailer');
  });

  it('refuses a missing, blank or relative value', () => {
    expect(httpUrlOrNull(undefined)).toBeNull();
    expect(httpUrlOrNull('   ')).toBeNull();
    expect(httpUrlOrNull('/trailer.mp4')).toBeNull();
    expect(httpUrlOrNull('example.com/trailer')).toBeNull();
  });

  it('refuses any scheme other than http and https', () => {
    expect(httpUrlOrNull('javascript:alert(1)')).toBeNull();
    expect(httpUrlOrNull('data:text/html;base64,AAAA')).toBeNull();
    expect(httpUrlOrNull('ftp://example.com/trailer')).toBeNull();
  });

  it('refuses an address longer than the contract allows', () => {
    const base = 'https://example.com/';
    expect(httpUrlOrNull(base + 'a'.repeat(MAX_WEB_URL_LENGTH - base.length))).not.toBeNull();
    expect(httpUrlOrNull(base + 'a'.repeat(MAX_WEB_URL_LENGTH - base.length + 1))).toBeNull();
  });
});
