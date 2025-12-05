"use client";

import MainLayout from '@/components/common/layout'
import Complaints from '@/components/features/complaints'
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const ComplaintsPage = () => {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [hasContract, setHasContract] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserContract();
  }, []);

  const checkUserContract = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/client-login');
        return;
      }

      // Check if user has any contracts
      const { data: contracts, error: contractError } = await supabase
        .from('property_contracts')
        .select('id')
        .eq('client_email', user.email)
        .limit(1);

      if (contractError) {
        setHasContract(false);
      } else {
        setHasContract(contracts && contracts.length > 0);
      }
    } catch (err) {
      setHasContract(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has a contract, they are a Certified Homeowner and should not access this page
  if (hasContract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Certified Homeowner</h2>
          <p className="text-slate-600 mb-6">You are now a Certified Homeowner. Please access the appropriate homeowner portal for complaints.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout currentPageName="complaints">
        <Complaints />
    </MainLayout>
  )
}
export default ComplaintsPage