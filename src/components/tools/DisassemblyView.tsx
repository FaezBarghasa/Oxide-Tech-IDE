import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { tauriService } from '../../services/tauri';
import { DisassemblyInstruction } from '../../types/oxide';

interface DisassemblyViewProps {
  selectedChip?: string;
  probeSerial?: string;
}

export const DisassemblyView: React.FC<DisassemblyViewProps> = ({
  selectedChip = 'STM32F401RE',
  probeSerial,
}) => {
  const [addressInput, setAddressInput] = useState('0x08000000');
  const [currentAddress, setCurrentAddress] = useState(0x08000000);
  const [instructionCount, setInstructionCount] = useState(32);
  const [instructions, setInstructions] = useState<DisassemblyInstruction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchDisassembly = async (addr: number, count: number) => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const data = await tauriService.mcuDisassemble(selectedChip, addr, count, probeSerial);
      setInstructions(data);
    } catch (err) {
      setStatusMsg(`Disassembly error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisassembly(currentAddress, instructionCount);
  }, [selectedChip, currentAddress, instructionCount]);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = addressInput.trim();
    const parsed = clean.startsWith('0x') || clean.startsWith('0X')
      ? parseInt(clean.substring(2), 16)
      : parseInt(clean, 10);
    if (!isNaN(parsed)) {
      setCurrentAddress(parsed);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-mono text-xs select-none">
      {/* Header controls */}
      <div className="flex items-center justify-between p-2 border-b border-[#2b2d30] bg-[#26282d] shrink-0">
        <form onSubmit={handleAddressSubmit} className="flex items-center space-x-2">
          <span className="text-[#868a91] text-[11px]">PC / Addr:</span>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="bg-[#1e1f22] border border-[#393b40] rounded px-2 py-0.5 text-xs text-[#589df6] font-bold focus:outline-none focus:border-[#3574f0] w-32"
          />
          <button
            type="submit"
            className="p-1 bg-[#3574f0] hover:bg-[#2e436e] text-white rounded transition-colors"
            title="Disassemble at Address"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1">
            <span className="text-[#868a91]">Count:</span>
            <select
              value={instructionCount}
              onChange={(e) => setInstructionCount(Number(e.target.value))}
              className="bg-[#1e1f22] border border-[#393b40] rounded px-1.5 py-0.5 text-xs text-white"
            >
              <option value={16}>16 instrs</option>
              <option value={32}>32 instrs</option>
              <option value={64}>64 instrs</option>
              <option value={128}>128 instrs</option>
            </select>
          </div>

          <button
            onClick={() => fetchDisassembly(currentAddress, instructionCount)}
            disabled={isLoading}
            className="p-1 hover:bg-[#35373c] text-[#868a91] hover:text-white rounded transition-colors"
            title="Refresh Disassembly"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#3574f0]' : ''}`} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="px-3 py-1 bg-[#2b2d30] border-b border-[#393b40] text-[11px] text-[#e5c07b]">
          {statusMsg}
        </div>
      )}

      {/* Disassembly instruction list */}
      <div className="flex-1 overflow-auto p-3">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[#6f737a] text-[10px] border-b border-[#2b2d30]">
              <th className="pb-1 w-28">ADDRESS</th>
              <th className="pb-1 w-28">OPCODE</th>
              <th className="pb-1 w-24">MNEMONIC</th>
              <th className="pb-1">OPERANDS</th>
            </tr>
          </thead>
          <tbody>
            {instructions.map((instr) => (
              <tr key={instr.address} className="hover:bg-[#26282d] transition-colors group">
                {/* Address */}
                <td className="py-1 text-[#868a91] font-bold text-[11px]">
                  0x{instr.address.toString(16).padStart(8, '0').toUpperCase()}
                </td>

                {/* Raw opcode bytes */}
                <td className="py-1 text-[#6f737a] text-[11px] tracking-wider">
                  {instr.raw_bytes.toUpperCase()}
                </td>

                {/* Mnemonic */}
                <td className="py-1 text-[#e5c07b] font-bold text-[11px]">
                  {instr.mnemonic}
                </td>

                {/* Operands */}
                <td className="py-1 text-[#98c379] font-medium text-[11px]">
                  {instr.operands}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
