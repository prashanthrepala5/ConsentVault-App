import { Wallet, FileSignature, Database, XCircle } from 'lucide-react'

const steps = [
  {
    icon: Wallet,
    step: '01',
    title: 'Connect Your Wallet',
    description: 'Link your Algorand wallet (Pera, AlgoSigner) to authenticate your identity without sharing personal data.',
  },
  {
    icon: FileSignature,
    step: '02',
    title: 'Grant Consent',
    description: 'Select a partner app, review their data policy, and choose which permissions to grant. Sign the transaction.',
  },
  {
    icon: Database,
    step: '03',
    title: 'On-Chain Record',
    description: 'Your consent is recorded immutably on Algorand with a policy hash, timestamp, and your permissions.',
  },
  {
    icon: XCircle,
    step: '04',
    title: 'Revoke Anytime',
    description: 'Change your mind? One-click revocation updates the blockchain and notifies the company instantly.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Simple, transparent, and secure consent management in four steps
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item.title} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute top-8 left-[calc(50%+2rem)] hidden h-0.5 w-[calc(100%-4rem)] bg-border lg:block" />
              )}
              
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
