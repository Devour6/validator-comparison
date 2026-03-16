import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center space-y-4">
        <h2 className="font-display text-xl text-foreground">Page Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-foreground hover:border-foreground/30 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Back to Validator Comparison
        </Link>
      </div>
    </div>
  )
}
