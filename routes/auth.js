const express = require('express');
const { body } = require('express-validator');
const User = require('../models/user');
const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.put('/signup',
   [
      body('email').isEmail().withMessage('Please enter a valid Email.')
         // Custom valida que el usuario no exista aun, si existe retorna un Promise.reject() que se transforma en un error por lo q la validacion no pasa
         .custom((value, { req }) => {
            return User.findOne({ email: value }).then(userDoc => {
               if (userDoc) {
                  return Promise.reject('Email address already taken.');
               }
            })
         }).normalizeEmail(),
      body('password').trim().isLength({ min: 5 }),
      body('name').trim().notEmpty()
   ],
   authController.signup);

router.post('/login', authController.login);

router.get('/status', isAuth, authController.getUserStatus);

router.patch('/status', isAuth,
   [
      body('status').trim().notEmpty()
   ],
   authController.updateUserStatus);

module.exports = router;