import MainLayout from "@/components/common/layout";
import PropertyDetailsManagement from "@/components/features/properties/PropertyDetailsManagement";
import React from "react";

const PropertiesTypePage = () => {
  return (
    <MainLayout currentPageName="Property details">
      <PropertyDetailsManagement />
    </MainLayout>
  );
};

export default PropertiesTypePage;
