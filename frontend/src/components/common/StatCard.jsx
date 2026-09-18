import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'agri', trend }) {
  const colorMap = {
    agri: 'bg-agri-50 text-agri-800 border-agri-200',
    navy: 'bg-navy-50 text-navy-800 border-navy-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  const iconColorMap = {
    agri: 'bg-agri-700 text-white',
    navy: 'bg-navy-800 text-white',
    amber: 'bg-amber-600 text-white',
    rose: 'bg-rose-600 text-white',
    emerald: 'bg-emerald-600 text-white',
  };

  return (
    <div className={`p-5 rounded-2xl border bg-white shadow-xs hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            {title}
          </p>
          <h4 className="text-2xl font-black text-neutral-900 mt-1 font-mono tracking-tight">
            {value}
          </h4>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl shadow-xs ${iconColorMap[color] || iconColorMap.agri}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-neutral-100 text-neutral-500">
          <span>{subtitle}</span>
          {trend && (
            <span className="font-semibold text-agri-700">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
