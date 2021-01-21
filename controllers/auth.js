const { validationResult } = require('express-validator');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//async/await
exports.signup = async (req, res, next) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      const error = new Error('Validation failed.');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
   }
   const { email, name, password } = req.body;

   try {
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = new User({
         email: email,
         password: hashedPassword,
         name: name
      });

      const result = await user.save();

      console.log('User created');
      res.status(201).json({
         message: 'User created',
         userId: result._id
      });
   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err)
   }
};

// Promises
// exports.signup = (req, res, next) => {
//    const errors = validationResult(req);
//    if (!errors.isEmpty()) {
//       const error = new Error('Validation failed.');
//       error.statusCode = 422;
//       error.data = errors.array();
//       throw error;
//    }
//    const { email, name, password } = req.body;

//    bcrypt.hash(password, 12)
//       .then(hashedPassword => {
//          const user = new User({
//             email: email,
//             password: hashedPassword,
//             name: name
//          });

//          return user.save();
//       })
//       .then(result => {
//          console.log('User created');
//          res.status(201).json({
//             message: 'User created',
//             userId: result._id
//          });
//       })
//       .catch(err => {
//          if (!err.statusCode) {
//             err.statusCode = 500;
//          }
//          next(err)
//       });
// };

// async/await
exports.login = async (req, res, next) => {
   const { email, password } = req.body;
   try {
      const user = await User.findOne({ email: email }); // busca un usuario con el email especificado
      if (!user) { // valida si el usuario existe
         const error = new Error('User not found');
         error.statusCode = 401;
         throw error;
      }
      const isEqual = await bcrypt.compare(password, user.password); // valida si las contraseñas coinciden

      if (!isEqual) { // si no coinciden entonces no se loggea
         const error = new Error('Wrong password');
         error.statusCode = 401;
         throw error;
      }

      //crea un json web token para demostrar que esta autenticado
      // la funcion jwtsign() requiere el primero argumento puede ser un ibjeto con lo que sea, el segundo argumento es un string secreto ('secret') y el tercer argumento define fecha de expiracion
      const token = jwt.sign(
         {
            email: user.email,
            userId: user._id.toString()
         },
         'secret',
         { expiresIn: '1h' }
      );
      // retorno la informacion para el usuario loggeado
      res.status(200).json({
         token: token,
         userId: user._id.toString()
      });

   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err)
   }
};


// Promises
// exports.login = (req, res, next) => {
//    const { email, password } = req.body;
//    let loadedUser;
//    User.findOne({ email: email }) // busca un usuario con el email especificado
//       .then(user => {
//          if (!user) { // valida si el usuario existe
//             const error = new Error('User not found');
//             error.statusCode = 401;
//             throw error;
//          }
//          loadedUser = user;
//          return bcrypt.compare(password, user.password); // valida si las contraseñas coinciden
//       })
//       .then(isEqual => {
//          if (!isEqual) { // si no coinciden entonces no se loggea
//             const error = new Error('Wrong password');
//             error.statusCode = 401;
//             throw error;
//          }

//          //crea un json web token para demostrar que esta autenticado
//          // la funcion jwtsign() requiere el primero argumento puede ser un ibjeto con lo que sea, el segundo argumento es un string secreto ('secret') y el tercer argumento define fecha de expiracion
//          const token = jwt.sign(
//             {
//                email: loadedUser.email,
//                userId: loadedUser._id.toString()
//             },
//             'secret',
//             { expiresIn: '1h' }
//          );
//          // retorno la informacion para el usuario loggeado
//          res.status(200).json({
//             token: token,
//             userId: loadedUser._id.toString()
//          });
//       })
//       .catch(err => {
//          if (!err.statusCode) {
//             err.statusCode = 500;
//          }
//          next(err)
//       });
// };

//async/await
exports.getUserStatus = async (req, res, next) => {
   try {
      const user = await User.findById(req.userId);
      if (!user) {
         const error = new Error('User Not found');
         error.statusCode = 404;
         throw error;
      }
      res.status(200).json({
         status: user.status
      });
   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err)
   }
};


// Promises
// exports.getUserStatus = (req, res, next) => {
//    User.findById(req.userId)
//       .then(user => {
//          if (!user) {
//             const error = new Error('User Not found');
//             error.statusCode = 404;
//             throw error;
//          }
//          res.status(200).json({
//             status: user.status
//          });
//       })
//       .catch(err => {
//          if (!err.statusCode) {
//             err.statusCode = 500;
//          }
//          next(err)
//       });
// };

//async/await
exports.updateUserStatus = async (req, res, next) => {
   const newStatus = req.body.status;
   try {
      const user = await User.findById(req.userId);
      if (!user) {
         const error = new Error('User Not found');
         error.statusCode = 404;
         throw error;
      }
      user.status = newStatus;
      await user.save();
      res.status(200).json({
         message: 'User status updated'
      });
   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err)
   }
};

// Promises
// exports.updateUserStatus = (req, res, next) => {
//    const newStatus = req.body.status;
//    User.findById(req.userId)
//       .then(user => {
//          if (!user) {
//             const error = new Error('User Not found');
//             error.statusCode = 404;
//             throw error;
//          }
//          user.status = newStatus;
//          return user.save();
//       })
//       .then(result => {
//          res.status(200).json({
//             message: 'User status updated'
//          });
//       })
//       .catch(err => {
//          if (!err.statusCode) {
//             err.statusCode = 500;
//          }
//          next(err)
//       });
// };