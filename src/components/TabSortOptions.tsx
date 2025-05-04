import React from 'react';
import SortDropdown from './SortDropdown';

interface TabSortOptionsProps {
  tab: string;
  sortOrder: string;
  onSortChange: (value: string) => void;
}

const TabSortOptions: React.FC<TabSortOptionsProps> = ({ tab, sortOrder, onSortChange }) => {
  const getSortOptions = () => {
    switch (tab) {
      case 'users':
        return [
          { value: 'recent', label: 'Most Recent Signups' },
          { value: 'earliest', label: 'Earliest Signups' },
          { value: 'name', label: 'Name (A-Z)' },
          { value: 'plan', label: 'Plan Type' }
        ];
      case 'bookings':
        return [
          { value: 'recent', label: 'Most Recent Bookings' },
          { value: 'earliest', label: 'Earliest Bookings' },
          { value: 'pickup', label: 'Pickup Date' },
          { value: 'status', label: 'Status' }
        ];
      case 'history':
        return [
          { value: 'recent', label: 'Most Recent Completions' },
          { value: 'earliest', label: 'Earliest Completions' },
          { value: 'amount', label: 'Amount (High to Low)' },
          { value: 'amount_low', label: 'Amount (Low to High)' }
        ];
      case 'feedback':
        return [
          { value: 'recent', label: 'Most Recent Messages' },
          { value: 'earliest', label: 'Earliest Messages' },
          { value: 'unread', label: 'Unread First' },
          { value: 'read', label: 'Read First' }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex items-center gap-2">
      <SortDropdown
        value={sortOrder}
        onChange={onSortChange}
        options={getSortOptions()}
      />
    </div>
  );
};

export default TabSortOptions; 