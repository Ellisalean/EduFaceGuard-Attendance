import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { User, UserRole } from '../types';
import { Trash2, Search, User as UserIcon, ShieldAlert, Edit2, X, Check, Database } from 'lucide-react';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  
  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  const ADMIN_PIN = '1234';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setUsers(StorageService.getUsers());
  };

  const handleDelete = (userId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar a este usuario? Esta acción borrará sus datos faciales y no se puede deshacer.')) {
      StorageService.deleteUser(userId);
      loadUsers();
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditForm({ ...user });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser && editForm.fullName && editForm.courseOrDept && editForm.role) {
      const updatedUser: User = {
        ...editingUser,
        fullName: editForm.fullName,
        role: editForm.role as UserRole,
        courseOrDept: editForm.courseOrDept
      };
      StorageService.updateUser(updatedUser);
      loadUsers();
      setEditingUser(null);
    }
  };
  
  const handleFactoryReset = () => {
    const confirmText = "BORRAR TODO";
    const input = window.prompt(`¡PELIGRO! Esto borrará TODOS los usuarios, fotos y registros de asistencia.\n\nPara confirmar, escriba "${confirmText}":`);
    
    if (input === confirmText) {
      StorageService.clearData();
      alert("Sistema reseteado correctamente.");
      window.location.reload(); // Reload to clear state
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) setIsAuthenticated(true);
    else alert('PIN Incorrecto');
  };

  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(filter.toLowerCase()) ||
    user.id.toLowerCase().includes(filter.toLowerCase()) ||
    user.courseOrDept.toLowerCase().includes(filter.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acceso Administrativo</h2>
          <p className="text-gray-500 mb-6">Ingrese el PIN para gestionar usuarios.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full p-3 border rounded-lg text-center text-2xl tracking-widest"
              placeholder="••••"
              maxLength={4}
            />
            <button
              type="submit"
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Desbloquear
            </button>
            <p className="text-xs text-gray-400 mt-4">Pista: '1234' para demo.</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 relative">
      {/* Header with Search and Danger Zone */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
           <p className="text-gray-500 text-sm mt-1">Total registrados: {users.length}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
            />
            </div>
            
            <button 
                onClick={handleFactoryReset}
                className="bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center hover:bg-red-200 transition border border-red-200 whitespace-nowrap"
                title="Borrar base de datos local"
            >
                <Database size={16} className="mr-2" /> Reset Total
            </button>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-500">No se encontraron usuarios.</p>
          <p className="text-gray-400 mt-2">Vaya a "Registro" para agregar personas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col">
              
              <div className="p-6 flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {user.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.fullName} 
                      className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-50"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 ring-4 ring-gray-50">
                      <UserIcon size={32} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{user.fullName}</h3>
                  <p className="text-sm text-brand-600 font-medium mb-1">{user.role}</p>
                  <p className="text-xs text-gray-500 flex items-center">
                    <span className="font-semibold mr-1">ID:</span> {user.id}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                     <span className="font-semibold mr-1">Curso:</span> {user.courseOrDept}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end items-center space-x-3 mt-auto">
                 <button
                   onClick={() => handleEditClick(user)}
                   className="text-brand-600 hover:text-brand-800 hover:bg-brand-50 p-2 rounded-lg transition flex items-center text-sm font-medium"
                   title="Editar Usuario"
                 >
                   <Edit2 size={16} className="mr-1" /> Editar
                 </button>
                 <button
                   onClick={() => handleDelete(user.id)}
                   className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition flex items-center text-sm font-medium"
                   title="Eliminar Usuario"
                 >
                   <Trash2 size={16} className="mr-1" /> Eliminar
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-bounce-in">
            <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold flex items-center">
                <Edit2 className="mr-2" size={20} /> Editar Usuario
              </h3>
              <button onClick={() => setEditingUser(null)} className="hover:bg-brand-700 p-1 rounded">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div className="flex items-center space-x-4 mb-4">
                 {editingUser.profileImage ? (
                    <img src={editingUser.profileImage} className="w-16 h-16 rounded-full object-cover border-2 border-brand-200" alt="Preview"/>
                 ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center"><UserIcon /></div>
                 )}
                 <div>
                   <p className="text-sm text-gray-500">ID (No editable)</p>
                   <p className="font-mono font-bold text-gray-800">{editingUser.id}</p>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                  value={editForm.fullName || ''}
                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    >
                      <option value={UserRole.STUDENT}>Estudiante</option>
                      <option value={UserRole.TEACHER}>Profesor</option>
                      <option value={UserRole.STAFF}>Personal</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Curso / Dept</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                      value={editForm.courseOrDept || ''}
                      onChange={(e) => setEditForm({...editForm, courseOrDept: e.target.value})}
                    />
                 </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center"
                >
                  <Check size={18} className="mr-2" /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;