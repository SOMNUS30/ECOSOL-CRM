import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { UsuarioSistema, RolUsuario } from '../../types/database';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  X, 
  Mail, 
  Clock, 
  User,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Loader2
} from 'lucide-react';

export const UsuariosModule: React.FC = () => {
  const { usuarios, guardarUsuario, eliminarUsuario } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioSistema | null>(null);

  // Form fields
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [rol, setRol] = useState<RolUsuario>('Asesor de Ventas');
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');
  const [telefono, setTelefono] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered users
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u => {
      if (selectedRole !== 'ALL' && u.rol !== selectedRole) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = u.nombre.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      return true;
    });
  }, [usuarios, selectedRole, searchTerm]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Formato no válido', { description: 'Seleccione una imagen PNG, JPG o WEBP.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagen demasiado pesada', { description: 'El tamaño máximo recomendado es de 2 MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatar(compressed);
          toast.success('Foto de perfil cargada');
        } else {
          setAvatar(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setNombre('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setAvatar('');
    setRol('Asesor de Ventas');
    setEstado('Activo');
    setTelefono('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UsuarioSistema) => {
    setEditingUser(user);
    setNombre(user.nombre);
    setEmail(user.email);
    setPassword(user.password || '');
    setShowPassword(false);
    setAvatar(user.avatar || '');
    setRol(user.rol);
    setEstado(user.estado);
    setTelefono(user.telefono || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    if (!editingUser && !password.trim()) {
      toast.error('Ingrese una contraseña para el nuevo usuario');
      return;
    }

    setIsSaving(true);
    try {
      const userToSave: UsuarioSistema = {
        id: editingUser ? editingUser.id : `usr-${Date.now()}`,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || editingUser?.password || '123456',
        rol,
        estado,
        telefono: telefono.trim() || undefined,
        ultimo_acceso: editingUser ? editingUser.ultimo_acceso : 'Nunca',
        avatar: avatar.trim() || editingUser?.avatar || undefined
      };

      await guardarUsuario(userToSave);
      toast.success(editingUser ? 'Usuario actualizado en la nube' : 'Nuevo usuario guardado en Supabase');
      setIsModalOpen(false);
    } catch {
      toast.error('Error al guardar usuario en la base de datos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (confirm(`¿Está seguro de eliminar el acceso para ${nombre}?`)) {
      await eliminarUsuario(id);
      toast.info(`Usuario ${nombre} eliminado del sistema`);
    }
  };

  const getRoleBadge = (r: RolUsuario) => {
    switch (r) {
      case 'Administrador':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Administrador
          </span>
        );
      case 'Cobranzas / Caja':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Cobranzas / Caja
          </span>
        );
      case 'Asesor de Ventas':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
            Asesor de Ventas
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Gestión de Usuarios &amp; Permisos
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {usuarios.length} usuarios
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Control de cuentas de colaboradores y roles de acceso (RBAC)
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1 text-purple-700 font-semibold text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrador</span>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            Control total: finanzas, auditoría, usuarios, caja y aprobación de contratos.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1 text-emerald-700 font-semibold text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Cobranzas / Caja</span>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            Registro de abonos, control de cuotas vencidas, vouchers bancarios y caja chica.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1 text-sky-700 font-semibold text-xs">
            <User className="w-3.5 h-3.5" />
            <span>Asesor de Ventas</span>
          </div>
          <p className="text-xs text-slate-500 leading-normal">
            Consulta de disponibilidad de lotes, prospectos y contratos asignados.
          </p>
        </div>
      </div>

      {/* Search and Role Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 shadow-xs">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o correo institucional..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
        </div>

        <div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="ALL">Todos los Roles ({usuarios.length})</option>
            <option value="Administrador">Administradores</option>
            <option value="Cobranzas / Caja">Cobranzas / Caja</option>
            <option value="Asesor de Ventas">Asesores de Ventas</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-medium border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Correo Institucional</th>
                <th className="px-4 py-3">Rol de Acceso</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Último Acceso</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-medium text-slate-700">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-slate-900 block">
                          {u.nombre}
                        </span>
                        <span className="text-[10px] text-slate-400">ID: {u.id}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{u.email}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    {getRoleBadge(u.rol)}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {u.telefono || '—'}
                  </td>

                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    {u.estado === 'Activo' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <XCircle className="w-3 h-3" />
                        Inactivo
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center text-slate-500 text-[11px] whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{u.ultimo_acceso}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        title="Editar rol y permisos"
                        className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.nombre)}
                        title="Eliminar usuario"
                        className="p-1.5 rounded-md text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar Usuario */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>{editingUser ? 'Editar Colaborador' : 'Registrar Colaborador'}</span>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* Profile Photo / Avatar Upload */}
              <div className="flex items-center gap-3.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="relative group w-14 h-14 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                  {avatar ? (
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Cambiar foto de perfil"
                    className="absolute inset-0 bg-slate-900/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-xs">Foto del Colaborador</span>
                    {avatar && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">Cargada</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    PNG, JPG o WEBP (máx. 2MB)
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-medium text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Camera className="w-3 h-3 text-slate-500" />
                      <span>{avatar ? 'Cambiar foto' : 'Subir foto'}</span>
                    </button>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => setAvatar('')}
                        className="px-2 py-1 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Lic. Martín Vizcarra R."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Correo Electrónico (Login) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@ecosol.pe"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Password field with show/hide toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-medium text-[11px]">
                    Contraseña de Acceso {!editingUser && <span className="text-rose-500">*</span>}
                  </label>
                  {editingUser && (
                    <span className="text-[10px] text-slate-400">
                      (Dejar en blanco para conservar actual)
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? '••••••••' : 'Ej: Ecosol2026!'}
                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required={!editingUser}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                    Rol en el Sistema
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as RolUsuario)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Cobranzas / Caja">Cobranzas / Caja</option>
                    <option value="Asesor de Ventas">Asesor de Ventas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                    Estado de la Cuenta
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as 'Activo' | 'Inactivo')}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-medium text-[11px]">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 987654321"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingUser ? 'Guardar Cambios' : 'Registrar Colaborador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
