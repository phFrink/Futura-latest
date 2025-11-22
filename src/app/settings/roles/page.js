'use client'

import MainLayout from '@/components/common/layout'
import Roles from '@/components/features/settings/roles'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import React from 'react'

const SettingsRolesPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <MainLayout currentPageName="Roles">
        <Roles />
      </MainLayout>
    </ProtectedRoute>
  )
}

export default SettingsRolesPage
