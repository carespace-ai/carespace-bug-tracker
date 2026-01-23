// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Check if popup was opened via context menu
  const contextData = await chrome.storage.local.get(['selectedText', 'pageUrl', 'pageTitle']);

  if (contextData.selectedText) {
    // Pre-fill description with selected text
    const descriptionField = document.getElementById('description');
    const currentDesc = descriptionField.value;
    descriptionField.value = currentDesc
      ? `${currentDesc}\n\nSelected text: "${contextData.selectedText}"`
      : `Selected text: "${contextData.selectedText}"`;
  }

  if (contextData.pageUrl) {
    // Add page context to steps to reproduce
    const stepsField = document.getElementById('stepsToReproduce');
    stepsField.value = `Page: ${contextData.pageTitle || contextData.pageUrl}\nURL: ${contextData.pageUrl}\n\n`;
  }

  // Clear context data after using it
  chrome.storage.local.remove(['selectedText', 'pageUrl', 'pageTitle']);
});

// Form submission handler
document.getElementById('bugForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');
  const resultDiv = document.getElementById('result');

  // Disable form during submission
  submitBtn.disabled = true;
  submitText.classList.add('hidden');
  submitSpinner.classList.remove('hidden');
  resultDiv.classList.add('hidden');

  try {
    const form = e.target;
    const formData = new FormData(form);

    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Auto-detect browser info
    const browserInfo = getBrowserInfo();
    formData.append('browserInfo', browserInfo);

    // Add environment context
    const environment = `Extension - ${tab.url}`;
    formData.append('environment', environment);

    // Capture screenshot if enabled
    const shouldCaptureScreenshot = document.getElementById('captureScreenshot').checked;
    if (shouldCaptureScreenshot) {
      try {
        const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
          format: 'png',
          quality: 90
        });

        // Convert data URL to blob
        const screenshotBlob = await dataUrlToBlob(screenshotDataUrl);
        formData.append('attachments', screenshotBlob, `screenshot-${Date.now()}.png`);
      } catch (error) {
        console.warn('Failed to capture screenshot:', error);
        // Continue without screenshot
      }
    }

    // Remove empty severity and category (let AI determine)
    if (!formData.get('severity')) {
      formData.delete('severity');
    }
    if (!formData.get('category')) {
      formData.delete('category');
    }

    // Get API URL from config
    const apiUrl = await CONFIG.getApiUrl();

    // Submit to API
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok) {
      // Success
      resultDiv.className = 'success';
      resultDiv.innerHTML = `
        <strong>✓ Bug submitted successfully!</strong>
        <a href="${result.data.githubIssue}" target="_blank">View GitHub Issue</a>
        <a href="${result.data.clickupTask}" target="_blank">View ClickUp Task</a>
        <div style="margin-top: 8px; font-size: 12px;">
          <div>Priority: ${result.data.enhancedReport.priority}/5</div>
          <div>Repository: ${result.data.enhancedReport.targetRepo}</div>
          <div>Labels: ${result.data.enhancedReport.labels.join(', ')}</div>
        </div>
      `;
      resultDiv.classList.remove('hidden');

      // Reset form
      form.reset();
      document.getElementById('captureScreenshot').checked = true;

      // Auto-close after 3 seconds (optional)
      // setTimeout(() => window.close(), 3000);
    } else {
      // Error
      resultDiv.className = 'error';
      resultDiv.innerHTML = `
        <strong>✗ Failed to submit bug</strong>
        <div>${result.error || result.message || 'Unknown error occurred'}</div>
        ${result.details ? `<div style="margin-top: 4px; font-size: 11px;">${result.details}</div>` : ''}
      `;
      resultDiv.classList.remove('hidden');
    }
  } catch (error) {
    // Network error
    resultDiv.className = 'error';
    resultDiv.innerHTML = `
      <strong>✗ Network error</strong>
      <div>${error.message}</div>
      <div style="margin-top: 4px; font-size: 11px;">
        Check if the bug tracker is running and accessible.
      </div>
    `;
    resultDiv.classList.remove('hidden');
  } finally {
    // Re-enable form
    submitBtn.disabled = false;
    submitText.classList.remove('hidden');
    submitSpinner.classList.add('hidden');
  }
});

// Helper: Get browser info
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Chrome';
  let version = '';

  // Detect Chrome version
  const chromeMatch = ua.match(/Chrome\/(\d+)/);
  if (chromeMatch) {
    version = chromeMatch[1];
  }

  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';

  return `${browser} ${version} on ${os}`;
}

// Helper: Convert data URL to Blob
async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return await response.blob();
}

// File input change handler - show file count
document.getElementById('attachments').addEventListener('change', (e) => {
  const files = e.target.files;
  const helpText = e.target.nextElementSibling;

  if (files.length > 0) {
    const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    helpText.textContent = `${files.length} file(s) selected (${sizeMB} MB total)`;
  } else {
    helpText.textContent = 'Max 10MB per file (JPG, PNG, GIF, WebP, MP4, MOV, TXT, LOG, PDF, JSON)';
  }
});
