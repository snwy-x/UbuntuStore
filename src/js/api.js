// cliente api para conectar con el servidor express
const API_BASE = window.location.origin + '/api';

function jsonPost(url, data) {
    return fetch(API_BASE + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json());
}


function jsonPut(url, data) {
    return fetch(API_BASE + url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(r => r.json());
}


function jsonGet(url, params = {}) {
    const filtered = {};
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') filtered[k] = v;
    }
    const qs = new URLSearchParams(filtered).toString();
    return fetch(API_BASE + url + (qs ? '?' + qs : '')).then(r => r.json());
}


function jsonDelete(url) {
    return fetch(API_BASE + url, { method: 'DELETE' }).then(r => r.json());
}



window.api = {
    // autenticacion
    login: (credentials) => jsonPost('/auth/login', credentials),
    register: (user) => jsonPost('/auth/register', user),

    // panel de control
    getStats: () => jsonGet('/dashboard/stats'),

    // inventario
    getProducts: (filters = {}) => jsonGet('/inventory', filters),
    createProduct: (product) => jsonPost('/inventory', product),
    updateProduct: (product) => jsonPut('/inventory', product),
    deleteProduct: (id) => jsonDelete(`/inventory/${id}`),
    getLowStock: () => jsonGet('/inventory/low-stock'),

    // categorias
    getCategories: () => jsonGet('/categories'),
    createCategory: (cat) => jsonPost('/categories', cat),

    // ventas
    createSale: (sale) => jsonPost('/sales', sale),
    getSales: (filters = {}) => jsonGet('/sales', filters),
    getSaleDetail: (id) => jsonGet(`/sales/${id}/detail`),

    // clientes
    getClients: () => jsonGet('/clients'),
    createClient: (client) => jsonPost('/clients', client),
    updateClient: (client) => jsonPut('/clients', client),
    deleteClient: (id) => jsonDelete(`/clients/${id}`),
    getClientHistory: (id) => jsonGet(`/clients/${id}/history`),

    // soporte tecnico y taller
    getServiceOrders: (filters = {}) => jsonGet('/workshop', filters),
    createServiceOrder: (order) => jsonPost('/workshop', order),
    updateServiceOrder: (order) => jsonPut('/workshop', order),

    // proveedores
    getSuppliers: () => jsonGet('/suppliers'),
    createSupplier: (supplier) => jsonPost('/suppliers', supplier),
    updateSupplier: (supplier) => jsonPut('/suppliers', supplier),
    deleteSupplier: (id) => jsonDelete(`/suppliers/${id}`),

    // compras a proveedores
    createPurchase: (purchase) => jsonPost('/purchases', purchase),
    getPurchases: () => jsonGet('/purchases'),

    // cuentas por pagar
    getPayables: () => jsonGet('/payables'),
    payPayable: (data) => jsonPost('/payables/pay', data),

    // reportes de caja
    getCashMovements: (dates) => jsonGet('/cash/movements', dates),

    // cotizador de ensambles
    saveQuotation: (quotation) => jsonPost('/quoter', quotation),
    getQuotations: () => jsonGet('/quoter'),
    getQuotationDetail: (id) => jsonGet(`/quoter/${id}/detail`),

    //usuarios
    getUsers: () => jsonGet('/users'),
    createUser: (user) => jsonPost('/users', user),
    updateUser: (user) => jsonPut('/users', user),
    toggleUserActive: (data) => jsonPut('/users/toggle-active', data),
    getRoles: () => jsonGet('/roles'),

    // auditoria
    getAuditLog: (filters = {}) => jsonGet('/audit', filters),
    logAudit: (data) => jsonPost('/audit', data)
};
