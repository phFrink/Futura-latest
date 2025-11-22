"use client";

import MainLayout from "@/components/common/layout";
import Loans from "@/components/features/loans";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const LoansPage = () => {
  return (
    <ProtectedRoute requiredRoles={["admin", "collection"]}>
      <MainLayout currentPageName="Billing">
        <Loans />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default LoansPage;
