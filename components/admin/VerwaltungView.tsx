
import React, { useState, useEffect } from 'react';
import { AdminViewType, type Customer, type Activity, type CompanySettings, type Employee } from '../../types';
import { CustomerManagement } from './CustomerManagement';
import { ActivityManagement } from './ActivityManagement';
import { EmployeeManagement } from './EmployeeManagement';

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
    { id: 'employees', label: 'Mitarbeiter' },
    { id: 'customers', label: customerLabel },
    { id: 'activities', label: activityLabel },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Stammdaten</h2>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
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
