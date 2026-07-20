import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  business_type?: string;
  created_at: string;
}

interface CustomersCardProps {
  location: { lat: number; lng: number; name: string } | null;
  isLoading: boolean;
}

const sampleCustomers: Customer[] = [
  { id: '1', name: 'Amina Traders', email: 'amina@traders.pk', phone: '+92 310 1234567', business_type: 'Retail', created_at: '2025-03-10T12:00:00Z' },
  { id: '2', name: 'Nexus Imports', email: 'contact@nexusimports.com', phone: '+92 300 7654321', business_type: 'Wholesale', created_at: '2025-02-24T09:30:00Z' },
  { id: '3', name: 'Zen Construction', email: 'hello@zenbuilds.com', phone: '+92 321 9876543', business_type: 'Construction', created_at: '2025-04-01T16:15:00Z' }
];

export function CustomersCard({ location, isLoading }: CustomersCardProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location) return;
    setLoading(true);
    const timeout = window.setTimeout(() => {
      setCustomers(sampleCustomers);
      setLoading(false);
    }, 400);

    return () => window.clearTimeout(timeout);
  }, [location]);

  if (isLoading || loading) {
    return (
      <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shimmer">
        <div className="h-6 bg-[var(--bg3)] rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg3)] rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="bg-[var(--bg2)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[var(--text1)]" style={{ fontFamily: 'Syne', fontWeight: 700 }}>
          Local Customers
        </h3>
        <div className="text-sm text-[var(--text2)]" style={{ fontFamily: 'DM Mono', fontWeight: 400 }}>
          {loading ? 'Loading...' : `${customers.length} found`}
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {customers.length === 0 && !loading && (
          <div className="text-center text-[var(--text3)] py-4">No customers in this area</div>
        )}

        {customers.map((customer) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--bg3)] rounded-[var(--radius-md)] p-4 border border-[var(--border)]"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-[var(--text1)] truncate">{customer.name}</h4>
              {customer.business_type && (
                <span className="px-2 py-1 rounded-full text-[var(--text1)] text-xs font-medium bg-[var(--purple)]/15">
                  {customer.business_type}
                </span>
              )}
            </div>
            <div className="text-xs text-[var(--text3)] mb-2">
              <div>{customer.email}</div>
              {customer.phone && <div>{customer.phone}</div>}
            </div>
            <div className="text-xs text-[var(--text2)]">Registered: {new Date(customer.created_at).toLocaleDateString()}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
