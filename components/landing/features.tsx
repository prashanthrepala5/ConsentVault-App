import { Shield, Lock, Eye, FileCheck, Zap, Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: Shield,
    title: 'DPDP Act Compliance',
    description: 'Built specifically for India\'s Digital Personal Data Protection Act, ensuring your business stays compliant.',
  },
  {
    icon: Lock,
    title: 'Immutable Records',
    description: 'Every consent action is permanently recorded on Algorand blockchain, creating tamper-proof audit trails.',
  },
  {
    icon: Eye,
    title: 'Granular Permissions',
    description: 'Users can approve or reject individual data permissions, giving them fine-grained control.',
  },
  {
    icon: FileCheck,
    title: 'Instant Verification',
    description: 'Companies and regulators can instantly verify consent status through blockchain queries.',
  },
  {
    icon: Zap,
    title: 'Low Cost Operations',
    description: 'Algorand\'s minimal fees mean consent operations cost less than 0.001 ALGO each.',
  },
  {
    icon: Globe,
    title: 'Public Audit Trail',
    description: 'Transparent audit capabilities allow regulators to verify compliance without compromising privacy.',
  },
]

export function Features() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl text-balance">
            Trustless Consent Infrastructure
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Built on Algorand for speed, security, and sustainability
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
