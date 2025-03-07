import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { check, validationResult } from "express-validator";
import verifyToken from "../middleware/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import pool from "../database/db";

import nodemailer from "nodemailer";
import "dotenv/config";

const router = express.Router();

const usergmail = process.env.EMAIL_USER;
const pswgmail = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: "gmail", // o el servicio de correo que uses
  auth: {
    user: usergmail,
    pass: pswgmail,
  },
});

router.get(
  "/me",
  verifyToken,
  async (req: Request, res: Response): Promise<void> => {
    
    const token =
      req.cookies.auth_token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as {
      role: string;
      email:string;
      userid: number;
    };

    try {
      const client = await pool.connect();
      const userQuery = `
        SELECT idUsuario AS userId, 'user' AS role, nombre, apellido, email, NULL AS idEmpresa FROM usuario WHERE email = $1
        `;
      const userResult = await client.query(userQuery, [decoded.email]);

      client.release();

      if (userResult.rows.length === 0) {
        res.status(400).json({ message: "User not found" });
        return;
      }

      const user = userResult.rows[0];
      
      res.json({...user, role: decoded.role});
      
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Something went wrong" });
    }
  }
);

router.post(
  "/register",
  [
    check("firstName", "First Name is required").isString(),
    check("lastName", "Last Name is required").isString(),
    check("email", "Email is required").isEmail(),
    check("password", "Password with 6 or more characters required").isLength({
      min: 6,
    }),
  ],
  async (req: Request, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    try {
      const client = await pool.connect();

      // Verificar si el usuario ya existe
      const checkUserQuery = "SELECT * FROM Usuario WHERE email = $1";
      const checkUserResult = await client.query(checkUserQuery, [email]);

      if (checkUserResult.rows.length > 0) {
        client.release();
        return res.status(400).json({ message: "Usuario existente!" });
      }

      if (email === usergmail) {
        client.release();
        return res.status(400).json({ message: "Email no permitido" });
      }

      // Encriptar la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insertar el nuevo usuario
      const insertUserQuery = `
        INSERT INTO Usuario (nombre, apellido, email, password)
        VALUES ($1, $2, $3, $4)
        RETURNING idUsuario
      `;
      const insertUserResult = await client.query(insertUserQuery, [
        firstName,
        lastName,
        email,
        hashedPassword, // Considerar el hash de la contraseña antes de almacenarla,
      ]);

      const userId = insertUserResult.rows[0].idUsuario;
      client.release();
      // Generar y enviar el token
      /* const token = jwt.sign({ userId }, process.env.JWT_SECRET_KEY as string, {
        expiresIn: "1d",
      });

      res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 86400000,
      }); */

      try {
        const mailOptions = {
          from: usergmail,
          to: email, // También puedes enviar una copia al admin del sistema
          subject: `Registro exitoso`,
          html: `
            <h2>¡Bienvenido a Workio!</h2>
            <p>Se ha creado tu nueva cuenta con éxito.</p>
            <p>${firstName} para nosotros es un gusto que te aventures en una nueva forma de trabajar.</p>

          `,
        };

        await transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(error);
      }

      return res.status(200).send({ message: "User registered OK" });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "Something went wrong" });
    }
  }
);

