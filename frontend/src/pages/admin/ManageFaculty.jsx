import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import { Card, Button, Input, Select, Table, Badge } from '../../components/ui';
import { validateFacultyForm } from '../../validators';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Users,
  Plus,
  Download,
  Upload,
  Save,
  CheckCircle2,
  GraduationCap,
  ChevronDown,
  Check,
  X,
  Search,
  BookOpen,
  Layers,
} from 'lucide-react';

/* ==========================================================================
   Modern Multi-Select Popover Component (Subjects / Batches)
   ========================================================================== */
function MultiSelectPopover({
  placeholder = 'Select...',
  items = [],
  selectedIds = [],
  onToggle,
  onSelectAll,
  onClear,
  badgeTheme = 'blue',
  type = 'course',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 280, opensUp: false });

  // Filter items by search query
  const filteredItems = items.filter((item) => {
    const text = `${item.code || ''} ${item.name || ''} ${item.semester ? `Sem ${item.semester}` : ''}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  // Calculate fixed portal coordinates to prevent table overflow clipping
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUp = spaceBelow < 300 && rect.top > spaceBelow;

      setCoords({
        top: opensUp ? rect.top - 8 : rect.bottom + 6,
        left,
        width: Math.max(rect.width, popoverWidth),
        opensUp,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  // Click outside and Esc listener
  useEffect(() => {
    if (!open) return;
    const handleDown = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selectedItems = items.filter((item) => selectedIds.includes(item._id));

  const themeClasses = {
    blue: {
      badge: 'bg-sky-50 text-sky-700 border border-sky-200/90 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/80',
      activeCheckbox: 'bg-sky-600 border-sky-600 text-white',
      accentText: 'text-sky-600 dark:text-sky-400',
    },
    emerald: {
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80',
      activeCheckbox: 'bg-emerald-600 border-emerald-600 text-white',
      accentText: 'text-emerald-600 dark:text-emerald-400',
    },
  }[badgeTheme] || {
    badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200/90 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/80',
    activeCheckbox: 'bg-indigo-600 border-indigo-600 text-white',
    accentText: 'text-indigo-600 dark:text-indigo-400',
  };

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={`group flex min-h-[38px] min-w-[160px] max-w-[240px] cursor-pointer items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition-all ${
          selectedItems.length > 0
            ? 'border-slate-200/90 bg-white/90 shadow-sm hover:border-brand-500/80 hover:shadow dark:border-slate-700/80 dark:bg-slate-900/90 dark:hover:border-slate-600'
            : 'border-dashed border-slate-300 bg-slate-50/60 text-slate-500 hover:border-brand-500 hover:bg-brand-50/30 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-400 dark:hover:border-brand-500/60 dark:hover:bg-brand-950/30 dark:hover:text-brand-300'
        }`}
      >
        {selectedItems.length === 0 ? (
          <div className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-90" />
            <span className="font-medium">{placeholder}</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1 overflow-hidden py-0.5">
            {selectedItems.slice(0, 2).map((item) => (
              <span
                key={item._id}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tracking-tight shadow-xs ${themeClasses.badge}`}
                title={`${item.code ? `${item.code} - ` : ''}${item.name}`}
              >
                <span className="truncate max-w-[95px]">{item.code || item.name}</span>
              </span>
            ))}
            {selectedItems.length > 2 && (
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                +{selectedItems.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 shrink-0">
          {selectedItems.length > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {selectedItems.length}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180 text-brand-600 dark:text-brand-400' : ''}`}
          />
        </div>
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.opensUp ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="flex flex-col rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/10 dark:border-slate-800 dark:bg-slate-900/95 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                autoFocus
                placeholder={`Search ${type === 'course' ? 'subjects...' : 'batches...'}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-white dark:placeholder-slate-500 dark:focus:border-brand-500 dark:focus:bg-slate-800"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Quick Actions Header */}
            <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 px-1 text-[11px] font-semibold text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
              <span>
                {selectedItems.length} of {items.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectAll(items.map((i) => i._id))}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={onClear}
                  className="text-rose-500 hover:underline dark:text-rose-400"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  No matching options found
                </p>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => onToggle(item._id)}
                      className={`flex cursor-pointer items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors ${
                        isSelected
                          ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800/90 dark:text-white'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-all ${
                            isSelected
                              ? themeClasses.activeCheckbox
                              : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900 dark:text-white">
                            {item.code ? `${item.code} - ${item.name}` : item.name}
                          </p>
                          {(item.semester || item.type) && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              {item.semester ? `Semester ${item.semester}` : ''}
                              {item.semester && item.type ? ' • ' : ''}
                              {item.type ? item.type.toUpperCase() : ''}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <span className={`text-[10px] font-bold ${themeClasses.accentText}`}>
                          Added
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Done button */}
            <div className="mt-2.5 border-t border-slate-100 pt-2 dark:border-slate-800/80 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ==========================================================================
   Modern Class Teacher Picker Component
   ========================================================================== */
function ClassTeacherPicker({ batches = [], selectedBatchId = '', onChange }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220, opensUp: false });

  const activeBatch = batches.find((b) => b._id === selectedBatchId);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 240;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = window.innerWidth - popoverWidth - 16;
      }
      if (left < 16) left = 16;

      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUp = spaceBelow < 260 && rect.top > spaceBelow;

      setCoords({
        top: opensUp ? rect.top - 8 : rect.bottom + 6,
        left,
        width: Math.max(rect.width, popoverWidth),
        opensUp,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className={`group flex min-h-[38px] min-w-[150px] max-w-[210px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all ${
          activeBatch
            ? 'border-purple-300/80 bg-purple-50/80 text-purple-900 shadow-sm dark:border-purple-800/80 dark:bg-purple-950/40 dark:text-purple-200'
            : 'border-slate-200/90 bg-slate-50/50 text-slate-500 hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-800/30 dark:text-slate-400'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {activeBatch ? (
            <>
              <GraduationCap className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400" />
              <div className="truncate">
                <span className="font-bold text-purple-800 dark:text-purple-200">{activeBatch.name}</span>
                <span className="ml-1 text-[10px] text-purple-600/80 dark:text-purple-400/80">Class Teacher</span>
              </div>
            </>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 font-medium">None (Subject Only)</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeBatch && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              title="Remove Class Teacher assignment"
              className="rounded p-0.5 text-purple-400 hover:bg-purple-200/60 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/60 dark:hover:text-purple-200"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              transform: coords.opensUp ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
            }}
            className="flex flex-col rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/10 dark:border-slate-800 dark:bg-slate-900/95 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Designate Class Teacher</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Grants all-subject attendance view for that cohort</p>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left transition ${
                  !selectedBatchId
                    ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>None (Subject Instructor Only)</span>
                {!selectedBatchId && <Check className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />}
              </button>

              {batches.map((batch) => {
                const isSelected = batch._id === selectedBatchId;
                return (
                  <button
                    key={batch._id}
                    type="button"
                    onClick={() => {
                      onChange(batch._id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left transition ${
                      isSelected
                        ? 'bg-purple-100/80 font-bold text-purple-900 dark:bg-purple-950/80 dark:text-purple-200'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <GraduationCap className={`h-3.5 w-3.5 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
                      <span className="truncate">{batch.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

/* ==========================================================================
   Main ManageFaculty Component
   ========================================================================== */
export default function ManageFaculty() {
  const { user } = useAuth();
  const hodDeptId = user?.department?._id || user?.department;

  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [savedAssignments, setSavedAssignments] = useState({});
  const [savingFacultyId, setSavingFacultyId] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    gender: 'Male',
    department: hodDeptId || '',
    role: 'faculty',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    gender: '',
    department: '',
  });
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const load = async () => {
    try {
      const [f, d, c, b] = await Promise.all([
        api.get('/faculty'),
        api.get('/academic/departments'),
        api.get('/academic/courses'),
        api.get('/academic/class-batches'),
      ]);
      setFaculty(f.data);
      setDepartments(d.data);
      setCourses(c.data);
      setBatches(b.data);

      const rawAssignments = Object.fromEntries(
        f.data.map((member) => [
          member._id,
          {
            coursesAssigned: (member.coursesAssigned || []).map((course) => course._id || course),
            classBatchesAssigned: (member.classBatchesAssigned || []).map((batch) => batch._id || batch),
            classTeacherOf: (member.classTeacherOf || []).map((batch) => batch._id || batch),
          },
        ])
      );
      setAssignments(rawAssignments);
      setSavedAssignments(JSON.parse(JSON.stringify(rawAssignments)));
    } catch (err) {
      console.error('Failed to load faculty records', err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAssignmentItem = (facultyId, field, itemId) => {
    setAssignments((current) => {
      const currentList = current[facultyId]?.[field] || [];
      const nextList = currentList.includes(itemId)
        ? currentList.filter((id) => id !== itemId)
        : [...currentList, itemId];
      return {
        ...current,
        [facultyId]: { ...current[facultyId], [field]: nextList },
      };
    });
  };

  const selectAllAssignment = (facultyId, field, allIds) => {
    setAssignments((current) => ({
      ...current,
      [facultyId]: { ...current[facultyId], [field]: allIds },
    }));
  };

  const clearAssignment = (facultyId, field) => {
    setAssignments((current) => ({
      ...current,
      [facultyId]: { ...current[facultyId], [field]: [] },
    }));
  };

  const updateSingleAssignment = (facultyId, field, value) => {
    setAssignments((current) => ({
      ...current,
      [facultyId]: { ...current[facultyId], [field]: value ? [value] : [] },
    }));
  };

  const isDirty = (facultyId) => {
    const current = assignments[facultyId] || {};
    const saved = savedAssignments[facultyId] || {};

    const currCourses = [...(current.coursesAssigned || [])].sort();
    const savedCourses = [...(saved.coursesAssigned || [])].sort();
    if (JSON.stringify(currCourses) !== JSON.stringify(savedCourses)) return true;

    const currBatches = [...(current.classBatchesAssigned || [])].sort();
    const savedBatches = [...(saved.classBatchesAssigned || [])].sort();
    if (JSON.stringify(currBatches) !== JSON.stringify(savedBatches)) return true;

    const currCT = current.classTeacherOf?.[0] || '';
    const savedCT = saved.classTeacherOf?.[0] || '';
    if (currCT !== savedCT) return true;

    return false;
  };

  const saveAssignments = async (facultyId) => {
    setSavingFacultyId(facultyId);
    try {
      await api.put(`/faculty/${facultyId}`, assignments[facultyId]);
      toast.success('Faculty course and batch assignments saved');
      window.dispatchEvent(new Event('refresh-notifications'));
      setSavedAssignments((prev) => ({
        ...prev,
        [facultyId]: JSON.parse(JSON.stringify(assignments[facultyId])),
      }));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save faculty assignments');
    } finally {
      setSavingFacultyId(null);
    }
  };

  const validateForm = () => {
    const nextErrors = validateFacultyForm(form);
    setErrors({
      name: nextErrors.name || '',
      email: nextErrors.email || '',
      password: nextErrors.password || '',
      gender: nextErrors.gender || '',
      department: nextErrors.department || '',
    });
    return !Object.values(nextErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const { data } = await api.post('/faculty', form);
      toast.success(data.message || 'Faculty member created');
      window.dispatchEvent(new Event('refresh-notifications'));
      setForm({ name: '', email: '', password: '', gender: 'Male', department: '', role: 'faculty' });
      setErrors({ name: '', email: '', password: '', gender: '', department: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add faculty');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/faculty/import/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'faculty_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download template');
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/faculty/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      if (res.data.created > 0) {
        toast.success(`Imported ${res.data.created} faculty record(s)${res.data.failed ? `, ${res.data.failed} failed` : ''}`);
      } else {
        toast.error('No faculty records were imported - check the results below');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filter faculty by search query and department
  const filteredFaculty = faculty.filter((f) => {
    const matchesSearch =
      f.name?.toLowerCase().includes(tableSearch.toLowerCase()) ||
      f.email?.toLowerCase().includes(tableSearch.toLowerCase());
    const facultyDeptId = f.department?._id || f.department;
    const matchesDept = deptFilter ? facultyDeptId === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-100 backdrop-blur-md">
              <Users className="h-3.5 w-3.5" /> Staff Directory
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Faculty & Administrator Management
            </h1>
            <p className="mt-1 text-sm text-indigo-100/90">
              Manage instructors, course subject assignments, and class batch supervision.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <span>{faculty.length} Members Registered</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* Add Faculty Card */}
        <Card title="Register Faculty / Admin" subtitle="Create instructor profile with role privileges">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Input
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name}
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
            </div>
            <div>
              <Input
                type="email"
                placeholder="Faculty Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={errors.email}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email}</p>}
            </div>
            <div>
              <Input
                type="password"
                placeholder="Initial Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password}</p>}
            </div>
            <div>
              <Select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                error={errors.gender}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </Select>
              {errors.gender && <p className="mt-1 text-xs text-rose-500">{errors.gender}</p>}
            </div>
            <div>
              <Select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                error={errors.department}
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </Select>
              {errors.department && <p className="mt-1 text-xs text-rose-500">{errors.department}</p>}
            </div>
            <div>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="faculty">Faculty Instructor</option>
                <option value="admin">System Administrator</option>
              </Select>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <Button type="submit" icon={Plus} className="w-full sm:w-auto">
                Add Faculty Member
              </Button>
            </div>
          </form>
        </Card>

        {/* Bulk Ingestion Card */}
        <Card title="Bulk Faculty Upload" subtitle="Add multiple teachers at once via spreadsheet">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            Download our roster template, input email addresses, department codes, and initial passwords, then upload.
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadTemplate}
            >
              Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileImport}
              disabled={importing}
              className="hidden"
              id="faculty-file-input"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Upload}
              loading={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? 'Uploading...' : 'Upload Excel'}
            </Button>
          </div>

          {importResult && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex gap-2 mb-2">
                <Badge color="green" dot>{importResult.created} imported</Badge>
                {importResult.failed > 0 && <Badge color="red" dot>{importResult.failed} failed</Badge>}
              </div>
              <div className="max-h-48 overflow-y-auto">
                <Table
                  columns={[
                    { key: 'row', header: 'Row' },
                    { key: 'email', header: 'Email' },
                    { key: 'name', header: 'Name' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => (
                        <Badge color={r.status === 'created' ? 'green' : 'red'}>
                          {r.status}
                        </Badge>
                      ),
                    },
                    { key: 'message', header: 'Details' },
                  ]}
                  data={importResult.rows || []}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Faculty List & Subject Assignments */}
      <Card
        title={`Faculty Directory & Subject Allocation (${faculty.length})`}
        subtitle="Click items to toggle subjects and cohorts instantly without holding Ctrl/Cmd. Assign Class Teachers with full cohort oversight."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter faculty..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-32 sm:w-44 rounded-xl border border-slate-200 bg-white/80 py-1 pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>
            {departments.length > 1 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="max-w-[130px] truncate rounded-xl border border-slate-200 bg-white/80 py-1 px-2.5 text-xs text-slate-700 outline-none transition focus:border-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>
        }
      >
        <Table
          columns={[
            {
              key: 'name',
              header: 'Faculty Member',
              headerClassName: 'whitespace-nowrap',
              render: (r) => (
                <div className="min-w-[140px]">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    {r.name}
                    {assignments[r._id]?.classTeacherOf?.[0] && (
                      <span title="Designated Class Teacher" className="cursor-help">
                        <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{r.email}</p>
                </div>
              ),
            },
            {
              key: 'department',
              header: 'Department',
              headerClassName: 'whitespace-nowrap',
              render: (r) => (
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {r.department?.name || 'Unassigned'}
                </span>
              ),
            },
            {
              key: 'role',
              header: 'Access Role',
              headerClassName: 'whitespace-nowrap',
              render: (r) => (
                <Badge color={r.role === 'admin' ? 'blue' : 'gray'} dot>
                  {r.role === 'admin' ? 'Admin' : 'Faculty'}
                </Badge>
              ),
            },
            {
              key: 'coursesAssigned',
              headerClassName: 'whitespace-nowrap',
              header: (
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-sky-500" />
                  <span>Assigned Subjects</span>
                </div>
              ),
              render: (r) => (
                <MultiSelectPopover
                  placeholder="Assign Subjects..."
                  items={courses}
                  selectedIds={assignments[r._id]?.coursesAssigned || []}
                  onToggle={(id) => toggleAssignmentItem(r._id, 'coursesAssigned', id)}
                  onSelectAll={(ids) => selectAllAssignment(r._id, 'coursesAssigned', ids)}
                  onClear={() => clearAssignment(r._id, 'coursesAssigned')}
                  badgeTheme="blue"
                  type="course"
                />
              ),
            },
            {
              key: 'classBatchesAssigned',
              headerClassName: 'whitespace-nowrap',
              header: (
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Assigned Batches</span>
                </div>
              ),
              render: (r) => (
                <MultiSelectPopover
                  placeholder="Assign Batches..."
                  items={batches}
                  selectedIds={assignments[r._id]?.classBatchesAssigned || []}
                  onToggle={(id) => toggleAssignmentItem(r._id, 'classBatchesAssigned', id)}
                  onSelectAll={(ids) => selectAllAssignment(r._id, 'classBatchesAssigned', ids)}
                  onClear={() => clearAssignment(r._id, 'classBatchesAssigned')}
                  badgeTheme="emerald"
                  type="batch"
                />
              ),
            },
            {
              key: 'classTeacherOf',
              headerClassName: 'whitespace-nowrap',
              header: (
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                  <span>Class Teacher Of</span>
                </div>
              ),
              render: (r) => (
                <ClassTeacherPicker
                  batches={batches}
                  selectedBatchId={assignments[r._id]?.classTeacherOf?.[0] || ''}
                  onChange={(val) => updateSingleAssignment(r._id, 'classTeacherOf', val)}
                />
              ),
            },
            {
              key: 'actions',
              header: '',
              headerClassName: 'whitespace-nowrap',
              render: (r) => {
                const dirty = isDirty(r._id);
                return (
                  <Button
                    size="sm"
                    variant={dirty ? 'primary' : 'outline'}
                    icon={dirty ? Save : CheckCircle2}
                    loading={savingFacultyId === r._id}
                    onClick={() => saveAssignments(r._id)}
                    className={`whitespace-nowrap transition-all ${
                      dirty
                        ? '!bg-brand-600 !text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/40 hover:!bg-brand-500'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {dirty ? 'Save *' : 'Saved'}
                  </Button>
                );
              },
            },
          ]}
          data={filteredFaculty}
        />
      </Card>
    </div>
  );
}
