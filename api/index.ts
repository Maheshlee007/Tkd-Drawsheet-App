import express from 'express';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Create and configure the server
const handler = async (req: any, res: any) => {
  await registerRoutes(app);
  
  // Pass the request to the express app
  return new Promise((resolve, reject) => {
    app(req, res, (err: any) => {
      if (err) {
        return reject(err);
      }
      return resolve(undefined);
    });
  });
};

export default handler;