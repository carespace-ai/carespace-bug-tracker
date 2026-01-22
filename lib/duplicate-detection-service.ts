import Anthropic from '@anthropic-ai/sdk';
import { DuplicateSearchRequest, DuplicateSearchResponse, SimilarBug } from './types';
import { listOpenIssues } from './github-service';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 60000, // 60 seconds timeout for API requests
  maxRetries: 3, // Retry up to 3 times with exponential backoff
});

/**
 * Finds similar bugs using AI semantic similarity analysis
 * Compares user's bug description with existing open issues
 * @param request - User's bug title and description
 * @returns Top 3-5 similar bugs with similarity scores
 */
export async function findSimilarBugs(request: DuplicateSearchRequest): Promise<DuplicateSearchResponse> {
  try {
    // Fetch existing open issues from GitHub
    const existingIssues = await listOpenIssues(100);

    // If no existing issues, return empty result
    if (existingIssues.length === 0) {
      return {
        similarBugs: [],
        count: 0
      };
    }

    // Build prompt for Claude to compare bugs
    const issuesContext = existingIssues.map((issue, idx) =>
      `Issue ${idx + 1}:
Title: ${issue.title}
Description: ${issue.body.substring(0, 500)}${issue.body.length > 500 ? '...' : ''}
Issue Number: ${issue.number}
URL: ${issue.html_url}
Created: ${issue.created_at}
Labels: ${issue.labels.join(', ') || 'none'}
`
    ).join('\n---\n');

    const prompt = `You are a technical bug report analyzer. Compare the following user's bug report with existing open issues and identify the most similar ones.

User's Bug Report:
Title: ${request.title}
Description: ${request.description}

Existing Issues:
${issuesContext}

Analyze semantic similarity between the user's bug and each existing issue. Consider:
1. Problem description similarity
2. Technical context overlap
3. Symptoms and behavior patterns
4. Error messages or keywords

Return the top 3-5 most similar issues (if any have similarity > 0.3) as a JSON array. Each item should have:
- issueNumber: the issue number
- similarityScore: float between 0 and 1 (0.3-0.5 = low match, 0.5-0.7 = medium match, 0.7+ = high match)
- reasoning: brief explanation of why they're similar

Respond ONLY with valid JSON in this exact format:
{
  "matches": [
    {
      "issueNumber": 123,
      "similarityScore": 0.85,
      "reasoning": "Both describe button click failures in the same component"
    }
  ]
}

If no issues are sufficiently similar (all scores < 0.3), return an empty matches array.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Map AI results to SimilarBug objects
    const similarBugs: SimilarBug[] = analysis.matches
      .filter((match: { issueNumber: number; similarityScore: number }) => match.similarityScore >= 0.3)
      .slice(0, 5) // Limit to top 5
      .map((match: { issueNumber: number; similarityScore: number }) => {
        const issue = existingIssues.find(i => i.number === match.issueNumber);
        if (!issue) {
          return null;
        }
        return {
          issueNumber: issue.number,
          title: issue.title,
          body: issue.body,
          url: issue.html_url,
          similarityScore: match.similarityScore,
          state: issue.state,
          createdAt: issue.created_at,
          labels: issue.labels
        };
      })
      .filter((bug: SimilarBug | null): bug is SimilarBug => bug !== null)
      .sort((a: SimilarBug, b: SimilarBug) => b.similarityScore - a.similarityScore); // Sort by score descending

    return {
      similarBugs,
      count: similarBugs.length
    };
  } catch (error) {
    // Check if this is a timeout error
    const isTimeout = error instanceof Error && (
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('timed out')
    );

    if (isTimeout) {
      console.error('Request timeout while searching for duplicates. The AI service took too long to respond. Falling back to empty results.');
    } else {
      console.error('Error finding similar bugs:', error);
    }

    // Fallback to empty result on error
    return {
      similarBugs: [],
      count: 0
    };
  }
}
