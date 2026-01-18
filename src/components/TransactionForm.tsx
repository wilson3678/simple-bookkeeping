import React, { useState, useEffect } from 'react';
import type { Transaction, TransactionType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { PlusCircle, ArrowRightLeft, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface TransactionFormProps {
    onSubmit: (transactions: Transaction[]) => void;
    initialSources?: string[];
    initialDestinations?: string[];
    initialIncomeSources?: string[];
    initialNotes?: string[];
    editingTransaction?: Transaction | null;
    onCancelEdit?: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
    onSubmit,
    initialSources = [],
    initialDestinations = [],
    initialIncomeSources = [],
    initialNotes = [],
    editingTransaction = null,
    onCancelEdit
}) => {
    // Transaction Mode
    const [type, setType] = useState<TransactionType>('EXPENSE');

    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0].replace(/-/g, '/'));

    // Fields
    const [source, setSource] = useState<string>('');
    const [destination, setDestination] = useState<string>('');

    const [amount, setAmount] = useState<number | string>('');
    const [summary, setSummary] = useState<string>('');
    const [payer, setPayer] = useState<string>('');

    // Split Transaction State (Only for Expense for now)
    const [isSplit, setIsSplit] = useState<boolean>(false);
    const [destinationA, setDestinationA] = useState<string>('');
    const [destinationB, setDestinationB] = useState<string>('');
    const [amountA, setAmountA] = useState<number | string>('');
    const [amountB, setAmountB] = useState<number | string>('');

    // Populate form when editingTransaction changes
    useEffect(() => {
        if (editingTransaction) {
            setDate(editingTransaction.date);
            setAmount(editingTransaction.amount);
            setSummary(editingTransaction.summary);
            setSource(editingTransaction.source);
            setDestination(editingTransaction.destination);
            setPayer(editingTransaction.payer || '');

            // Set Type if available, otherwise guess based on fields or default to EXPENSE
            if (editingTransaction.type) {
                setType(editingTransaction.type);
            } else {
                // Fallback guessing logic if old data didn't have type
                // But now we should have type on all new data
                setType('EXPENSE');
            }

            // Disable split for edit mode for now to keep it simple, 
            // OR if we want to support editing splits, we'd need to know if it came from a split...
            // Complex splits are usually stored as 2 separate transactions effectively.
            // So we edit them individually.
            setIsSplit(false);
        } else {
            // Reset for new entry (optional, depends on UX preference, let's keep previous date/source often requested?)
            // But if we just cancelled edit, we might want to clean up?
            // User usually expects form to plain state after reset.
        }
    }, [editingTransaction]);

    useEffect(() => {
        // Auto calculate split amounts if total amount changes
        if (isSplit && amount) {
            const total = Number(amount);
            if (!isNaN(total)) {
                const half = Math.floor(total / 2);
                setAmountA(half);
                setAmountB(total - half);
            }
        }
    }, [amount, isSplit]);

    const handleAmountAChange = (val: string) => {
        setAmountA(val);
        const total = Number(amount);
        const valNum = Number(val);
        if (!isNaN(total) && !isNaN(valNum)) {
            setAmountB(total - valNum);
        }
    };

    const handleAmountBChange = (val: string) => {
        setAmountB(val);
        const total = Number(amount);
        const valNum = Number(val);
        if (!isNaN(total) && !isNaN(valNum)) {
            setAmountA(total - valNum);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!source || !amount) return;

        // Validation for Transfer/Income
        if ((type === 'INCOME' || type === 'TRANSFER') && !destination) return;

        const baseTransaction = {
            date: date.replace(/-/g, '/'),
            source,
            amount: Number(amount),
            summary,
            payer,
            type,
            projectCode: '',
            invoiceNumber: '',
        };

        if (editingTransaction) {
            // Update existing
            const updated: Transaction = {
                ...editingTransaction, // Keep original ID
                ...baseTransaction,
                destination: type === 'EXPENSE' ? (destination || '未分類') : destination,
            };
            onSubmit([updated]);
        } else if (type === 'EXPENSE' && isSplit) {
            if (!destinationA || !destinationB) return;

            const t1: Transaction = {
                ...baseTransaction,
                id: uuidv4(),
                destination: destinationA,
                amount: Number(amountA),
            };

            const t2: Transaction = {
                ...baseTransaction,
                id: uuidv4(),
                type: 'EXPENSE', // Explicitly set type
                source,
                summary,
                payer,
                projectCode: '',
                invoiceNumber: '',
                date: baseTransaction.date,
                destination: destinationB,
                amount: Number(amountB),
            };

            onSubmit([t1, t2]);
        } else {
            // Standard Single Transaction (Expense, Income, or Transfer)
            const t1: Transaction = {
                ...baseTransaction,
                id: uuidv4(),
                destination: type === 'EXPENSE' ? (destination || '未分類') : destination,
            };
            onSubmit([t1]);
        }

        // Reset
        if (!editingTransaction) {
            setSummary('');
            setAmount('');
            setAmountA('');
            setAmountB('');
            // Keep Date and Source/Destination depending on type might be annoying, but safer to clear amounts
        }
    };

    // Helper to get options based on field and type
    const getSourceOptions = () => {
        if (type === 'INCOME') return initialIncomeSources;
        return initialSources; // Expense & Transfer use Assets as Source
    };

    const getDestinationOptions = () => {
        if (type === 'EXPENSE') return initialDestinations; // Categories
        return initialSources; // Income & Transfer use Assets as Destination
    };

    const getSourceLabel = () => {
        if (type === 'INCOME') return 'Income Source 收入來源';
        if (type === 'TRANSFER') return 'From 轉出帳戶';
        return 'Source 支付帳戶'; // Expense
    };

    const getDestinationLabel = () => {
        if (type === 'INCOME') return 'To 存入帳戶';
        if (type === 'TRANSFER') return 'To 轉入帳戶';
        return 'Category 消費分類'; // Expense
    };

    return (
        <form onSubmit={handleSubmit} className="bg-[#faf9f6] p-6 md:p-8 shadow-lg border-2 border-gray-300 relative transition-colors duration-500">
            {/* Type Tabs */}
            <div className="flex mb-8 border-b-2 border-black">
                <button
                    type="button"
                    onClick={() => { setType('EXPENSE'); setIsSplit(false); }}
                    className={`flex-1 py-4 font-black tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${type === 'EXPENSE' ? 'bg-black text-white' : 'text-gray-400 hover:text-black'}`}
                >
                    <ArrowUpCircle size={18} />
                    EXPENSE 支出
                </button>
                <button
                    type="button"
                    onClick={() => { setType('INCOME'); setIsSplit(false); }}
                    className={`flex-1 py-4 font-black tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${type === 'INCOME' ? 'bg-[#8B001D] text-white' : 'text-gray-400 hover:text-[#8B001D]'}`}
                >
                    <ArrowDownCircle size={18} />
                    INCOME 收入
                </button>
                <button
                    type="button"
                    onClick={() => { setType('TRANSFER'); setIsSplit(false); }}
                    className={`flex-1 py-4 font-black tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${type === 'TRANSFER' ? 'bg-[#1a472a] text-white' : 'text-gray-400 hover:text-[#1a472a]'}`}
                >
                    <ArrowRightLeft size={18} />
                    TRANSFER 轉帳
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                {/* Date */}
                <div>
                    <label className="block text-xs font-black text-black mb-2 tracking-widest uppercase">Date 日期</label>
                    <input
                        type="date"
                        value={date.replace(/\//g, '-')}
                        onChange={(e) => setDate(e.target.value.replace(/-/g, '/'))}
                        className="w-full p-3 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none text-black font-bold text-lg"
                    />
                </div>

                {/* Source Input */}
                <div>
                    <label className={`block text-xs font-black mb-2 tracking-widest uppercase ${type === 'INCOME' ? 'text-[#8B001D]' : 'text-black'}`}>
                        {getSourceLabel()}
                    </label>
                    <input
                        type="text"
                        list="source-options"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full p-3 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none placeholder-gray-500 text-black font-bold text-lg"
                        placeholder={type === 'EXPENSE' ? "例如: 國泰PLAY" : type === 'INCOME' ? "例如: 薪資" : "例如: 銀行帳戶"}
                    />
                    <datalist id="source-options">
                        {getSourceOptions().map((s, i) => <option key={i} value={s} />)}
                    </datalist>
                </div>

                {/* Amount */}
                <div className={`md:col-span-2 p-6 border-l-4 ${type === 'INCOME' ? 'bg-[#fff0f3] border-[#8B001D]' : type === 'TRANSFER' ? 'bg-[#e8f5e9] border-[#1a472a]' : 'bg-[#ebe9e4] border-black'}`}>
                    <label className="block text-xs font-black text-black mb-2 tracking-widest uppercase">Amount 金額</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full text-5xl font-black bg-transparent border-none focus:ring-0 text-right font-mono placeholder-gray-500 p-0 ${type === 'INCOME' ? 'text-[#8B001D]' : type === 'TRANSFER' ? 'text-[#1a472a]' : 'text-black'}`}
                        placeholder="0"
                    />
                </div>

                {/* Split Toggle (Only visible for Expense) */}
                {type === 'EXPENSE' && (
                    <div className="md:col-span-2 flex items-center justify-between py-2">
                        <span className="text-xs font-black text-gray-400 tracking-widest uppercase">Split Transaction 分帳模式</span>
                        <button
                            type="button"
                            onClick={() => setIsSplit(!isSplit)}
                            className={`w-10 h-6 flex items-center p-0.5 transition-colors duration-200 rounded-full border-2 border-gray-300 ${isSplit ? 'bg-black border-black' : 'bg-transparent'}`}
                        >
                            <div className={`w-4 h-4 rounded-full shadow-sm transform duration-200 ${isSplit ? 'translate-x-4 bg-white' : 'bg-gray-300'}`}></div>
                        </button>
                    </div>
                )}

                {/* Destination Input */}
                {!isSplit ? (
                    <div className="md:col-span-2">
                        <label className={`block text-xs font-black mb-2 tracking-widest uppercase ${type === 'INCOME' ? 'text-black' : type === 'TRANSFER' ? 'text-[#1a472a]' : 'text-black'}`}>
                            {getDestinationLabel()}
                        </label>
                        <input
                            type="text"
                            list="destination-options"
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="w-full p-3 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none placeholder-gray-500 text-black font-bold text-lg"
                            placeholder={type === 'EXPENSE' ? "例如: 晚餐" : type === 'INCOME' ? "存入帳戶" : "轉入帳戶"}
                        />
                        <datalist id="destination-options">
                            {getDestinationOptions().map((s, i) => <option key={i} value={s} />)}
                        </datalist>
                    </div>
                ) : (
                    // Split Mode UI (Expense Only)
                    <>
                        <div className="p-6 bg-[#ebe9e4] border-2 border-gray-400">
                            <label className="block text-xs font-black text-black mb-4 tracking-widest uppercase border-b border-black pb-1 inline-block">Item 1</label>
                            <input
                                type="text"
                                list="destination-options"
                                value={destinationA}
                                onChange={(e) => setDestinationA(e.target.value)}
                                className="w-full p-2 mb-4 bg-transparent border-b-2 border-gray-400 text-lg focus:outline-none focus:border-black text-black font-bold"
                                placeholder="目的 A"
                            />
                            <input
                                type="number"
                                value={amountA}
                                onChange={(e) => handleAmountAChange(e.target.value)}
                                className="w-full p-2 bg-transparent border-b-2 border-gray-400 text-right font-mono focus:outline-none focus:border-black text-black font-bold text-xl"
                                placeholder="0"
                            />
                        </div>
                        <div className="p-6 bg-[#ebe9e4] border-2 border-gray-400">
                            <label className="block text-xs font-black text-black mb-4 tracking-widest uppercase border-b border-black pb-1 inline-block">Item 2</label>
                            <input
                                type="text"
                                list="destination-options"
                                value={destinationB}
                                onChange={(e) => setDestinationB(e.target.value)}
                                className="w-full p-2 mb-4 bg-transparent border-b-2 border-gray-400 text-lg focus:outline-none focus:border-black text-black font-bold"
                                placeholder="目的 B"
                            />
                            <input
                                type="number"
                                value={amountB}
                                onChange={(e) => handleAmountBChange(e.target.value)}
                                className="w-full p-2 bg-transparent border-b-2 border-gray-400 text-right font-mono focus:outline-none focus:border-black text-black font-bold text-xl"
                                placeholder="0"
                            />
                        </div>
                        <datalist id="destination-options">
                            {getDestinationOptions().map((s, i) => <option key={i} value={s} />)}
                        </datalist>
                    </>
                )}

                {/* Note */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-black text-black mb-2 tracking-widest uppercase">Note 備註</label>
                    <input
                        type="text"
                        list="note-options"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full p-3 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none placeholder-gray-500 text-black font-bold text-lg"
                        placeholder="例如: 午餐"
                    />
                    <datalist id="note-options">
                        {initialNotes.map((s, i) => <option key={i} value={s} />)}
                    </datalist>
                </div>

                {/* Payer (Only relevant for Expense usually, maybe Transfer?) */}
                {type !== 'INCOME' && (
                    <div>
                        <label className="block text-xs font-black text-black mb-2 tracking-widest uppercase">Payer 付款人</label>
                        <input type="text" value={payer} onChange={(e) => setPayer(e.target.value)} className="w-full p-3 bg-transparent border-b-2 border-gray-400 focus:border-black focus:outline-none transition-colors rounded-none placeholder-gray-500 text-black font-bold text-lg" />
                    </div>
                )}
            </div>

            <button
                type="submit"
                className={`w-full mt-12 text-white font-black py-5 px-6 transition-all flex items-center justify-center gap-3 tracking-widest text-base rounded-none border-2 hover:scale-[1.01] active:scale-[0.99] shadow-xl ${type === 'INCOME' ? 'bg-[#8B001D] border-[#8B001D] hover:bg-[#6e0017]' : type === 'TRANSFER' ? 'bg-[#1a472a] border-[#1a472a] hover:bg-[#143620]' : 'bg-black border-black hover:bg-[#333]'}`}
            >
                <PlusCircle size={20} />
                {editingTransaction ? '更新紀錄 UPDATE' : (
                    type === 'INCOME' ? '新增收入 ADD INCOME' : type === 'TRANSFER' ? '新增轉帳 ADD TRANSFER' : '新增支出 ADD EXPENSE'
                )}
            </button>
            {editingTransaction && (
                <button
                    type="button"
                    onClick={onCancelEdit}
                    className="w-full mt-4 text-gray-500 font-bold py-3 hover:text-black transition-colors"
                >
                    取消編輯 Cancel Edit
                </button>
            )}
        </form>
    );
};

export default TransactionForm;
