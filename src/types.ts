export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface Transaction {
    id: string;
    date: string; // YYYY/MM/DD
    type?: TransactionType; // Defaults to EXPENSE if undefined
    source: string;
    destination: string;
    amount: number;
    summary: string;
    payer?: string;
    projectCode?: string;
    invoiceNumber?: string;
}

export type TransactionRecord = string[]; // For CSV parsing if needed, but we use strict objects

export interface AppSettings {
    commonSources: string[];      // Assets / Accounts
    commonDestinations: string[]; // Expense Categories
    commonIncomeSources: string[]; // Income Categories
    commonNotes: string[];
    initialBalances?: { [key: string]: number }; // Account -> Initial Balance
}

