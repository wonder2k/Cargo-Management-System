import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken;
  
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = user;
    next();
  } catch (err) {
    res.clearCookie('accessToken');
    return res.status(401).json({ message: 'Invalid token' });
  }
};
