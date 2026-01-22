# End-to-End Verification Guide
## File Attachment Support Feature

This document provides comprehensive steps for manually verifying the complete file attachment flow.

---

## Prerequisites

1. **Environment Variables**: Ensure the following are set in your `.env.local` file:
   ```
   GITHUB_TOKEN=your_github_personal_access_token
   GITHUB_OWNER=your_github_username_or_org
   GITHUB_REPO=your_repo_name
   ANTHROPIC_API_KEY=your_anthropic_api_key
   CLICKUP_API_KEY=your_clickup_api_key
   CLICKUP_LIST_ID=your_clickup_list_id
   ```

2. **Test Files**: Use the provided test files in `./test-files/` directory or prepare your own:
   - A screenshot file (PNG, JPG, GIF, or WebP format)
   - A log file (TXT, LOG, or JSON format)

---

## Verification Steps

### Step 1: Start Development Server

```bash
npm run dev
```

**Expected Result**:
- Server starts successfully on `http://localhost:3000`
- No errors in console
- Terminal shows: "✓ Ready in Xms"

---

### Step 2: Open Application in Browser

Open `http://localhost:3000` in your browser

**Expected Result**:
- Bug report form loads correctly
- All form fields are visible:
  - Title (required)
  - Description (required)
  - Steps to Reproduce (optional)
  - Expected Behavior (optional)
  - Actual Behavior (optional)
  - Severity dropdown (required)
  - Category dropdown (required)
  - User Email (optional)
  - Environment (optional)
  - Browser Info (optional)
  - **File Attachment input** (new feature)

---

### Step 3: Fill Out Bug Report Form

Fill in the form with test data:

```
Title: "Test Bug with File Attachments"
Description: "This is a test bug report to verify file attachment functionality"
Steps to Reproduce: "1. Click button\n2. Error occurs"
Expected Behavior: "Button should work"
Actual Behavior: "Error message appears"
Severity: "high"
Category: "functionality"
```

**Expected Result**:
- All fields accept input correctly
- No validation errors appear

---

### Step 4: Attach Files

1. Click the file attachment input
2. Select 2 files:
   - 1 screenshot file (PNG/JPG)
   - 1 log file (TXT)

**Expected Result**:
- Files are selected successfully
- File previews appear below the input
- Each file shows:
  - Filename
  - File size
  - File type icon
  - Remove button (X)

---

### Step 5: Validate File Upload UI

Before submitting, verify:

1. **File count validation**: Try adding more than 5 files
   - **Expected**: Error message appears

2. **File size validation**: Try adding a file larger than 10MB
   - **Expected**: Error message appears

3. **File type validation**: Try adding an unsupported file (e.g., .exe)
   - **Expected**: Error message appears

4. **Remove file**: Click the X button on one file
   - **Expected**: File is removed from the list

Re-attach 2 valid files before proceeding.

---

### Step 6: Submit Form

Click the "Submit Bug Report" button

**Expected Result**:
- Submit button shows loading state ("Submitting...")
- Button is disabled during submission
- No console errors in browser DevTools

**Wait Time**: This may take 10-30 seconds depending on:
- LLM processing time
- File upload time to GitHub
- GitHub issue creation
- ClickUp task creation

---

### Step 7: Verify Success Response

After submission completes:

**Expected Result**:
- Green success message appears at the top of the page
- Success message contains:
  - "Bug report submitted successfully"
  - Link to GitHub issue (clickable)
  - Link to ClickUp task (clickable)
  - Enhanced report details (priority, labels)

---

### Step 8: Verify GitHub Issue

Click the "View Issue" link in the success message

**Expected Result**:
- GitHub issue page opens in a new tab
- Issue contains:
  - ✅ Title: "Test Bug with File Attachments"
  - ✅ Enhanced description (written by LLM)
  - ✅ **Attachments section** with both files listed
  - ✅ File links are clickable
  - ✅ File names are displayed correctly
  - ✅ File sizes are shown (in KB)
  - ✅ Clicking file links downloads or displays the files
  - ✅ Enhanced description references the screenshot (e.g., "See attached screenshot for visual details")

**Attachments Section Example**:
```markdown
### Attachments
- [screenshot.png](https://raw.githubusercontent.com/.../screenshot.png) (123.45 KB)
- [error.log](https://raw.githubusercontent.com/.../error.log) (2.34 KB)
```

---

### Step 9: Verify LLM Enhancement with Attachments

In the GitHub issue, check the enhanced description:

**Expected Result**:
- The LLM should have mentioned the attached files
- Examples of what to look for:
  - "See attached screenshot for visual details"
  - "Refer to attached log file for error stack trace"
  - "The screenshot shows..."
  - "As evidenced in the attached log..."

---

### Step 10: Verify ClickUp Task

Click the "View Task" link in the success message (if ClickUp is configured)

**Expected Result**:
- ClickUp task page opens in a new tab
- Task contains:
  - ✅ Title matches the bug report
  - ✅ Description includes link to GitHub issue
  - ✅ Task is created successfully

---

### Step 11: Verify File Storage on GitHub

Navigate to your GitHub repository:

1. Go to the repository root
2. Navigate to `bug-attachments/` directory
3. Check for uploaded files with timestamp prefixes

