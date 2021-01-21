const express = require('express');

const { body } = require('express-validator');

const feedController = require('../controllers/feed');

const isAuth = require('../middleware/is-auth');

// creacion del router feed para manejar todas las CRUDS de feed
const router = express.Router();

// GET /feed/posts 
router.get('/posts', isAuth, feedController.getPosts);

// POST /feed/post - En el request es necesario colocar el body bajo JSON.stringify({}) y definir el header Content-Type: 'application/json' en caso de que no haya archivos
// Cuando hay archivos hay q enviar el request bajo formData
router.post('/post',
   isAuth,
   [
      body('title').trim().isLength({ min: 5 }),
      body('content').trim().isLength({ min: 5 })
   ],
   feedController.createPost);

// GET /feed/post/:postId
router.get('/post/:postId', isAuth, feedController.getPost);

router.put('/post/:postId',
   isAuth,
   [
      body('title').trim().isLength({ min: 5 }),
      body('content').trim().isLength({ min: 5 })
   ],
   feedController.updatePost);

router.delete('/post/:postId', isAuth, feedController.deletePost);

module.exports = router;