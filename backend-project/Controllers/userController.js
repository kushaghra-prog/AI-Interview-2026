import asyncHandler from 'express-async-handler';
import User from '../models/user.js';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import generateToken from '../utils/generateToken.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generaterToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      prefferedRole: user.prefferedRole,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const googleLogin = asyncHandler(async (req, res) => {
  const { tokenId } = req.body;

  const ticket = await client.verifyIdToken({
    idToken: tokenId,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const {
    email_verified,
    name,
    email,
    sub: googleId,
  } = ticket.getPayload();

  if (!email_verified) {
    res.status(400);
    throw new Error('Invalid Google token');
  }

  let user = await User.findOne({ email });   // changed const -> let

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }
  } else {
    user = await User.create({                // removed const
      name,
      email,
      googleId,
      password: null,
    });
  }

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    preferredRole: user.preferredRole,
    token: generateToken(user._id),
  });
});


const getUserProfile = asyncHandler(async (req, res) => {
  if(req.user) {
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      preferredRole: req.user.preferredRole,
    });
  }else {
    res.status(404);
    throw new Error('User not found');
  }
})

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.preferredRole = req.body.preferredRole || user.preferredRole;
    if(req.body.password) {
      user.password = req.body.password;
    }
    await user.save();
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      preferredRole: user.preferredRole,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});


export {registerUser,loginUser,googleLogin,getUserProfile,updateUserProfile};
