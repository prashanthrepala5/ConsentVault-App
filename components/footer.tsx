import Link from 'next/link'
import { Shield, Github, ExternalLink } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">ConsentVault</span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Blockchain-powered consent management for India&apos;s DPDP Act. 
              Giving users control over their data with immutable, auditable consent records.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://algorand.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm"
              >
                Built on Algorand <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">Product</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/consent" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Give Consent
                </Link>
              </li>
              <li>
                <Link href="/audit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Audit Trail
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Resources</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a 
                  href="https://testnet.algoexplorer.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Testnet Explorer <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://developer.algorand.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Algorand Docs <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://www.meity.gov.in/data-protection-framework" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  DPDP Act Info <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            Running on Algorand Testnet. This is a demo application for educational purposes.
          </p>
        </div>
      </div>
    </footer>
  )
}
