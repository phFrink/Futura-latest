"use client";

import MainLayout from "@/components/common/layout";
import LoanPlanView from "@/components/features/loans/LoanPlanView";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const LoanPlanPage = ({ params }) => {
  return (
    <ProtectedRoute requiredRoles={["admin", "collection"]}>
      <MainLayout currentPageName="Loan Plan Details">
        <LoanPlanView contractId={params.id} />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default LoanPlanPage;