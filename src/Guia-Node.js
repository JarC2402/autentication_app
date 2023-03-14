// PASOS PARA CREAR UNA APP EN NODE JS.

/*  
1.- abre cdm y crea la carpeta y la base de dato:
    - cd Carpeta donde quieres crear la app.
    - npx create-node-sequelize nombre del proyecto
    - psql -U postgres
    - clave: root
    - create database nombre_db;
    - exit
    - code .
2.- ingresa en code y crea un archivo .env. Instala los paquetes que usaras
    - DATABASE_URL=postgres://postgres:root@127.0.0.1:5432/<nombre_db>
    - abre la terminal e instala: npm i bcrypt, npm i nodemailer    y   npm i jsonwebtoken
3.- crea el modelo controladores y rutas necesarias.
    - crea las carpetas: models, controllers.
    - dentro del archivo models:
    { // User.js
        const { DataTypes } = require('sequelize');
        const sequelize = require('../utils/connection');
        
        const User = sequelize.define('user', {
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            },
            firstName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            lastName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            country: {
                type: DataTypes.STRING,
                allowNull: false
            },
            image: {
                type: DataTypes.STRING,
                allowNull: false
            },
            isVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
        });
        // esto es para hacer que no retorne la contraseña:
        User.prototype.toJSON = function () {
            const values = Object.assign({}, this.get());
            delete values.password;
            return values;
        } // puedes usar el snipet: nopassword
        
        
        
        module.exports = User;
    }
    {// EnaulCode
        // este model en este caso solo se usara para confirmar el correo

const { DataTypes } = require('sequelize');
const sequelize = require('../utils/connection');

const EmailCode = sequelize.define('emailCode', {
    code: {
        type: DataTypes.STRING,
        allowNull: false
    },
});

module.exports = EmailCode;
    }
    - dentro del archivo user.controolers.js:
    {
        const catchError = require('../utils/catchError');
        const User = require('../models/User');
        const bcrypt = require('bcrypt'); // esto lo importas luego de instalar el npm i bycrypt.. lo usaras para encriptar la contraseña
        const sendEmail = require('../utils/sendEmail');// esto se importa para hacer q te lleguen los email de confirmacion
        const EmailCode = require('../models/EmailCode');
        const jwt = require('jsonwebtoken');
        
        const getAll = catchError(async(req, res) => {
            const results = await User.findAll();
            return res.json(results);
        });
        
        const create = catchError(async(req, res) => {
            const { email, password, firstName, lastName, country, image, frontBaseUrl } = req.body; // desestructuras los parametros que estan en el model
            const escripted = await bcrypt.hash(password, 10); // aca creas una contante cualquiera y usas wait bcrypt.hash por regla (entre los parentesis colocas lo q quieres encriptar como password y colocas el nivel del encriptacion ej: 10 ) 
            const result = await User.create({email, password: escripted, firstName, lastName, country, image}); // aca colocas todo lo desestruturado y a la contraseña le agregas la constante que creaste arriba
            // con la siguiente logica generas un codigo (codigo para verificar los correos):
            const code = require('crypto').randomBytes(32).toString('hex');
            const link = `${frontBaseUrl}/verify_email/${code}` // para verificar un correo te va a llegar un email como si tu email fuese el de la empresa. y para esto debes agregar en el archivo .env el email y la contraseña
            //ademas en la caprta de utils debes crear un archivo sendEmail.js y pegar el codigo de notion (en un futuro debes crear snipets para esto) luego usars este codigo aca abajo:
            await sendEmail ({
                to: email, // aca le envias el correo al usuario
                subject: "user app email verification", // creo que esto es el asunto q le llegara al usuario
                // aca colocaras todo el html
                html: ` 
                    <h1>Hello ${firstName}</h1>
                    <p>We're almost done</p>
                    <p>go to the following link to verify your email</p>
                    <a href="${link}">${link}</a>
                `
            })
            //este codigo es para que al crear un usuario se genere un registro en la columna emailCode con el codigo enviado y con el id de usuario creado
        //primero creo el await luego uso el metodo de sequelize create, desestructuro (code, userId) code es del codigo q se creo con el usuario arriba y userId le doy el valor de usuario donde tome el codigo (que es el usuario que se creo arriba)
        await EmailCode.create({ code, userId: result.id});
            return res.status(201).json(result);
        });
        
        
        const getOne = catchError(async(req, res) => {
            const { id } = req.params;
            const result = await User.findByPk(id);
            if(!result) return res.sendStatus(404);
            return res.json(result);
        });
        
        const remove = catchError(async(req, res) => {
            const { id } = req.params;
            await User.destroy({ where: {id} });
            return res.sendStatus(204);
        });
        
        const update = catchError(async(req, res) => {
            const { firstName, lastName, country, image } = req.body; // aca desectructuras todo menos la contraseña e imail para q no se puedan modificar
            const { id } = req.params;
            const result = await User.update(
                { firstName, lastName, country, image }, // lo pegas aca para sustituyendo lo antes habia q era la info q substrae del body
                { where: {id}, returning: true }
            );
            if(result[0] === 0) return res.sendStatus(404);
            return res.json(result[1][0]);
        });
        
        // este codigo es para crear el endpoint. recibe el codigo de los parametros y lo compara con el modelo email code al encontrar coincidencia cambiar la propiedad de User isVerified: true. por ultimo elimina el codigo de EmailCode para que no vuelva a usarse el mismo
        const verifyEmail = catchError(async(req, res) => {
            //asi traes el codigo que se creo con el usuario (parametros)
            const { code } = req.params;
            // asi comparas con codigo de EmailCode... con el where especificas exactamente donde quieres que busque
            const emailCode = await EmailCode.findOne ({ where: {code}});
            //asi toma una desicion si coindicen los codigos y cambia a el isVerify a true si es la condicion se cumple
            if(!emailCode) return res.status(401).json({message: "Invalid Code"});
            //con esta logica actualizas la propiedad isVerified a true si paso el anterior filtro
            await User.update({ isVerified: true }, { where: { id: emailCode.userId } });
            // una vez usada la anterior informacion se debe destruir el codigo asi:
            await emailCode.destroy(); //cuando usas la variable no es necesario usar el where pero cuando usas un modelo si ej. "User"
            return res.json(emailCode)
        });
        
        //endpoint/users/login.. debe validar que el usuario este verificado.... debe generar un token...debe retornar el usuario encontrado y el token
        const login = catchError(async(req, res) => {
            //aca desestructuras la info del body - front
            const {email, password} = req.body;
            //buscar si el usuario esta registrado
            const user = await User.findOne({ where: { email } });
            if (!user) return res.status(401).json({ message: "invalid credentials" })
            //buscar si el usuario esta registrado
            if (!user.isVerified) return res.status(401).json({message: 'invalid credentials'})
            // como confirmar si la contraseña es la correcta.. 
            const isValid = await bcrypt.compare(password, user.password) // password solo es la contraseña son encriptar y user.password es la encryptada (para eso usas bcrypt para comparar estas 2)
            if (!isValid) return res.status(401).json({message: "invalid credentials"})
            // para generar un token : primero importa en archivo controllers : const jwt = require('jsonwebtoken')
            const token = jwt.sign({ user }, process.env.TOKEN_SECRET, { expiresIn: "1d" })  // con user seleccionar el usuario y con process.env.token_secret pasas el codigo encriptado q se genero
            return res.json({user, token}) // para poder retornar varias cosas debes colocarla entre {}
        })
        //crear un endpont protegido. users/me para traer el usuario loggeado y proteger los endpoints 
        const getLoogedUser = catchError(async(req, res) => {
            // para traer el usuario loggeado usas req.user
            return res.json(req.user);
        }) // al terminar aca recuerda importar el verifyJWT en user.route para q funcione esto 
        
        
        module.exports = {
            getAll,
            create,
            getOne,
            remove,
            update,
            verifyEmail,
            login,
            getLoogedUser
        }
    }
    -dentro del archivo user.router.js:
    {
        const { getAll, create, getOne, remove, update, verifyEmail, login, getLoogedUser } = require('../controllers/user.controolers');
        const express = require('express');
        const verifyJWT = require('../utils/verifyJWT')
        
        const userRouter = express.Router();
        
        userRouter.route('/')
            .get(verifyJWT, getAll)
            .post(create);
        
        userRouter.route('/verify/:code')
            .get(verifyEmail);
        
        userRouter.route('/login')
            .post(login)
        
        userRouter.route('/me')
            .get(verifyJWT, getLoogedUser) // siempre q necesite el token debes colocar el verifyJWT
            
        userRouter.route('/:id')
            .get(verifyJWT, getOne)
            .delete(verifyJWT, remove)
            .put(verifyJWT, update);
        
        module.exports = userRouter;
    }
4.- agrega a la carpta index:
    {
        const express = require('express');
        const router = express.Router();
        const userRouter = require('./user.router')
        
        // colocar las rutas aquí
        
        router.use('/users', userRouter) // aca escribes router.use y (aca va 'la ruta que se usara', aca la variable que create en user.rout.js ) de esta maneras haces que los dos archivos se entiendan jeje;
            
        module.exports = router;
}
5.- Para relacionar tablas "models" res recomendable crear un archivo index.js en la carpeta models. Ojo recuerda que debes importarlo en el archivo server despues de crearlo asi: require('./models')
    {
    // primero importas los modelos que asociaras

const User = require('./User')
const EmailCode = require('./EmailCode')


// con esto haces la asociacion 1 a 1:
EmailCode.belongsTo(User);
User.hasOne(EmailCode);
    }
6.- Por si hay un error de sincronizacion. este normalmente aparece en postman dice algo asi como la propiedad tal no existe:
    debes ingresar en la carpeta server y en la linea 8-9 pegar= sequelize.sync({ alter: true }) . Si no funciona, sequelize.sync({ force: true })  y borrarlo
7-. Autenticacion:
    -ingresa al cmd ingresa: node ... para inicializarlo
    -para generar codigo pega: require('crypto').randomBytes(64).toString('hex')
    -luego en archivo .env del proyecto pega TOKEN_SECRET= codigoGenerado
    -Crear un middleware para poder verificar los tokens. Para esto, podemos crear un archivo llamado verifyJWT.js en la carpeta utils, que contenga lo siguiente:
        {
    const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);
    const token = authHeader.split(' ')[1]; 
    jwt.verify(
        token,
        process.env.TOKEN_SECRET,
        (err, decoded) => {
            if (err) return res.sendStatus(403);
            req.user = decoded.user;
            next();
        }
    )
}

module.exports = verifyJWT;
        }
   - crear el endpoint/users/login.. debe validar que el usuario este verificado.... debe generar un token...debe retornar el usuario encontrado y el token
        { // este endpoint va en el archivo user.controllers
            const login = catchError(async(req, res) => {
                //aca desestructuras la info del body - front
                const {email, password} = req.body;
                //buscar si el usuario esta registrado
                const user = await User.findOne({ where: { email } });
                if (!user) return res.status(401).json({ message: "invalid credentials" })
                //buscar si el usuario esta registrado
                if (!user.isVerified) return res.status(401).json({message: 'invalid credentials'})
                // como confirmar si la contraseña es la correcta.. 
                const isValid = await bcrypt.compare(password, user.password) // password solo es la contraseña son encriptar y user.password es la encryptada (para eso usas bcrypt para comparar estas 2)
                if (!isValid) return res.status(401).json({message: "invalid credentials"})
                // para generar un token : primero importa en archivo controllers : const jwt = require('jsonwebtoken')
                const token = jwt.sign({ user }, process.env.TOKEN_SECRET, { expiresIn: "1d" })  // con user seleccionar el usuario y con process.env.token_secret pasas el codigo encriptado q se genero
                return res.json({user, token}) // para poder retornar varias cosas debes colocarla entre {}
            })
        }
    - crear un endpont protegido. users/me para traer el usuario loggeado y proteger los endpoints 
  */