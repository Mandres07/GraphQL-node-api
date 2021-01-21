const { validationResult } = require('express-validator');
const Post = require('../models/post');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const io = require('../socket');

// Asincrono usando async/await
exports.getPosts = async (req, res, next) => {
   const page = req.query.page || 1; // Extraer query parameter page, en caso de ser nulo asigna 1
   const perPage = 2;
   try {
      const totalItems = await Post.countDocuments();
      const posts = await Post.find()
         .populate('creator') // trae la informacion relacionada de usuario creador del post
         .sort({ createdAt: -1 }) // ordena por campo createdAt de manera descendiente (-1)
         .skip((page - 1) * perPage) // especifica cuantos items se ignoran desde el inicio
         .limit(perPage); // especifica cuantos items en total se deben traer

      // status(200) es success
      res.status(200).json({
         message: 'Posts fetched',
         posts: posts,
         totalItems: totalItems
      });
   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err)
   }
};

// Asincrono con Promises  y then/catch
// exports.getPosts = (req, res, next) => {
//    const page = req.query.page || 1; // Extraer query parameter page, en caso de ser nulo asigna 1
//    const perPage = 2;
//    let totalItems;
//    Post.countDocuments()
//       .then(count => {
//          totalItems = count;
//          return Post.find()
//             .skip((page - 1) * perPage) // especifica cuantos items se ignoran desde el inicio
//             .limit(perPage); // especifica cuantos items en total se deben traer
//       })
//       .then(posts => {
//          // status(200) es success
//          res.status(200).json({
//             message: 'Posts fetched',
//             posts: posts,
//             totalItems: totalItems
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
exports.getPost = async (req, res, next) => {
   const postId = req.params.postId;
   try {
      const post = await Post.findById(postId).populate('creator');
      if (!post) {
         const error = new Error('Post not found');
         error.statusCode = 404;
         throw error; // este throw si va a funcionar porque el proximo catch haace el next(err) necesario
      }
      // status(200) es success
      res.status(200).json({
         message: 'Post fetched.',
         post: post
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
// exports.getPost = (req, res, next) => {
//    const postId = req.params.postId;

//    Post.findById(postId)
//       .then(post => {
//          if (!post) {
//             const error = new Error('Post not found');
//             error.statusCode = 404;
//             throw error; // este throw si va a funcionar porque el proximo catch haace el next(err) necesario
//          }
//          // status(200) es success
//          res.status(200).json({
//             message: 'Post fetched.',
//             post: post
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
exports.createPost = async (req, res, next) => {
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      // Handling errors con throw
      const error = new Error('Validation failed, entered data is incorrect.');
      error.statusCode = 422;
      throw error;

      // handling errors manually
      // return res.status(422).json({
      //    message: 'Validation failed, entered data is incosrrect.',
      //    errors: errors.array()
      // });
   }
   // El request NO debe tener el header 'Content-Type': 'application/json'. Sino que deb eria ser enviado con un body FormData que le da formato de form automaticamente
   if (!req.file) {
      const error = new Error('No image provided.');
      error.statusCode = 422;
      throw error;
   }
   const { title, content } = req.body;
   const imageUrl = req.file.path.replace("\\", "/");
   //obtiene el userId almacenado en is-auth.js cuando el usuario tiene un token correcto
   const userId = req.userId;
   // crea un documento bajo los criterios definidos en mongoose por la clase Post
   const post = new Post({
      // _id: new Date().toISOString(), // el _id mongoose lo crea automaticamente
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: userId,
      // createdAt: new Date() // mongoose hace esto de fechas automatico
   });

   try {
      // guarda el documento en mongoDB
      await post.save();
      const user = await User.findById(userId);
      user.posts.push(post); // se introduce el _id del post a la lista de posts del usuario, mongoDD hace el trabajo de buscar el _id ya que esta almacenado en post
      await user.save();

      // emit() send message to all users, broadcast() send a message to all users but the one that was the sender
      // se debe definir un nombre para el evento: 'posts' y luego un paquete de datos con la informacion que quieras enviar: { action: 'create', post: post }
      io.getIO().emit('posts', { action: 'create', post: { ...post._doc, creator: { _id: req.userId, name: user.name } } });

      console.log('Post created!');
      // status(201) es success se creo un registro
      res.status(201).json({
         message: 'Post created successfully',
         post: post,
         creator: { _id: user._id, name: user.name }
      });
   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      // como estamos en un bloque then/catch no funciona el throw, por lo ue el error hay q pasarlo al siguiente middleware con next(err)
      next(err);
   }
};

// Promises
// exports.createPost = (req, res, next) => {
//    const errors = validationResult(req);
//    if (!errors.isEmpty()) {
//       // Handling errors con throw
//       const error = new Error('Validation failed, entered data is incorrect.');
//       error.statusCode = 422;
//       throw error;

//       // handling errors manually
//       // return res.status(422).json({
//       //    message: 'Validation failed, entered data is incosrrect.',
//       //    errors: errors.array()
//       // });
//    }
//    // El request NO debe tener el header 'Content-Type': 'application/json'. Sino que deb eria ser enviado con un body FormData que le da formato de form automaticamente
//    if (!req.file) {
//       const error = new Error('No image provided.');
//       error.statusCode = 422;
//       throw error;
//    }
//    const { title, content } = req.body;
//    let creator;
//    const imageUrl = req.file.path.replace("\\", "/");
//    //obtiene el userId almacenado en is-auth.js cuando el usuario tiene un token correcto
//    const userId = req.userId;
//    // crea un documento bajo los criterios definidos en mongoose por la clase Post
//    const post = new Post({
//       // _id: new Date().toISOString(), // el _id mongoose lo crea automaticamente
//       title: title,
//       content: content,
//       imageUrl: imageUrl,
//       creator: userId,
//       // createdAt: new Date() // mongoose hace esto de fechas automatico
//    });

//    // guarda el documento en mongoDB
//    post.save()
//       .then(result => {
//          return User.findById(userId);
//       })
//       .then(user => {
//          creator = user;
//          user.posts.push(post); // se introduce el _id del post a la lista de posts del usuario, mongoDD hace el trabajo de buscar el _id ya que esta almacenado en post
//          return user.save();
//       })
//       .then(result => {
//          console.log('Post created!');
//          // status(201) es success se creo un registro
//          res.status(201).json({
//             message: 'Post created successfully',
//             post: post,
//             creator: { _id: creator._id, name: creator.name }
//          });
//       })
//       .catch(err => {
//          if (!err.statusCode) {
//             err.statusCode = 500;
//          }
//          // como estamos en un bloque then/catch no funciona el throw, por lo ue el error hay q pasarlo al siguiente middleware con next(err)
//          next(err);
//       });
// };

// async/await
exports.updatePost = async (req, res, next) => {
   const postId = req.params.postId;
   const userId = req.userId;
   const errors = validationResult(req);
   if (!errors.isEmpty()) {
      const error = new Error('Validation failed, entered data is incorrect.');
      error.statusCode = 422;
      throw error;
   }
   const { title, content } = req.body;
   let imageUrl = req.body.image;
   if (req.file) {
      imageUrl = req.file.path.replace("\\", "/");
   }
   if (!imageUrl) {
      const error = new Error('No file picked.');
      error.statusCode = 422;
      throw error;
   }

   try {
      const post = await Post.findById(postId).populate('creator');
      if (!post) {
         const error = new Error('Post not found');
         error.statusCode = 404;
         throw error;
      }
      if (post.creator._id.toString() !== userId) {
         const error = new Error('Not Authorized');
         error.statusCode = 403;
         throw error;
      }
      if (imageUrl !== post.imageUrl) {
         clearImage(post.imageUrl);
      }
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
      const result = await post.save();

      // emit() send message to all users, broadcast() send a message to all users but the one that was the sender
      // se debe definir un nombre para el evento: 'posts' y luego un paquete de datos con la informacion que quieras enviar: { action: 'update', post: result }
      io.getIO().emit('posts', { action: 'update', post: result });

      console.log('Post updated!');
      res.status(200).json({
         message: 'Post updated.',
         post: result
      });
   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err);
   }
};

// Promises
// exports.updatePost = (req, res, next) => {
//    const postId = req.params.postId;
//    const userId = req.userId;
//    const errors = validationResult(req);
//    if (!errors.isEmpty()) {
//       const error = new Error('Validation failed, entered data is incorrect.');
//       error.statusCode = 422;
//       throw error;
//    }
//    const { title, content } = req.body;
//    let imageUrl = req.body.image;
//    if (req.file) {
//       imageUrl = req.file.path.replace("\\", "/");
//    }
//    if (!imageUrl) {
//       const error = new Error('No file picked.');
//       error.statusCode = 422;
//       throw error;
//    }

//    Post.findById(postId)
//       .then(post => {
//          if (!post) {
//             const error = new Error('Post not found');
//             error.statusCode = 404;
//             throw error;
//          }
//          if (post.creator.toString() !== userId) {
//             const error = new Error('Not Authorized');
//             error.statusCode = 403;
//             throw error;
//          }
//          if (imageUrl !== post.imageUrl) {
//             clearImage(post.imageUrl);
//          }
//          post.title = title;
//          post.content = content;
//          post.imageUrl = imageUrl;
//          return post.save();
//       })
//       .then(result => {
//          console.log('Post updated!');
//          res.status(200).json({
//             message: 'Post updated.',
//             post: result
//          });
//       })
//       .catch(err => {
//          if (!err.statusCode) {
//             err.statusCode = 500;
//          }
//          next(err);
//       });
// };

// async/await
exports.deletePost = async (req, res, next) => {
   const postId = req.params.postId;
   const userId = req.userId;

   try {
      const post = await Post.findById(postId);
      if (!post) {
         const error = new Error('Post not found');
         error.statusCode = 404;
         throw error;
      }
      // check logged in user
      if (post.creator.toString() !== userId) {
         const error = new Error('Not Authorized');
         error.statusCode = 403;
         throw error;
      }
      clearImage(post.imageUrl);
      await Post.findByIdAndRemove(postId, { useFindAndModify: false });

      // Busco el usuario para eliminar el id de su lista de posts
      const user = await User.findById(userId);
      // obtengo el array de posts y elimino el id postId con pull()
      user.posts.pull(postId);
      await user.save();

      // emit() send message to all users, broadcast() send a message to all users but the one that was the sender
      // se debe definir un nombre para el evento: 'posts' y luego un paquete de datos con la informacion que quieras enviar: { action: 'delete', post: postId }
      io.getIO().emit('posts', { action: 'delete', post: postId });

      console.log('Post deleted.');
      res.status(200).json({
         message: 'Post deleted.'
      });
   }
   catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err);
   }
};

