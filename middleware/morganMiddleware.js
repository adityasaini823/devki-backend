import morgan from 'morgan';
import Logger from '../logger.js';

// Define the userId token for morgan
morgan.token('userId', (req) => {
    return req.user?._id || req.user?.id || '-';
});

const morganMiddleware = morgan(':method :url :status :res[content-length] - :response-time ms :userId', {
    stream: {
        write: async (message) => {
            Logger.http(`${message.trim()}`);
        }
    }
});

export default morganMiddleware;