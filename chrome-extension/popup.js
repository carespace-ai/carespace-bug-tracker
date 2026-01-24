// Helper: Check if URL is on carespace.ai domain
function isCarespaceAiDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.endsWith('.carespace.ai') || hostname === 'carespace.ai' || hostname === 'localhost';
  } catch (e) {
    return false;
  }
}

// Store auth status globally
let authStatus = null;

// Form state persistence
const FORM_STATE_KEY = 'carespace_bug_form_state';
const SUCCESS_STATE_KEY = 'carespace_bug_success_state';

let saveIndicatorTimeout = null;

function saveFormState() {
  const formData = {
    title: document.getElementById('title')?.value || '',
    description: document.getElementById('description')?.value || '',
    stepsToReproduce: document.getElementById('stepsToReproduce')?.value || '',
    expectedBehavior: document.getElementById('expectedBehavior')?.value || '',
    actualBehavior: document.getElementById('actualBehavior')?.value || '',
    severity: document.getElementById('severity')?.value || '',
    category: document.getElementById('category')?.value || '',
    captureScreenshot: document.getElementById('captureScreenshot')?.checked ?? true,
    timestamp: Date.now()
  };

  localStorage.setItem(FORM_STATE_KEY, JSON.stringify(formData));

  // Show save indicator
  const indicator = document.getElementById('saveIndicator');
  if (indicator) {
    indicator.classList.remove('hidden');

    // Clear existing timeout
    if (saveIndicatorTimeout) {
      clearTimeout(saveIndicatorTimeout);
    }

    // Hide after 2 seconds
    saveIndicatorTimeout = setTimeout(() => {
      indicator.classList.add('hidden');
    }, 2000);
  }
}

function restoreFormState() {
  try {
    const savedState = localStorage.getItem(FORM_STATE_KEY);
    if (!savedState) return false;

    const formData = JSON.parse(savedState);

    // Only restore if saved within last 7 days
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - formData.timestamp > sevenDaysInMs) {
      localStorage.removeItem(FORM_STATE_KEY);
      return false;
    }

    // Restore form fields
    if (formData.title) document.getElementById('title').value = formData.title;
    if (formData.description) document.getElementById('description').value = formData.description;
    if (formData.stepsToReproduce) document.getElementById('stepsToReproduce').value = formData.stepsToReproduce;
    if (formData.expectedBehavior) document.getElementById('expectedBehavior').value = formData.expectedBehavior;
    if (formData.actualBehavior) document.getElementById('actualBehavior').value = formData.actualBehavior;
    if (formData.severity) document.getElementById('severity').value = formData.severity;
    if (formData.category) document.getElementById('category').value = formData.category;
    document.getElementById('captureScreenshot').checked = formData.captureScreenshot;

    return true;
  } catch (error) {
    console.warn('Failed to restore form state:', error);
    return false;
  }
}

function clearFormState() {
  localStorage.removeItem(FORM_STATE_KEY);
}

function saveSuccessState(bugTitle) {
  const successData = {
    success: true,
    bugTitle: bugTitle || 'Bug report',
    timestamp: Date.now()
  };
  localStorage.setItem(SUCCESS_STATE_KEY, JSON.stringify(successData));
}

function checkSuccessState() {
  try {
    const savedSuccess = localStorage.getItem(SUCCESS_STATE_KEY);
    if (!savedSuccess) return null;

    const successData = JSON.parse(savedSuccess);

    // Only restore if success was within last 24 hours
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
    if (Date.now() - successData.timestamp > twentyFourHoursInMs) {
      localStorage.removeItem(SUCCESS_STATE_KEY);
      return null;
    }

    return successData;
  } catch (error) {
    console.warn('Failed to check success state:', error);
    return null;
  }
}

function clearSuccessState() {
  localStorage.removeItem(SUCCESS_STATE_KEY);
}

function showSuccessScreen(bugTitle = null) {
  const bugForm = document.getElementById('bugForm');
  const resultDiv = document.getElementById('result');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');

  // Hide form, show success message
  bugForm.style.display = 'none';

  // Build bug title display
  const bugTitleHtml = bugTitle
    ? `<div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; padding: 12px; background: var(--surface-secondary); border-radius: 8px;">
         <strong>Latest report:</strong> ${bugTitle}
       </div>`
    : '';

  resultDiv.className = 'success';
  resultDiv.innerHTML = `
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 48px; margin-bottom: 16px;">✓</div>
      <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">
        Your bug was reported successfully
      </div>
      <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 24px;">
        Our team has been notified and will review it shortly
      </div>
      ${bugTitleHtml}
      <button id="reportAnotherBtn" class="btn-primary" style="width: 100%;">
        Report Another Bug
      </button>
    </div>
  `;
  resultDiv.classList.remove('hidden');

  // Add listener for "Report Another Bug" button
  document.getElementById('reportAnotherBtn').addEventListener('click', () => {
    // Clear success state
    clearSuccessState();

    // Hide success message, show form again
    resultDiv.classList.add('hidden');
    bugForm.style.display = 'block';

    // Re-enable submit button
    submitBtn.disabled = false;
    submitText.textContent = 'Submit Bug Report';
    submitText.classList.remove('hidden');
    submitSpinner.classList.add('hidden');
  });
}