// Promises
// exports.deletePost = (req, res, next) => {
//    const postId = req.params.postId;
//    const userId = req.userId;

//    Post.findById(postId)
//       .then(post => {
//          if (!post) {
//             const error = new Error('Post not found');
//             error.statusCode = 404;
//             throw error;
//          }
//          // check logged in user
//          if (post.creator.toString() !== userId) {
//             const error = new Error('Not Authorized');
//             error.statusCode = 403;
//             throw error;
//          }
//          clearImage(post.imageUrl);
//          return Post.findByIdAndRemove(postId, { useFindAndModify: false });
//       })
//       .then(result => {
//          // Busco el usuario para eliminar el id de su lista de posts
//          return User.findById(userId);
//       })
//       .then(user => {
//          // obtengo el array de posts y elimino el id postId con pull()
//          user.posts.pull(postId);
//          return user.save();
//       })
//       .then(result => {
//          console.log('Post deleted.');
//          res.status(200).json({
//             message: 'Post deleted.'
//          });
//       })
//       .catch(err => {
//          if (!err.statusCode) {
//             err.statusCode = 500;
//          }
//          next(err);
//       })
// };

const clearImage = filePath => {
   filePath = path.join(__dirname, '..', filePath);
   fs.unlink(filePath, err => { if (err) console.log(err); });
};