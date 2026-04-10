import { useState, useEffect, useCallback } from 'react'
import {
    Users, Plus, Pencil, Lock, Unlock, X, AlertCircle,
    Loader2, Search, Shield, ShieldCheck, ShieldOff,
    ChevronDown, ChevronRight, Trash2, Key, MoreVertical
} from 'lucide-react'
import {
    getEmployees, createEmployee, updateEmployee, toggleEmployeeStatus,
    getEmployeeById, grantPermission, revokePermission,
    getPermissionGroups, createPermissionGroup, createPermission,
    deletePermission, deletePermissionGroup, getRoles
} from '../api/employees'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'
import DropdownPortal from '../components/DropdownPortal'

const EMPTY_FORM = { fullName: '', username: '', password: '', phone: '', roleId: '' }
const EMPTY_PERM = { name: '', labelUz: '', labelEn: '', type: 'PAGE', groupId: '' }
const EMPTY_GROUP = { name: '', labelUz: '', labelEn: '' }

export default function EmployeesPage() {
    const [tab, setTab] = useState('employees') // 'employees' | 'permissions'
    const [openMenuId, setOpenMenuId] = useState(null)
    const [menuAnchor, setMenuAnchor] = useState(null)

    // ── Employees ──
    const [employees, setEmployees] = useState([])
    const [empLoading, setEmpLoading] = useState(false)
    const [empSearch, setEmpSearch] = useState('')
    const [roles, setRoles] = useState([])

    const [showEmpModal, setShowEmpModal] = useState(false)
    const [editId, setEditId] = useState(null)
    const [empForm, setEmpForm] = useState(EMPTY_FORM)
    const [empSaving, setEmpSaving] = useState(false)
    const [empError, setEmpError] = useState('')

    // ── Permissions modal ──
    const [permEmployee, setPermEmployee] = useState(null)
    const [permLoading, setPermLoading] = useState(false)
    const [allGroups, setAllGroups] = useState([])
    const [expanded, setExpanded] = useState({})
    const [grantedIds, setGrantedIds] = useState(new Set())
    const [toggling, setToggling] = useState(new Set())

    // ── Permission groups tab ──
    const [groups, setGroups] = useState([])
    const [groupsLoading, setGroupsLoading] = useState(false)
    const [showGroupModal, setShowGroupModal] = useState(false)
    const [groupForm, setGroupForm] = useState(EMPTY_GROUP)
    const [groupSaving, setGroupSaving] = useState(false)
    const [groupError, setGroupError] = useState('')

    const [showPermModal, setShowPermModal] = useState(false)
    const [permForm, setPermForm] = useState(EMPTY_PERM)
    const [permSaving, setPermSaving] = useState(false)
    const [permError, setPermError] = useState('')

    const { hasPermission } = useAuth()

    // Load
    const loadEmployees = useCallback(() => {
        setEmpLoading(true)
        getEmployees()
            .then(res => setEmployees(res.data?.content || res.data || []))
            .catch(console.error)
            .finally(() => setEmpLoading(false))
    }, [])

    const loadGroups = useCallback(() => {
        setGroupsLoading(true)
        getPermissionGroups()
            .then(res => setGroups(res.data || []))
            .catch(console.error)
            .finally(() => setGroupsLoading(false))
    }, [])

    useEffect(() => {
        loadEmployees()
        getRoles().then(res => setRoles(res.data || []))
    }, [loadEmployees])

    useEffect(() => {
        if (tab === 'permissions') loadGroups()
    }, [tab, loadGroups])

    // Filter employees
    const filtered = employees.filter(e =>
        !empSearch || e.fullName?.toLowerCase().includes(empSearch.toLowerCase()) ||
        e.username?.toLowerCase().includes(empSearch.toLowerCase())
    )

    // ── Employee CRUD ──
    const openAdd = () => {
        setEditId(null); setEmpForm(EMPTY_FORM); setEmpError(''); setShowEmpModal(true)
    }
    const openEdit = (e) => {
        setEditId(e.id)
        setEmpForm({ fullName: e.fullName || '', username: e.username || '', password: '', phone: e.phone || '', roleId: e.roleId || '' })
        setEmpError(''); setShowEmpModal(true)
    }

    const handleEmpSave = async () => {
        if (!empForm.fullName.trim()) { setEmpError("To'liq ism kiritilishi shart"); return }
        if (!empForm.username.trim()) { setEmpError("Username kiritilishi shart"); return }
        if (!editId && !empForm.password.trim()) { setEmpError("Parol kiritilishi shart"); return }
        if (!empForm.roleId) { setEmpError("Rol tanlanishi shart"); return }
        setEmpSaving(true); setEmpError('')
        try {
            const data = { ...empForm, roleId: Number(empForm.roleId) }
            if (editId && !data.password) delete data.password
            editId ? await updateEmployee(editId, data) : await createEmployee(data)
            setShowEmpModal(false); loadEmployees()
        } catch (err) {
            setEmpError(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally { setEmpSaving(false) }
    }

    useEffect(() => {
        if (!showEmpModal) return
        const h = (e) => {
            if (e.key === 'Escape') setShowEmpModal(false)
            if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') handleEmpSave()
        }
        document.addEventListener('keydown', h)
        return () => document.removeEventListener('keydown', h)
    }, [showEmpModal, empForm, editId])

    const handleToggle = async (emp) => {
        try { await toggleEmployeeStatus(emp.id); loadEmployees() }
        catch (e) { alert(e.response?.data?.message || 'Xatolik') }
    }

    // ── Permissions modal ──
    const openPerms = async (emp) => {
        setPermLoading(true); setPermEmployee(emp); setExpanded({})
        try {
            const [empRes, groupRes] = await Promise.all([
                getEmployeeById(emp.id),
                getPermissionGroups()
            ])
            setAllGroups(groupRes.data || [])
            const granted = new Set()
            empRes.data?.permissionGroups?.forEach(g =>
                g.permissions?.forEach(p => granted.add(p.id))
            )
            setGrantedIds(granted)
        } catch (e) { console.error(e) }
        finally { setPermLoading(false) }
    }

    const togglePerm = async (permId) => {
        if (toggling.has(permId)) return
        setToggling(prev => new Set(prev).add(permId))
        try {
            if (grantedIds.has(permId)) {
                await revokePermission(permEmployee.id, permId)
                setGrantedIds(prev => { const s = new Set(prev); s.delete(permId); return s })
            } else {
                await grantPermission(permEmployee.id, { permissionId: permId })
                setGrantedIds(prev => new Set(prev).add(permId))
            }
        } catch (e) { alert(e.response?.data?.message || 'Xatolik') }
        finally { setToggling(prev => { const s = new Set(prev); s.delete(permId); return s }) }
    }

    // ── Permission group/perm CRUD ──
    const handleGroupSave = async () => {
        if (!groupForm.name.trim()) { setGroupError("Nomi kiritilishi shart"); return }
        setGroupSaving(true); setGroupError('')
        try {
            await createPermissionGroup(groupForm)
            setShowGroupModal(false); loadGroups()
        } catch (err) {
            setGroupError(err.response?.data?.message || 'Xatolik')
        } finally { setGroupSaving(false) }
    }

    const handlePermSave = async () => {
        if (!permForm.name.trim()) { setPermError("Nomi kiritilishi shart"); return }
        if (!permForm.groupId) { setPermError("Guruh tanlanishi shart"); return }
        setPermSaving(true); setPermError('')
        try {
            await createPermission({ ...permForm, groupId: Number(permForm.groupId) })
            setShowPermModal(false); loadGroups()
        } catch (err) {
            setPermError(err.response?.data?.message || 'Xatolik')
        } finally { setPermSaving(false) }
    }

    useEffect(() => {
        if (!showGroupModal) return
        const h = (e) => {
            if (e.key === 'Escape') setShowGroupModal(false)
            if (e.key === 'Enter') handleGroupSave()
        }
        document.addEventListener('keydown', h)
        return () => document.removeEventListener('keydown', h)
    }, [showGroupModal, groupForm])

    useEffect(() => {
        if (!showPermModal) return
        const h = (e) => {
            if (e.key === 'Escape') setShowPermModal(false)
            if (e.key === 'Enter') handlePermSave()
        }
        document.addEventListener('keydown', h)
        return () => document.removeEventListener('keydown', h)
    }, [showPermModal, permForm])

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <Users size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Xodimlar va Ruxsatlar</h1>
                        <p className="page-subtitle">Xodimlar va permission boshqaruvi</p>
                    </div>
                </div>
                {tab === 'employees' && hasPermission('EMPLOYEES_CREATE') && (
                    <button className="btn-add" onClick={openAdd}>
                        <Plus size={16} /> Xodim qo'shish
                    </button>
                )}
                {tab === 'permissions' && hasPermission('EMPLOYEES_PERMS') && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-add" style={{ background: 'var(--success)' }}
                                onClick={() => { setPermForm(EMPTY_PERM); setPermError(''); setShowPermModal(true) }}>
                            <Plus size={16} /> Permission
                        </button>
                        <button className="btn-add" onClick={() => { setGroupForm(EMPTY_GROUP); setGroupError(''); setShowGroupModal(true) }}>
                            <Plus size={16} /> Guruh
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {[
                    { key: 'employees', label: 'Xodimlar', icon: <Users size={15} /> },
                    { key: 'permissions', label: 'Permissionlar', icon: <Shield size={15} /> }
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 18px', borderRadius: 8, border: '1.5px solid',
                                cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: '0.2s',
                                borderColor: tab === t.key ? 'var(--primary)' : 'var(--border-color)',
                                background: tab === t.key ? 'var(--primary)' : 'var(--surface)',
                                color: tab === t.key ? '#fff' : 'var(--text-secondary)'
                            }}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {/* ── Employees Tab ── */}
            {tab === 'employees' && (
                <>
                    <div className="filter-bar">
                        <div className="filter-search-wrap">
                            <Search size={16} className="filter-search-icon" />
                            <input className="filter-search" placeholder="Ism yoki username..."
                                   value={empSearch} onChange={e => setEmpSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="table-card">
                        {empLoading ? (
                            <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
                        ) : filtered.length === 0 ? (
                            <div className="table-empty"><Users size={40} strokeWidth={1} /><p>Xodimlar yo'q</p></div>
                        ) : (
                            <div className="table-responsive">
                                <table className="ptable">
                                    <thead>
                                    <tr>
                                        <th className="th-num">#</th>
                                        <th>To'liq ism</th>
                                        <th>Username</th>
                                        <th>Telefon</th>
                                        <th>Rol</th>
                                        <th className="th-center">Holat</th>
                                        <th className="th-center">Amallar</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filtered.map((emp, i) => (
                                        <tr key={emp.id}>
                                            <td className="cell-num">{i + 1}</td>
                                            <td><div className="cell-name">{emp.fullName}</div></td>
                                            <td><span className="cell-barcode">{emp.username}</span></td>
                                            <td>{emp.phone ? <span className="cell-muted">{emp.phone}</span> : <span className="cell-muted">—</span>}</td>
                                            <td>
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                        background: 'var(--primary-light, rgba(37,99,235,0.1))',
                                                        color: 'var(--primary)'
                                                    }}>{emp.roleName || '—'}</span>
                                            </td>
                                            <td className="th-center">
                                                    <span className={`status-badge ${emp.isActive ? 'status-active' : 'status-inactive'}`}>
                                                        {emp.isActive ? 'Faol' : 'Noaktiv'}
                                                    </span>
                                            </td>
                                            <td>
                                                <div className="action-group">
                                                    <div className="desk-actions">
                                                        {hasPermission('EMPLOYEES_EDIT') && (
                                                            <button className="act-btn act-edit" title="Tahrirlash" onClick={() => openEdit(emp)}>
                                                                <Pencil size={14} />
                                                            </button>
                                                        )}
                                                        {hasPermission('EMPLOYEES_PERMS') && (
                                                            <button className="act-btn" title="Permissionlar"
                                                                    style={{ color: 'var(--info, #0891b2)' }}
                                                                    onClick={() => openPerms(emp)}>
                                                                <Key size={14} />
                                                            </button>
                                                        )}
                                                        {hasPermission('EMPLOYEES_EDIT') && (
                                                            <button className={`act-btn ${emp.isActive ? 'act-lock' : ''}`}
                                                                    title={emp.isActive ? 'Bloklash' : 'Faollashtirish'}
                                                                    onClick={() => handleToggle(emp)}>
                                                                {emp.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mob-actions">
                                                        <button className="act-btn act-more" onClick={(e) => {
                                                            if (openMenuId === emp.id) { setOpenMenuId(null); setMenuAnchor(null) }
                                                            else { setOpenMenuId(emp.id); setMenuAnchor(e.currentTarget) }
                                                        }}>
                                                            <MoreVertical size={15} />
                                                        </button>
                                                        {openMenuId === emp.id && (
                                                            <DropdownPortal anchorEl={menuAnchor} onClose={() => { setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                {hasPermission('EMPLOYEES_EDIT') && (
                                                                    <button className="act-btn act-edit" onClick={() => { openEdit(emp); setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                        <Pencil size={14} /> Tahrirlash
                                                                    </button>
                                                                )}
                                                                {hasPermission('EMPLOYEES_PERMS') && (
                                                                    <button className="act-btn" style={{ color: 'var(--info, #0891b2)' }}
                                                                            onClick={() => { openPerms(emp); setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                        <Key size={14} /> Permissionlar
                                                                    </button>
                                                                )}
                                                                {hasPermission('EMPLOYEES_EDIT') && (
                                                                    <button className={`act-btn ${emp.isActive ? 'act-lock' : ''}`}
                                                                            onClick={() => { handleToggle(emp); setOpenMenuId(null); setMenuAnchor(null) }}>
                                                                        {emp.isActive ? <Lock size={14} /> : <Unlock size={14} />}
                                                                        {emp.isActive ? 'Bloklash' : 'Faollashtirish'}
                                                                    </button>
                                                                )}
                                                            </DropdownPortal>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Permissions Tab ── */}
            {tab === 'permissions' && (
                <div className="table-card">
                    {groupsLoading ? (
                        <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
                    ) : groups.length === 0 ? (
                        <div className="table-empty"><Shield size={40} strokeWidth={1} /><p>Guruhlar yo'q</p></div>
                    ) : (
                        <div style={{ padding: '8px 0' }}>
                            {groups.map(g => (
                                <div key={g.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 20px', cursor: 'pointer',
                                        background: expanded[g.id] ? 'var(--surface-2, rgba(37,99,235,0.03))' : 'transparent'
                                    }} onClick={() => setExpanded(p => ({ ...p, [g.id]: !p[g.id] }))}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            {expanded[g.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            <span style={{ fontWeight: 700, fontSize: 14 }}>{g.labelUz || g.name}</span>
                                            <span style={{
                                                background: 'var(--primary)', color: '#fff',
                                                borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600
                                            }}>{g.permissions?.length || 0}</span>
                                        </div>
                                        <button className="act-btn act-delete" title="Guruhni o'chirish"
                                                onClick={async (e) => {
                                                    e.stopPropagation()
                                                    if (!confirm(`"${g.labelUz || g.name}" guruhini o'chirishni tasdiqlaysizmi?`)) return
                                                    try { await deletePermissionGroup(g.id); loadGroups() }
                                                    catch (err) { alert(err.response?.data?.message || 'Xatolik') }
                                                }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                    {expanded[g.id] && (
                                        <div style={{ padding: '0 20px 12px 44px' }}>
                                            {g.permissions?.length === 0 ? (
                                                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Permission yo'q</p>
                                            ) : (
                                                <table className="ptable" style={{ marginBottom: 0 }}>
                                                    <thead>
                                                    <tr>
                                                        <th>Nomi</th>
                                                        <th>Label (UZ)</th>
                                                        <th className="th-center">Turi</th>
                                                        <th className="th-center">Amal</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {g.permissions.map(p => (
                                                        <tr key={p.id}>
                                                            <td><span className="cell-barcode">{p.name}</span></td>
                                                            <td>{p.labelUz || '—'}</td>
                                                            <td className="th-center">
                                                                    <span style={{
                                                                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                                                        background: p.type === 'PAGE' ? 'rgba(37,99,235,0.1)' : 'rgba(22,163,74,0.1)',
                                                                        color: p.type === 'PAGE' ? 'var(--primary)' : 'var(--success)'
                                                                    }}>{p.type}</span>
                                                            </td>
                                                            <td className="th-center">
                                                                <button className="act-btn act-delete" title="O'chirish"
                                                                        onClick={async () => {
                                                                            if (!confirm(`"${p.labelUz || p.name}" ni o'chirishni tasdiqlaysizmi?`)) return
                                                                            try { await deletePermission(p.id); loadGroups() }
                                                                            catch (err) { alert(err.response?.data?.message || 'Xatolik') }
                                                                        }}>
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Employee Add/Edit Modal ── */}
            {showEmpModal && (
                <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Users size={20} />
                                <div>
                                    <h6 className="modal-title">{editId ? 'Xodimni tahrirlash' : "Xodim qo'shish"}</h6>
                                    <p className="modal-subtitle">Ma'lumotlarni kiriting</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowEmpModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {empError && <div className="form-error"><AlertCircle size={16} />{empError}</div>}
                            <div className="form-row">
                                <div className="form-group flex-2">
                                    <label className="form-label">To'liq ism <span className="required">*</span></label>
                                    <input className="form-input" value={empForm.fullName}
                                           onChange={e => setEmpForm(f => ({ ...f, fullName: e.target.value }))}
                                           placeholder="Ism familiya" autoFocus />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Telefon</label>
                                    <input className="form-input" value={empForm.phone}
                                           onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))}
                                           placeholder="+998..." />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label className="form-label">Username <span className="required">*</span></label>
                                    <input className="form-input" value={empForm.username}
                                           onChange={e => setEmpForm(f => ({ ...f, username: e.target.value }))}
                                           placeholder="login" />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Parol {!editId && <span className="required">*</span>}</label>
                                    <input className="form-input" type="password" value={empForm.password}
                                           onChange={e => setEmpForm(f => ({ ...f, password: e.target.value }))}
                                           placeholder={editId ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Kamida 6 ta belgi"} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rol <span className="required">*</span></label>
                                <select className="form-select" value={empForm.roleId}
                                        onChange={e => setEmpForm(f => ({ ...f, roleId: e.target.value }))}>
                                    <option value="">— Rol tanlang —</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowEmpModal(false)}>Bekor qilish</button>
                            <button className="btn-save" onClick={handleEmpSave} disabled={empSaving}>
                                {empSaving ? <><Loader2 size={14} className="spin" /> Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Employee Permissions Modal ── */}
            {permEmployee && (
                <div className="modal-overlay" onClick={() => setPermEmployee(null)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Key size={20} />
                                <div>
                                    <h6 className="modal-title">{permEmployee.fullName} — Permissionlar</h6>
                                    <p className="modal-subtitle">Ruxsatlarni bering yoki oling</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setPermEmployee(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: 0 }}>
                            {permLoading ? (
                                <div className="table-loading"><Loader2 size={24} className="spin" /></div>
                            ) : allGroups.length === 0 ? (
                                <div className="table-empty"><Shield size={36} strokeWidth={1} /><p>Permission guruhlar yo'q</p></div>
                            ) : (
                                <div>
                                    {allGroups.map(g => (
                                        <div key={g.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{
                                                padding: '10px 20px', fontWeight: 700, fontSize: 13,
                                                color: 'var(--text-secondary)', textTransform: 'uppercase',
                                                letterSpacing: '0.5px', background: 'var(--surface-2, rgba(0,0,0,0.02))'
                                            }}>{g.labelUz || g.name}</div>
                                            <div style={{ padding: '8px 20px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {g.permissions?.map(p => {
                                                    const granted = grantedIds.has(p.id)
                                                    const loading = toggling.has(p.id)
                                                    return (
                                                        <button key={p.id} onClick={() => togglePerm(p.id)} disabled={loading}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: 6,
                                                                    padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                                    cursor: loading ? 'wait' : 'pointer', transition: '0.2s',
                                                                    border: '1.5px solid',
                                                                    borderColor: granted ? 'var(--success)' : 'var(--border-color)',
                                                                    background: granted ? 'rgba(22,163,74,0.1)' : 'var(--surface)',
                                                                    color: granted ? 'var(--success)' : 'var(--text-muted)'
                                                                }}>
                                                            {loading ? <Loader2 size={12} className="spin" /> :
                                                                granted ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                                                            {p.labelUz || p.name}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Permission Group Modal ── */}
            {showGroupModal && (
                <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Shield size={20} />
                                <div>
                                    <h6 className="modal-title">Guruh qo'shish</h6>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowGroupModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {groupError && <div className="form-error"><AlertCircle size={16} />{groupError}</div>}
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Nomi (kod) <span className="required">*</span></label>
                                <input className="form-input" value={groupForm.name}
                                       onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                                       placeholder="PRODUCTS" autoFocus />
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label className="form-label">Label (UZ)</label>
                                    <input className="form-input" value={groupForm.labelUz}
                                           onChange={e => setGroupForm(f => ({ ...f, labelUz: e.target.value }))}
                                           placeholder="Mahsulotlar" />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Label (EN)</label>
                                    <input className="form-input" value={groupForm.labelEn}
                                           onChange={e => setGroupForm(f => ({ ...f, labelEn: e.target.value }))}
                                           placeholder="Products" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowGroupModal(false)}>Bekor qilish</button>
                            <button className="btn-save" onClick={handleGroupSave} disabled={groupSaving}>
                                {groupSaving ? <><Loader2 size={14} className="spin" /> Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Permission Modal ── */}
            {showPermModal && (
                <div className="modal-overlay" onClick={() => setShowPermModal(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <ShieldCheck size={20} />
                                <div>
                                    <h6 className="modal-title">Permission qo'shish</h6>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowPermModal(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {permError && <div className="form-error"><AlertCircle size={16} />{permError}</div>}
                            <div className="form-row">
                                <div className="form-group flex-2">
                                    <label className="form-label">Nomi (kod) <span className="required">*</span></label>
                                    <input className="form-input" value={permForm.name}
                                           onChange={e => setPermForm(f => ({ ...f, name: e.target.value }))}
                                           placeholder="PRODUCTS_VIEW" autoFocus />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Turi</label>
                                    <select className="form-select" value={permForm.type}
                                            onChange={e => setPermForm(f => ({ ...f, type: e.target.value }))}>
                                        <option value="PAGE">PAGE</option>
                                        <option value="ACTION">ACTION</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Guruh <span className="required">*</span></label>
                                <select className="form-select" value={permForm.groupId}
                                        onChange={e => setPermForm(f => ({ ...f, groupId: e.target.value }))}>
                                    <option value="">— Guruh tanlang —</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.labelUz || g.name}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label className="form-label">Label (UZ)</label>
                                    <input className="form-input" value={permForm.labelUz}
                                           onChange={e => setPermForm(f => ({ ...f, labelUz: e.target.value }))}
                                           placeholder="Ko'rish" />
                                </div>
                                <div className="form-group flex-1">
                                    <label className="form-label">Label (EN)</label>
                                    <input className="form-input" value={permForm.labelEn}
                                           onChange={e => setPermForm(f => ({ ...f, labelEn: e.target.value }))}
                                           placeholder="View" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowPermModal(false)}>Bekor qilish</button>
                            <button className="btn-save" onClick={handlePermSave} disabled={permSaving}>
                                {permSaving ? <><Loader2 size={14} className="spin" /> Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}