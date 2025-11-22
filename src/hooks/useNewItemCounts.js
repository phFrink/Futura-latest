'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { isNewItem } from '@/lib/utils';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const useNewItemCounts = () => {
  const [counts, setCounts] = useState({
    properties: 0,
    homeowners: 0,
    serviceRequests: 0,
    inquiries: 0,
    complaints: 0,
    announcements: 0,
    reservations: 0,
    transactions: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchNewItemCounts = async () => {
    try {
      setLoading(true);
      
      // Define the tables and their corresponding keys with correct date fields
      const tableConfigs = [
        { table: 'property_tbl', key: 'properties', dateField: 'created_at' },
        { table: 'homeowner_tbl', key: 'homeowners', dateField: 'created_at' },
        { table: 'service_request_tbl', key: 'serviceRequests', dateField: 'created_at' },
        { table: 'inquiry_tbl', key: 'inquiries', dateField: 'created_date' },
        { table: 'complaint_tbl', key: 'complaints', dateField: 'created_date' },
        { table: 'announcement_tbl', key: 'announcements', dateField: 'created_date' },
        { table: 'reservation_tbl', key: 'reservations', dateField: 'created_at' },
        { table: 'transaction_tbl', key: 'transactions', dateField: 'created_at' }
      ];

      const newCounts = { ...counts };

      // Fetch data for each table and count new items
      for (const config of tableConfigs) {
        try {
          const { data, error } = await supabase
            .from(config.table)
            .select(config.dateField)
            .order(config.dateField, { ascending: false })
            .limit(100); // Limit to last 100 records for performance

          if (error) {
            // console.error(`Error fetching ${config.table}:`, error);
            newCounts[config.key] = 0;
            continue;
          }

          if (!data) {
            console.log(`${config.table}: No data returned`);
            newCounts[config.key] = 0;
            continue;
          }

          // Count items created in the last 24 hours
          const newItems = data.filter(item => {
            const dateValue = item[config.dateField];
            if (!dateValue) return false;
            return isNewItem(dateValue);
          });
          
          newCounts[config.key] = newItems.length;
          
          // Debug logging
          console.log(`${config.table}: Found ${data.length} total items, ${newItems.length} new items`);
        } catch (tableError) {
          console.error(`Error processing ${config.table}:`, tableError);
          newCounts[config.key] = 0;
        }
      }

      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching new item counts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewItemCounts();
    
    // Set up real-time listeners for all tables to update counts immediately
    const subscriptions = [];
    
    const tableConfigs = [
      { table: 'property_tbl', key: 'properties', dateField: 'created_at' },
      { table: 'homeowner_tbl', key: 'homeowners', dateField: 'created_at' },
      { table: 'service_request_tbl', key: 'serviceRequests', dateField: 'created_at' },
      { table: 'inquiry_tbl', key: 'inquiries', dateField: 'created_date' },
      { table: 'complaint_tbl', key: 'complaints', dateField: 'created_date' },
      { table: 'announcement_tbl', key: 'announcements', dateField: 'created_date' },
      { table: 'reservation_tbl', key: 'reservations', dateField: 'created_at' },
      { table: 'transaction_tbl', key: 'transactions', dateField: 'created_at' }
    ];

    tableConfigs.forEach(({ table, key }) => {
      const subscription = supabase
        .channel(`${table}_count_changes`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: table
          },
          (payload) => {
            // Increment count for new items
            const dateValue = payload.new[tableConfigs.find(t => t.key === key)?.dateField] || payload.new.created_at;
            if (isNewItem(dateValue)) {
              setCounts(prev => ({
                ...prev,
                [key]: prev[key] + 1
              }));
            }
          }
        )
        .subscribe();
      
      subscriptions.push(subscription);
    });

    // Refresh counts every 5 minutes to account for items aging out of "new" status
    const intervalId = setInterval(fetchNewItemCounts, 5 * 60 * 1000);

    return () => {
      // Cleanup subscriptions
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
      clearInterval(intervalId);
    };
  }, []);

  // Manual refresh function
  const refreshCounts = () => {
    fetchNewItemCounts();
  };

  return { counts, loading, refreshCounts };
};