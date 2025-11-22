"use client";

import MainLayout from "@/components/common/layout";
import ManageAmenities from "@/components/features/manage-amenities";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const ManageAmenitiesPage = () => {
  return (
    <ProtectedRoute requiredRoles={["admin", "customer service"]}>
      <MainLayout currentPageName="Manage Amenities">
        <ManageAmenities />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default ManageAmenitiesPage;