**Expected Result**:
- Files are stored in `bug-attachments/` directory
- Filenames have timestamp prefixes (e.g., `1674405678901-screenshot.png`)
- Files are accessible via raw.githubusercontent.com URLs
- Files can be downloaded directly

---

## Edge Cases to Test

### Test Case 1: Maximum File Count (5 files)

1. Attach exactly 5 files
2. Submit form

**Expected**: All 5 files upload successfully

---

### Test Case 2: No Attachments

1. Fill out form without attaching any files
2. Submit form

**Expected**: Form submits successfully, no attachments section in GitHub issue

---

### Test Case 3: Mixed File Types

1. Attach files of different types:
   - 1 PNG image
   - 1 MP4 video
   - 1 TXT log
   - 1 PDF document

2. Submit form

**Expected**: All files upload successfully and appear in attachments section

---

### Test Case 4: Large Files (near 10MB limit)

1. Create or find a file close to 10MB
2. Attach it to the form
3. Submit

**Expected**: File uploads successfully (may take longer)

---

### Test Case 5: File Validation Errors

1. Try to attach a 15MB file
   - **Expected**: Error message: "File is too large (max 10MB)"

2. Try to attach an .exe file
   - **Expected**: Error message: "Unsupported file type"

3. Try to attach 6 files
   - **Expected**: Error message: "Maximum 5 files allowed"

---

## Verification Checklist

Use this checklist to confirm all acceptance criteria are met:

- [ ] Files upload without errors
- [ ] GitHub issue displays all attachments with working links
- [ ] LLM enhanced description references attached files appropriately
- [ ] File size validation works (10MB limit)
- [ ] File type validation works (allowed: images, videos, text, PDF, JSON)
- [ ] File count validation works (max 5 files)
- [ ] File links in GitHub issue are clickable and work
- [ ] Attached files can be downloaded from GitHub
- [ ] ClickUp task is created successfully
- [ ] No console errors during the entire flow
- [ ] Form can be submitted multiple times (rate limiting allows 5 requests)

---

## Troubleshooting

### Issue: "Failed to upload file to GitHub"

**Possible Causes**:
- Invalid `GITHUB_TOKEN`
- Token lacks `repo` permissions
- Repository doesn't exist
- Network timeout

**Solution**:
- Verify GitHub token has `repo` scope
- Check token in GitHub Settings > Developer settings > Personal access tokens

---

### Issue: "LLM enhancement failed"

**Possible Causes**:
- Invalid `ANTHROPIC_API_KEY`
- API rate limit exceeded
- Network timeout

**Solution**:
- Check Anthropic API key
- The app has fallback logic that will create the issue anyway with basic enhancement

---

### Issue: "ClickUp task creation failed"

**Possible Causes**:
- Invalid `CLICKUP_API_KEY` or `CLICKUP_LIST_ID`
- ClickUp API down

**Solution**:
- Verify ClickUp credentials
- Note: The GitHub issue will still be created even if ClickUp fails

---

## Implementation Details

### Code Changes Made

1. **API Route (`app/api/submit-bug/route.ts`)**:
   - Changed from `request.json()` to `request.formData()`
   - Added file extraction: `formData.getAll('attachments')`
   - Added backend file validation (count, size, type)
   - Integrated `uploadFilesToGitHub()` function
   - Attached URLs to `enhancedReport.attachments`

2. **LLM Service (`lib/llm-service.ts`)**:
   - Updated prompt to include attachment information
   - Added instruction for LLM to reference attachments
   - Format attachments list with name, type, and size

3. **GitHub Service (`lib/github-service.ts`)**:
   - Already had `uploadFileToGitHub()` function
   - Already had `uploadFilesToGitHub()` function
   - Already had attachments section in issue template

4. **Frontend (`app/page.tsx`)**:
   - Already had file upload UI
   - Already had file validation
   - Already had file preview component

---

## Success Criteria

The feature is successfully implemented if:

1. ✅ Customers can attach up to 5 files per bug report
2. ✅ Supported file types work: PNG, JPG, GIF, WebP, MP4, MOV, TXT, LOG, JSON, PDF
3. ✅ Maximum file size of 10MB per file is enforced
4. ✅ Files are uploaded to GitHub repository storage
5. ✅ File URLs are included in GitHub issue with working links
6. ✅ AI references attached screenshots in enhanced description

---

## Notes for Tester

- This is an integration feature connecting existing components
- Most code was already in place; integration was the key task
- The feature follows existing patterns in the codebase
- File storage uses GitHub repository (not external S3/R2)
- Files are stored at: `bug-attachments/{timestamp}-{filename}`
- URLs format: `https://raw.githubusercontent.com/{owner}/{repo}/main/bug-attachments/{filename}`

---

## Next Steps After Verification

If all tests pass:
1. Mark subtask-3-1 as completed in implementation_plan.json
2. Update build-progress.txt with verification results
3. Commit changes with message: "auto-claude: subtask-3-1 - End-to-end verification of complete attachment flow"
4. Feature is ready for production deployment

If tests fail:
1. Document specific failures in build-progress.txt
2. Fix identified issues
3. Re-run verification
4. Commit fixes separately
