export type ItemType = "expense" | "income";
export type ItemSource = "recurring" | "one_off";

export interface RecurringTemplate {
  id: string;
  user_id: string;
  type: ItemType;
  description: string;
  amount: number;
  active: boolean;
  sort_order: number;
  created_at: string;
}

export interface MonthlyItem {
  id: string;
  user_id: string;
  year_month: string;
  type: ItemType;
  description: string;
  amount: number;
  source: ItemSource;
  recurring_template_id: string | null;
  is_modified: boolean;
  sort_order: number;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  pay_year_month: string | null;
  installment_count: number;
  sort_order: number;
  created_at: string;
}

export interface DebtMonthEntry {
  id: string;
  description: string;
  totalAmount: number;
  installmentAmount: number;
  installmentIndex: number;
  installmentCount: number;
}

export type CardChargeType = "fixed" | "installment";

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface CardCharge {
  id: string;
  card_id: string;
  user_id: string;
  description: string;
  amount: number;
  charge_type: CardChargeType;
  pay_year_month: string | null;
  installment_count: number;
  sort_order: number;
  created_at: string;
}

export interface CardWithCharges extends CreditCard {
  charges: CardCharge[];
}

export interface CardChargeMonthEntry {
  id: string;
  cardId: string;
  cardName: string;
  description: string;
  chargeType: CardChargeType;
  monthAmount: number;
  totalAmount: number;
  installmentIndex?: number;
  installmentCount?: number;
}

export interface MonthSummary {
  yearMonth: string;
  incomes: MonthlyItem[];
  expenses: MonthlyItem[];
  debts: DebtMonthEntry[];
  cards: CardChargeMonthEntry[];
  totalIncome: number;
  totalExpense: number;
  totalDebts: number;
  totalCards: number;
  balance: number;
}

export interface CreateItemInput {
  yearMonth: string;
  type: ItemType;
  description: string;
  amount: number;
  isRecurring: boolean;
}

export interface UpdateItemInput {
  id: string;
  description: string;
  amount: number;
  updateTemplate?: boolean;
}

export interface PersistItemsLayoutInput {
  yearMonth: string;
  incomeIds: string[];
  expenseIds: string[];
}

export interface CreateDebtInput {
  description: string;
  amount: number;
  payYearMonth: string | null;
  installmentCount: number;
}

export interface UpdateDebtInput {
  id: string;
  description: string;
  amount: number;
  payYearMonth: string | null;
  installmentCount: number;
}

export interface CreateCardInput {
  name: string;
}

export interface UpdateCardInput {
  id: string;
  name: string;
}

export interface CreateCardChargeInput {
  cardId: string;
  description: string;
  amount: number;
  chargeType: CardChargeType;
  payYearMonth: string | null;
  installmentCount: number;
}

export interface UpdateCardChargeInput {
  id: string;
  cardId: string;
  description: string;
  amount: number;
  chargeType: CardChargeType;
  payYearMonth: string | null;
  installmentCount: number;
}
