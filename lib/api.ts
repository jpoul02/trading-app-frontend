import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

export default api;
