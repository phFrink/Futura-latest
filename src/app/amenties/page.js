"use client";

import MainLayout from "@/components/common/layout";
import Amenities from "@/components/features/amenities";
import ProtectedRoute from "@/components/common/ProtectedRoute";

const AmenitiesPage = () => {
  return (
    <ProtectedRoute requiredRoles={["admin", "customer service"]}>
      <MainLayout currentPageName="Amenity Borrowing">
        <Amenities />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default AmenitiesPage;
