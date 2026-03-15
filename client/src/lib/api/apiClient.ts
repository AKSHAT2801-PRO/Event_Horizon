import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_API_URL ?? "localhost:8000",
  timeout: 60_000,
  headers: {
    Accept: "application/json",
  },
  //   withCredentials: true,
});

// api.interceptors.response.use(
//   (res) => res,
//   (error) => {
//     console.error("API Error:", error);
//     return Promise.reject(error);
//   },
// );

// api.interceptors.response.use(
//   (res) => res,
//   (error) => {
//     if (error.response?.status === 401) {
//       window.location.href = "/login";
//     }
//     return Promise.reject(error);
//   },
// );
