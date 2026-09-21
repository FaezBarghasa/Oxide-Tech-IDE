import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRight, Check } from 'lucide-react';
import { tauriService } from '../../services/tauri';

interface MemoryHexViewProps {
  selectedChip?: string;
  probeSerial?: string;
}

export const MemoryHexView: React.FC<MemoryHexViewProps> = ({
  selectedChip = 'STM32F401RE',
  probeSerial,
}) => {
  const [addressInput, setAddressInput] = useState('0x08000000');
  const [currentAddress, setCurrentAddress] = useState(0x08000000);
  const [byteCount, setByteCount] = useState(128);
  const [rawBytes, setRawBytes] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editAddress, setEditAddress] = useState<number | null>(null);
  const [editByteVal, setEditByteVal] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchMemory = async (addr: number, count: number) => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const bytes = await tauriService.mcuMemoryRead(selectedChip, addr, count, probeSerial);
      setRawBytes(bytes);
    } catch (err) {
      setStatusMsg(`Read error: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory(currentAddress, byteCount);
  }, [selectedChip, currentAddress, byteCount]);

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

  const handleWriteByte = async (targetAddr: number) => {
    const val = parseInt(editByteVal, 16);
    if (isNaN(val) || val < 0 || val > 255) {
      setStatusMsg('Invalid byte value (00-FF)');
      return;
    }
    try {
      const res = await tauriService.mcuMemoryWrite(selectedChip, targetAddr, [val], probeSerial);
      setStatusMsg(res);
      setEditAddress(null);
      setEditByteVal('');
      fetchMemory(currentAddress, byteCount);
    } catch (err) {
      setStatusMsg(`Write failed: ${err}`);
    }
  };

  // Group bytes into 16-byte rows
  const rows: { addr: number; bytes: number[] }[] = [];
  for (let i = 0; i < rawBytes.length; i += 16) {
    rows.push({
      addr: currentAddress + i,
      bytes: rawBytes.slice(i, i + 16),
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dfe1e5] font-mono text-xs select-none">
      {/* Top Address Navigation Bar */}
      <div className="flex items-center justify-between p-2 border-b border-[#2b2d30] bg-[#26282d] shrink-0">
        <form onSubmit={handleAddressSubmit} className="flex items-center space-x-2">
          <span className="text-[#868a91] text-[11px]">Address:</span>
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="bg-[#1e1f22] border border-[#393b40] rounded px-2 py-0.5 text-xs text-[#589df6] font-bold focus:outline-none focus:border-[#3574f0] w-32"
          />
          <button
            type="submit"
            className="p-1 bg-[#3574f0] hover:bg-[#2e436e] text-white rounded transition-colors"
            title="Jump to Address"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1">
            <span className="text-[#868a91]">Bytes:</span>
            <select
              value={byteCount}
              onChange={(e) => setByteCount(Number(e.target.value))}
              className="bg-[#1e1f22] border border-[#393b40] rounded px-1.5 py-0.5 text-xs text-white"
            >
              <option value={64}>64 B</option>
              <option value={128}>128 B</option>
              <option value={256}>256 B</option>
              <option value={512}>512 B</option>
            </select>
          </div>

          <button
            onClick={() => fetchMemory(currentAddress, byteCount)}
            disabled={isLoading}
            className="p-1 hover:bg-[#35373c] text-[#868a91] hover:text-white rounded transition-colors"
            title="Refresh Memory"
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

      {/* Hex Dump Table */}
      <div className="flex-1 overflow-auto p-3">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[#6f737a] text-[10px] border-b border-[#2b2d30]">
              <th className="pb-1 w-24">OFFSET</th>
              <th className="pb-1 text-center" colSpan={16}>HEXADECIMAL (00..0F)</th>
              <th className="pb-1 pl-4">ASCII DECODE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.addr} className="hover:bg-[#26282d] transition-colors group">
                {/* Offset */}
                <td className="py-1 text-[#868a91] font-bold text-[11px]">
                  0x{row.addr.toString(16).padStart(8, '0').toUpperCase()}
                </td>

                {/* 16 Hex Bytes */}
                <td className="py-1">
                  <div className="grid grid-cols-16 gap-1 text-center">
                    {row.bytes.map((b, idx) => {
                      const byteAddr = row.addr + idx;
                      const isEditing = editAddress === byteAddr;

                      if (isEditing) {
                        return (
                          <div key={idx} className="flex items-center space-x-0.5">
                            <input
                              type="text"
                              maxLength={2}
                              autoFocus
                              value={editByteVal}
                              onChange={(e) => setEditByteVal(e.target.value.toUpperCase())}
                              className="w-6 bg-[#3574f0] text-white text-center font-bold rounded focus:outline-none text-[10px]"
                            />
                            <button
                              onClick={() => handleWriteByte(byteAddr)}
                              className="text-white hover:text-[#98c379]"
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <span
                          key={idx}
                          onClick={() => {
                            setEditAddress(byteAddr);
                            setEditByteVal(b.toString(16).padStart(2, '0').toUpperCase());
                          }}
                          className={`cursor-pointer rounded px-0.5 text-[11px] transition-colors ${
                            b === 0
                              ? 'text-[#4e5157]'
                              : 'text-[#98c379] group-hover:text-[#a8d888]'
                          } hover:bg-[#3574f0] hover:text-white`}
                          title={`Click to edit byte at 0x${byteAddr.toString(16).toUpperCase()}`}
                        >
                          {b.toString(16).padStart(2, '0').toUpperCase()}
                        </span>
                      );
                    })}
                  </div>
                </td>

                {/* ASCII View */}
                <td className="py-1 pl-4 text-[#868a91] text-[11px] tracking-widest">
                  {row.bytes
                    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '·'))
                    .join('')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
