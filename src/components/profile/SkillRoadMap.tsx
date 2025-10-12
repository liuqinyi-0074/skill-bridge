// src/components/analyzer/profile/SkillRoadMap.tsx
import React, { useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { skillCategories } from "../../data/skill.static";
import { knowledgeCategories } from "../../data/knowledge.static";
import { techSkillCategories } from "../../data/techskill.static";

// Ability types matching your project structure
type AbilityType = "skill" | "knowledge" | "tech";

export type SkillRoadmapItem = {
  id: string;
  abilityType: AbilityType;
  category: string;
  skill: string;
  code?: string;
  startDate?: string;
  endDate?: string;
};

type StatusInfo = {
  status: "not-started" | "in-progress" | "completed" | "not-scheduled";
  label: string;
  color: string;
  icon: typeof Clock;
  sortOrder: number;
};

type SkillRoadMapProps = {
  initialSkills?: SkillRoadmapItem[];
  onChange?: (next: SkillRoadmapItem[]) => void;
};

// Create stable ids for new items
const createId = (): string =>
  `skill-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// Parse string date to Date if valid
const parseDateStrict = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? undefined : dt;
};

// Format date for UI
const formatDateLabel = (value?: string): string => {
  const dt = parseDateStrict(value);
  return dt ? dt.toLocaleDateString() : "Not scheduled";
};

// Ensure each item has an id
const normalizeInitial = (items?: SkillRoadmapItem[]): SkillRoadmapItem[] =>
  (items ?? []).map((item) => ({
    ...item,
    id: item.id ?? createId(),
  }));

const SkillRoadMap: React.FC<SkillRoadMapProps> = ({
  initialSkills,
  onChange,
}) => {
  const [skills, setSkills] = useState<SkillRoadmapItem[]>(() =>
    normalizeInitial(initialSkills)
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillRoadmapItem | null>(
    null
  );
  const [collapsed, setCollapsed] = useState<boolean>(false);

  // New state for filtering, sorting, and batch operations
  const [filterType, setFilterType] = useState<AbilityType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Local form state for add/edit
  const [formData, setFormData] = useState({
    abilityType: "" as AbilityType | "",
    category: "",
    skill: "",
    code: "",
    startDate: "",
    endDate: "",
  });

  // Propagate changes upward
  const syncSkills = (next: SkillRoadmapItem[]) => {
    setSkills(next);
    onChange?.(next);
  };

  // Get category options based on ability type
  const getCategoryOptions = (type: AbilityType | ""): string[] => {
    if (!type) return [];
    if (type === "skill") {
      return ["content", "process", "crossFunctional"];
    } else if (type === "knowledge") {
      return [
        "management",
        "production",
        "technical",
        "science",
        "health",
        "education",
        "culture",
        "public",
        "communication",
      ];
    } else if (type === "tech") {
      return [
        "business",
        "productivity",
        "development",
        "database",
        "education",
        "industry",
        "network",
        "system",
        "security",
        "communication",
        "management",
      ];
    }
    return [];
  };

  // Get skill options based on type and category
  const getSkillOptions = (type: AbilityType | "", category: string) => {
    if (!type || !category) return [];

    if (type === "skill") {
      if (category === "content") return skillCategories.content;
      if (category === "process") return skillCategories.process;
      if (category === "crossFunctional") {
        return [
          ...skillCategories.crossFunctional.resourceManagement,
          ...skillCategories.crossFunctional.technical,
        ];
      }
    } else if (type === "knowledge") {
      return knowledgeCategories[category as keyof typeof knowledgeCategories] || [];
    } else if (type === "tech") {
      return techSkillCategories[category as keyof typeof techSkillCategories] || [];
    }
    return [];
  };

  // Compute status for a single item with sort order
  const getSkillStatus = (startDate?: string, endDate?: string): StatusInfo => {
    const start = parseDateStrict(startDate);
    const end = parseDateStrict(endDate);

    if (!start || !end) {
      return {
        status: "not-scheduled",
        label: "Not scheduled",
        color: "bg-gray-100 text-ink-soft border-border",
        icon: Clock,
        sortOrder: 4, // Last priority
      };
    }

    const today = new Date();

    if (today < start) {
      return {
        status: "not-started",
        label: "Not Started",
        color: "bg-gray-100 text-ink-soft border-border",
        icon: Clock,
        sortOrder: 3,
      };
    } else if (today >= start && today <= end) {
      return {
        status: "in-progress",
        label: "In Progress",
        color: "bg-primary/10 text-primary border-primary",
        icon: TrendingUp,
        sortOrder: 2,
      };
    } else {
      return {
        status: "completed",
        label: "Date Passed",
        color: "bg-accent/20 text-black border-accent",
        icon: AlertCircle,
        sortOrder: 1, // First priority
      };
    }
  };



  // Filter and sort skills
  const filteredAndSortedSkills = useMemo(() => {
    let result = [...skills];

    // Apply filters
    if (filterType !== "all") {
      result = result.filter(s => s.abilityType === filterType);
    }
    if (filterStatus !== "all") {
      result = result.filter(s => {
        const status = getSkillStatus(s.startDate, s.endDate).status;
        return status === filterStatus;
      });
    }

    // Sort by status priority: Date Passed → In Progress → Not Started → Not Scheduled
    result.sort((a, b) => {
      const statusA = getSkillStatus(a.startDate, a.endDate);
      const statusB = getSkillStatus(b.startDate, b.endDate);
      return statusA.sortOrder - statusB.sortOrder;
    });

    return result;
  }, [skills, filterType, filterStatus]);

  // Summary counts for collapsed view
  const summary = useMemo(() => {
    const total = skills.length;

    // Count items with no schedule at all
    const notScheduled = skills.reduce((acc, s) => {
      const start = parseDateStrict(s.startDate);
      const end = parseDateStrict(s.endDate);
      return acc + (!start || !end ? 1 : 0);
    }, 0);

    // Count in-progress and date-passed
    let inProgress = 0;
    let datePassed = 0;
    for (const s of skills) {
      const st = getSkillStatus(s.startDate, s.endDate).status;
      if (st === "in-progress") inProgress += 1;
      if (st === "completed") datePassed += 1;
    }

    return { total, notScheduled, inProgress, datePassed };
  }, [skills]);

  // Handlers for add/edit/delete
  const handleAddSkill = () => {
    if (
      formData.abilityType &&
      formData.category &&
      formData.skill &&
      formData.startDate &&
      formData.endDate
    ) {
      const newSkill: SkillRoadmapItem = {
        id: createId(),
        abilityType: formData.abilityType as AbilityType,
        category: formData.category,
        skill: formData.skill,
        code: formData.code?.trim() ? formData.code.trim() : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };
      syncSkills([...skills, newSkill]);
      resetForm();
      setShowAddModal(false);
    }
  };

  const handleEditSkill = () => {
    if (
      editingSkill &&
      formData.abilityType &&
      formData.category &&
      formData.skill &&
      formData.startDate &&
      formData.endDate
    ) {
      syncSkills(
        skills.map((skill) =>
          skill.id === editingSkill.id
            ? {
                ...skill,
                abilityType: formData.abilityType as AbilityType,
                category: formData.category,
                skill: formData.skill,
                code: formData.code?.trim() ? formData.code.trim() : undefined,
                startDate: formData.startDate || undefined,
                endDate: formData.endDate || undefined,
              }
            : skill
        )
      );
      resetForm();
      setShowEditModal(false);
      setEditingSkill(null);
    }
  };

  const handleRemoveSkill = (id: string) => {
    syncSkills(skills.filter((skill) => skill.id !== id));
    selectedIds.delete(id);
    setSelectedIds(new Set(selectedIds));
  };

  const openEditModal = (skill: SkillRoadmapItem) => {
    setEditingSkill(skill);
    setFormData({
      abilityType: skill.abilityType,
      category: skill.category,
      skill: skill.skill,
      code: skill.code || "",
      startDate: skill.startDate ?? "",
      endDate: skill.endDate ?? "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      abilityType: "",
      category: "",
      skill: "",
      code: "",
      startDate: "",
      endDate: "",
    });
  };

  // Batch operations
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedSkills.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedSkills.map(s => s.id)));
    }
  };

  const handleBatchDelete = () => {
    if (confirm(`Delete ${selectedIds.size} selected skills?`)) {
      syncSkills(skills.filter(s => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setShowBatchActions(false);
    }
  };

  const resetFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
  };

  // Responsive modal scaffold
  const Modal = ({
    show,
    title,
    children,
  }: {
    show: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white rounded-xl shadow-modal w-full max-h-[92vh] overflow-y-auto
                        max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl">
          <div className="p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-ink mb-3 sm:mb-4">
              {title}
            </h2>
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Responsive form content
  const FormContent = ({
    onSubmit,
    submitLabel,
  }: {
    onSubmit: () => void;
    submitLabel: string;
  }) => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Ability Type
          </label>
          <select
            value={formData.abilityType}
            onChange={(e) =>
              setFormData({
                ...formData,
                abilityType: e.target.value as AbilityType | "",
                category: "",
                skill: "",
                code: "",
              })
            }
            className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
          >
            <option value="">Select Type</option>
            <option value="skill">Skill</option>
            <option value="knowledge">Knowledge</option>
            <option value="tech">Tech Skill</option>
          </select>
        </div>

        {formData.abilityType && (
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value, skill: "", code: "" })
              }
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            >
              <option value="">Select Category</option>
              {getCategoryOptions(formData.abilityType).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.category && (
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Skill
            </label>
            <select
              value={formData.skill}
              onChange={(e) => {
                const selectedOption = getSkillOptions(
                  formData.abilityType,
                  formData.category
                ).find((opt) => opt.name === e.target.value);
                setFormData({
                  ...formData,
                  skill: e.target.value,
                  code: selectedOption?.code || "",
                });
              }}
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            >
              <option value="">Select Skill</option>
              {getSkillOptions(formData.abilityType, formData.category).map((opt) => (
                <option key={opt.code || opt.name} value={opt.name}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              End Date
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              className="w-full p-2.5 sm:p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-ink"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 sm:pt-4">
          <button
            onClick={onSubmit}
            className="w-full sm:flex-1 bg-primary text-ink-invert py-2.5 sm:py-3 px-4 rounded-full font-semibold hover:bg-primary/90 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {submitLabel}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(false);
              setShowEditModal(false);
              setEditingSkill(null);
            }}
            className="w-full sm:flex-1 bg-transparent text-ink border border-border py-2.5 sm:py-3 px-4 rounded-full font-semibold hover:bg-black/10 transition focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 items-start sm:items-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-xl lg:text-xl font-heading font-bold text-ink">
            
          </h3>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {skills.length > 0 && (
              <>
                <button
                  onClick={() => setShowBatchActions(!showBatchActions)}
                  className={`flex items-center gap-1.5 sm:gap-2 border px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-black/5 transition shadow-sm focus:outline-none focus:ring-2 text-sm sm:text-base ${
                    showBatchActions ? 'bg-primary/10 border-primary text-primary' : 'border-border text-ink'
                  }`}
                  title={showBatchActions ? "Exit batch mode" : "Enter batch mode"}
                >
                  <CheckSquare size={18} />
                  Batch
                </button>
                
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  className="flex items-center gap-1.5 sm:gap-2 border border-border text-ink px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-black/5 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-black/20 text-sm sm:text-base"
                  title={collapsed ? "Show all" : "Show less"}
                >
                  {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  {collapsed ? "Show all" : "Show less"}
                </button>
              </>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 bg-primary text-ink-invert px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-primary/90 transition shadow-card font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm sm:text-base"
            >
              <Plus size={18} className="sm:hidden" />
              <Plus size={20} className="hidden sm:block" />
              Add Skill
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {skills.length > 0 && !collapsed && (
          <div className="bg-white rounded-xl shadow-card border border-border p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={18} className="text-primary" />
              <h3 className="font-semibold text-ink">Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as AbilityType | "all")}
                  className="w-full p-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">All Types</option>
                  <option value="skill">Skill</option>
                  <option value="knowledge">Knowledge</option>
                  <option value="tech">Tech Skill</option>
                </select>
              </div>


              <div>
                <label className="block text-xs font-medium text-ink-soft mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full p-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Date Passed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="not-started">Not Started</option>
                  <option value="not-scheduled">Not Scheduled</option>
                </select>
              </div>
            </div>

            {(filterType !== "all" ||  filterStatus !== "all") && (
              <button
                onClick={resetFilters}
                className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
              >
                <X size={14} />
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Batch actions bar */}
        {showBatchActions && selectedIds.size > 0 && (
          <div className="bg-primary/10 border border-primary rounded-xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink">
              {selectedIds.size} skill{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition text-sm font-semibold"
              >
                <Trash2 size={16} />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 border border-border rounded-full hover:bg-black/5 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Collapsed summary */}
        {collapsed && skills.length > 0 ? (
          <div className="bg-white rounded-xl shadow-card border border-border p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-heading font-semibold text-ink mb-3 sm:mb-4">
              Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="text-xs sm:text-sm text-ink-soft mb-1">Total</div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.total}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-ink-soft mb-1">
                  <AlertCircle size={14} />
                  <span>Date Passed</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.datePassed}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-ink-soft mb-1">
                  <Clock size={14} />
                  <span>Not Scheduled</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.notScheduled}
                </div>
              </div>
              <div className="rounded-lg border border-border p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-ink-soft mb-1">
                  <TrendingUp size={14} />
                  <span>In Progress</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-ink">
                  {summary.inProgress}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {skills.length === 0 ? (
              <div className="bg-white rounded-xl shadow-card border border-border p-8 sm:p-12 text-center">
                <Calendar
                  size={56}
                  className="mx-auto mb-3 text-ink-soft/40 sm:hidden"
                />
                <Calendar
                  size={64}
                  className="mx-auto mb-4 text-ink-soft/40 hidden sm:block"
                />
                <h2 className="text-lg sm:text-2xl font-heading font-semibold text-ink mb-2">
                  Not selected yet
                </h2>
                <p className="text-ink-soft mb-4 sm:mb-6 text-sm sm:text-base">
                  Start building your learning roadmap by adding your first skill
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary text-ink-invert px-5 sm:px-6 py-2 sm:py-2.5 rounded-full hover:bg-primary/90 transition font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm sm:text-base"
                >
                  Add Your First Skill
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-card border border-border">
                {/* Sorting info header */}
                <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gray-50/50">
                  <div className="flex items-center gap-2 text-sm text-ink-soft">
                    <ArrowUpDown size={16} />
                    <span>Sorted: Date Passed → In Progress → Not Started → Not Scheduled</span>
                  </div>
                  {showBatchActions && (
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      {selectedIds.size === filteredAndSortedSkills.length ? (
                        <>
                          <CheckSquare size={16} />
                          Deselect All
                        </>
                      ) : (
                        <>
                          <Square size={16} />
                          Select All
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Scrollable skills list - max height with scroll */}
                <div className="max-h-[600px] overflow-y-auto">
                  <div className="p-3 sm:p-4 space-y-3">
                    {filteredAndSortedSkills.map((skill) => {
                      const statusInfo = getSkillStatus(
                        skill.startDate,
                        skill.endDate
                      );
                      const StatusIcon = statusInfo.icon;
                      const isSelected = selectedIds.has(skill.id);

                      return (
                        <div
                          key={skill.id}
                          className={`bg-white rounded-xl border p-4 sm:p-5 hover:shadow-lg transition ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Checkbox for batch selection */}
                            {showBatchActions && (
                              <button
                                onClick={() => toggleSelection(skill.id)}
                                className="mt-1 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                              >
                                {isSelected ? (
                                  <CheckSquare size={20} className="text-primary" />
                                ) : (
                                  <Square size={20} className="text-ink-soft" />
                                )}
                              </button>
                            )}

                            <div className="flex-1 min-w-0">
                              {/* Skill name as main title */}
                              <h3 className="text-base sm:text-lg lg:text-xl font-heading font-bold text-ink leading-snug whitespace-normal break-words">
                                {skill.skill}
                              </h3>

                              {/* Meta information */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-ink-soft">
                                <span className="capitalize font-medium">
                                  {skill.abilityType}
                                </span>
                                <span>→</span>
                                <span className="capitalize">{skill.category}</span>

                                <span
                                  className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-medium border ${statusInfo.color}`}
                                >
                                  <StatusIcon size={12} />
                                  {statusInfo.label}
                                </span>

                                <span className="flex items-center gap-1">
                                  <Calendar size={14} className="opacity-70" />
                                  <span>Start: {formatDateLabel(skill.startDate)}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} className="opacity-70" />
                                  <span>End: {formatDateLabel(skill.endDate)}</span>
                                </span>
                              </div>
                            </div>

                            {/* Action buttons */}
                            {!showBatchActions && (
                              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                                <button
                                  onClick={() => openEditModal(skill)}
                                  className="p-1.5 sm:p-2 text-primary hover:bg-primary/10 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  title="Edit skill"
                                >
                                  <Edit2 size={18} className="sm:hidden" />
                                  <Edit2 size={20} className="hidden sm:block" />
                                </button>
                                <button
                                  onClick={() => handleRemoveSkill(skill.id)}
                                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-red-300"
                                  title="Remove skill"
                                >
                                  <Trash2 size={18} className="sm:hidden" />
                                  <Trash2 size={20} className="hidden sm:block" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Results count footer */}
                {filteredAndSortedSkills.length > 0 && (
                  <div className="px-4 py-3 border-t border-border bg-gray-50/50 text-center text-sm text-ink-soft">
                    Showing {filteredAndSortedSkills.length} of {skills.length} skill{skills.length !== 1 ? 's' : ''}
                  </div>
                )}

                {/* No results message */}
                {filteredAndSortedSkills.length === 0 && skills.length > 0 && (
                  <div className="p-8 text-center">
                    <Filter size={48} className="mx-auto mb-3 text-ink-soft/40" />
                    <h3 className="text-lg font-semibold text-ink mb-2">No skills match your filters</h3>
                    <p className="text-ink-soft mb-4">Try adjusting your filter criteria</p>
                    <button
                      onClick={resetFilters}
                      className="text-sm text-primary hover:underline"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modals */}
        <Modal
          show={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add New Skill"
        >
          <FormContent onSubmit={handleAddSkill} submitLabel="Add Skill" />
        </Modal>

        <Modal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Skill"
        >
          <FormContent onSubmit={handleEditSkill} submitLabel="Update Skill" />
        </Modal>
      </div>
    </div>
  );
};

export default SkillRoadMap;