router.post(
  "/registeradmin",
  [
    check("nombre", "Name is required").isString(),
    check("nit", "NIT is required").isString(),
    check("direccion", "direccion is required").isString(),
    check("telefono", "telefono is required").isString(),
    check("email", "Email is required").isEmail(),
  ],
  async (req: Request, res: Response): Promise<any> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array() });
    }

    const { nombre, nit, telefono, email, direccion } = req.body;
    const generatedPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    try {
      const mailOptions = {
        from: usergmail,
        to: usergmail, // También puedes enviar una copia al admin del sistema
        subject: `Solicitud registro de empresa: ${nombre}`,
        html: `
          <h2>Solicitud Exitosa!</h2>
          <p>Se ha creado una nueva solicitud de registro de empresa con éxito.</p>
          <ul>
            <li><strong>Nombre:</strong> ${nombre}</li>
            <li><strong>NIT:</strong> ${nit}</li>
            <li><strong>Dirección:</strong> ${direccion}</li>
            <li><strong>Teléfono:</strong> ${telefono}</li>
            <li><strong>Email:</strong> ${email}</li>
          </ul>
        `,
      };

      await transporter.sendMail(mailOptions);

      const client = await pool.connect();

      // Formatear dirección
      const direccionParts = direccion.split("#");
      const tipoViaPrincipal = direccionParts[0].split(" ")[0].trim();
      const viaPrincipal = direccionParts[0].split(" ")[1].trim();
      const viaSecundaria = direccionParts.length > 0 ? direccionParts[1].split("-")[0].trim() : "";
      const complemento = direccionParts.length > 0 ? direccionParts[1].split("-")[1].trim() : "";

      // Insertar dirección
      const direccionQuery = `
        INSERT INTO Direccion (tipo_via_principal, via_principal, via_secundaria, complemento)
        VALUES ($1, $2, $3, $4)
        RETURNING idDireccion
      `;
      const direccionResult = await client.query(direccionQuery, [
        tipoViaPrincipal,
        viaPrincipal, 
        viaSecundaria, 
        complemento
      ]);
      const idDireccion = direccionResult.rows[0].iddireccion;

      // Insertar empresa
      const empresaQuery = `
        INSERT INTO empresa (nombre, nit, idDireccion, telefono, email)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING idempresa
      `;
      const empresaResult = await client.query(empresaQuery, [
        nombre,
        nit,
        idDireccion,
        telefono,
        email,
      ]);
      const idEmpresa = empresaResult.rows[0].idempresa;

      // Insertar usuario administrador
      const userAdminQuery = `
        INSERT INTO usuario_admin (idEmpresa, email, password)
        VALUES ($1, $2, $3)
        RETURNING idAdmin
      `;
      const userAdminResult = await client.query(userAdminQuery, [
        idEmpresa,
        email,
        hashedPassword,
      ]);
      const userAdminId = userAdminResult.rows[0].idAdmin;

      client.release();

      res.status(201).json({ message: "Admin register", userAdminId });
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "Something went wrong" });
    }
  }
);

router.put(
  "/update/:email",
  verifyToken,
  [
    check("firstName", "First Name is required").optional().isString(),
    check("lastName", "Last Name is required").optional().isString(),
    check("email", "Email is required").isEmail(),
    check("newPassword", "Password must be at least 6 characters long")
      .optional()
      .isLength({ min: 6 }),
  ],
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { email } = req.params;
      const { firstName, lastName, password } = req.body;

      // Verificar si el usuario existe
      const userExist = await pool.query(
        "SELECT * FROM Usuario WHERE email = $1",
        [email]
      );
      if (userExist.rows.length === 0) {
        return res.status(404).send({ message: "User not found" });
      }

      // Construir la consulta SQL dinámicamente
      let query = "UPDATE Usuario SET ";
      const values: any[] = [];
      let index = 1;

      if (firstName) {
        query += `nombre = $${index}, `;
        values.push(firstName);
        index++;
      }

      if (lastName) {
        query += `apellido = $${index}, `;
        values.push(lastName);
        index++;
      }

      if (password) {
        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        query += `password = $${index}, `;
        values.push(hashedPassword);
        index++;
      }

      // Eliminar la última coma y espacio
      query = query.slice(0, -2);

      
      // Agregar la condición WHERE
      query += ` WHERE email = $${index} RETURNING *`;
      values.push(email);

      

      // Ejecutar la consulta
      const updatedUser = await pool.query(query, values);

      res.json(updatedUser.rows[0]);
    } catch (error) {
      console.log("Error al actualizar el usuario:", error);
      res.status(500).send({ message: "Error al actualizar el usuario" });
    }
  }
);

router.delete('/delete/me', verifyToken, async (req: Request, res: Response) =>{
    try {
      const token = req.cookies.auth_token || req.headers.authorization?.split(" ")[1];
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string) as {
        userId: string;
      };
  
      const idUsuario = parseInt(decoded.userId);
  
      const query = `DELETE FROM usuario where idusuario = $1 RETURNING *`;

      await pool.query(query, [idUsuario]);
  
      res.clearCookie("auth_token", { sameSite: "none", secure: true });
      res.status(200).json({ message: "Cuenta eliminada correctamente" });
    } catch (error) {
      console.error("error: ", error);
    }
});

export default router;
