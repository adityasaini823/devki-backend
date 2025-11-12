import morgan from 'morgan';
import logger from '../logger.js';

// Create a stream object with a 'write' function that Morgan can use
const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

const morganMiddleware = morgan(
  // The 'combined' format is a good detailed preset
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
  { 
    stream: morganStream,
    
  }
);

export default morganMiddleware;