import { useState } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useApi';
import { Card, Btn, Modal, FormGroup, Loading } from '../components/ui';
import type { SystemUser } from '../types';

type UserForm = { username: string; password: string; full_name: string; role: string; active: number };
const empty: UserForm = { username: '', password: '', full_name: '', role: 'user', active: 1 };

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser  = useCreateUser();
  const updateUser  = useUpdateUser();
  const deleteUser  = useDeleteUser();

  const [open, setOpen]   = useState(false);
  const [editing, setEdit] = useState<SystemUser | null>(null);
  const [form, setForm]    = useState<UserForm>(empty);

  const openNew = () => { setEdit(null); setForm(empty); setOpen(true); };
  const openEdit = (u: SystemUser) => {
    setEdit(u);
    setForm({ username: u.username, password: '', full_name: u.full_name, role: u.role, active: u.active ? 1 : 0 });
    setOpen(true);
  };

  const handleSave = async () => {
    if (editing) {
      await updateUser.mutateAsync({ id: editing.id, data: form });
    } else {
      await createUser.mutateAsync({ ...form, active: undefined } as any);
    }
    setOpen(false);
  };

  const handleDelete = async (u: SystemUser) => {
    if (!confirm(`هل تريد حذف المستخدم "${u.username}"؟`)) return;
    deleteUser.mutate(u.id);
  };

  const F = (k: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>👥 إدارة المستخدمين</h1>
        <Btn variant="primary" onClick={openNew}>➕ مستخدم جديد</Btn>
      </div>

      <Card noPad>
        {isLoading ? <Loading /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: 'var(--steel)', color: '#fff' }}>
                <tr>
                  {['#','المستخدم','الاسم الكامل','الصلاحية','الحالة','تاريخ الإنشاء','إجراء'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', fontWeight: 600, fontSize: 11.5, textAlign: 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{u.id}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>{u.username}</td>
                    <td style={{ padding: '10px 14px' }}>{u.full_name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
                        background: u.role === 'admin' ? 'rgba(192,57,43,.1)' : 'rgba(26,82,118,.1)',
                        color: u.role === 'admin' ? 'var(--red)' : 'var(--blue)',
                      }}>{u.role === 'admin' ? '🔑 مدير' : '👤 مستخدم'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: u.active ? 'rgba(30,132,73,.1)' : 'rgba(127,140,141,.1)',
                        color: u.active ? 'var(--green)' : 'var(--muted)',
                      }}>{u.active ? '✅ مفعّل' : '⛔ موقوف'}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12 }}>{u.created_at?.split('T')[0]}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn size="sm" onClick={() => openEdit(u)}>تعديل</Btn>
                        <Btn size="sm" variant="danger" onClick={() => handleDelete(u)}>🗑</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `✏️ تعديل: ${editing.username}` : '➕ مستخدم جديد'}
        footer={
          <>
            <Btn variant="outline" onClick={() => setOpen(false)}>إلغاء</Btn>
            <Btn variant="primary" onClick={handleSave}
              disabled={createUser.isPending || updateUser.isPending}>
              {createUser.isPending || updateUser.isPending ? '⏳...' : '💾 حفظ'}
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormGroup label="اسم المستخدم" required>
            <input className="fc" value={form.username} onChange={F('username')} readOnly={!!editing} />
          </FormGroup>
          <FormGroup label={editing ? 'كلمة المرور الجديدة' : 'كلمة المرور'} required={!editing}>
            <input className="fc" type="password" value={form.password} onChange={F('password')}
              placeholder={editing ? 'اتركها فارغة لعدم التغيير' : ''} />
          </FormGroup>
          <FormGroup label="الاسم الكامل" required>
            <input className="fc" value={form.full_name} onChange={F('full_name')} style={{ gridColumn: 'span 2' }} />
          </FormGroup>
          <FormGroup label="الصلاحية">
            <select className="fc" value={form.role} onChange={F('role')}>
              <option value="user">مستخدم عادي</option>
              <option value="admin">مدير</option>
            </select>
          </FormGroup>
          <FormGroup label="الحالة">
            <select className="fc" value={form.active} onChange={F('active')}>
              <option value={1}>مفعّل</option>
              <option value={0}>موقوف</option>
            </select>
          </FormGroup>
        </div>
      </Modal>
    </div>
  );
}
