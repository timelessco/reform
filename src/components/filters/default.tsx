"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createFilter, Filters } from "@/components/ui/filters";
import type { Filter, FilterFieldConfig } from "@/components/ui/filters";
import {
  AlertCircleIcon,
  BanIcon,
  CalendarIcon,
  ClockIcon,
  MailIcon,
  StarIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  Bell,
  Building,
  CheckCircle,
  FunnelX,
  Globe,
  Phone,
  SlidersHorizontal,
  Timer,
  TrendingUp,
  Type,
  UserRoundCheck,
  Wallet,
} from "lucide-react";

// Priority icon component
const PriorityIcon = ({ priority }: { priority: string }) => {
  const colors = {
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-violet-500",
    urgent: "bg-orange-500",
    critical: "bg-red-500",
  };
  return (
    <div
      className={cn("size-2.25 shrink-0 rounded-full", colors[priority as keyof typeof colors])}
    />
  );
};

export default function FiltersDemo() {
  // Example: All Possible Filter Field Types with Grouping
  const fields: FilterFieldConfig[] = [
    {
      group: "Basic",
      fields: [
        {
          key: "text",
          label: "Text",
          type: "text",
          icon: <Type />,
          placeholder: "Search text...",
        },
        {
          key: "email",
          label: "Email",
          type: "email",
          icon: <MailIcon />,
          placeholder: "user@example.com",
        },
        {
          key: "website",
          label: "Website",
          icon: <Globe />,
          type: "url",
          className: "w-40",
          placeholder: "https://example.com",
        },
        {
          key: "phone",
          label: "Phone",
          icon: <Phone />,
          type: "tel",
          className: "w-40",
          placeholder: "+1 (123) 456-7890",
        },
        {
          key: "isActive",
          label: "Is active ?",
          icon: <CheckCircle />,
          type: "boolean",
        },
      ],
    },
    {
      group: "Select",
      fields: [
        {
          key: "status",
          label: "Status",
          icon: <Bell />,
          type: "select",
          searchable: false,
          className: "w-[200px]",
          options: [
            {
              value: "todo",
              label: "To Do",
              icon: <ClockIcon className="size-3 text-primary" />,
            },
            {
              value: "in-progress",
              label: "In Progress",
              icon: <AlertCircleIcon className="size-3 text-yellow-500" />,
            },
            {
              value: "done",
              label: "Done",
              icon: <CheckCircle className="size-3 text-green-500" />,
            },
            {
              value: "cancelled",
              label: "Cancelled",
              icon: <BanIcon className="size-3 text-destructive" />,
            },
          ],
        },
        {
          key: "priority",
          label: "Priority",
          icon: <SlidersHorizontal />,
          type: "multiselect",
          className: "w-[180px]",
          selectedOptionsClassName: "-space-x-1",
          options: [
            {
              value: "low",
              label: "Low",
              icon: <PriorityIcon priority="low" />,
            },
            {
              value: "medium",
              label: "Medium",
              icon: <PriorityIcon priority="medium" />,
            },
            {
              value: "high",
              label: "High",
              icon: <PriorityIcon priority="high" />,
            },
            {
              value: "urgent",
              label: "Urgent",
              icon: <PriorityIcon priority="urgent" />,
            },
            {
              value: "critical",
              label: "Critical",
              icon: <PriorityIcon priority="critical" />,
            },
          ],
        },
        {
          key: "assignee",
          label: "Assignee",
          icon: <UserRoundCheck />,
          type: "multiselect",
          maxSelections: 5,
          options: [
            {
              value: "john",
              label: "John Doe",
              icon: <div className="size-3 rounded-full bg-primary" />,
            },
            {
              value: "jane",
              label: "Jane Smith",
              icon: <div className="size-3 rounded-full bg-green-400" />,
            },
            {
              value: "bob",
              label: "Bob Johnson",
              icon: <div className="size-3 rounded-full bg-purple-400" />,
            },
            {
              value: "unassigned",
              label: "Unassigned",
              icon: <Building className="size-3 text-gray-400" />,
            },
          ],
        },
        {
          key: "userType",
          label: "User Type",
          icon: <UsersIcon />,
          type: "select",
          searchable: false,
          className: "w-[200px]",
          options: [
            {
              value: "premium",
              label: "Premium",
              icon: <StarIcon className="size-3 text-yellow-500" />,
            },
            {
              value: "standard",
              label: "Standard",
              icon: <Building className="size-3 text-muted-foreground" />,
            },
            {
              value: "trial",
              label: "Trial",
              icon: <ClockIcon className="size-3 text-gray-500" />,
            },
          ],
        },
      ],
    },
    {
      group: "Date & Time",
      fields: [
        {
          key: "dueDate",
          label: "Due Date",
          icon: <CalendarIcon />,
          type: "date",
          className: "w-36",
        },
        {
          key: "orderDate",
          label: "Order Date",
          icon: <CalendarIcon />,
          type: "select",
          searchable: false,
          className: "w-[200px]",
          options: [
            { value: "past", label: "in the past" },
            { value: "24h", label: "24 hours from now" },
            { value: "3d", label: "3 days from now" },
            { value: "1w", label: "1 week from now" },
            { value: "1m", label: "1 month from now" },
            { value: "3m", label: "3 months from now" },
          ],
        },
        {
          key: "dateRange",
          label: "Date Range",
          icon: <CalendarIcon />,
          type: "daterange",
        },
        {
          key: "createdAt",
          label: "Created At",
          icon: <ClockIcon />,
          type: "datetime",
        },
        {
          key: "workingHours",
          label: "Working Hours",
          icon: <Timer />,
          type: "time",
        },
      ],
    },
    {
      group: "Numbers",
      fields: [
        {
          key: "score",
          label: "Score",
          icon: <StarIcon />,
          type: "number",
          min: 0,
          max: 100,
          step: 1,
        },
        {
          key: "salary",
          label: "Salary",
          icon: <Wallet />,
          type: "number",
          prefix: "$",
          className: "w-24",
          min: 0,
          max: 500000,
          step: 1000,
        },
        {
          key: "completion",
          label: "Completion",
          icon: <TrendingUp />,
          className: "w-24",
          suffix: "%",
          type: "number",
          step: 5,
        },
      ],
    },
  ];

  const [filters, setFilters] = useState<Filter[]>([
    createFilter("priority", "contains", ["low", "medium", "critical"]),
  ]);

  const handleFiltersChange = useCallback((filters: Filter[]) => {
    setFilters(filters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  return (
    <div className="flex items-start gap-2.5 grow space-y-6 self-start content-start">
      <div className="flex-1">
        <Filters
          filters={filters}
          fields={fields}
          variant="outline"
          onChange={handleFiltersChange}
        />
      </div>

      {filters.length > 0 && (
        <Button variant="outline" prefix={<FunnelX />} onClick={handleClearFilters}>
          Clear
        </Button>
      )}
    </div>
  );
}
