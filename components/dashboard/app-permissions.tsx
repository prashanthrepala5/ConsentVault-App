import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet-context';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function AppPermissions() {
  const { address, sendPaymentTransaction } = useWallet();
  const [apps, setApps] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (address) {
      fetchData();
    }
  }, [address]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Create some mock apps if none exist, normally you'd do this via a separate admin channel
      const appsRes = await fetch('/api/apps');
      if (appsRes.ok) {
        const { apps } = await appsRes.json();
        setApps(apps);
      }
      
      const permRes = await fetch(`/api/permissions?wallet=${address}`);
      if (permRes.ok) {
        const data = await permRes.json();
        setPermissions(data.permissions);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load apps/permissions');
    }
    setLoading(false);
  };

  const getPermission = (appId: string) => {
    return permissions.find((p) => p.connectedAppId === appId) || { viewProfile: false, viewActivity: false, receiveNotifs: false };
  };

  const handleToggle = async (appId: string, field: string, currentValue: boolean) => {
    toast.info('Initiating 0.01 ALGO transaction to update permissions...');
    try {
      // 1. Ask wallet to send 0.01 ALGO
      const amountMicroAlgos = 10000; // 0.01 ALGO
      const platformReceiver = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || 'DEMO_TREASURY_ADDRESS_CHANGE_ME';
      
      const txid = await sendPaymentTransaction(amountMicroAlgos, platformReceiver);
      
      if (!txid) {
        throw new Error('Transaction failed or cancelled');
      }
      
      toast.success('Payment confirmed! Updating database...');

      const currentPerms = getPermission(appId);
      const newPerms = { ...currentPerms, [field]: !currentValue };
      
      // 2. Inform Backend
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          connectedAppId: appId,
          permissions: newPerms,
          txid: txid,
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update securely.');
      }

      toast.success('Permission updated successfully!');
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Update failed.');
    }
  };

  const handleCriticalPermission = () => {
    toast.warning('Such an access is permissible only via direct access of the app.');
  };

  if (loading) return <div>Loading applications...</div>;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Connected Apps</h2>
      {apps.length === 0 && <p className="text-muted-foreground">No applications available.</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => {
          const perm = getPermission(app.id);
          
          return (
            <div key={app.id} className="border border-border bg-card p-6 rounded-xl flex flex-col">
              <h3 className="text-lg font-semibold">{app.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">{app.description || 'No description'}</p>
              
              <div className="space-y-4 flex-grow">
                {/* Broad Permissions */}
                <div className="flex items-center justify-between">
                  <span className="text-sm">View Profile</span>
                  <Switch 
                    checked={perm.viewProfile} 
                    onCheckedChange={() => handleToggle(app.id, 'viewProfile', perm.viewProfile)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">View Activity Logs</span>
                  <Switch 
                    checked={perm.viewActivity} 
                    onCheckedChange={() => handleToggle(app.id, 'viewActivity', perm.viewActivity)} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Receive Notifications</span>
                  <Switch 
                    checked={perm.receiveNotifs} 
                    onCheckedChange={() => handleToggle(app.id, 'receiveNotifs', perm.receiveNotifs)} 
                  />
                </div>

                <hr className="border-border" />

                {/* Critical Permissions (simulated) */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-warning">Location Tracking</span>
                  <Switch checked={false} onCheckedChange={handleCriticalPermission} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-warning">Camera Access</span>
                  <Switch checked={false} onCheckedChange={handleCriticalPermission} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
