interface SubmitResultProps {
  result: {
    success: boolean;
    message: string;
    data?: any;
  } | null;
}

export default function SubmitResult({ result }: SubmitResultProps) {
  if (!result) return null;

  return (
    <div
      className={`mb-6 p-4 rounded-lg ${
        result.success
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'
      }`}
    >
      <p
        className={`font-semibold ${
          result.success ? 'text-green-800' : 'text-red-800'
        }`}
      >
        {result.message}
      </p>
      {result.success && result.data && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-green-700">
            <strong>GitHub Issue:</strong>{' '}
            <a
              href={result.data.githubIssue}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-900"
            >
              View Issue
            </a>
          </p>
          <p className="text-green-700">
            <strong>ClickUp Task:</strong>{' '}
            <a
              href={result.data.clickupTask}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-900"
            >
              View Task
            </a>
          </p>
          <p className="text-green-700">
            <strong>Priority:</strong> {result.data.enhancedReport.priority}/5
          </p>
          <p className="text-green-700">
            <strong>Labels:</strong> {result.data.enhancedReport.labels.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
