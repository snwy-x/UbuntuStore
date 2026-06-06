-- Datos semilla para la base de datos de UbuntuStore

-- Roles de usuarios
INSERT INTO Roles (nombre) VALUES ('Administrador') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Roles (nombre) VALUES ('Vendedor') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Roles (nombre) VALUES ('Cliente') ON CONFLICT (nombre) DO NOTHING;

-- Usuario administrador por defecto (Contraseña: admin123)
INSERT INTO Usuarios (nombre_completo, usuario, password_hash, rol_id)
VALUES ('Admin', 'admin', '$2a$10$ts57OmCoZmct/khSkxBWZeMHwxPJVL21s.gKl2FjnfMDngO.V/KtW', 1)
ON CONFLICT (usuario) DO NOTHING;

-- Categorías por defecto del inventario
INSERT INTO Categorias (nombre, descripcion) VALUES ('Laptops', 'Computadoras portátiles de todas las marcas') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Categorias (nombre, descripcion) VALUES ('Componentes', 'Componentes internos: CPU, RAM, GPU, SSD, etc.') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Categorias (nombre, descripcion) VALUES ('Periféricos', 'Teclados, mouse, monitores, audífonos') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Categorias (nombre, descripcion) VALUES ('Software', 'Licencias de software y sistemas operativos') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Categorias (nombre, descripcion) VALUES ('Accesorios', 'Cables, adaptadores, fundas, mochilas') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Categorias (nombre, descripcion) VALUES ('Redes', 'Routers, switches, cables de red, access points') ON CONFLICT (nombre) DO NOTHING;
INSERT INTO Categorias (nombre, descripcion) VALUES ('Impresoras', 'Impresoras, escáneres y consumibles') ON CONFLICT (nombre) DO NOTHING;
