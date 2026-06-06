require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query, getClient, closeConnection } = require('./database/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de Express
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src')));

// Rutas de la API de UbuntuStore

// Autenticación de usuarios
app.post('/api/auth/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        const result = await query(
            `SELECT u.id, u.nombre_completo, u.usuario, u.password_hash, u.activo, 
               r.nombre as rol FROM Usuarios u 
               INNER JOIN Roles r ON u.rol_id = r.id 
               WHERE u.usuario = $1`, [usuario]);

        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        if (!user.activo) {
            return res.json({ success: false, message: 'Usuario desactivado. Contacte al administrador.' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.json({ success: false, message: 'Contraseña incorrecta' });
        }

        // Registrar en la auditoría
        await query(
            `INSERT INTO AuditoriaMovimientos (usuario_id, accion, tabla_afectada, registro_id, detalle) 
               VALUES ($1, $2, $3, $4, $5)`,
            [user.id, 'LOGIN', 'Usuarios', user.id, `Inicio de sesión: ${user.usuario}`]);

        res.json({
            success: true,
            user: { id: user.id, nombre: user.nombre_completo, usuario: user.usuario, rol: user.rol }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.json({ success: false, message: 'Error de conexión con la base de datos: ' + err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombre_completo, usuario, password } = req.body;
        if (!nombre_completo || !usuario || !password) {
            return res.json({ success: false, message: 'Complete todos los campos obligatorios' });
        }

        // Verificamos si el usuario ya está registrado
        const checkUser = await query('SELECT id FROM Usuarios WHERE usuario = $1', [usuario]);
        if (checkUser.rows.length > 0) {
            return res.json({ success: false, message: 'El nombre de usuario ya está registrado' });
        }

        // Obtenemos el ID del rol de Cliente
        const roleRes = await query("SELECT id FROM Roles WHERE nombre = 'Cliente'");
        let rolId = roleRes.rows.length > 0 ? roleRes.rows[0].id : null;
        if (!rolId) {
            const fallback = await query("SELECT id FROM Roles LIMIT 1");
            if (fallback.rows.length > 0) {
                rolId = fallback.rows[0].id;
            } else {
                return res.json({ success: false, message: 'No hay roles configurados en la base de datos' });
            }
        }

        // Encriptar la contraseña con Bcrypt
        const hash = await bcrypt.hash(password, 10);

        // Insertamos el nuevo usuario
        const result = await query(
            `INSERT INTO Usuarios (nombre_completo, usuario, password_hash, rol_id) 
               VALUES ($1, $2, $3, $4) RETURNING id`,
            [nombre_completo, usuario, hash, rolId]);

        const newUserId = result.rows[0].id;

        // Registrar en la auditoría
        await query(
            `INSERT INTO AuditoriaMovimientos (usuario_id, accion, tabla_afectada, registro_id, detalle) 
               VALUES ($1, $2, $3, $4, $5)`,
            [newUserId, 'CREAR', 'Usuarios', newUserId, `Registro público de usuario: ${usuario}`]);

        res.json({ success: true, message: 'Usuario registrado con éxito' });
    } catch (err) {
        console.error('Registration error:', err);
        res.json({ success: false, message: 'Error al registrar usuario: ' + err.message });
    }
});

// Inventario de productos
app.get('/api/inventory', async (req, res) => {
    try {
        let q = `SELECT p.*, c.nombre as categoria_nombre, pr.nombre as proveedor_nombre 
                 FROM Productos p 
                 LEFT JOIN Categorias c ON p.categoria_id = c.id 
                 LEFT JOIN Proveedores pr ON p.proveedor_id = pr.id 
                 WHERE p.activo = true`;
        const params = [];
        let paramIndex = 1;

        if (req.query.categoria_id) {
            q += ` AND p.categoria_id = $${paramIndex++}`;
            params.push(req.query.categoria_id);
        }
        if (req.query.search) {
            q += ` AND (p.nombre ILIKE $${paramIndex} OR p.codigo ILIKE $${paramIndex})`;
            params.push(`%${req.query.search}%`);
            paramIndex++;
        }
        if (req.query.lowStock === 'true') {
            q += ' AND p.stock_actual <= p.stock_minimo';
        }

        q += ' ORDER BY p.nombre';
        const result = await query(q, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/inventory', async (req, res) => {
    try {
        const p = req.body;
        const result = await query(
            `INSERT INTO Productos (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_actual, stock_minimo, proveedor_id, garantia_meses) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
            [p.codigo, p.nombre, p.descripcion || '', p.categoria_id, p.precio_compra || 0,
             p.precio_venta, p.stock_actual || 0, p.stock_minimo || 5, p.proveedor_id || null, p.garantia_meses || 0]);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/inventory', async (req, res) => {
    try {
        const p = req.body;
        await query(
            `UPDATE Productos SET codigo=$1, nombre=$2, descripcion=$3, 
               categoria_id=$4, precio_compra=$5, precio_venta=$6, 
               stock_actual=$7, stock_minimo=$8, proveedor_id=$9, 
               garantia_meses=$10 WHERE id=$11`,
            [p.codigo, p.nombre, p.descripcion || '', p.categoria_id, p.precio_compra || 0,
             p.precio_venta, p.stock_actual, p.stock_minimo || 5, p.proveedor_id || null,
             p.garantia_meses || 0, p.id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.delete('/api/inventory/:id', async (req, res) => {
    try {
        await query('UPDATE Productos SET activo = false WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/inventory/low-stock', async (req, res) => {
    try {
        const result = await query(
            `SELECT p.*, c.nombre as categoria_nombre FROM Productos p 
               LEFT JOIN Categorias c ON p.categoria_id = c.id 
               WHERE p.activo = true AND p.stock_actual <= p.stock_minimo 
               ORDER BY p.stock_actual ASC`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Categorías de productos
app.get('/api/categories', async (req, res) => {
    try {
        const result = await query('SELECT * FROM Categorias ORDER BY nombre');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const result = await query(
            'INSERT INTO Categorias (nombre, descripcion) VALUES ($1, $2) RETURNING id',
            [req.body.nombre, req.body.descripcion || '']);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Procesamiento de ventas (Punto de Venta)
app.post('/api/sales', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const saleData = req.body;

        // Generamos el folio único de la venta
        const folioResult = await client.query(
            "SELECT 'V-' || LPAD(CAST(COALESCE(MAX(id), 0) + 1 AS TEXT), 6, '0') as folio FROM Ventas");
        const folio = folioResult.rows[0].folio;

        // Registramos el encabezado de la venta
        const saleResult = await client.query(
            `INSERT INTO Ventas (folio, cliente_id, usuario_id, subtotal, impuesto, total, metodo_pago) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, folio`,
            [folio, saleData.cliente_id || null, saleData.usuario_id, saleData.subtotal,
             saleData.impuesto, saleData.total, saleData.metodo_pago || 'Efectivo']);

        const ventaId = saleResult.rows[0].id;

        // Registramos los detalles de la venta y actualizamos el stock
        for (const item of saleData.items) {
            await client.query(
                `INSERT INTO DetalleVenta (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
                   VALUES ($1, $2, $3, $4, $5)`,
                [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.subtotal]);

            await client.query(
                'UPDATE Productos SET stock_actual = stock_actual - $1 WHERE id = $2',
                [item.cantidad, item.producto_id]);
        }

        // Registramos el movimiento de dinero en caja
        await client.query(
            `INSERT INTO MovimientosCaja (tipo, concepto, monto, referencia_id, referencia_tipo, usuario_id) 
                VALUES ($1, $2, $3, $4, $5, $6)`,
            ['Ingreso', `Venta ${folio}`, saleData.total, ventaId, 'Venta', saleData.usuario_id]);

        await client.query('COMMIT');
        res.json({ success: true, folio: folio, ventaId: ventaId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/sales', async (req, res) => {
    try {
        let q = `SELECT v.*, u.nombre_completo as vendedor, c.nombre as cliente_nombre 
                 FROM Ventas v 
                 LEFT JOIN Usuarios u ON v.usuario_id = u.id 
                 LEFT JOIN Clientes c ON v.cliente_id = c.id WHERE 1=1`;
        const params = [];
        let paramIndex = 1;

        if (req.query.fecha) {
            q += ` AND v.fecha::DATE = $${paramIndex++}`;
            params.push(req.query.fecha);
        }
        if (req.query.cliente_usuario) {
            q += ` AND c.nombre = (SELECT nombre_completo FROM Usuarios WHERE usuario = $${paramIndex++})`;
            params.push(req.query.cliente_usuario);
        }

        q += ' ORDER BY v.fecha DESC';
        const result = await query(q, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/sales/:id/detail', async (req, res) => {
    try {
        const result = await query(
            `SELECT dv.*, p.nombre as producto_nombre, p.codigo as producto_codigo 
               FROM DetalleVenta dv 
               INNER JOIN Productos p ON dv.producto_id = p.id 
               WHERE dv.venta_id = $1`, [req.params.id]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Control de Clientes
app.get('/api/clients', async (req, res) => {
    try {
        const result = await query('SELECT * FROM Clientes ORDER BY nombre');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const c = req.body;
        const result = await query(
            `INSERT INTO Clientes (nombre, telefono, email, direccion, notas) 
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [c.nombre, c.telefono || '', c.email || '', c.direccion || '', c.notas || '']);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/clients', async (req, res) => {
    try {
        const c = req.body;
        await query(
            `UPDATE Clientes SET nombre=$1, telefono=$2, email=$3, 
               direccion=$4, notas=$5 WHERE id=$6`,
            [c.nombre, c.telefono || '', c.email || '', c.direccion || '', c.notas || '', c.id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    try {
        await query('DELETE FROM Clientes WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/clients/:id/history', async (req, res) => {
    try {
        const clienteId = req.params.id;
        const ventas = await query(
            `SELECT v.*, u.nombre_completo as vendedor FROM Ventas v 
               LEFT JOIN Usuarios u ON v.usuario_id = u.id 
               WHERE v.cliente_id = $1 ORDER BY v.fecha DESC`, [clienteId]);
        const servicios = await query(
            `SELECT os.*, u.nombre_completo as tecnico_nombre FROM OrdenesServicio os 
               LEFT JOIN Usuarios u ON os.tecnico_id = u.id 
               WHERE os.cliente_id = $1 ORDER BY os.fecha_recepcion DESC`, [clienteId]);
        res.json({ success: true, ventas: ventas.rows, servicios: servicios.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Taller y Órdenes de Servicio
app.get('/api/workshop', async (req, res) => {
    try {
        let q = `SELECT os.*, c.nombre as cliente_nombre, u.nombre_completo as tecnico_nombre 
                 FROM OrdenesServicio os 
                 LEFT JOIN Clientes c ON os.cliente_id = c.id 
                 LEFT JOIN Usuarios u ON os.tecnico_id = u.id WHERE 1=1`;
        const params = [];
        let paramIndex = 1;

        if (req.query.estado) {
            q += ` AND os.estado = $${paramIndex++}`;
            params.push(req.query.estado);
        }
        if (req.query.cliente_usuario) {
            q += ` AND c.nombre = (SELECT nombre_completo FROM Usuarios WHERE usuario = $${paramIndex++})`;
            params.push(req.query.cliente_usuario);
        }

        q += ' ORDER BY os.fecha_recepcion DESC';
        const result = await query(q, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/workshop', async (req, res) => {
    try {
        const order = req.body;
        const folioResult = await query(
            "SELECT 'ST-' || LPAD(CAST(COALESCE(MAX(id), 0) + 1 AS TEXT), 6, '0') as folio FROM OrdenesServicio");
        const folio = folioResult.rows[0].folio;

        const result = await query(
            `INSERT INTO OrdenesServicio (folio, cliente_id, equipo_descripcion, falla_reportada, tecnico_id, notas) 
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, folio`,
            [folio, order.cliente_id || null, order.equipo_descripcion, order.falla_reportada,
             order.tecnico_id || null, order.notas || '']);
        res.json({ success: true, id: result.rows[0].id, folio: folio });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/workshop', async (req, res) => {
    try {
        const order = req.body;
        const updateFields = [];
        const params = [];
        let paramIndex = 1;

        if (order.estado !== undefined) { updateFields.push(`estado=$${paramIndex++}`); params.push(order.estado); }
        if (order.diagnostico !== undefined) { updateFields.push(`diagnostico=$${paramIndex++}`); params.push(order.diagnostico); }
        if (order.piezas_reemplazadas !== undefined) { updateFields.push(`piezas_reemplazadas=$${paramIndex++}`); params.push(order.piezas_reemplazadas); }
        if (order.costo_servicio !== undefined) { updateFields.push(`costo_servicio=$${paramIndex++}`); params.push(order.costo_servicio); }
        if (order.tecnico_id !== undefined) { updateFields.push(`tecnico_id=$${paramIndex++}`); params.push(order.tecnico_id); }
        if (order.notas !== undefined) { updateFields.push(`notas=$${paramIndex++}`); params.push(order.notas); }
        if (order.estado === 'Entregado') { updateFields.push('fecha_entrega=NOW()'); }

        if (updateFields.length > 0) {
            params.push(order.id);
            await query(`UPDATE OrdenesServicio SET ${updateFields.join(', ')} WHERE id=$${paramIndex}`, params);
        }
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Control de Proveedores
app.get('/api/suppliers', async (req, res) => {
    try {
        const result = await query('SELECT * FROM Proveedores WHERE activo = true ORDER BY nombre');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/suppliers', async (req, res) => {
    try {
        const s = req.body;
        const result = await query(
            `INSERT INTO Proveedores (nombre, contacto, telefono, email, direccion) 
               VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [s.nombre, s.contacto || '', s.telefono || '', s.email || '', s.direccion || '']);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/suppliers', async (req, res) => {
    try {
        const s = req.body;
        await query(
            `UPDATE Proveedores SET nombre=$1, contacto=$2, telefono=$3, 
               email=$4, direccion=$5 WHERE id=$6`,
            [s.nombre, s.contacto || '', s.telefono || '', s.email || '', s.direccion || '', s.id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        await query('UPDATE Proveedores SET activo = false WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Registro de Compras
app.post('/api/purchases', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const purchaseData = req.body;

        const folioResult = await client.query(
            "SELECT 'C-' || LPAD(CAST(COALESCE(MAX(id), 0) + 1 AS TEXT), 6, '0') as folio FROM ComprasProveedor");
        const folio = folioResult.rows[0].folio;

        const purchaseResult = await client.query(
            `INSERT INTO ComprasProveedor (folio, proveedor_id, total, estado, notas, usuario_id) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, folio`,
            [folio, purchaseData.proveedor_id, purchaseData.total, purchaseData.estado || 'Pendiente',
             purchaseData.notas || '', purchaseData.usuario_id]);

        const compraId = purchaseResult.rows[0].id;

        for (const item of purchaseData.items) {
            await client.query(
                `INSERT INTO DetalleCompra (compra_id, producto_id, cantidad, costo_unitario, subtotal) 
                   VALUES ($1, $2, $3, $4, $5)`,
                [compraId, item.producto_id, item.cantidad, item.costo_unitario, item.subtotal]);

            await client.query(
                'UPDATE Productos SET stock_actual = stock_actual + $1, precio_compra = $2 WHERE id = $3',
                [item.cantidad, item.costo_unitario, item.producto_id]);
        }

        // Generamos la cuenta por pagar
        await client.query(
            'INSERT INTO CuentasPorPagar (compra_id, monto) VALUES ($1, $2)',
            [compraId, purchaseData.total]);

        // Registramos el movimiento de dinero en caja
        await client.query(
            `INSERT INTO MovimientosCaja (tipo, concepto, monto, referencia_id, referencia_tipo, usuario_id) 
                VALUES ($1, $2, $3, $4, $5, $6)`,
            ['Egreso', `Compra ${folio}`, purchaseData.total, compraId, 'Compra', purchaseData.usuario_id]);

        await client.query('COMMIT');
        res.json({ success: true, folio: folio, compraId: compraId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/purchases', async (req, res) => {
    try {
        const result = await query(
            `SELECT cp.*, p.nombre as proveedor_nombre, u.nombre_completo as usuario_nombre 
               FROM ComprasProveedor cp 
               LEFT JOIN Proveedores p ON cp.proveedor_id = p.id 
               LEFT JOIN Usuarios u ON cp.usuario_id = u.id 
               ORDER BY cp.fecha DESC`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Control de Cuentas por Pagar
app.get('/api/payables', async (req, res) => {
    try {
        const result = await query(
            `SELECT cpp.*, cp.folio, p.nombre as proveedor_nombre 
               FROM CuentasPorPagar cpp 
               INNER JOIN ComprasProveedor cp ON cpp.compra_id = cp.id 
               INNER JOIN Proveedores p ON cp.proveedor_id = p.id 
               ORDER BY cpp.fecha_vencimiento`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/payables/pay', async (req, res) => {
    try {
        const { id, monto } = req.body;
        await query(
            `UPDATE CuentasPorPagar SET monto_pagado = monto_pagado + $1, 
               estado = CASE WHEN monto_pagado + $1 >= monto THEN 'Pagada' ELSE 'Parcial' END 
               WHERE id = $2`, [monto, id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Reportes de Caja (Ingresos vs Egresos)
app.get('/api/cash/movements', async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        const result = await query(
            `SELECT mc.*, u.nombre_completo as usuario_nombre 
               FROM MovimientosCaja mc 
               LEFT JOIN Usuarios u ON mc.usuario_id = u.id 
               WHERE mc.fecha::DATE BETWEEN $1 AND $2 
               ORDER BY mc.fecha DESC`, [fechaInicio, fechaFin]);

        const summary = await query(
            `SELECT 
                COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
                COALESCE(SUM(CASE WHEN tipo = 'Egreso' THEN monto ELSE 0 END), 0) as total_egresos,
                COALESCE(SUM(CASE WHEN tipo = 'Ingreso' THEN monto ELSE -monto END), 0) as utilidad
              FROM MovimientosCaja 
              WHERE fecha::DATE BETWEEN $1 AND $2`, [fechaInicio, fechaFin]);

        res.json({ success: true, data: result.rows, summary: summary.rows[0] });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Cotizador de Ensambles de PC
app.post('/api/quoter', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const quotation = req.body;

        const result = await client.query(
            `INSERT INTO CotizacionEnsamble (cliente_id, usuario_id, nombre_ensamble, total) 
                VALUES ($1, $2, $3, $4) RETURNING id`,
            [quotation.cliente_id || null, quotation.usuario_id,
             quotation.nombre_ensamble || 'Ensamble PC', quotation.total]);

        const cotizacionId = result.rows[0].id;

        for (const item of quotation.items) {
            await client.query(
                `INSERT INTO DetalleCotizacion (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal) 
                   VALUES ($1, $2, $3, $4, $5)`,
                [cotizacionId, item.producto_id, item.cantidad || 1, item.precio_unitario, item.subtotal]);
        }

        await client.query('COMMIT');
        res.json({ success: true, id: cotizacionId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

app.get('/api/quoter', async (req, res) => {
    try {
        const result = await query(
            `SELECT ce.*, c.nombre as cliente_nombre, u.nombre_completo as vendedor 
               FROM CotizacionEnsamble ce 
               LEFT JOIN Clientes c ON ce.cliente_id = c.id 
               LEFT JOIN Usuarios u ON ce.usuario_id = u.id 
               ORDER BY ce.fecha DESC`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/quoter/:id/detail', async (req, res) => {
    try {
        const result = await query(
            `SELECT dc.*, p.nombre as producto_nombre, p.codigo as producto_codigo 
               FROM DetalleCotizacion dc 
               INNER JOIN Productos p ON dc.producto_id = p.id 
               WHERE dc.cotizacion_id = $1`, [req.params.id]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Administración de Usuarios (Roles y accesos)
app.get('/api/users', async (req, res) => {
    try {
        const result = await query(
            `SELECT u.id, u.nombre_completo, u.usuario, u.activo, u.fecha_creacion, r.nombre as rol 
               FROM Usuarios u INNER JOIN Roles r ON u.rol_id = r.id ORDER BY u.nombre_completo`);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const user = req.body;
        const hash = await bcrypt.hash(user.password, 10);
        const result = await query(
            `INSERT INTO Usuarios (nombre_completo, usuario, password_hash, rol_id) 
               VALUES ($1, $2, $3, $4) RETURNING id`,
            [user.nombre_completo, user.usuario, hash, user.rol_id]);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/users', async (req, res) => {
    try {
        const user = req.body;
        let q = 'UPDATE Usuarios SET nombre_completo=$1, usuario=$2, rol_id=$3';
        const params = [user.nombre_completo, user.usuario, user.rol_id];
        let paramIndex = 4;

        if (user.password) {
            const hash = await bcrypt.hash(user.password, 10);
            q += `, password_hash=$${paramIndex++}`;
            params.push(hash);
        }

        q += ` WHERE id=$${paramIndex}`;
        params.push(user.id);
        await query(q, params);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.put('/api/users/toggle-active', async (req, res) => {
    try {
        const { id, activo } = req.body;
        await query('UPDATE Usuarios SET activo = $1 WHERE id = $2', [activo, id]);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/roles', async (req, res) => {
    try {
        const result = await query('SELECT * FROM Roles ORDER BY id');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Historial de Auditoría
app.get('/api/audit', async (req, res) => {
    try {
        let q = `SELECT a.*, u.nombre_completo as usuario_nombre 
                 FROM AuditoriaMovimientos a 
                 LEFT JOIN Usuarios u ON a.usuario_id = u.id WHERE 1=1`;
        const params = [];
        let paramIndex = 1;

        if (req.query.usuario_id) {
            q += ` AND a.usuario_id = $${paramIndex++}`;
            params.push(req.query.usuario_id);
        }
        if (req.query.fechaInicio) {
            q += ` AND a.fecha::DATE >= $${paramIndex++}`;
            params.push(req.query.fechaInicio);
        }
        if (req.query.fechaFin) {
            q += ` AND a.fecha::DATE <= $${paramIndex++}`;
            params.push(req.query.fechaFin);
        }

        q += ' ORDER BY a.fecha DESC';
        const result = await query(q, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/audit', async (req, res) => {
    try {
        const { usuario_id, accion, tabla_afectada, registro_id, detalle } = req.body;
        await query(
            `INSERT INTO AuditoriaMovimientos (usuario_id, accion, tabla_afectada, registro_id, detalle) 
               VALUES ($1, $2, $3, $4, $5)`,
            [usuario_id, accion, tabla_afectada, registro_id || null, detalle || '']);
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// Estadísticas del Panel de Control
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = {};

        const ventasHoy = await query(
            "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM Ventas WHERE fecha::DATE = $1", [today]);
        stats.ventasHoy = ventasHoy.rows[0];

        const productosTotal = await query(
            "SELECT COUNT(*) as total FROM Productos WHERE activo = true");
        stats.productos = productosTotal.rows[0].total;

        const lowStock = await query(
            "SELECT COUNT(*) as total FROM Productos WHERE activo = true AND stock_actual <= stock_minimo");
        stats.alertasStock = lowStock.rows[0].total;

        const ordenesActivas = await query(
            "SELECT COUNT(*) as total FROM OrdenesServicio WHERE estado NOT IN ('Entregado', 'Cancelado')");
        stats.ordenesActivas = ordenesActivas.rows[0].total;

        const clientesTotal = await query("SELECT COUNT(*) as total FROM Clientes");
        stats.clientes = clientesTotal.rows[0].total;

        res.json({ success: true, data: stats });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// API Pública de la Tienda
app.get('/api/public/products', async (req, res) => {
    try {
        let q = `SELECT p.id, p.codigo, p.nombre, p.descripcion, p.precio_venta, p.stock_actual, p.garantia_meses, c.nombre as categoria_nombre 
                 FROM Productos p 
                 LEFT JOIN Categorias c ON p.categoria_id = c.id 
                 WHERE p.activo = true`;
        const params = [];
        let paramIndex = 1;

        if (req.query.categoria_id) {
            q += ` AND p.categoria_id = $${paramIndex++}`;
            params.push(req.query.categoria_id);
        }
        if (req.query.search) {
            q += ` AND (p.nombre ILIKE $${paramIndex} OR p.codigo ILIKE $${paramIndex})`;
            params.push(`%${req.query.search}%`);
            paramIndex++;
        }

        q += ' ORDER BY p.nombre';
        const result = await query(q, params);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.get('/api/public/workshop/track/:folio', async (req, res) => {
    try {
        const result = await query(
            `SELECT os.folio, os.fecha_recepcion, os.equipo_descripcion, os.falla_reportada, 
                    os.diagnostico, os.piezas_reemplazadas, os.costo_servicio, os.estado, os.fecha_entrega, os.notas,
                    c.nombre as cliente_nombre
             FROM OrdenesServicio os
             LEFT JOIN Clientes c ON os.cliente_id = c.id
             WHERE os.folio = $1`, [req.params.folio]);

        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Orden de servicio no encontrada' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/api/sales/online', async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const checkoutData = req.body;

        // Buscamos o creamos al cliente en la base de datos
        let clienteId = null;
        if (checkoutData.cliente) {
            const checkClient = await client.query(
                "SELECT id FROM Clientes WHERE email = $1 OR nombre = $2", 
                [checkoutData.cliente.email, checkoutData.cliente.nombre]
            );
            if (checkClient.rows.length > 0) {
                clienteId = checkClient.rows[0].id;
            } else {
                const insertClient = await client.query(
                    `INSERT INTO Clientes (nombre, telefono, email, direccion) 
                     VALUES ($1, $2, $3, $4) RETURNING id`,
                    [checkoutData.cliente.nombre, checkoutData.cliente.telefono || '', 
                     checkoutData.cliente.email || '', checkoutData.cliente.direccion || '']
                );
                clienteId = insertClient.rows[0].id;
            }
        }

        // Calculamos los totales
        let subtotal = 0;
        for (const item of checkoutData.items) {
            subtotal += item.precio_unitario * item.cantidad;
        }
        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        // Generamos el folio de la venta web
        const folioResult = await client.query(
            "SELECT 'V-' || LPAD(CAST(COALESCE(MAX(id), 0) + 1 AS TEXT), 6, '0') as folio FROM Ventas");
        const folio = folioResult.rows[0].folio;

        const systemUserId = 1;

        // Insertamos la venta
        const saleResult = await client.query(
            `INSERT INTO Ventas (folio, cliente_id, usuario_id, subtotal, impuesto, total, metodo_pago, estado) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, folio`,
            [folio, clienteId, systemUserId, subtotal, tax, total, checkoutData.metodo_pago || 'Tarjeta', 'Web Completada']
        );
        const ventaId = saleResult.rows[0].id;

        // Insertamos los detalles de la venta y actualizamos existencias
        for (const item of checkoutData.items) {
            await client.query(
                `INSERT INTO DetalleVenta (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [ventaId, item.producto_id, item.cantidad, item.precio_unitario, item.precio_unitario * item.cantidad]
            );

            await client.query(
                'UPDATE Productos SET stock_actual = stock_actual - $1 WHERE id = $2',
                [item.cantidad, item.producto_id]
            );
        }

        // Registramos el movimiento de dinero en caja
        await client.query(
            `INSERT INTO MovimientosCaja (tipo, concepto, monto, referencia_id, referencia_tipo, usuario_id) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['Ingreso', `Venta Online ${folio}`, total, ventaId, 'Venta Web', systemUserId]
        );

        await client.query('COMMIT');
        res.json({ success: true, folio, ventaId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Online checkout error:', err);
        res.json({ success: false, message: err.message });
    } finally {
        client.release();
    }
});

// arrancar el servidor
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 UbuntuStore Server running at http://localhost:${PORT}`);
        console.log(`📦 Database: Supabase Cloud PostgreSQL`);
        console.log(`\n   Abre tu navegador en: http://localhost:${PORT}\n`);
    });
}

// apagar el servidor
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await closeConnection();
    process.exit(0);
});

module.exports = app;
