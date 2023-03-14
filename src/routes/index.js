const express = require('express');
const router = express.Router();
const userRouter = require('./user.router')

// colocar las rutas aquí

router.use('/users', userRouter) // aca escribes router.use y (aca va 'la ruta que se usara', aca la variable que create en user.rout.js ) de esta maneras haces que los dos archivos se entiendan jeje;
    
module.exports = router;