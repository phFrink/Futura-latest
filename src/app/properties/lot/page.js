import MainLayout from "@/components/common/layout";
import LotManagement from "@/components/features/properties/LotManagement";
import React from "react";

const PropertiesLotPage = () => {
  return (
    <MainLayout currentPageName="Lot Number">
      <LotManagement />
    </MainLayout>
  );
};

export default PropertiesLotPage;
