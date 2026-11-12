export function Footer({ githubUrl, bmacUrl }: { githubUrl?: string; bmacUrl?: string }) {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto grid max-w-5xl gap-4 px-4 py-8 text-sm text-muted sm:grid-cols-[2fr_1fr] sm:px-6">
        <div className="space-y-2">
          <p>
            <strong className="text-ink">A personal portfolio project.</strong> Built and run by Piyush on Salesforce and
            Next.js, with no uptime promises.
          </p>
          <p>
            Privacy: the shop stores your email, your points history, and what you send with an order. Email Piyush
            any time to have it all deleted.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {bmacUrl && (
            <a href={bmacUrl} className="underline hover:text-ink" rel="noopener" target="_blank">
              Buy Piyush a coffee
            </a>
          )}
          {githubUrl && (
            <a href={githubUrl} className="underline hover:text-ink" rel="noopener" target="_blank">
              Code on GitHub
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
