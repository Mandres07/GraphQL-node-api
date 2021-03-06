const User = require('../models/user');
const Post = require('../models/post');
const bcrypt = require('bcryptjs');
const validator = require('validator').default;
const jwt = require('jsonwebtoken');
const { clearImage } = require('../util/file');

module.exports = {
   createUser: async function ({ userInput }, req) {
      const { email, name, password } = userInput;
      const errors = [];
      if (!validator.isEmail(email)) {
         errors.push({ message: 'Email is invalid' });
      }
      if (validator.isEmpty(password) || !validator.isLength(password, { min: 5 })) {
         errors.push({ message: 'Password is missing or to short.' });
      }
      if (errors.length > 0) {
         const error = new Error('Invalid input.');
         error.data = errors;
         error.code = 422;
         throw error;
      }
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
         const error = new Error('User already exists.');
         throw error;
      }
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
         email: email,
         name: name,
         password: hashedPassword
      });
      const createdUser = await user.save();
      return {
         ...createdUser._doc, _id: createdUser._id.toString()
      };
   },
   login: async function ({ email, password }, req) {
      const user = await User.findOne({ email: email });
      if (!user) {
         const error = new Error('User Not Found.');
         error.code = 401;
         throw error;
      }
      const isEqual = await bcrypt.compare(password, user.password);
      if (!isEqual) {
         const error = new Error('Password is incorrect.');
         error.code = 401;
         throw error;
      }
      const token = jwt.sign(
         {
            userId: user._id,
            email: user.email
         },
         'secret',
         { expiresIn: '1h' }
      );
      return { token: token, userId: user._id.toString() };
   },
   createPost: async function ({ postInput }, req) {
      if (!req.isAuth) {
         const error = new Error('Not authenticated.');
         error.code = 401;
         throw error;
      }
      const { title, content, imageUrl } = postInput;
      const errors = [];
      if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
         errors.push({ message: 'Title is missing or to short.' });
      }
      if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
         errors.push({ message: 'content is missing or to short.' });
      }
      // if (!validator.isURL(imageUrl)) {
      //    errors.push({ message: 'imageUrl is invalid.' });
      // }
      if (errors.length > 0) {
         const error = new Error('Invalid input.');
         error.data = errors;
         error.code = 422;
         throw error;
      }
      const user = await User.findById(req.userId);
      if (!user) {
         const error = new Error('Invalid user.');
         error.code = 401;
         throw error;
      }
      const post = new Post({
         title: title,
         content: content,
         imageUrl: imageUrl,
         creator: user
      });
      const createdPost = await post.save();
      user.posts.push(createdPost);
      await user.save();
      return {
         ...createdPost._doc,
         _id: createdPost._id.toString(),
         createdAt: createdPost.createdAt.toISOString(),
         updatedAt: createdPost.updatedAt.toISOString()
      };
   },
   posts: async function (args, req) {
      if (!req.isAuth) {
         const error = new Error('Not authenticated.');
         error.code = 401;
         throw error;
      }
      const page = args.page || 1;
      const perPage = 2;
      const totalPosts = await Post.countDocuments();
      const posts = await Post.find()
         .populate('creator') // trae la informacion relacionada de usuario creador del post
         .sort({ createdAt: -1 }) // ordena por campo createdAt de manera descendiente (-1)
         .skip((page - 1) * perPage) // especifica cuantos items se ignoran desde el inicio
         .limit(perPage); // especifica cuantos items en total se deben traer
      return {
         posts: posts.map(p => {
            return {
               ...p._doc,
               _id: p._id.toString(),
               createdAt: p.createdAt.toISOString(),
               updatedAt: p.updatedAt.toISOString()
            };
         }),
         totalPosts: totalPosts
      };
   },
   post: async function ({ id }, req) {
      if (!req.isAuth) {
         const error = new Error('Not authenticated.');
         error.code = 401;
         throw error;
      }
      const post = await Post.findById(id).populate('creator');
      if (!post) {
         const error = new Error('No post found.');
         error.code = 404;
         throw error;
      }
      return {
         ...post._doc,
         _id: post._id.toString(),
         createdAt: post.createdAt.toISOString(),
         updatedAt: post.updatedAt.toISOString()
      };
   },
   updatePost: async function ({ id, postInput }, req) {
      if (!req.isAuth) {
         const error = new Error('Not authenticated.');
         error.code = 401;
         throw error;
      }
      const post = await Post.findById(id).populate('creator');
      if (!post) {
         const error = new Error('No post found.');
         error.code = 404;
         throw error;
      }
      if (post.creator._id.toString() !== req.userId.toString()) {
         const error = new Error('Not authorized.');
         error.code = 403;
         throw error;
      }
      const { title, content, imageUrl } = postInput;
      const errors = [];
      if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
         errors.push({ message: 'Title is missing or to short.' });
      }
      if (validator.isEmpty(content) || !validator.isLength(content, { min: 5 })) {
         errors.push({ message: 'content is missing or to short.' });
      }
      if (errors.length > 0) {
         const error = new Error('Invalid input.');
         error.data = errors;
         error.code = 422;
         throw error;
      }
      post.title = title;
      post.content = content;
      if (imageUrl !== 'undefined') {
         post.imageUrl = imageUrl;
      }
      const updatedPost = await post.save();
      return {
         ...updatedPost._doc,
         _id: updatedPost._id.toString(),
         createdAt: updatedPost.createdAt.toISOString(),
         updatedAt: updatedPost.updatedAt.toISOString()
      };
   },
   deletePost: async function ({ id }, req) {
      if (!req.isAuth) {
         const error = new Error('Not authenticated.');
         error.code = 401;
         throw error;
      }
      const post = await Post.findById(id);
      if (!post) {
         const error = new Error('No post found.');
         error.code = 404;
         throw error;
      }
      if (post.creator.toString() !== req.userId.toString()) {
         const error = new Error('Not authorized.');
         error.code = 403;
         throw error;
      }
      try {
         clearImage(post.imageUrl);
         await Post.findByIdAndRemove(id, { useFindAndModify: false });
         const user = await User.findById(req.userId);
         user.posts.pull(id);
         await user.save();
         return true;
      }
      catch (err) {
         return false;
      }
   },
   user: async function (args, req) {
      if (!req.isAuth) {
         const error = new Error('Not authenticated.');
         error.code = 401;
         throw error;
      }
      const user = await User.findById(req.userId);
      if (!user) {
         const error = new Error('No user found.');
         error.code = 404;
         throw error;
      }
      return {
         ...user._doc,
         _id: user._id.toString()
      };
   },
   updateStatus: async function ({ status }, req) {
      if (!req.isAuth) {
         const error = new Error('Not authenticated.');
         error.code = 401;
         throw error;
      }
      const user = await User.findById(req.userId);
      if (!user) {
         const error = new Error('No user found.');
         error.code = 404;
         throw error;
      }
      user.status = status;
      await user.save();
      return {
         ...user._doc,
         _id: user._id.toString()
      };
   }
};