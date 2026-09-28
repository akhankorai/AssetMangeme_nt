import React, { useState, useMemo, useRef } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Search,
  Package,
  Wrench,
  Fuel,
  Calendar,
  AlertCircle,
  FileText,
  ShieldCheck,
  RotateCcw,
  Tag,
  MapPin,
  X,
  User,
  UserCheck
} from 'lucide-react';
import { formatPersonDisplayName } from '../../utils/formatting';
import './ApprovalsWorkspace.css';

export default function ApprovalsWorkspace({
  tasks = [],
  completedTasks = [],
  items = [],
  assets = [],
  categories = [],
  locations = [],
  serviceTypes = [],
  teamMembers = [],
  onUpdateTask,
  showNotification,
  isSuperuser = true,
  currentUser = null,
  fuelDemands = [],
  onAllocateFuelDemand,
  onDenyFuelDemand
}) {
  const [moduleTab, setModuleTab] = useState('tasks');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [selectedServiceType, setSelectedServiceType] = useState('All Service Types');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateFromRef = useRef(null);
  const dateToRef = useRef(null);

  const handleDateClick = (ref) => {
    if (ref?.current) {
      if (typeof ref.current.showPicker === 'function') {
        try {
          ref.current.showPicker();
        } catch (e) {
          ref.current.focus();
        }
      } else {
        ref.current.focus();
      }
    }
  };

  // Column level quick filters (split title and service separately)
  const [colSearch, setColSearch] = useState({
    id: '',
    asset: '',
    title: '',
    service: '',
    item: '',
    assignee: ''
  });

  const [selectedTaskForPrint, setSelectedTaskForPrint] = useState(null);
  const [selectedTaskForAction, setSelectedTaskForAction] = useState(null);
  const [actionType, setActionType] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Map asset lookup table for fast category/station resolution
  const assetMap = useMemo(() => {
    const map = new Map();
    (assets || []).forEach((a) => {
      if (a.id) map.set(a.id, a);
      if (a.asset_tag) map.set(a.asset_tag, a);
    });
    return map;
  }, [assets]);

  // Assignee name resolution helper
  const resolveAssigneeName = (task) => {
    if (!task) return 'Unassigned';
    const raw = task.assignee || task.assigned_to || task.assignedTo || task.technician || task.assigned_user;
    if (!raw || String(raw).trim().toLowerCase() === 'unassigned') return 'Unassigned';

    const valStr = String(raw).trim();
    const matchedMember = (teamMembers || []).find(
      (m) =>
        String(m.id) === valStr ||
        String(m.name || '').toLowerCase() === valStr.toLowerCase() ||
        String(m.email || '').toLowerCase() === valStr.toLowerCase() ||
        String(m.username || '').toLowerCase() === valStr.toLowerCase()
    );

    if (matchedMember) {
      return formatPersonDisplayName(matchedMember.name || matchedMember.email || matchedMember.username);
    }
    return formatPersonDisplayName(valStr);
  };

  // Combine tasks that require approval
  const allTasksList = [...(tasks || []), ...(completedTasks || [])];

  const approvalTasks = useMemo(() => {
    return allTasksList.filter((task) => {
      if (!task) return false;
      const isAwaitingParts = task.stage === 'awaiting_parts';
      const hasParts = Boolean(task.consumedItemId || task.consumedItemName);
      const status = task.approvalStatus || task.approval_status;
      const hasApprovalStatus = Boolean(status && status !== 'not_required');
      return isAwaitingParts || hasParts || hasApprovalStatus;
    });
  }, [allTasksList]);

  // Metrics
  const totalCount = approvalTasks.length;
  const pendingCount = approvalTasks.filter(
    (t) => (t.approvalStatus || 'pending') === 'pending' || (t.stage === 'awaiting_parts' && t.approvalStatus !== 'approved' && t.approvalStatus !== 'rejected')
  ).length;
  const approvedCount = approvalTasks.filter((t) => t.approvalStatus === 'approved').length;
  const rejectedCount = approvalTasks.filter((t) => t.approvalStatus === 'rejected').length;

  // Fuel Demand Metrics
  const fuelApprovalDemands = useMemo(() => {
    return (fuelDemands || []).filter(d => ['requested', 'approved', 'rejected'].includes(d.status));
  }, [fuelDemands]);
  const fuelTotalCount = fuelApprovalDemands.length;
  const fuelPendingCount = fuelApprovalDemands.filter(d => d.status === 'requested').length;
  const fuelApprovedCount = fuelApprovalDemands.filter(d => d.status === 'approved').length;
  const fuelRejectedCount = fuelApprovalDemands.filter(d => d.status === 'rejected').length;

  // Options
  const categoryOptions = useMemo(() => {
    const set = new Set();
    if (categories && categories.length > 0) {
      categories.forEach((c) => {
        const val = typeof c === 'object' ? (c.name || c.category_name || c.category || '') : String(c || '');
        if (val && val.trim()) set.add(val.trim());
      });
    }

    approvalTasks.forEach((t) => {
      const matched = assetMap.get(t.assetId) || assetMap.get(t.assetTag);
      const cat = t.category || matched?.category_name || matched?.category;
      if (cat && String(cat).trim()) {
        set.add(String(cat).trim());
      }
    });

    return ['All Categories', ...Array.from(set)];
  }, [categories, approvalTasks, assetMap]);

  const locationOptions = useMemo(() => {
    const set = new Set();

    if (locations && locations.length > 0) {
      locations.forEach((l) => {
        const val = typeof l === 'object' ? (l.name || l.location_name || l.station || l.title || '') : String(l || '');
        if (val && val.trim()) set.add(val.trim());
      });
    }

    approvalTasks.forEach((t) => {
      const matched = assetMap.get(t.assetId) || assetMap.get(t.assetTag);
      const loc = t.station || t.location || matched?.location_name || matched?.location || matched?.station;
      if (loc && String(loc).trim()) {
        set.add(String(loc).trim());
      }
    });

    return ['All Locations', ...Array.from(set)];
  }, [locations, approvalTasks, assetMap]);

  const serviceTypeOptionsList = useMemo(() => {
    const set = new Set();
    if (serviceTypes && serviceTypes.length > 0) {
      serviceTypes.forEach((s) => {
        const val = typeof s === 'object' ? (s.name || s.service_type || '') : String(s || '');
        if (val && val.trim()) set.add(val.trim());
      });
    }

    approvalTasks.forEach((t) => {
      if (t.serviceType && String(t.serviceType).trim()) {
        set.add(String(t.serviceType).trim());
      }
    });

    return ['All Service Types', ...Array.from(set)];
  }, [serviceTypes, approvalTasks]);

  // Multi-criteria filter pipeline
  const filteredTasks = useMemo(() => {
    return approvalTasks.filter((task) => {
      const status = task.approvalStatus || task.approval_status || (task.stage === 'awaiting_parts' ? 'pending' : 'not_required');
      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'pending'
            ? status === 'pending' || (task.stage === 'awaiting_parts' && status !== 'approved' && status !== 'rejected')
            : activeTab === 'approved'
              ? status === 'approved'
              : activeTab === 'rejected'
                ? status === 'rejected'
                : true;

      if (!matchesTab) return false;

      const matchedAsset = assetMap.get(task.assetId) || assetMap.get(task.assetTag);
      const taskCategory = task.category || matchedAsset?.category_name || matchedAsset?.category || '';
      const taskLocation = task.station || task.location || matchedAsset?.location_name || matchedAsset?.location || matchedAsset?.station || '';
      const assigneeName = resolveAssigneeName(task);

      if (selectedCategory !== 'All Categories' && taskCategory !== selectedCategory) {
        return false;
      }

      if (selectedLocation !== 'All Locations' && taskLocation !== selectedLocation) {
        return false;
      }

      if (selectedServiceType !== 'All Service Types' && task.serviceType !== selectedServiceType) {
        return false;
      }

      if (dateFrom) {
        const taskDate = task.assignedAt || task.dueDate || task.createdAt;
        if (taskDate && new Date(taskDate) < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const taskDate = task.assignedAt || task.dueDate || task.createdAt;
        if (taskDate && new Date(taskDate) > new Date(dateTo + 'T23:59:59')) return false;
      }

      // Column Filters
      if (colSearch.id && !String(task.formatted_id || `#${task.id}`).toLowerCase().includes(colSearch.id.toLowerCase())) {
        return false;
      }
      if (colSearch.asset && !String(task.assetName || task.assetTag || '').toLowerCase().includes(colSearch.asset.toLowerCase())) {
        return false;
      }
      if (colSearch.title && !String(task.title || '').toLowerCase().includes(colSearch.title.toLowerCase())) {
        return false;
      }
      if (colSearch.service && !String(task.serviceType || '').toLowerCase().includes(colSearch.service.toLowerCase())) {
        return false;
      }
      if (colSearch.item && !String(task.consumedItemName || '').toLowerCase().includes(colSearch.item.toLowerCase())) {
        return false;
      }
      if (colSearch.assignee && !String(assigneeName).toLowerCase().includes(colSearch.assignee.toLowerCase())) {
        return false;
      }

      // General Search Term
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesSearch =
          String(task.formatted_id || `#${task.id}`).toLowerCase().includes(term) ||
          String(task.title || '').toLowerCase().includes(term) ||
          String(task.serviceType || '').toLowerCase().includes(term) ||
          String(task.assetTag || '').toLowerCase().includes(term) ||
          String(task.assetName || '').toLowerCase().includes(term) ||
          String(task.consumedItemName || '').toLowerCase().includes(term) ||
          String(assigneeName).toLowerCase().includes(term);

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [
    approvalTasks,
    activeTab,
    selectedCategory,
    selectedLocation,
    selectedServiceType,
    dateFrom,
    dateTo,
    colSearch,
    searchTerm,
    assetMap,
    teamMembers
  ]);

  const filteredFuelDemands = useMemo(() => {
    return fuelApprovalDemands.filter((demand) => {
      const status = demand.status === 'requested' ? 'pending' : demand.status;
      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'pending'
            ? status === 'pending'
            : activeTab === 'approved'
              ? status === 'approved'
              : activeTab === 'rejected'
                ? status === 'rejected'
                : true;

      if (!matchesTab) return false;

      // Column Filters (using same states where they fit)
      if (colSearch.id && !String(demand.id || '').toLowerCase().includes(colSearch.id.toLowerCase())) return false;
      if (colSearch.asset && !String(demand.assetName || demand.assetTag || '').toLowerCase().includes(colSearch.asset.toLowerCase())) return false;
      if (colSearch.service && !String('Fuel').toLowerCase().includes(colSearch.service.toLowerCase())) return false;
      if (colSearch.item && !String(demand.fuelItemName || '').toLowerCase().includes(colSearch.item.toLowerCase())) return false;

      // General Search Term
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesSearch =
          String(demand.id || '').toLowerCase().includes(term) ||
          String('Fuel Demand').toLowerCase().includes(term) ||
          String(demand.assetTag || '').toLowerCase().includes(term) ||
          String(demand.assetName || '').toLowerCase().includes(term) ||
          String(demand.fuelItemName || '').toLowerCase().includes(term);

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [
    fuelApprovalDemands,
    activeTab,
    colSearch,
    searchTerm,
  ]);

  const hasActiveFilters =
    activeTab !== 'all' ||
    searchTerm !== '' ||
    selectedCategory !== 'All Categories' ||
    selectedLocation !== 'All Locations' ||
    selectedServiceType !== 'All Service Types' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    Boolean(colSearch.id || colSearch.asset || colSearch.title || colSearch.service || colSearch.item || colSearch.assignee);

  const handleClearFilters = () => {
    setActiveTab('all');
    setSearchTerm('');
    setSelectedCategory('All Categories');
    setSelectedLocation('All Locations');
    setSelectedServiceType('All Service Types');
    setDateFrom('');
    setDateTo('');
    setColSearch({ id: '', asset: '', title: '', service: '', item: '', assignee: '' });
  };

  const handleConfirmAction = async () => {
    if (!selectedTaskForAction) return;

    try {
      const isApprove = actionType === 'approve';
      const approverName = currentUser?.name || currentUser?.email || 'Admin';
      const timestamp = new Date().toISOString();

      if (moduleTab === 'fuel') {
        const adminNotes = adminRemarks || (isApprove ? 'Approved' : 'Rejected by management');
        if (isApprove) {
          await onAllocateFuelDemand(selectedTaskForAction.id, {
            ...selectedTaskForAction,
            adminNotes,
            approvedBy: approverName,
            approvedAt: timestamp
          });
        } else {
          await onDenyFuelDemand(selectedTaskForAction.id, adminNotes);
        }
        showNotification(
          isApprove ? `Fuel Demand ${selectedTaskForAction.id} approved.` : `Fuel Demand rejected.`,
          isApprove ? 'success' : 'info'
        );
      } else {
        const newStatus = isApprove ? 'approved' : 'rejected';
        await onUpdateTask(selectedTaskForAction.id, {
          approvalStatus: newStatus,
          approval_status: newStatus,
          approvalRemarks: adminRemarks || (isApprove ? 'Approved for execution' : 'Rejected by management'),
          approval_remarks: adminRemarks || (isApprove ? 'Approved for execution' : 'Rejected by management'),
          approvedBy: approverName,
          approved_by: approverName,
          approvedAt: timestamp,
          approved_at: timestamp,
        });

        showNotification(
          isApprove
            ? `Work & Parts Approval confirmed for task ${selectedTaskForAction.formatted_id || `#${selectedTaskForAction.id}`}. "Start Work" button is now unlocked!`
            : `Approval request rejected for task ${selectedTaskForAction.formatted_id || `#${selectedTaskForAction.id}`}.`,
          isApprove ? 'success' : 'info'
        );
      }

      setSelectedTaskForAction(null);
      setAdminRemarks('');
    } catch (err) {
      showNotification(err.message || 'Could not update approval status.', 'error');
    }
  };

  const triggerPrint = (task) => {
    setSelectedTaskForPrint(task);
    setTimeout(() => {
      window.print();
    }, 250);
  };

  return (
    <div className="approvals-workspace">
      {/* Header */}
      <header className="approvals-header">
        <div className="approvals-header__title-group">
          <div className="approvals-header__icon-badge">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="approvals-header__title">Work & Parts Approvals</h1>
            <p className="approvals-header__subtitle">Review, authorize, and print official material requisition documents for fleet maintenance.</p>
          </div>
        </div>
      </header>

      {/* Module Tabs */}
      <div className="workspaceTabs" style={{ margin: '0 32px 24px' }}>
        <button
          className={`workspaceTab ${moduleTab === 'tasks' ? 'active blue' : ''}`}
          onClick={() => setModuleTab('tasks')}
        >
          <Wrench size={16} /> Task Approvals
        </button>
        <button
          className={`workspaceTab ${moduleTab === 'fuel' ? 'active red' : ''}`}
          onClick={() => setModuleTab('fuel')}
        >
          <Fuel size={16} /> Fuel Approvals {fuelPendingCount > 0 && <span style={{ background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', marginLeft: '6px' }}>{fuelPendingCount}</span>}
        </button>
      </div>

      {/* Metrics Row */}
      <section className="approvals-metrics">
        <div className="approvals-metric-card">
          <div>
            <div className="approvals-metric-card__label">Total Requisitions</div>
            <div className="approvals-metric-card__value">{moduleTab === 'tasks' ? totalCount : fuelTotalCount}</div>
          </div>
          <div className="approvals-metric-card__icon">
            <FileText size={22} />
          </div>
        </div>

        <div className="approvals-metric-card approvals-metric-card--pending">
          <div>
            <div className="approvals-metric-card__label">Pending Approval</div>
            <div className="approvals-metric-card__value">{moduleTab === 'tasks' ? pendingCount : fuelPendingCount}</div>
          </div>
          <div className="approvals-metric-card__icon">
            <Clock size={22} />
          </div>
        </div>

        <div className="approvals-metric-card approvals-metric-card--approved">
          <div>
            <div className="approvals-metric-card__label">Approved & Unlocked</div>
            <div className="approvals-metric-card__value">{moduleTab === 'tasks' ? approvedCount : fuelApprovedCount}</div>
          </div>
          <div className="approvals-metric-card__icon">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="approvals-metric-card approvals-metric-card--rejected">
          <div>
            <div className="approvals-metric-card__label">Rejected</div>
            <div className="approvals-metric-card__value">{moduleTab === 'tasks' ? rejectedCount : fuelRejectedCount}</div>
          </div>
          <div className="approvals-metric-card__icon">
            <XCircle size={22} />
          </div>
        </div>
      </section>

      {/* Filter Panel */}
      <section className="approvals-filter-panel">
        <div className="approvals-filter-panel__main-row">
          <div className="approvals-tabs">
            {[
              { key: 'all', label: `All Requests` },
              { key: 'pending', label: `Pending` },
              { key: 'approved', label: `Approved` },
              { key: 'rejected', label: `Rejected` }
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`approvals-tabs__item ${activeTab === tab.key ? 'approvals-tabs__item--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="approvals-search">
            <Search size={16} className="approvals-search__icon" />
            <input
              type="text"
              className="approvals-search__input"
              placeholder="Search by ID, asset, part or assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="approvals-search__clear"
                onClick={() => setSearchTerm('')}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="approvals-filter-panel__secondary-row">
          <div className={`approvals-filter-select ${selectedCategory !== 'All Categories' ? 'active-filter' : ''}`}>
            <Tag size={14} className="approvals-filter-select__icon" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className={`approvals-filter-select ${selectedLocation !== 'All Locations' ? 'active-filter' : ''}`}>
            <MapPin size={14} className="approvals-filter-select__icon" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className={`approvals-filter-select ${selectedServiceType !== 'All Service Types' ? 'active-filter' : ''}`}>
            <Wrench size={14} className="approvals-filter-select__icon" />
            <select
              value={selectedServiceType}
              onChange={(e) => setSelectedServiceType(e.target.value)}
            >
              {serviceTypeOptionsList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`approvals-filter-select ${dateFrom ? 'active-filter' : ''}`}
            onClick={() => handleDateClick(dateFromRef)}
            style={{ cursor: 'pointer' }}
          >
            <Calendar size={15} className="approvals-filter-select__icon" />
            <span className="approvals-filter-select__label">From:</span>
            <input
              ref={dateFromRef}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                handleDateClick(dateFromRef);
              }}
            />
          </div>

          <div
            className={`approvals-filter-select ${dateTo ? 'active-filter' : ''}`}
            onClick={() => handleDateClick(dateToRef)}
            style={{ cursor: 'pointer' }}
          >
            <Calendar size={15} className="approvals-filter-select__icon" />
            <span className="approvals-filter-select__label">To:</span>
            <input
              ref={dateToRef}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onClick={(e) => {
                e.stopPropagation();
                handleDateClick(dateToRef);
              }}
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="approvals-btn-reset"
              onClick={handleClearFilters}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>
      </section >

      {/* Requests Table — Separated into 4 individual columns for Task, Service, Item, Qty/Cost */}
      < section className="approvals-table-wrap" >
        <table className="approvals-table">
          <thead>
            <tr>
              <th className="approvals-table__head-cell" style={{ width: '9%' }}>Task ID</th>
              <th className="approvals-table__head-cell" style={{ width: '14%' }}>Asset Details</th>
              <th className="approvals-table__head-cell" style={{ width: '16%' }}>Task Title</th>
              <th className="approvals-table__head-cell" style={{ width: '13%' }}>Service Type</th>
              <th className="approvals-table__head-cell" style={{ width: '14%' }}>Requested Item</th>
              <th className="approvals-table__head-cell" style={{ width: '11%' }}>Qty & Cost</th>
              <th className="approvals-table__head-cell" style={{ width: '11%' }}>Assignee</th>
              <th className="approvals-table__head-cell" style={{ width: '12%' }}>Approval Status</th>
              <th className="approvals-table__head-cell approvals-table__cell--right" style={{ width: '10%' }}>Actions</th>
            </tr>
            {/* Column-level quick filter row */}
            <tr>
              <td className="approvals-table__filter-row-cell">
                <input
                  type="text"
                  className="approvals-table__col-input"
                  placeholder="Filter ID..."
                  value={colSearch.id}
                  onChange={(e) => setColSearch({ ...colSearch, id: e.target.value })}
                />
              </td>
              <td className="approvals-table__filter-row-cell">
                <input
                  type="text"
                  className="approvals-table__col-input"
                  placeholder="Filter asset..."
                  value={colSearch.asset}
                  onChange={(e) => setColSearch({ ...colSearch, asset: e.target.value })}
                />
              </td>
              <td className="approvals-table__filter-row-cell">
                <input
                  type="text"
                  className="approvals-table__col-input"
                  placeholder="Filter task..."
                  value={colSearch.title}
                  onChange={(e) => setColSearch({ ...colSearch, title: e.target.value })}
                />
              </td>
              <td className="approvals-table__filter-row-cell">
                <input
                  type="text"
                  className="approvals-table__col-input"
                  placeholder="Filter service..."
                  value={colSearch.service}
                  onChange={(e) => setColSearch({ ...colSearch, service: e.target.value })}
                />
              </td>
              <td className="approvals-table__filter-row-cell">
                <input
                  type="text"
                  className="approvals-table__col-input"
                  placeholder="Filter item..."
                  value={colSearch.item}
                  onChange={(e) => setColSearch({ ...colSearch, item: e.target.value })}
                />
              </td>
              <td className="approvals-table__filter-row-cell"></td>
              <td className="approvals-table__filter-row-cell">
                <input
                  type="text"
                  className="approvals-table__col-input"
                  placeholder="Filter tech..."
                  value={colSearch.assignee}
                  onChange={(e) => setColSearch({ ...colSearch, assignee: e.target.value })}
                />
              </td>
              <td className="approvals-table__filter-row-cell"></td>
              <td className="approvals-table__filter-row-cell"></td>
            </tr>
          </thead>
          <tbody>
            {(moduleTab === 'tasks' ? filteredTasks : filteredFuelDemands).length === 0 ? (
              <tr>
                <td colSpan={9} className="approvals-empty-state">
                  <AlertCircle size={36} className="approvals-empty-state__icon" />
                  <div className="approvals-empty-state__title">
                    No approval requests found matching your filters.
                  </div>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="approvals-btn-reset"
                      onClick={handleClearFilters}
                      style={{ margin: '14px auto 0 auto' }}
                    >
                      <RotateCcw size={14} /> Clear All Filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              moduleTab === 'tasks' ? filteredTasks.map((task) => {
                const status = task.approvalStatus || (task.stage === 'awaiting_parts' ? 'pending' : 'not_required');
                const isPending = status === 'pending' || (task.stage === 'awaiting_parts' && status !== 'approved' && status !== 'rejected');
                const isApproved = status === 'approved';
                const isRejected = status === 'rejected';

                const matchedItem = items.find((i) => i && (i.id === task.consumedItemId || i.name === task.consumedItemName));
                const unitPrice = Number(matchedItem?.price || 0);

                const matchedAsset = assetMap.get(task.assetId) || assetMap.get(task.assetTag);
                const taskLocation = task.station || task.location || matchedAsset?.location_name || matchedAsset?.location || matchedAsset?.station || '';

                const qty = Math.max(1, Number(task.consumedQuantity) || 1);
                const totalCost = unitPrice * qty;
                const assigneeDisplay = resolveAssigneeName(task);

                return (
                  <tr key={task.id} className="approvals-table__row">
                    {/* 1. Task ID */}
                    <td className="approvals-table__cell">
                      <span className="approvals-task-id">
                        {task.formatted_id || `#${task.id}`}
                      </span>
                    </td>

                    {/* 2. Asset Details */}
                    <td className="approvals-table__cell">
                      <div className="approvals-asset-info">
                        <strong className="approvals-asset-info__name">{task.assetName || 'Unknown Asset'}</strong>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span className="approvals-asset-info__tag">
                            {task.assetTag || '-'}
                          </span>
                          {taskLocation && (
                            <span className="approvals-location-tag">
                              <MapPin size={10} style={{ color: '#2563eb' }} /> {taskLocation}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Task Title */}
                    <td className="approvals-table__cell">
                      <strong className="approvals-task-title">{task.title}</strong>
                    </td>

                    {/* 4. Service Type */}
                    <td className="approvals-table__cell">
                      <span className="approvals-service-badge">
                        <Wrench size={12} style={{ color: '#2563eb' }} />
                        {task.serviceType || 'General Maintenance'}
                      </span>
                    </td>

                    {/* 5. Requested Item */}
                    <td className="approvals-table__cell">
                      <div className="approvals-item-name">
                        <Package size={14} className="approvals-item-icon" />
                        <span>{task.consumedItemName || 'No Item Specified'}</span>
                      </div>
                    </td>

                    {/* 6. Qty & Cost */}
                    <td className="approvals-table__cell">
                      <div className="approvals-qty-cost">
                        <span className="approvals-qty-badge">Qty: <strong>{qty}</strong></span>
                        {unitPrice > 0 ? (
                          <span className="approvals-cost-tag">Rs. {totalCost.toLocaleString()}</span>
                        ) : null}
                      </div>
                    </td>

                    {/* 7. Assignee */}
                    <td className="approvals-table__cell">
                      {assigneeDisplay === 'Unassigned' ? (
                        <span className="approvals-assignee-chip approvals-assignee-chip--unassigned">
                          Unassigned
                        </span>
                      ) : (
                        <span className="approvals-assignee-chip">
                          <User size={13} style={{ color: '#2563eb' }} />
                          {assigneeDisplay}
                        </span>
                      )}
                    </td>

                    {/* 8. Approval Status */}
                    <td className="approvals-table__cell">
                      {isPending ? (
                        <span className="approvals-badge approvals-badge--pending">
                          <Clock size={13} /> Pending Approval
                        </span>
                      ) : isApproved ? (
                        <div className="approvals-status-stack">
                          <span className="approvals-badge approvals-badge--approved">
                            <CheckCircle2 size={13} /> Approved
                          </span>
                          {task.approvedBy && <span className="approvals-status-stack__meta">By {task.approvedBy}</span>}
                        </div>
                      ) : (
                        <div className="approvals-status-stack">
                          <span className="approvals-badge approvals-badge--rejected">
                            <XCircle size={13} /> Rejected
                          </span>
                          {task.approvalRemarks && <span className="approvals-status-stack__meta">{task.approvalRemarks}</span>}
                        </div>
                      )}
                    </td>

                    {/* 9. Actions */}
                    <td className="approvals-table__cell approvals-table__cell--right">
                      <div className="approvals-actions">
                        <button
                          type="button"
                          className="approvals-btn approvals-btn--print"
                          onClick={() => triggerPrint(task)}
                          title="Print Material Requisition Document"
                        >
                          <Printer size={14} /> Print
                        </button>

                        {isPending && isSuperuser && (
                          <>
                            <button
                              type="button"
                              className="approvals-btn approvals-btn--approve"
                              onClick={() => {
                                setSelectedTaskForAction(task);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              type="button"
                              className="approvals-btn approvals-btn--reject"
                              onClick={() => {
                                setSelectedTaskForAction(task);
                                setActionType('reject');
                              }}
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              }) : filteredFuelDemands.map((demand) => {
                const status = demand.status === 'requested' ? 'pending' : demand.status;
                const isPending = status === 'pending';
                const isApproved = status === 'approved';
                const isRejected = status === 'rejected';

                const matchedItem = items.find((i) => i && (i.id === demand.fuelItemId || i.name === demand.fuelItemName));
                const unitPrice = Number(matchedItem?.price || 0);

                const qty = Math.max(0, Number(demand.liters) || 0);
                const totalCost = Number(demand.totalCost || 0) || (unitPrice * qty);

                return (
                  <tr key={demand.id} className="approvals-table__row">
                    <td className="approvals-table__cell">
                      <span className="approvals-task-id">
                        #{demand.id}
                      </span>
                    </td>

                    <td className="approvals-table__cell">
                      <div className="approvals-asset-info">
                        <strong className="approvals-asset-info__name">{demand.assetName || 'Unknown Asset'}</strong>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span className="approvals-asset-info__tag">
                            {demand.assetTag || '-'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="approvals-table__cell">
                      <strong className="approvals-task-title">Fuel Demand Request</strong>
                    </td>

                    <td className="approvals-table__cell">
                      <span className="approvals-service-badge">
                        <Fuel size={12} style={{ color: '#ef4444' }} />
                        Fuel Allocation
                      </span>
                    </td>

                    <td className="approvals-table__cell">
                      <div className="approvals-item-name">
                        <Fuel size={14} className="approvals-item-icon" />
                        <span>{demand.fuelItemName || 'Fuel'}</span>
                      </div>
                    </td>

                    <td className="approvals-table__cell">
                      <div className="approvals-qty-cost">
                        <span className="approvals-qty-badge">Qty: <strong>{qty}L</strong></span>
                        {totalCost > 0 ? (
                          <span className="approvals-cost-tag">Rs. {totalCost.toLocaleString()}</span>
                        ) : null}
                      </div>
                    </td>

                    <td className="approvals-table__cell">
                      <span className="approvals-assignee-chip">
                        <User size={13} style={{ color: '#2563eb' }} />
                        {demand.requestedBy || 'Unknown'}
                      </span>
                    </td>

                    <td className="approvals-table__cell">
                      <div className={`approvals-status-pill approvals-status-pill--${isApproved ? 'approved' : isRejected ? 'rejected' : 'pending'}`}>
                        {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                      </div>
                    </td>

                    <td className="approvals-table__cell approvals-table__cell--right">
                      <div className="approvals-action-group">
                        {isPending && (
                          <>
                            <button
                              type="button"
                              className="approvals-btn approvals-btn--approve"
                              onClick={() => {
                                setSelectedTaskForAction(demand);
                                setActionType('approve');
                              }}
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              type="button"
                              className="approvals-btn approvals-btn--reject"
                              onClick={() => {
                                setSelectedTaskForAction(demand);
                                setActionType('reject');
                              }}
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section >

      {/* Action Modal (Approve / Reject) */}
      {
        selectedTaskForAction && (
          <div className="approvals-modal-backdrop">
            <div className="approvals-modal-card">
              <div className="approvals-modal-card__header">
                <div className={`approvals-modal-card__icon-wrap ${actionType === 'approve' ? 'approvals-modal-card__icon-wrap--approve' : 'approvals-modal-card__icon-wrap--reject'}`}>
                  {actionType === 'approve' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                  <h3 className="approvals-modal-card__title">
                    {actionType === 'approve' ? 'Confirm Work Approval' : 'Reject Requisition'}
                  </h3>
                  <span className="approvals-modal-card__subtitle">
                    Task {selectedTaskForAction.formatted_id || `#${selectedTaskForAction.id}`} — {selectedTaskForAction.assetName}
                  </span>
                </div>
              </div>

              <p className="approvals-modal-card__description">
                {actionType === 'approve'
                  ? `Approving this requisition will confirm item allocation (${selectedTaskForAction.consumedItemName || 'Parts'}) and unlock the "Start Work" button in the Schedule Workspace.`
                  : 'Rejecting this request will mark the requisition as declined.'}
              </p>

              <div className="approvals-modal-card__field">
                <span className="approvals-modal-card__field-label">
                  Admin Remarks / Approval Note (Optional):
                </span>
                <textarea
                  rows={3}
                  className="approvals-modal-card__textarea"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder={actionType === 'approve' ? 'e.g. Budget approved. Proceed with maintenance.' : 'e.g. Parts currently out of stock.'}
                />
              </div>

              <div className="approvals-modal-card__footer">
                <button
                  type="button"
                  className="approvals-btn approvals-btn--cancel"
                  onClick={() => {
                    setSelectedTaskForAction(null);
                    setAdminRemarks('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`approvals-btn approvals-btn--modal-confirm ${actionType === 'approve' ? 'approve' : 'reject'}`}
                  onClick={handleConfirmAction}
                >
                  {actionType === 'approve' ? 'Confirm Approval' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Printable Requisition Form */}
      {
        selectedTaskForPrint && (
          <div className="printableRequisitionDocument" style={{ display: 'none' }}>
            <style dangerouslySetInnerHTML={{
              __html: `
            @media print {
              body * { visibility: hidden !important; }
              .printableRequisitionDocument, .printableRequisitionDocument * { visibility: visible !important; }
              .printableRequisitionDocument {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                padding: 24px !important;
                font-family: Arial, sans-serif !important;
                color: #000000 !important;
              }
            }
          ` }} />

            <div style={{ border: '2px solid #000', padding: '24px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20pt', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    PRECISION ASSETS SUITE
                  </h2>
                  <div style={{ fontSize: '10pt', color: '#555', marginTop: '4px' }}>
                    WORK & MATERIAL REQUISITION VOUCHER
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14pt', fontWeight: 'bold' }}>
                    {selectedTaskForPrint.formatted_id || `#${selectedTaskForPrint.id}`}
                  </div>
                  <div style={{ fontSize: '10pt', marginTop: '4px' }}>
                    Date: {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '11pt' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '6px', fontWeight: 'bold', width: '20%' }}>Asset Tag:</td>
                    <td style={{ padding: '6px', width: '30%' }}>{selectedTaskForPrint.assetTag || '-'}</td>
                    <td style={{ padding: '6px', fontWeight: 'bold', width: '20%' }}>Asset Name:</td>
                    <td style={{ padding: '6px', width: '30%' }}>{selectedTaskForPrint.assetName || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px', fontWeight: 'bold', verticalAlign: 'top' }}>Service Title:</td>
                    <td style={{ padding: '6px' }} colSpan="3">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(selectedTaskForPrint.title || "").split(" + ").map((service, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #ccc', paddingBottom: '4px' }}>
                            <span style={{ fontSize: '10pt', color: '#000' }}>{service}</span>
                            <div style={{ width: '16px', height: '16px', border: '1px solid #000', flexShrink: 0 }}></div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>Service Type:</td>
                    <td style={{ padding: '6px' }} colSpan="3">{selectedTaskForPrint.serviceType || 'Maintenance'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>Assigned Tech:</td>
                    <td style={{ padding: '6px' }}>{resolveAssigneeName(selectedTaskForPrint)}</td>
                    <td style={{ padding: '6px', fontWeight: 'bold' }}>Priority / Risk:</td>
                    <td style={{ padding: '6px' }}>{selectedTaskForPrint.risk || 'Medium'}</td>
                  </tr>
                </tbody>
              </table>

              <h3 style={{ fontSize: '12pt', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '4px', marginBottom: '10px' }}>
                Required Inventory / Spare Parts
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '10pt', border: '1px solid #000' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #000' }}>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'left' }}>Item Description</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', width: '15%' }}>Required Qty</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'right', width: '20%' }}>Est. Unit Rate</th>
                    <th style={{ padding: '8px', textAlign: 'right', width: '20%' }}>Total Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderRight: '1px solid #000' }}>
                      {selectedTaskForPrint.consumedItemName || 'Parts / Materials Required'}
                    </td>
                    <td style={{ padding: '10px', borderRight: '1px solid #000', textAlign: 'center' }}>
                      {selectedTaskForPrint.consumedQuantity || 1}
                    </td>
                    <td style={{ padding: '10px', borderRight: '1px solid #000', textAlign: 'right' }}>
                      Rs. {(items.find((i) => i.id === selectedTaskForPrint.consumedItemId || i.name === selectedTaskForPrint.consumedItemName)?.price || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      Rs. {((items.find((i) => i.id === selectedTaskForPrint.consumedItemId || i.name === selectedTaskForPrint.consumedItemName)?.price || 0) * (selectedTaskForPrint.consumedQuantity || 1)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '60px', paddingTop: '20px' }}>
                <div style={{ width: '40%', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '8px', fontSize: '10pt' }}>
                  <strong>Requested By (Maintenance Manager)</strong>
                  <br /><br />
                  Signature: ____________________
                </div>
                <div style={{ width: '40%', textAlign: 'center', borderTop: '1px solid #000', paddingTop: '8px', fontSize: '10pt' }}>
                  <strong>Authorized By (Admin / Management)</strong>
                  <br /><br />
                  Signature: ____________________
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
