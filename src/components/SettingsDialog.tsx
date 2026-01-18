import React, { useState } from 'react';
import { X, Plus, Trash2, Settings } from 'lucide-react';
import type { AppSettings } from '../types';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (newSettings: AppSettings) => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [newSource, setNewSource] = useState('');
    const [newDestination, setNewDestination] = useState('');
    const [newIncomeSource, setNewIncomeSource] = useState('');
    const [newNote, setNewNote] = useState('');

    // Update local state when prop changes, if needed
    React.useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    if (!isOpen) return null;

    const handleAddSource = () => {
        if (newSource.trim()) {
            const name = newSource.trim();
            setLocalSettings(prev => ({
                ...prev,
                commonSources: [...prev.commonSources, name],
                initialBalances: {
                    ...(prev.initialBalances || {}),
                    [name]: 0
                }
            }));
            setNewSource('');
        }
    };

    const handleDeleteSource = (index: number) => {
        const nameToRemove = localSettings.commonSources[index];
        setLocalSettings(prev => {
            const newBalances = { ...prev.initialBalances };
            delete newBalances[nameToRemove];

            return {
                ...prev,
                commonSources: prev.commonSources.filter((_, i) => i !== index),
                initialBalances: newBalances
            };
        });
    };

    const handleInitialBalanceChange = (account: string, amount: string) => {
        setLocalSettings(prev => ({
            ...prev,
            initialBalances: {
                ...(prev.initialBalances || {}),
                [account]: Number(amount)
            }
        }));
    };

    const handleAddIncomeSource = () => {
        if (newIncomeSource.trim()) {
            setLocalSettings(prev => ({
                ...prev,
                commonIncomeSources: [...(prev.commonIncomeSources || []), newIncomeSource.trim()]
            }));
            setNewIncomeSource('');
        }
    };

    const handleDeleteIncomeSource = (index: number) => {
        setLocalSettings(prev => ({
            ...prev,
            commonIncomeSources: (prev.commonIncomeSources || []).filter((_, i) => i !== index)
        }));
    };

    const handleAddDestination = () => {
        if (newDestination.trim()) {
            setLocalSettings(prev => ({
                ...prev,
                commonDestinations: [...prev.commonDestinations, newDestination.trim()]
            }));
            setNewDestination('');
        }
    };

    const handleDeleteDestination = (index: number) => {
        setLocalSettings(prev => ({
            ...prev,
            commonDestinations: prev.commonDestinations.filter((_, i) => i !== index)
        }));
    };

    const handleAddNote = () => {
        if (newNote.trim()) {
            setLocalSettings(prev => ({
                ...prev,
                commonNotes: [...(prev.commonNotes || []), newNote.trim()]
            }));
            setNewNote('');
        }
    };

    const handleDeleteNote = (index: number) => {
        setLocalSettings(prev => ({
            ...prev,
            commonNotes: (prev.commonNotes || []).filter((_, i) => i !== index)
        }));
    };

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#faf9f6] w-full max-w-2xl shadow-2xl border-2 border-black max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b-2 border-black bg-[#e3e1dd]">
                    <h2 className="text-xl font-black text-black tracking-widest flex items-center gap-2 uppercase">
                        <Settings size={24} className="stroke-[2.5px]" />
                        Settings 設定
                    </h2>
                    <button onClick={onClose} className="text-black hover:bg-black/10 p-1 transition rounded-sm">
                        <X size={24} className="stroke-[3px]" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

                    {/* Common Sources (Assets) Section */}
                    <div>
                        <h3 className="text-sm font-black text-black uppercase tracking-widest mb-4 border-b-2 border-gray-300 pb-2">
                            Accounts / Assets 帳戶資產
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newSource}
                                onChange={(e) => setNewSource(e.target.value)}
                                className="flex-1 p-3 bg-white border-2 border-gray-300 focus:border-black focus:outline-none font-bold text-black"
                                placeholder="例如: 中信卡"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                            />
                            <button
                                onClick={handleAddSource}
                                className="bg-black text-white px-4 font-bold border-2 border-black hover:bg-[#333] transition"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-col gap-2">
                            {localSettings.commonSources.map((item, index) => (
                                <div key={index} className="flex items-center gap-2 bg-[#ebe9e4] border-2 border-gray-400 px-3 py-2">
                                    <span className="font-bold text-black text-sm flex-1">{item}</span>

                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-bold text-gray-500">INIT:</span>
                                        <input
                                            type="number"
                                            value={localSettings.initialBalances?.[item] ?? 0}
                                            onChange={(e) => handleInitialBalanceChange(item, e.target.value)}
                                            className="w-24 p-1 text-right font-mono font-bold border-b border-gray-400 bg-transparent focus:border-black focus:outline-none"
                                        />
                                    </div>

                                    <button
                                        onClick={() => handleDeleteSource(index)}
                                        className="text-gray-500 hover:text-[#8B001D] transition ml-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Common Income Sources Section */}
                    <div>
                        <h3 className="text-sm font-black text-[#8B001D] uppercase tracking-widest mb-4 border-b-2 border-[#8B001D]/30 pb-2">
                            Income Sources 收入來源分類
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newIncomeSource}
                                onChange={(e) => setNewIncomeSource(e.target.value)}
                                className="flex-1 p-3 bg-white border-2 border-gray-300 focus:border-[#8B001D] focus:outline-none font-bold text-black"
                                placeholder="例如: 薪資"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddIncomeSource()}
                            />
                            <button
                                onClick={handleAddIncomeSource}
                                className="bg-[#8B001D] text-white px-4 font-bold border-2 border-[#8B001D] hover:bg-[#6e0017] transition"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(localSettings.commonIncomeSources || []).map((item, index) => (
                                <div key={index} className="flex items-center gap-2 bg-[#fff0f3] border-2 border-[#8B001D]/30 px-3 py-2">
                                    <span className="font-bold text-black text-sm">{item}</span>
                                    <button
                                        onClick={() => handleDeleteIncomeSource(index)}
                                        className="text-gray-500 hover:text-[#8B001D] transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Common Destinations (Expense Categories) Section */}
                    <div>
                        <h3 className="text-sm font-black text-black uppercase tracking-widest mb-4 border-b-2 border-gray-300 pb-2">
                            Expense Categories 支出分類
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newDestination}
                                onChange={(e) => setNewDestination(e.target.value)}
                                className="flex-1 p-3 bg-white border-2 border-gray-300 focus:border-black focus:outline-none font-bold text-black"
                                placeholder="例如: 晚餐"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddDestination()}
                            />
                            <button
                                onClick={handleAddDestination}
                                className="bg-black text-white px-4 font-bold border-2 border-black hover:bg-[#333] transition"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {localSettings.commonDestinations.map((item, index) => (
                                <div key={index} className="flex items-center gap-2 bg-[#ebe9e4] border-2 border-gray-400 px-3 py-2">
                                    <span className="font-bold text-black text-sm">{item}</span>
                                    <button
                                        onClick={() => handleDeleteDestination(index)}
                                        className="text-gray-500 hover:text-[#8B001D] transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Common Notes Section */}
                    <div>
                        <h3 className="text-sm font-black text-black uppercase tracking-widest mb-4 border-b-2 border-gray-300 pb-2">
                            Common Notes 常用備註
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                className="flex-1 p-3 bg-white border-2 border-gray-300 focus:border-black focus:outline-none font-bold text-black"
                                placeholder="例如: 加油"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                            />
                            <button
                                onClick={handleAddNote}
                                className="bg-black text-white px-4 font-bold border-2 border-black hover:bg-[#333] transition"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(localSettings.commonNotes || []).map((item, index) => (
                                <div key={index} className="flex items-center gap-2 bg-[#ebe9e4] border-2 border-gray-400 px-3 py-2">
                                    <span className="font-bold text-black text-sm">{item}</span>
                                    <button
                                        onClick={() => handleDeleteNote(index)}
                                        className="text-gray-500 hover:text-[#8B001D] transition"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t-2 border-gray-200 bg-white flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-bold text-gray-500 hover:text-black transition tracking-widest text-sm"
                    >
                        CANCEL 取消
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-[#8B001D] hover:bg-[#5e0013] text-white px-8 py-3 font-bold tracking-widest text-sm border-2 border-transparent hover:border-black shadow-md"
                    >
                        SAVE 儲存設定
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsDialog;
