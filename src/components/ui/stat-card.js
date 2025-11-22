import React from 'react';
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection = 'up',
  className = "",
  delay = 0,
  color = "blue"
}) {
  const colorClasses = {
    blue: "from-red-400 to-red-500",
    green: "from-red-500 to-red-600",
    amber: "from-red-600 to-red-700",
    red: "from-red-500 to-red-600",
    purple: "from-red-700 to-red-800"
  };

  return (
    <Card className={`relative overflow-hidden bg-white/80 backdrop-blur-sm border-slate-200 hover:shadow-xl hover:shadow-slate-200/30 transition-all duration-300 ${className}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 bg-gradient-to-br ${colorClasses[color]} rounded-full opacity-10`} />
      <div className="relative p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">{title}</p>
            <p className="text-xl font-bold text-slate-900">{value}</p>
          </div>
          <div className={`flex items-center justify-center min-w-12 min-h-12 w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-4 text-sm">
            {trendDirection === 'up' ? (
              <TrendingUp className="w-4 h-4 mr-1 text-emerald-500" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
            )}
            <span className={`font-medium ${
              trendDirection === 'up' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {trend}
            </span>
            <span className="text-xs text-slate-500 ml-1">this month</span>
          </div>
        )}
      </div>
    </Card>
  );
}