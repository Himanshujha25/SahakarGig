const IS_PROD = import.meta.env.PROD || import.meta.env.MODE === 'production';

const PRODUCTION_URL = 'https://sahakargig.onrender.com';
const LOCAL_URL = 'http://localhost:5000';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || (IS_PROD ? PRODUCTION_URL : LOCAL_URL);
export const API_URL = import.meta.env.VITE_API_URL || `${SERVER_URL}/api`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || SERVER_URL;
