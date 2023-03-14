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