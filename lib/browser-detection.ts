export function detectBrowserInfo(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  // Detect browser name and version
  let browserName = 'Unknown Browser';
  let browserVersion = '';

  // Chrome
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  // Edge (Chromium-based)
  else if (userAgent.indexOf('Edg') > -1) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  // Firefox
  else if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }
  // Safari (must check after Chrome as Safari UA contains both)
  else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browserName = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) browserVersion = match[1];
  }

  // Detect operating system
  let os = 'Unknown OS';

  if (platform.indexOf('Win') > -1) {
    os = 'Windows';
  } else if (platform.indexOf('Mac') > -1) {
    os = 'macOS';
  } else if (platform.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (/Android/.test(userAgent)) {
    os = 'Android';
  } else if (/iPhone|iPad|iPod/.test(userAgent)) {
    os = 'iOS';
  }

  // Format the output
  return `${browserName}${browserVersion ? ' ' + browserVersion : ''} on ${os}`;
}
