"use client";

import ClientAmenities from "@/components/features/client-amenities";
import { useClientAuth } from "@/contexts/ClientAuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ClientAmenitiesPage() {
  const { isAuthenticated, loading } = useClientAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [hasContract, setHasContract] = useState(null);
  const [contractLoading, setContractLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/client-login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      checkUserContract();
    }
  }, [isAuthenticated]);

  const checkUserContract = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setHasContract(false);
        setContractLoading(false);
        return;
      }

      // Check if user has any contracts
      const { data: contracts, error } = await supabase
        .from('property_contracts')
        .select('id')
        .eq('client_email', user.email)
        .limit(1);

      if (error) {
        console.error('Error checking contracts:', error);
        setHasContract(false);
      } else {
        setHasContract(contracts && contracts.length > 0);
      }
    } catch (error) {
      console.error('Error in checkUserContract:', error);
      setHasContract(false);
    } finally {
      setContractLoading(false);
    }
  };

  if (loading || contractLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // If user has a contract, they are a Certified Homeowner and should not access this page
  if (hasContract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Certified Homeowner</h2>
          <p className="text-slate-600 mb-6">You are now a Certified Homeowner. Please access the appropriate homeowner portal for amenities.</p>
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

  return <ClientAmenities />;
}
