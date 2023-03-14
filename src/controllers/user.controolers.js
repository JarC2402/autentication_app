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