function setupFormAutoSave() {
  const formFields = [
    'title', 'description', 'stepsToReproduce',
    'expectedBehavior', 'actualBehavior', 'severity', 'category'
  ];

  formFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.addEventListener('input', saveFormState);
      field.addEventListener('change', saveFormState);
    }
  });

  // Also save screenshot checkbox state
  const screenshotCheckbox = document.getElementById('captureScreenshot');
  if (screenshotCheckbox) {
    screenshotCheckbox.addEventListener('change', saveFormState);
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const loadingDiv = document.getElementById('loadingAuth');

  // Check if we should show success screen from previous submission
  const successState = checkSuccessState();
  if (successState) {
    loadingDiv.classList.add('hidden');
    showSuccessScreen(successState.bugTitle);
    return;
  }

  // Get current tab to check domain
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check if we're on a carespace.ai domain
  if (!isCarespaceAiDomain(tab.url)) {
    // Hide loading, show domain restriction message (form is hidden by default in CSS)
    loadingDiv.classList.add('hidden');
    const resultDiv = document.getElementById('result');
    resultDiv.className = 'error';
    resultDiv.innerHTML = `
      <strong>⚠️ Domain Restriction</strong>
      <div style="margin-top: 8px;">
        This extension only works on <strong>*.carespace.ai</strong> domains.
      </div>
      <div style="margin-top: 8px; font-size: 11px;">
        Current page: <code>${new URL(tab.url).hostname}</code>
      </div>
      <div style="margin-top: 12px;">
        Please navigate to a Carespace page to report bugs.
      </div>
    `;
    resultDiv.classList.remove('hidden');
    return;
  }

  // Check authentication status
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'checkAuth' });
    authStatus = response;

    if (!response.authenticated) {
      // Hide loading, show login instructions ONLY (form stays hidden)
      loadingDiv.classList.add('hidden');
      const resultDiv = document.getElementById('result');
      const currentSubdomain = response.subdomain || new URL(tab.url).hostname;
      const loginUrl = `https://${currentSubdomain}/login`;

      resultDiv.className = 'error';
      resultDiv.innerHTML = `
        <strong>🔒 Authentication Required</strong>
        <div style="margin-top: 12px; line-height: 1.6;">
          You must be logged in to <strong>${currentSubdomain}</strong> before you can report bugs.
        </div>
        <div style="margin-top: 12px; padding: 12px; background: rgba(159, 48, 237, 0.1); border-radius: 6px; font-size: 12px; line-height: 1.5;">
          <strong>📌 Important:</strong> Being logged in to other Carespace subdomains
          (like app.carespace.ai or dashboard.carespace.ai) is not sufficient.
          You need to be authenticated on <strong>${currentSubdomain}</strong> specifically.
        </div>
        <div style="margin-top: 16px;">
          <a href="${loginUrl}" target="_blank"
             style="display: inline-block; padding: 10px 20px; background: #9f30ed; color: white;
                    text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
            Log in to ${currentSubdomain}
          </a>
        </div>
        <div style="margin-top: 12px;">
          <button id="retryAuth"
                  style="padding: 8px 16px; background: transparent; color: #9f30ed;
                         border: 1px solid #9f30ed; border-radius: 6px; cursor: pointer;
                         font-weight: 500; font-size: 13px;">
            I've Logged In - Retry
          </button>
        </div>
      `;
      resultDiv.classList.remove('hidden');

      // Add retry button listener
      document.getElementById('retryAuth').addEventListener('click', () => {
        window.location.reload();
      });

      // Form stays hidden - don't show it
      return;
    }

    // User IS authenticated - hide loading, show the form
    loadingDiv.classList.add('hidden');
    document.getElementById('bugForm').style.display = 'block';

    // Pre-fill email if available
    if (response.userInfo && response.userInfo.email) {
      const emailField = document.getElementById('userEmail');
      emailField.value = response.userInfo.email;
      emailField.disabled = true; // Disable editing since it's from auth
    }

    // Restore saved form state (if any)
    const stateRestored = restoreFormState();
    if (stateRestored) {
      console.log('[Carespace Bug Reporter] Restored previous form state');
    }

    // Setup auto-save for form changes
    setupFormAutoSave();
  } catch (error) {
    console.warn('[Carespace Bug Reporter] Could not check auth status:', error);

    // Hide loading, show error message (don't show form)
    loadingDiv.classList.add('hidden');
    const resultDiv = document.getElementById('result');
    resultDiv.className = 'error';
    resultDiv.innerHTML = `
      <strong>⚠️ Unable to Verify Authentication</strong>
      <div style="margin-top: 12px; line-height: 1.6;">
        The extension couldn't verify your authentication status on this page.
      </div>
      <div style="margin-top: 12px; font-size: 12px; line-height: 1.5;">
        This may happen if the page just loaded. Try:
      </div>
      <ol style="margin: 8px 0 0 20px; font-size: 12px; line-height: 1.8;">
        <li>Refresh the page</li>
        <li>Wait a few seconds for the page to fully load</li>
        <li>Try opening the extension again</li>
      </ol>
      <div style="margin-top: 16px;">
        <button id="retryAuthError"
                style="padding: 10px 20px; background: #9f30ed; color: white;
                       border: none; border-radius: 6px; cursor: pointer;
                       font-weight: 500; font-size: 14px;">
          Retry
        </button>
      </div>
    `;
    resultDiv.classList.remove('hidden');

    // Add retry button listener
    document.getElementById('retryAuthError').addEventListener('click', () => {
      window.location.reload();
    });

    // Form stays hidden
    return;
  }

  // Check if popup was opened via context menu
  const contextData = await chrome.storage.local.get(['selectedText', 'pageUrl', 'pageTitle']);

  // Only add context data if fields are empty (don't overwrite restored state)
  if (contextData.selectedText) {
    const descriptionField = document.getElementById('description');
    const currentDesc = descriptionField.value;
    // Only add selected text if description is empty or doesn't already contain it
    if (!currentDesc || !currentDesc.includes(contextData.selectedText)) {
      descriptionField.value = currentDesc
        ? `${currentDesc}\n\nSelected text: "${contextData.selectedText}"`
        : `Selected text: "${contextData.selectedText}"`;
      saveFormState(); // Save after adding context
    }
  }

  if (contextData.pageUrl) {
    const stepsField = document.getElementById('stepsToReproduce');
    const currentSteps = stepsField.value;
    // Only add page context if field is empty or doesn't already contain the URL
    if (!currentSteps || !currentSteps.includes(contextData.pageUrl)) {
      stepsField.value = currentSteps
        ? `${currentSteps}\n\nPage: ${contextData.pageTitle || contextData.pageUrl}\nURL: ${contextData.pageUrl}`
        : `Page: ${contextData.pageTitle || contextData.pageUrl}\nURL: ${contextData.pageUrl}\n\n`;
      saveFormState(); // Save after adding context
    }
  }

  // Clear context data after using it
  chrome.storage.local.remove(['selectedText', 'pageUrl', 'pageTitle']);
});

