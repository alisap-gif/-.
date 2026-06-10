import React, { useState } from 'react';
import { FileText, Download, Calendar, Upload, Plus, Trash2, Eye, TableProperties, AlertCircle } from 'lucide-react';
import { AttachedFile } from '../types';
import { DEFAULT_ATTACHED_FILES } from '../data';

interface ManualCalendarReferenceProps {
  attachedFiles: AttachedFile[];
  onAddFile: (file: AttachedFile) => void;
  onRemoveFile: (id: string) => void;
  userRole: 'executive' | 'secretary';
  currentUserName: string;
}

export function ManualCalendarReference({
  attachedFiles,
  onAddFile,
  onRemoveFile,
  userRole,
  currentUserName
}: ManualCalendarReferenceProps) {
  const [selectedFile, setSelectedFile] = useState<AttachedFile | null>(attachedFiles[0] || null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedName, setUploadedName] = useState('');
  const [mockRows, setMockRows] = useState([
    { id: 'r1', event: 'ประชุมเตรียมการเปิดภาคเรียน 2570', date: '5 สิงหาคม 2569', time: '10:00 - 12:00 น.', room: 'ห้องประชุม วก. 1' },
    { id: 'r2', event: 'หารือแนวทางการจัดสรรงบประมาณ วก.', date: '12 สิงหาคม 2569', time: '13:30 - 15:30 น.', room: 'ห้องประชุม วก. 3' },
    { id: 'r3', event: 'ประเมินผลการเรียนการสอนรายวิชาแกน', date: '21 สิงหาคม 2569', time: '09:00 - 11:30 น.', room: 'สตรีมมิ่งออนไลน์' },
    { id: 'r4', event: 'ประชุมวิชาการประจำปีการศึกษา 2570', date: '28 สิงหาคม 2569', time: '08:30 - 16:30 น.', room: 'ห้องเฉลิมพระเกียรติ ชั้น 5' },
  ]);

  const [newEvent, setNewEvent] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newRoom, setNewRoom] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const newAttached: AttachedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadedAt: new Date().toISOString(),
        fileType: file.name.split('.').pop() || 'dat'
      };
      
      onAddFile(newAttached);
      setSelectedFile(newAttached);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newAttached: AttachedFile = {
        id: Date.now().toString(),
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadedAt: new Date().toISOString(),
        fileType: file.name.split('.').pop() || 'dat'
      };
      onAddFile(newAttached);
      setSelectedFile(newAttached);
    }
  };

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent || !newDate) return;
    setMockRows([
      ...mockRows,
      {
        id: Date.now().toString(),
        event: newEvent,
        date: newDate,
        time: newTime || 'ตลอดทั้งวัน',
        room: newRoom || 'ไม่ระบุสถานที่'
      }
    ]);
    setNewEvent('');
    setNewDate('');
    setNewTime('');
    setNewRoom('');
  };

  const handleRemoveRow = (id: string) => {
    setMockRows(mockRows.filter(r => r.id !== id));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden" id="manual-calendar-section">
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-50 to-white">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
              <Calendar className="w-4.5 h-4.5 text-indigo-600" />
            </span>
            <h2 className="text-base font-bold text-slate-900 font-display">ตารางประชุมแนบและกำหนดการ (Attached Schedule)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ตามข้อกำหนด 3.1: แหล่งข้อมูลอ้างอิงตารางสรุปนโยบายที่ผู้บริหารสามารถล็อกอินเข้ามาดูเพื่อวางแผนเวลาว่าง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold py-2 px-3.5 border border-slate-200 rounded-xl shadow-sm transition-all duration-200 flex items-center gap-1.5 focus:outline-none">
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>อัปโหลดข้อมูลตาราง</span>
            <input type="file" className="hidden" onChange={handleManualUpload} accept=".pdf,.xlsx,.csv,.doc,.docx" />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* File Navigator */}
        <div className="lg:col-span-4 p-5 border-r border-slate-100 bg-slate-50/30">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 font-display">
            <TableProperties className="w-3.5 h-3.5 text-indigo-500" />
            เอกสารแนบอ้างอิง ({attachedFiles.length})
          </h3>
          <div className="space-y-2">
            {attachedFiles.map((file) => {
              const isSelected = selectedFile?.id === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start justify-between ${
                    isSelected
                      ? 'bg-indigo-50/60 border-indigo-200/80 shadow-xs'
                      : 'bg-white border-slate-200/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      file.fileType === 'pdf' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate line-clamp-2">{file.name}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                        {file.size} • {new Date(file.uploadedAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                      if (selectedFile?.id === file.id) {
                        setSelectedFile(attachedFiles.find(f => f.id !== file.id) || null);
                      }
                    }}
                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                    title="ลบไฟล์แนบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {attachedFiles.length === 0 && (
              <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg bg-white">
                <p className="text-xs text-slate-400">ยังไม่มีเอกสารตารางงานแนบ</p>
              </div>
            )}
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-4 border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50/30 text-indigo-700 font-medium'
                : 'border-slate-200/80 hover:border-slate-350 text-slate-450'
            }`}
          >
            <Upload className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
            <p className="text-[11px] font-semibold text-slate-700">ลากไฟล์ข้อมูลลงที่นี่เพื่อจำลองการแนบไฟล์</p>
            <p className="text-[10px] text-slate-400 mt-0.5">PDF, Excel ขนาดไม่เกิน 5MB</p>
          </div>
        </div>

        {/* Calendar visualizer or Previewer */}
        <div className="lg:col-span-8 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 py-1 px-3 rounded-full">
                ดูตัวอย่างแบบตอบสนอง (Interactive Preview)
              </span>
            </div>
            {selectedFile && (
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert(`จำลองการดาวน์โหลดไฟล์: ${selectedFile.name}`);
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500" />ดาวน์โหลดชุดตารางดิบ
              </a>
            )}
          </div>

          {selectedFile ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/10">
              <div className="bg-slate-100/60 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  {selectedFile.name}
                </span>
                <span className="text-[10px] bg-white text-slate-600 font-bold px-2.5 py-0.5 border border-slate-200 rounded-full font-display">
                  ตารางสรุปนโยบายอ้างอิง
                </span>
              </div>

              {/* Dynamic spreadsheet render */}
              <div className="p-4 overflow-x-auto">
                <h4 className="text-xs font-bold text-slate-800 mb-3 text-center border-b border-slate-200 pb-2">
                  ร่างวิเคราะห์แผนสัมมนา-การจัดประชุม ทีม วก. ประจำภาคการศึกษา 1/2570 (เริ่มสิงหาคม 2569)
                </h4>
                <table className="min-w-full text-xs text-left text-slate-600 border-collapse font-sans">
                  <thead>
                    <tr className="bg-white border-b border-slate-200/80 text-slate-400 font-bold uppercase tracking-wider font-display">
                      <th className="py-2.5 px-3">กิจกรรม/การประชุม</th>
                      <th className="py-2.5 px-3">วันและกำหนดการ</th>
                      <th className="py-2.5 px-3">ช่วงเวลา</th>
                      <th className="py-2.5 px-3">สถานที่จัดงาน</th>
                      <th className="py-2.5 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockRows.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-850">{row.event}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="bg-indigo-50 text-indigo-700 py-0.5 px-2 rounded-full text-[10px] font-bold border border-indigo-100/50">
                            {row.date}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">{row.time}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-500">{row.room}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all duration-200"
                            title="ลบแถวการประชุม"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Live Form to add schedules directly reference inside table */}
                <form onSubmit={handleAddRow} className="mt-5 p-4 bg-white rounded-xl border border-slate-200/80">
                  <p className="text-[11px] font-bold text-slate-700 mb-2.5 flex items-center gap-1.5 font-display">
                    <Plus className="w-3.5 h-3.5 text-indigo-600 animate-none" />
                    ระบุกิจกรรมและเวลาลงในตารางกริดอ้างอิงกำหนดการร่วม วก.
                  </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="ชื่อการประชุม/กิจกรรม..."
                        value={newEvent}
                        onChange={(e) => setNewEvent(e.target.value)}
                        className="py-2 px-3 text-xs border border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                        required
                      />
                      <input
                        type="text"
                        placeholder="วันที่ (เช่น 15 ส.ค. 2569)..."
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="py-2 px-3 text-xs border border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                        required
                      />
                      <input
                        type="text"
                        placeholder="ช่วงเวลา (เช่น 10:00 - 12:00 น.)..."
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="py-2 px-3 text-xs border border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100"
                      />
                      <input
                        type="text"
                        placeholder="ห้องประชุม / สถานที่..."
                        value={newRoom}
                        onChange={(e) => setNewRoom(e.target.value)}
                        className="py-2 px-3 text-xs border border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-100 animate-none"
                      />
                    </div>
                    <div className="flex justify-end mt-3">
                      <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-all duration-200 flex items-center gap-1.5 cursor-pointer focus:outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มลงในร่างตารางอ้างอิง วก.</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 border border-slate-200 rounded-lg">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-2 animate-none" />
              <p className="text-xs">กรุณาอัปโหลดหรือเลือกตารางแนบอ้างอิงเพื่อดูวิเคราะห์</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
