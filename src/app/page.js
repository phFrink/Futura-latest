import React from "react";
import ClientLandingPage from "./client-home/page";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";

const Page = () => {
  return (
    <ClientAuthProvider>
      <ClientLandingPage />
    </ClientAuthProvider>
  );
};

export default Page;
