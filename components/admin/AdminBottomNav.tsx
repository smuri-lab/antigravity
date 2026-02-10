
import React from 'react';
import { AdminViewType, type AbsenceRequest } from '../../types';
import { useTranslation } from 'react-i18next';
import { LayoutDashboardIcon } from '../icons/LayoutDashboardIcon';
import { SunIcon } from '../icons/SunIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';

interface AdminBottomNavProps {
  activeView: AdminViewType;
  setActiveView: (view: AdminViewType) => void;
  absenceRequests: AbsenceRequest[];
}

interface NavItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  Icon: React.ElementType;
  badge?: number;
}

const NavItem: React.FC<NavItemProps> = ({ label, isActive, onClick, Icon, badge }) => {
  const activeClasses = 'text-blue-600';
  const inactiveClasses = 'text-gray-500 hover:text-blue-600';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full transition-colors duration-200 relative pt-1 ${isActive ? activeClasses : inactiveClasses}`}
    >
      <div className="relative">
        <Icon className="h-6 w-6 mb-1" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 group-hover:text-blue-600 transition-colors">{label}</span>
    </button>
  );
};

export const AdminBottomNav: React.FC<AdminBottomNavProps> = ({ activeView, setActiveView, absenceRequests }) => {
  const { t } = useTranslation();
  const pendingRequestsCount = absenceRequests.filter(r => r.status === 'pending').length;

  const isStammdatenActive =
    activeView === AdminViewType.Employees ||
    activeView === AdminViewType.Customers ||
    activeView === AdminViewType.Activities;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-[0_-2px_5px_rgba(0,0,0,0.05)] z-30">
      <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
        <NavItem
          label={t('nav.dashboard')}
          isActive={activeView === AdminViewType.Dashboard}
          onClick={() => setActiveView(AdminViewType.Dashboard)}
          Icon={LayoutDashboardIcon}
        />
        <NavItem
          label={t('nav.planner', 'Planer')}
          isActive={activeView === AdminViewType.Planner}
          onClick={() => setActiveView(AdminViewType.Planner)}
          Icon={SunIcon}
          badge={pendingRequestsCount}
        />
        <NavItem
          label={t('nav.reports', 'Berichte')}
          isActive={activeView === AdminViewType.Reports}
          onClick={() => setActiveView(AdminViewType.Reports)}
          Icon={ChartBarIcon}
        />
        <NavItem
          label={t('nav.admin', 'Stammdaten')}
          isActive={isStammdatenActive}
          onClick={() => setActiveView(AdminViewType.Employees)}
          Icon={BriefcaseIcon}
        />
      </div>
    </div>
  );
};
