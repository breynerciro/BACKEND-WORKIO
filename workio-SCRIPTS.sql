CREATE TABLE IF NOT EXISTS Usuario (
	idUsuario bigSerial NOT NULL,
	nombre varchar(50) NOT NULL,
	apellido varchar(50) NOT NULL,
	email varchar(100) NOT NULL,
	password varchar(100) NOT NULL,
	PRIMARY KEY (idUsuario),
	CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TABLE IF NOT EXISTS usuario_admin (
	idAdmin bigserial PRIMARY KEY,
	idEmpresa bigint not null,
	email varchar (50) not null,
	password varchar(100) not null,
	CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
	active boolean not null default false
)

CREATE TABLE IF NOT EXISTS empresa (
    idempresa bigserial NOT NULL,
    nombre character varying(50) NOT NULL,
	nit character varying(15) NOT NULL,
    idDireccion int NOT NULL,
	telefono character varying(10) NOT NULL,
    email character varying(100) NOT NULL,
    last_updated timestamp with time zone NOT NULL DEFAULT now(),
	active boolean NOT NULL DEFAULT false,
    CONSTRAINT empresa_pkey PRIMARY KEY (idempresa),
    CONSTRAINT email_format CHECK (email::text ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text),
    CONSTRAINT len_telefono CHECK (telefono::text ~ '^[0-9]{10}$'::text)
)

CREATE TABLE IF NOT EXISTS Direccion (
	idDireccion serial NOT NULL UNIQUE,
	tipo_via_principal varchar(25) NOT NULL,
	via_principal varchar(50) NOT NULL,
	via_secundaria varchar(25) NOT NULL,
	complemento varchar(50) NOT NULL,
	PRIMARY KEY (idDireccion)
);


CREATE TABLE IF NOT EXISTS Reserva (
	idReserva serial NOT NULL UNIQUE,
	idUsuario bigint NOT NULL,
	idEmpresa bigint NOT NULL,
	idSede int NOT NULL,
	fecha_inicio timestamp NOT NULL,
	fecha_fin timestamp NOT NULL,
	precio float NOT NULL,
	tipo VARCHAR(10) NOT NULL DEFAULT 'days'
	PRIMARY KEY (idReserva)
);

CREATE TABLE IF NOT EXISTS Sede_facilidad (
	idFacilidad int NOT NULL,
	idEmpresa bigint NOT NULL,
	idSede int NOT NULL,
	disponibilidad boolean NOT NULL,
	detalle varchar(250),
	last_update timestamp NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Facilidad (
	idFacilidad serial NOT NULL UNIQUE,
	nombre varchar(50) NOT NULL,
	tipo varchar(50) NOT NULL,
	descripcion varchar(250) NOT NULL,
	PRIMARY KEY (idFacilidad)
);

CREATE TABLE IF NOT EXISTS PasswordResetCodes (
  id SERIAL PRIMARY KEY,              -- Identificador único para cada registro
  userId INT NOT NULL,                -- ID del usuario asociado al código
  code INT NOT NULL,                  -- Código de 6 dígitos
  expires TIMESTAMP NOT NULL,         -- Fecha y hora de expiración del código
  createdAt TIMESTAMP DEFAULT NOW(),  -- Fecha y hora de creación del registro
  FOREIGN KEY (userId) REFERENCES Usuario(idUsuario) ON DELETE CASCADE
);

create table sede1 (
	idSede bigSERIAL PRIMARY KEY,
	idEmpresa INT NOT NULL,
	idDireccion int NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(255) NOT NULL,
    price_per_day NUMERIC(10, 2) NOT NULL,
    starRating INT NOT NULL,
    facilities JSONB NOT NULL,
    asistentes INT NOT NULL,
    visitantes INT NOT NULL,
    image_urls JSONB,
	FOREIGN KEY (idEmpresa) REFERENCES Empresa(idEmpresa) ON DELETE CASCADE,
	FOREIGN KEY (idDireccion) REFERENCES Direccion(idDireccion) ON DELETE CASCADE
);



ALTER TABLE Sede ADD CONSTRAINT Sede_fk1 FOREIGN KEY (idEmpresa) REFERENCES Empresa(idEmpresa);
ALTER TABLE Sede ADD CONSTRAINT Sede_fk2 FOREIGN KEY (idDireccion) REFERENCES Direccion(idDireccion);

ALTER TABLE Reserva ADD CONSTRAINT Reserva_fk1 FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario);
ALTER TABLE Reserva ADD CONSTRAINT Reserva_fk2 FOREIGN KEY (idEmpresa) REFERENCES Empresa(idEmpresa);
ALTER TABLE Reserva ADD CONSTRAINT Reserva_fk3 FOREIGN KEY (idSede) REFERENCES Sede1(idSede);

ALTER TABLE Sede_facilidad ADD CONSTRAINT Sede_facilidad_fk0 FOREIGN KEY (idFacilidad) REFERENCES Facilidad(idFacilidad);
ALTER TABLE Sede_facilidad ADD CONSTRAINT Sede_facilidad_fk1 FOREIGN KEY (idEmpresa) REFERENCES Empresa(idEmpresa);
ALTER TABLE Sede_facilidad ADD CONSTRAINT Sede_facilidad_fk2 FOREIGN KEY (idSede) REFERENCES Sede1(idSede);

ALTER TABLE usuario_admin ADD CONSTRAINT Usuario_admin_fk0 FOREIGN KEY (idEmpresa) REFERENCES Empresa(idEmpresa);

