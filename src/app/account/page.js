"use client";

import MainLayout from "@/components/common/layout";
import Account from "@/components/features/account";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import React from "react";

const AccountPage = () => {
  return (
    <ProtectedRoute
      requiredRoles={[
        "admin",
        "customer service",
        "sales representative",
        "home owner",
      ]}
    >
      <MainLayout currentPageName="Account Settings">
        <Account />
      </MainLayout>
    </ProtectedRoute>
  );
};

export default AccountPage;
