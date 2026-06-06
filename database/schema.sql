-- Estructura de la base de datos de UbuntuStore (PostgreSQL)

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS Roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS Usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT NOT NULL REFERENCES Roles(id),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS Categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS Proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(150),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS Productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    descripcion VARCHAR(500),
    categoria_id INT NOT NULL REFERENCES Categorias(id),
    precio_compra NUMERIC(12,2) DEFAULT 0,
    precio_venta NUMERIC(12,2) NOT NULL,
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    proveedor_id INT REFERENCES Proveedores(id),
    garantia_meses INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS Clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT NOW(),
    notas VARCHAR(500)
);

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS Ventas (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(20) NOT NULL UNIQUE,
    fecha TIMESTAMP DEFAULT NOW(),
    cliente_id INT REFERENCES Clientes(id),
    usuario_id INT NOT NULL REFERENCES Usuarios(id),
    subtotal NUMERIC(12,2) NOT NULL,
    impuesto NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'Efectivo',
    estado VARCHAR(20) DEFAULT 'Completada'
);

-- Tabla de Detalles de Ventas
CREATE TABLE IF NOT EXISTS DetalleVenta (
    id SERIAL PRIMARY KEY,
    venta_id INT NOT NULL REFERENCES Ventas(id),
    producto_id INT NOT NULL REFERENCES Productos(id),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Tabla de Órdenes de Servicio (Taller)
CREATE TABLE IF NOT EXISTS OrdenesServicio (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(20) NOT NULL UNIQUE,
    fecha_recepcion TIMESTAMP DEFAULT NOW(),
    cliente_id INT REFERENCES Clientes(id),
    equipo_descripcion VARCHAR(300) NOT NULL,
    falla_reportada VARCHAR(500) NOT NULL,
    tecnico_id INT REFERENCES Usuarios(id),
    diagnostico VARCHAR(500),
    piezas_reemplazadas VARCHAR(500),
    costo_servicio NUMERIC(12,2) DEFAULT 0,
    estado VARCHAR(30) DEFAULT 'Recibido',
    fecha_entrega TIMESTAMP,
    notas VARCHAR(1000)
);

-- Tabla de Compras a Proveedores
CREATE TABLE IF NOT EXISTS ComprasProveedor (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(20) NOT NULL UNIQUE,
    proveedor_id INT NOT NULL REFERENCES Proveedores(id),
    fecha TIMESTAMP DEFAULT NOW(),
    total NUMERIC(12,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    notas VARCHAR(500),
    usuario_id INT REFERENCES Usuarios(id)
);

-- Tabla de Detalles de Compras
CREATE TABLE IF NOT EXISTS DetalleCompra (
    id SERIAL PRIMARY KEY,
    compra_id INT NOT NULL REFERENCES ComprasProveedor(id),
    producto_id INT NOT NULL REFERENCES Productos(id),
    cantidad INT NOT NULL,
    costo_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Tabla de Cuentas por Pagar
CREATE TABLE IF NOT EXISTS CuentasPorPagar (
    id SERIAL PRIMARY KEY,
    compra_id INT NOT NULL REFERENCES ComprasProveedor(id),
    monto NUMERIC(12,2) NOT NULL,
    monto_pagado NUMERIC(12,2) DEFAULT 0,
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'Pendiente'
);

-- Tabla de Movimientos de Caja
CREATE TABLE IF NOT EXISTS MovimientosCaja (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT NOW(),
    tipo VARCHAR(20) NOT NULL, -- 'Ingreso' or 'Egreso'
    concepto VARCHAR(200) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    referencia_id INT,
    referencia_tipo VARCHAR(50),
    usuario_id INT NOT NULL REFERENCES Usuarios(id)
);

-- Tabla de Cotizaciones de Ensambles
CREATE TABLE IF NOT EXISTS CotizacionEnsamble (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT NOW(),
    cliente_id INT REFERENCES Clientes(id),
    usuario_id INT NOT NULL REFERENCES Usuarios(id),
    nombre_ensamble VARCHAR(200),
    total NUMERIC(12,2) NOT NULL
);

-- Tabla de Detalles de Cotizaciones
CREATE TABLE IF NOT EXISTS DetalleCotizacion (
    id SERIAL PRIMARY KEY,
    cotizacion_id INT NOT NULL REFERENCES CotizacionEnsamble(id),
    producto_id INT NOT NULL REFERENCES Productos(id),
    cantidad INT DEFAULT 1,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL
);

-- Tabla de Auditoría de Movimientos
CREATE TABLE IF NOT EXISTS AuditoriaMovimientos (
    id SERIAL PRIMARY KEY,
    fecha TIMESTAMP DEFAULT NOW(),
    usuario_id INT NOT NULL REFERENCES Usuarios(id),
    accion VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id INT,
    detalle VARCHAR(1000)
);