// Helper: Update submit button with progress message
function updateSubmitProgress(message) {
  const submitText = document.getElementById('submitText');
  if (submitText) {
    submitText.textContent = message;
  }
}

// Form submission handler
document.getElementById('bugForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');
  const resultDiv = document.getElementById('result');

  // Disable form during submission
  submitBtn.disabled = true;
  submitText.classList.remove('hidden');
  submitSpinner.classList.remove('hidden');
  resultDiv.classList.add('hidden');

  // Show initial progress
  updateSubmitProgress('Preparing bug report...');

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

    // Add authentication token if available
    if (authStatus && authStatus.token) {
      formData.append('authToken', authStatus.token);
    }

    // Add user ID if available
    if (authStatus && authStatus.userInfo && authStatus.userInfo.userId) {
      formData.append('userId', authStatus.userInfo.userId);
    }

    // Capture screenshot if enabled
    const shouldCaptureScreenshot = document.getElementById('captureScreenshot').checked;
    if (shouldCaptureScreenshot) {
      try {
        updateSubmitProgress('Capturing screenshot...');
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
    updateSubmitProgress('Analyzing with AI...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData
    });

    updateSubmitProgress('Finalizing report...');
    const result = await response.json();

    if (response.ok) {
      // Get the bug title from the form
      const bugTitle = formData.get('title');

      // Save success state for persistence (with bug title)
      saveSuccessState(bugTitle);

      // Clear saved form state
      clearFormState();

      // Reset form (hidden, ready for next report)
      form.reset();
      document.getElementById('captureScreenshot').checked = true;

      // Show success screen with bug title
      showSuccessScreen(bugTitle);
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

// Helper: Convert data URL to Blob with proper MIME type
async function dataUrlToBlob(dataUrl) {
  // Extract MIME type from data URL (e.g., "data:image/png;base64,...")
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }

  const mimeType = matches[1]; // e.g., "image/png"
  const base64Data = matches[2];

  // Convert base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Create blob with explicit MIME type
  return new Blob([bytes], { type: mimeType });
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
