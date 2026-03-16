'use client'

import { useState, useRef, useEffect } from 'react'

interface ShareButtonProps {
  pubkeys: string[]
  names?: string[]
}

function buildCompareUrl(pubkeys: string[]): string {
  const base = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://validator-comparison.vercel.app'
  const params = new URLSearchParams()
  pubkeys.forEach(pk => params.append('v', pk))
  return `${base}/compare?${params.toString()}`
}

function buildOgUrl(pubkeys: string[]): string {
  const params = new URLSearchParams()
  pubkeys.forEach(pk => params.append('v', pk))
  return `/api/og?${params.toString()}`
}

export function ShareButton({ pubkeys, names }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const compareUrl = buildCompareUrl(pubkeys)
  const ogUrl = buildOgUrl(pubkeys)

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(compareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (e.g. non-HTTPS context)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(ogUrl)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'validator-comparison.png'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  function handleTwitter() {
    const text = names && names.length > 0
      ? `Compare ${names.join(' vs ')} on @phase_labs`
      : 'Check out this Solana validator comparison'
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(compareUrl)}`
    window.open(twitterUrl, '_blank')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Share this comparison"
        className="px-4 py-2.5 rounded-lg border border-foreground/20 bg-foreground/5 text-sm text-foreground hover:bg-foreground/10 hover:border-foreground/30 transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        Share This Comparison
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 rounded-lg border border-border bg-card shadow-xl overflow-hidden min-w-[200px]">
          <button
            onClick={handleCopyLink}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {copied ? (
              <>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="text-chart-1">Copied!</span>
              </>
            ) : (
              <>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                Copy Link
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-3 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? 'Downloading...' : 'Download Image'}
          </button>
          <button
            onClick={handleTwitter}
            className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </button>
        </div>
      )}
    </div>
  )
}
