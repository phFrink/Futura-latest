'use client'

import MainLayout from '@/components/common/layout'
import Users from '@/components/features/settings/users'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import React from 'react'

const SettingsUsersPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <MainLayout currentPageName="Users">
        <Users />
      </MainLayout>
    </ProtectedRoute>
  )
}

export default SettingsUsersPage
