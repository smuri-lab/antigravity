
import React, { useState, useEffect } from 'react';
import { AdminViewType, type Customer, type Activity, type CompanySettings, type Employee } from '../../types';
import { CustomerManagement } from './CustomerManagement';
import { ActivityManagement } from './ActivityManagement';
import { EmployeeManagement } from './EmployeeManagement';
import { UsersIcon } from '../icons/UsersIcon';
import { BriefcaseIcon } from '../icons/BriefcaseIcon';
import { AdjustmentsHorizontalIcon } from '../icons/AdjustmentsHorizontalIcon';

interface VerwaltungViewProps {
  initialView: AdminViewType;
  setActiveView: (view: AdminViewType) => void;
  // Employee Props
  loggedInUser: Employee;
  employees: Employee[];
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: number) => void;
  // Customer Props
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  // Activity Props
  activities: Activity[];
  onAddActivity: (activity: Omit<Activity, 'id'>) => void;
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  // Settings
  companySettings: CompanySettings;
}

export const VerwaltungView: React.FC<VerwaltungViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'customers' | 'activities'>('employees');

  useEffect(() => {
    if (props.initialView === AdminViewType.Employees) setActiveTab('employees');
    else if (props.initialView === AdminViewType.Activities) setActiveTab('activities');
    else if (props.initialView === AdminViewType.Customers) setActiveTab('customers');
    else setActiveTab('employees'); // Default fallback
  }, [props.initialView]);

  const handleTabChange = (tab: 'employees' | 'customers' | 'activities') => {
    setActiveTab(tab);
    if (tab === 'employees') props.setActiveView(AdminViewType.Employees);
    else if (tab === 'customers') props.setActiveView(AdminViewType.Customers);
    else if (tab === 'activities') props.setActiveView(AdminViewType.Activities);
  };

  const customerLabel = props.companySettings.customerLabel || 'Zeitkategorie 1';
  const activityLabel = props.companySettings.activityLabel || 'Zeitkategorie 2';

  const tabs = [
    { id: 'employees', label: 'Mitarbeiter', icon: UsersIcon },
    { id: 'customers', label: customerLabel, icon: BriefcaseIcon },
    { id: 'activities', label: activityLabel, icon: AdjustmentsHorizontalIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="mt-4 flex justify-start">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in">
        {activeTab === 'employees' && (
          <EmployeeManagement
            loggedInUser={props.loggedInUser}
            employees={props.employees}
            onAdd={props.onAddEmployee}
            onUpdate={props.onUpdateEmployee}
            onDelete={props.onDeleteEmployee}
            companySettings={props.companySettings}
          />
        )}
        {activeTab === 'customers' && (
          <CustomerManagement
            customers={props.customers}
            onAdd={props.onAddCustomer}
            onUpdate={props.onUpdateCustomer}
            onDelete={props.onDeleteCustomer}
            companySettings={props.companySettings}
          />
        )}
        {activeTab === 'activities' && (
          <ActivityManagement
            activities={props.activities}
            onAdd={props.onAddActivity}
            onUpdate={props.onUpdateActivity}
            onDelete={props.onDeleteActivity}
            companySettings={props.companySettings}
          />
        )}
      </div>
    </div>
  );
};
