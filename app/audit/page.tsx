import { AuditSearch } from '@/components/audit/audit-search'

export default function AuditPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Audit Trail</h1>
        <p className="mt-2 text-muted-foreground">
          Public audit interface for companies and regulators to verify consent records
        </p>
      </div>

      <AuditSearch />
    </div>
  )
}
