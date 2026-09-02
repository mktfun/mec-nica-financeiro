import React from 'react';
import { StoreRow } from '@/lib/supabase';
import { 
  PatioExcelStoreAccordion, 
  EditablePatioOsItem, 
  PaymentMethodOption 
} from './PatioExcelStoreAccordion';

export type { EditablePatioOsItem, PaymentMethodOption };

export interface PatioManualStoreGridProps {
  stores: StoreRow[];
  selectedStoreId?: string;
  onSelectStore?: (storeId: string) => void;
  osItems: EditablePatioOsItem[];
  onChangeItem: (id: string, updates: Partial<EditablePatioOsItem>) => void;
  onQuickPay?: (id: string, method: PaymentMethodOption) => void;
  onAddManualOs: (storeId: string, os: Partial<EditablePatioOsItem>) => void;
  onRemoveManualOs?: (id: string) => void;
  targetDate: string;
}

export const PatioManualStoreGrid: React.FC<PatioManualStoreGridProps> = (props) => {
  return <PatioExcelStoreAccordion {...props} />;
};
